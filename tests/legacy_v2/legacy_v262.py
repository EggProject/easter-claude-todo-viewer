import importlib.util
import io
import json
import os
import pathlib
import sys
import tempfile
import time
import unittest

PKG = pathlib.Path(__file__).resolve().parents[1]
SERVER = PKG / 'server.py'


def load_server():
    name = f'claude_todos_server_v262_{time.time_ns()}'
    spec = importlib.util.spec_from_file_location(name, SERVER)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


class V262Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)
        self.home = self.root / 'home'
        self.claude = self.home / '.claude'
        self.cache_root = self.home / '.claude-todos' / 'cache'
        self.log_root = self.home / '.claude-todos' / 'logs'
        self.project = self.root / 'project'
        self.project.mkdir(parents=True)
        self.session = 'd1165f25-2740-45b4-8ae7-b35a1cb64c46'
        self.store = self.session
        self.task_dir = self.claude / 'tasks' / self.store
        self.task_dir.mkdir(parents=True)
        self.transcript = self.claude / 'projects' / '-tmp-project' / f'{self.session}.jsonl'
        self.transcript.parent.mkdir(parents=True)
        self.transcript.write_text(json.dumps({'cwd': str(self.project)}) + '\n')

    def tearDown(self):
        self.tmp.cleanup()

    def write_task(self, task_id='18', subject='Translate title', description='Translate description'):
        data = {
            'id': str(task_id), 'subject': subject, 'description': description,
            'status': 'pending', 'activeForm': 'Working', 'owner': '',
            'blockedBy': [], 'blocks': [], 'metadata': {}
        }
        path = self.task_dir / f'{task_id}.json'
        path.write_text(json.dumps(data), encoding='utf-8')
        return path

    def config(self, mod, agy_path='agy'):
        return mod.Config(
            session_id=self.session,
            transcript=str(self.transcript),
            project_cwd=str(self.project),
            task_root=self.claude / 'tasks',
            candidate_ids=[self.store],
            initial_status='all', initial_sort='dependency', version='2.6.2',
            cache_root=self.cache_root, ui_dir=PKG / 'ui', agy_bin=agy_path,
            no_open=True, port=0,
            log_file=False, log_output=False, log_root=self.log_root,
        )

    def make_official_stream_agy(self, fail=False, delay=0.05):
        bin_dir = self.root / ('bin-fail' if fail else 'bin-ok')
        bin_dir.mkdir(exist_ok=True)
        script = bin_dir / 'agy'
        script.write_text(r'''#!/usr/bin/env python3
import json, sys, time
args=sys.argv[1:]
prompt=args[args.index('-p')+1]
print(json.dumps({
  'event':'init',
  'conversation_id':'conv-123',
  'init':{'cwd':'/tmp','tools':[],'permission_mode':'request-review','model':'gemini-3.8-flash-high'}
}), flush=True)
print(json.dumps({
  'event':'step_update',
  'step_update':{'conversation_id':'conv-123','step_index':0,'state':'ACTIVE','step_type':'agent_response'}
}), flush=True)
time.sleep(%r)
if %r:
    print(json.dumps({'event':'result','result':{
      'conversation_id':'conv-123','status':'ERROR','response':'','error':'synthetic translator failure',
      'duration_seconds':%r,'num_turns':1,
      'usage':{'input_tokens':11,'output_tokens':0,'thinking_tokens':2,'cache_read_tokens':3,'total_tokens':13}
    }}), flush=True)
    sys.exit(1)
if 'independent translation fidelity validator' in prompt:
    out={'valid': True, 'issues': []}
else:
    src=json.loads(prompt.split('Source JSON:\n',1)[1])
    out={'title':'HU: '+src['title'],'description':'HU: '+src['description']}
print(json.dumps({
  'event':'step_update',
  'step_update':{'conversation_id':'conv-123','step_index':1,'state':'DONE','step_type':'agent_response','duration_seconds':%r,
                 'usage':{'input_tokens':11,'output_tokens':7,'thinking_tokens':2,'cache_read_tokens':3,'total_tokens':18}}
}), flush=True)
print(json.dumps({'event':'result','result':{
  'conversation_id':'conv-123','status':'SUCCESS','response':json.dumps(out),
  'structured_output':out,'duration_seconds':%r,'num_turns':1,
  'usage':{'input_tokens':11,'output_tokens':7,'thinking_tokens':2,'cache_read_tokens':3,'total_tokens':18}
}}), flush=True)
''' % (delay, fail, delay, delay, delay), encoding='utf-8')
        script.chmod(0o755)
        return script

    def wait_until(self, predicate, timeout=6):
        deadline = time.monotonic() + timeout
        last = None
        while time.monotonic() < deadline:
            last = predicate()
            if last:
                return last
            time.sleep(0.03)
        return last

    def test_run_agy_parses_official_nested_stream_json(self):
        mod = load_server()
        agy = self.make_official_stream_agy(fail=False)
        out = mod.run_agy(str(agy), 'Source JSON:\n{"title":"A","description":"B"}', mod.TRANSLATION_SCHEMA)
        self.assertEqual(out, {'title': 'HU: A', 'description': 'HU: B'})

    def test_task_hu_request_is_transactional_and_failure_reverts_to_en_with_sse_error(self):
        self.write_task()
        mod = load_server()
        agy = self.make_official_stream_agy(fail=True, delay=0.08)
        runtime = mod.DashboardRuntime(self.config(mod, str(agy)))
        uid = f'{self.store}:18'
        try:
            state = runtime.request_task_language(uid, 'hu')
            task = next(t for t in state['tasks'] if t['uid'] == uid)
            self.assertEqual(task['languagePreference'], 'en', 'HU preference must not commit before validated translation exists')
            self.assertTrue(task['translationPending'])

            def finished():
                st = runtime.api_state()
                t = next(x for x in st['tasks'] if x['uid'] == uid)
                if t['translationPending']:
                    return None
                return st, t
            result = self.wait_until(finished)
            self.assertIsNotNone(result)
            _, task = result
            self.assertEqual(task['languagePreference'], 'en')
            self.assertEqual(task['effectiveLanguage'], 'en')
            self.assertTrue(task.get('translationError'))
            errors = [e for e in runtime.hub.history if e['event'] == 'translation-error']
            self.assertTrue(errors, 'async translation failure must be pushed to the browser')
            payload = errors[-1]['payload']
            self.assertEqual(payload['scope'], 'task')
            self.assertEqual(payload['taskId'], '18')
            self.assertIn('synthetic translator failure', payload['message'])
        finally:
            runtime.close()

    def test_global_hu_request_commits_only_after_all_translations_succeed(self):
        self.write_task()
        mod = load_server()
        agy = self.make_official_stream_agy(fail=False, delay=0.08)
        runtime = mod.DashboardRuntime(self.config(mod, str(agy)))
        try:
            state = runtime.request_global_language('hu')
            self.assertEqual(state['globalLanguage'], 'en')
            self.assertTrue(state['globalTranslationPending'])
            
            def global_done():
                st = runtime.api_state()
                return st if st['globalLanguage'] == 'hu' and not st['globalTranslationPending'] else None
            done = self.wait_until(global_done)
            self.assertIsNotNone(done)
            self.assertEqual(done['tasks'][0]['subject'], 'HU: Translate title')
        finally:
            runtime.close()

    def test_frontend_listens_for_translation_error_and_uses_required_modal(self):
        js = (PKG / 'ui' / 'app.js').read_text(encoding='utf-8')
        html = (PKG / 'ui' / 'index.html').read_text(encoding='utf-8')
        self.assertIn("addEventListener('translation-error'", js)
        self.assertIn('enqueueTranslationError', js)
        self.assertIn('modalKicker', html)
        self.assertIn('Translation failed', js)


    def test_official_stream_error_log_contains_real_nested_status_error_exit_and_conversation(self):
        mod = load_server()
        agy = self.make_official_stream_agy(fail=True, delay=0.01)
        class TTY(io.StringIO):
            def isatty(self): return True
        stream = TTY()
        cfg = self.config(mod, str(agy))
        cfg.log_output = True
        cfg.log_stream = stream
        logger = mod.AppLogger(cfg)
        try:
            with self.assertRaisesRegex(RuntimeError, 'synthetic translator failure'):
                mod.run_agy(str(agy), 'Source JSON:\n{"title":"A","description":"B"}', mod.TRANSLATION_SCHEMA, logger, 'translator', 'task #18')
        finally:
            logger.close()
        text = stream.getvalue()
        self.assertIn('status=ERROR', text)
        self.assertIn('error=synthetic translator failure', text)
        self.assertIn('exit=1', text)
        self.assertIn('conversation=conv-123', text)
        self.assertIn('agent_response ACTIVE', text)

    def test_committed_hu_retranslation_failure_keeps_global_hu_but_falls_back_task_to_english(self):
        task_path = self.write_task(subject='Original title', description='Original description')
        mod = load_server()
        ok_agy = self.make_official_stream_agy(fail=False, delay=0.01)
        runtime = mod.DashboardRuntime(self.config(mod, str(ok_agy)))
        uid = f'{self.store}:18'
        try:
            runtime.set_global_language('hu')
            initial = runtime.api_state()
            self.assertEqual(initial['globalLanguage'], 'hu')
            self.assertEqual(initial['tasks'][0]['effectiveLanguage'], 'hu')

            fail_agy = self.make_official_stream_agy(fail=True, delay=0.01)
            runtime.store.config.agy_bin = str(fail_agy)
            raw = json.loads(task_path.read_text())
            raw['description'] = 'Changed while HU is active'
            task_path.write_text(json.dumps(raw))
            runtime.store.poll_once(source='live')
            runtime.schedule_translation('tasks-updated')

            def failed_state():
                st = runtime.api_state()
                t = next(x for x in st['tasks'] if x['uid'] == uid)
                if t.get('translationError') and not t.get('translationPending'):
                    return st, t
                return None
            result = self.wait_until(failed_state)
            self.assertIsNotNone(result)
            st, t = result
            self.assertEqual(st['globalLanguage'], 'hu')
            self.assertEqual(t['effectiveLanguage'], 'en')
            self.assertEqual(t['description'], 'Changed while HU is active')
            self.assertIn('synthetic translator failure', t['translationError'])
            errors = [e for e in runtime.hub.history if e['event'] == 'translation-error']
            self.assertTrue(errors)
            self.assertEqual(errors[-1]['payload']['context'], 'retranslation')
        finally:
            runtime.close()

if __name__ == '__main__':
    unittest.main(verbosity=2)
