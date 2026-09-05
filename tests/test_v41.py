import json
import pathlib
import tempfile
import unittest
from unittest import mock

from server.multi_runtime import DaemonConfig, MultiSessionRuntime
from server.session_registry import SessionRegistry

ROOT = pathlib.Path(__file__).resolve().parents[1]


class RegistryCacheTests(unittest.TestCase):
    def test_unchanged_transcript_is_not_rescanned(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            pdir = root / 'projects' / 'p'
            pdir.mkdir(parents=True)
            transcript = pdir / 'S.jsonl'
            transcript.write_text(json.dumps({'timestamp':'2026-09-05T10:00:00Z','cwd':'/work/s','type':'user','message':{'content':'Hello'}})+'\n')
            registry = SessionRegistry(root)
            with mock.patch.object(registry, '_scan_transcript', wraps=registry._scan_transcript) as scan:
                first = registry.discover()
                second = registry.discover()
                self.assertEqual(1, scan.call_count)
                self.assertEqual(first, second)
                transcript.write_text(transcript.read_text() + json.dumps({'timestamp':'2026-09-05T10:01:00Z','type':'assistant','message':{'content':'x'}})+'\n')
                registry.discover()
                self.assertEqual(2, scan.call_count)

    def test_snapshot_never_scans_files(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            pdir = root / 'projects' / 'p'; pdir.mkdir(parents=True)
            (pdir/'S.jsonl').write_text(json.dumps({'timestamp':'2026-09-05T10:00:00Z','cwd':'/work/s'})+'\n')
            registry = SessionRegistry(root)
            registry.discover()
            with mock.patch.object(registry, '_scan_transcript', side_effect=AssertionError('snapshot must not scan')):
                rows = registry.snapshot()
            self.assertEqual('S', rows[0]['id'])


class RuntimePerformanceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        b = pathlib.Path(self.tmp.name)
        self.ch = b/'claude'; projects=self.ch/'projects'; (self.ch/'tasks').mkdir(parents=True)
        for sid, ts in [('A','2026-09-05T10:00:00Z'),('B','2026-09-05T11:00:00Z'),('C','2026-09-05T12:00:00Z')]:
            p = projects/f'-{sid}'; p.mkdir(parents=True)
            (p/f'{sid}.jsonl').write_text(json.dumps({'timestamp':ts,'cwd':f'/work/{sid.lower()}','type':'user','message':{'content':sid}})+'\n')
        self.cfg = DaemonConfig(claude_home=self.ch, cache_root=b/'cache', settings_file=b/'config.json', app_state_file=b/'app-state.json', log_root=b/'logs', client_origins=['http://127.0.0.1:8766'], version='4.1.1')
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
    def tearDown(self):
        self.rt.close(); self.tmp.cleanup()

    def test_sessions_snapshot_does_not_rediscover(self):
        with mock.patch.object(self.rt, 'refresh_sessions', side_effect=AssertionError('snapshot endpoint path must not refresh')):
            state = self.rt.sessions_state()
        self.assertEqual(3, len(state['sessions']))

    def test_sessions_state_does_not_build_full_child_task_state(self):
        current=self.rt.app_state()['currentSessionId']
        child=self.rt.get_runtime(current)
        with mock.patch.object(child,'api_state',side_effect=AssertionError('sessions table must use lightweight child status')):
            state=self.rt.sessions_state()
        self.assertEqual(current,state['currentSessionId'])

    def test_session_cache_stats_are_reused_until_explicitly_invalidated(self):
        info=self.rt.sessions[0]
        with mock.patch.object(self.rt, '_compute_cache_stats', wraps=self.rt._compute_cache_stats) as compute:
            first=self.rt.sessions_state()
            second=self.rt.sessions_state()
            self.assertEqual(first,second)
            self.assertEqual(len(self.rt.sessions),compute.call_count)
            self.rt.invalidate_session_stats(info['id'])
            self.rt.sessions_state()
            self.assertEqual(len(self.rt.sessions)+1,compute.call_count)

    def test_translations_do_not_instantiate_every_inactive_runtime(self):
        current = self.rt.app_state()['currentSessionId']
        self.assertEqual({current}, set(self.rt.children))
        self.rt.translations()
        self.assertEqual({current}, set(self.rt.children))

    def test_language_change_auto_watches_unwatched_session(self):
        current = self.rt.app_state()['currentSessionId']
        target = next(s['id'] for s in self.rt.sessions if s['id'] != current)
        self.assertNotIn(target, self.rt.app_state()['watchedSessionIds'])
        self.rt.request_global_language(target, 'hu')
        self.assertIn(target, self.rt.app_state()['watchedSessionIds'])


class ClientSourceContractTests(unittest.TestCase):
    def test_flow_uses_semantic_reconciliation_and_does_not_reconcile_on_layout_object(self):
        flow = (ROOT/'client/src/pages/flow.js').read_text()
        self.assertIn('graphRevision', flow)
        self.assertIn('reconcileSemanticNodes', flow)
        self.assertIn('restoringViewport', flow)
        self.assertNotIn('}, [automatic.nodes, layouts]);', flow)


    def test_flow_reconciliation_preserves_dragged_positions_and_revision_ignores_layout(self):
        import subprocess
        module=(ROOT/'client/src/flow-state.js').as_uri()
        script=f"""import {{semanticGraphRevision,reconcileSemanticNodes}} from {json.dumps(module)};
const groups=new Map([['S',{{tasks:[{{uid:'u1',id:'1',status:'in_progress',subject:'A',description:'D',blockedBy:[],blocks:[]}}]}}]]);
const rev1=semanticGraphRevision(groups,['S'],'dependency');
const old=[{{id:'S::u1',position:{{x:777,y:333}},data:{{uid:'u1',sessionId:'S'}}}}];
const incoming=[{{id:'S::u1',position:{{x:0,y:0}},data:{{uid:'u1',sessionId:'S',label:'new'}}}}];
const out=reconcileSemanticNodes(old,incoming,{{S:{{nodes:{{u1:{{x:1,y:2}}}}}}}});
const rev2=semanticGraphRevision(groups,['S'],'dependency');
console.log(JSON.stringify({{revSame:rev1===rev2,pos:out[0].position,label:out[0].data.label}}));"""
        result=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],text=True))
        self.assertTrue(result['revSame'])
        self.assertEqual({'x':777,'y':333},result['pos'])
        self.assertEqual('new',result['label'])

    def test_app_has_bootstrap_splash_with_retry(self):
        ctx = (ROOT/'client/src/app-context.js').read_text()
        main = (ROOT/'client/src/main.js').read_text()
        splash = (ROOT/'client/src/components/app-splash.js').read_text()
        self.assertIn('bootstrapStatus', ctx)
        self.assertIn('retryBootstrap', ctx)
        self.assertIn('AppSplash', main)
        self.assertIn('Retry', splash)
        self.assertIn('Preparing session workspace', splash)

    def test_initial_html_contains_branded_splash_before_react_boots(self):
        html=(ROOT/'client/index.html').read_text()
        self.assertIn('class="app-splash"',html)
        self.assertIn('Claude Tasks',html)
        self.assertIn('Connecting to multi-session daemon',html)

    def test_sessions_switch_action_is_sticky_and_language_control_is_on_row(self):
        page = (ROOT/'client/src/pages/sessions.js').read_text()
        css = (ROOT/'client/styles.css').read_text()
        self.assertIn("header: 'Action'", page)
        self.assertIn('switchSessionOptimistic', page)
        self.assertIn('SessionLanguageControl', page)
        self.assertIn('sessions-action-cell', page)
        self.assertIn('switchingRef', page)
        self.assertIn('position:sticky', css.replace(' ', ''))

    def test_topbar_has_no_global_language_switch_and_nav_is_right_aligned(self):
        top = (ROOT/'client/src/components/topbar.js').read_text()
        css = (ROOT/'client/styles.css').read_text()
        self.assertNotIn('toggleGlobalLanguage', top)
        self.assertNotIn("className:'lang-control'", top)
        self.assertIn("className:'spacer'", top)
        self.assertIn('clamp(280px,30vw,620px)', css.replace(' ', ''))

    def test_task_language_badge_is_used_on_translation_and_notification_surfaces(self):
        translations=(ROOT/'client/src/pages/translations.js').read_text()
        overlays=(ROOT/'client/src/components/overlays.js').read_text()
        self.assertIn('TaskLanguageBadge',translations)
        self.assertIn('TaskLanguageBadge',overlays)
        self.assertIn('taskSnapshot',overlays)

    def test_v41_version_is_consistent_in_entrypoints(self):
        files=['server/main.py','server/session_core.py','client/package.json','client/serve.py','README.md']
        for rel in files:
            text=(ROOT/rel).read_text()
            self.assertIn('4.1.1',text,rel)

    def test_shared_task_language_badge_is_used_on_task_and_flow_surfaces(self):
        badge = (ROOT/'client/src/components/language-badge.js').read_text()
        tasks = (ROOT/'client/src/pages/tasks.js').read_text()
        flow = (ROOT/'client/src/pages/flow.js').read_text()
        drawer = (ROOT/'client/src/components/task-drawer.js').read_text()
        for token in ['HU cached','EN override','translationState','sessionGlobalLanguage']:
            self.assertIn(token, badge)
        self.assertIn('TaskLanguageBadge', tasks)
        self.assertIn('TaskLanguageBadge', flow)
        self.assertIn('TaskLanguageBadge', drawer)


if __name__ == '__main__':
    unittest.main()
