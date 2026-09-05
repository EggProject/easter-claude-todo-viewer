import importlib.util
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import time
import unittest

PKG = pathlib.Path(__file__).resolve().parents[1]
SERVER = PKG / 'server.py'


def load_server():
    spec = importlib.util.spec_from_file_location('claude_todos_server', SERVER)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class V26Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)
        self.home = self.root / 'home'
        self.claude = self.home / '.claude'
        self.cache_root = self.home / '.claude-todos' / 'cache'
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

    def write_task(self, task_id='17', subject='Translate **this** title', description='Keep `code` and\n\n- bullets', status='pending'):
        data = {
            'id': str(task_id), 'subject': subject, 'description': description,
            'status': status, 'activeForm': 'Working', 'owner': '',
            'blockedBy': [], 'blocks': [], 'metadata': {}
        }
        path = self.task_dir / f'{task_id}.json'
        path.write_text(json.dumps(data), encoding='utf-8')
        return path

    def make_fake_agy(self):
        bin_dir = self.root / 'bin'
        bin_dir.mkdir()
        log = self.root / 'agy-calls.jsonl'
        script = bin_dir / 'agy'
        script.write_text(r'''#!/usr/bin/env python3
import json, os, sys
args=sys.argv[1:]
prompt=args[args.index('-p')+1] if '-p' in args else ''
log=os.environ['FAKE_AGY_LOG']
with open(log,'a',encoding='utf-8') as f:
    f.write(json.dumps({'args':args,'prompt':prompt})+'\n')
if 'independent translation fidelity validator' in prompt:
    out={'valid': True, 'issues': []}
else:
    marker='Source JSON:\n'
    raw=prompt.split(marker,1)[1]
    src=json.loads(raw)
    out={'title':'HU: '+src['title'], 'description':'HU: '+src['description']}
envelope={'status':'SUCCESS','structured_output':out,'response':json.dumps(out,ensure_ascii=False)}
print(json.dumps(envelope,ensure_ascii=False))
''', encoding='utf-8')
        script.chmod(0o755)
        return bin_dir, log

    def config(self, agy_path='agy'):
        mod = load_server()
        return mod.Config(
            session_id=self.session,
            transcript=str(self.transcript),
            project_cwd=str(self.project),
            task_root=self.claude / 'tasks',
            candidate_ids=[self.store],
            initial_status='all', initial_sort='dependency', version='2.6.2',
            cache_root=self.cache_root, ui_dir=PKG / 'ui', agy_bin=agy_path,
            no_open=True, port=0,
        )

    def test_cache_path_contains_project_session_and_task(self):
        self.write_task()
        mod=load_server(); cfg=self.config(); store=mod.StateStore(cfg)
        store.reconcile_startup()
        files=list(self.cache_root.glob(f'projects/*/sessions/{self.session}/tasks/*/17/task.json'))
        self.assertEqual(len(files),1)
        payload=json.loads(files[0].read_text())
        self.assertEqual(payload['sessionId'],self.session)
        self.assertEqual(payload['taskId'],'17')

    def test_offline_change_is_persisted_once_and_detected_on_restart(self):
        task=self.write_task(status='pending')
        mod=load_server(); cfg=self.config(); store=mod.StateStore(cfg)
        first=store.reconcile_startup()
        self.assertEqual(first, [])
        task_data=json.loads(task.read_text()); task_data['status']='in_progress'; task.write_text(json.dumps(task_data))
        store2=mod.StateStore(cfg); changes=store2.reconcile_startup()
        self.assertEqual(len(changes),1)
        self.assertEqual(changes[0]['source'],'startup-reconcile')
        self.assertEqual(changes[0]['changes'][0]['field'],'status')
        self.assertEqual(changes[0]['changes'][0]['before'],'pending')
        self.assertEqual(changes[0]['changes'][0]['after'],'in_progress')
        store3=mod.StateStore(cfg); self.assertEqual(store3.reconcile_startup(),[])
        history=store3.history()
        self.assertEqual(sum(1 for h in history if h['source']=='startup-reconcile'),1)

    def test_translation_uses_two_separate_agy_runs_and_is_cached_by_text_fingerprint(self):
        self.write_task()
        bin_dir, log=self.make_fake_agy()
        old_path=os.environ.get('PATH',''); os.environ['PATH']=str(bin_dir)+os.pathsep+old_path; os.environ['FAKE_AGY_LOG']=str(log)
        try:
            mod=load_server(); cfg=self.config(agy_path='agy'); store=mod.StateStore(cfg); store.reconcile_startup()
            store.set_global_language('hu')
            store.ensure_required_translations_sync()
            calls=[json.loads(x) for x in log.read_text().splitlines()]
            self.assertEqual(len(calls),2)
            for c in calls:
                self.assertIn('--model',c['args']); self.assertEqual(c['args'][c['args'].index('--model')+1],'gemini-3.8-flash-high')
                self.assertIn('--output-format',c['args']); self.assertIn('--json-schema',c['args'])
            self.assertIn('precision EN → HU translation agent',calls[0]['prompt'])
            self.assertIn('independent translation fidelity validator',calls[1]['prompt'])
            # Restart must reuse the validated translation.
            store2=mod.StateStore(cfg); store2.reconcile_startup(); store2.ensure_required_translations_sync()
            calls2=[json.loads(x) for x in log.read_text().splitlines()]
            self.assertEqual(len(calls2),2)
            state=store2.api_state()
            self.assertEqual(state['tasks'][0]['subject'],'HU: Translate **this** title')
            self.assertEqual(state['tasks'][0]['description'],'HU: Keep `code` and\n\n- bullets')
        finally:
            os.environ['PATH']=old_path
            os.environ.pop('FAKE_AGY_LOG',None)

    def test_restart_with_hu_enabled_retranslates_only_if_text_changed(self):
        task=self.write_task(description='Version A')
        bin_dir, log=self.make_fake_agy(); old_path=os.environ.get('PATH',''); os.environ['PATH']=str(bin_dir)+os.pathsep+old_path; os.environ['FAKE_AGY_LOG']=str(log)
        try:
            mod=load_server(); cfg=self.config(); s=mod.StateStore(cfg); s.reconcile_startup(); s.set_global_language('hu'); s.ensure_required_translations_sync()
            self.assertEqual(len(log.read_text().splitlines()),2)
            data=json.loads(task.read_text()); data['description']='Version B'; task.write_text(json.dumps(data))
            s2=mod.StateStore(cfg); changes=s2.reconcile_startup(); self.assertEqual(len(changes),1); s2.ensure_required_translations_sync()
            self.assertEqual(s2.api_state()['tasks'][0]['description'],'HU: Version B')
        finally:
            os.environ['PATH']=old_path; os.environ.pop('FAKE_AGY_LOG',None)

    def test_task_language_toggle_localizes_that_task_when_global_is_en(self):
        self.write_task()
        bin_dir, log=self.make_fake_agy(); old_path=os.environ.get('PATH',''); os.environ['PATH']=str(bin_dir)+os.pathsep+old_path; os.environ['FAKE_AGY_LOG']=str(log)
        try:
            mod=load_server(); cfg=self.config(); s=mod.StateStore(cfg); s.reconcile_startup()
            uid=f'{self.store}:17'; s.set_task_language(uid,'hu'); s.ensure_required_translations_sync()
            st=s.api_state(); t=st['tasks'][0]
            self.assertEqual(st['globalLanguage'],'en')
            self.assertEqual(t['languagePreference'],'hu')
            self.assertEqual(t['effectiveLanguage'],'hu')
            self.assertTrue(t['subject'].startswith('HU: '))
        finally:
            os.environ['PATH']=old_path; os.environ.pop('FAKE_AGY_LOG',None)

    def test_static_frontend_is_split_and_requests_state_from_server(self):
        html=(PKG/'ui'/'index.html').read_text()
        js=(PKG/'ui'/'app.js').read_text()
        self.assertIn('styles.css',html); self.assertIn('app.js',html)
        self.assertNotIn('<style>',html); self.assertNotIn('<script>',html)
        self.assertIn("fetch('/api/state'",js)
        self.assertIn("/api/language",js)
        self.assertIn('effectiveLanguage',js)
        self.assertIn('state-invalidated',js)
        self.assertNotIn('evt.state',js)

    def test_history_persists_and_exposes_before_after_after_restart(self):
        task=self.write_task(description='Before')
        mod=load_server(); cfg=self.config(); s=mod.StateStore(cfg); s.reconcile_startup()
        data=json.loads(task.read_text()); data['description']='After'; task.write_text(json.dumps(data))
        s.poll_once(source='live')
        s2=mod.StateStore(cfg); s2.reconcile_startup(); hist=s2.history()
        ev=next(h for h in hist if any(c['field']=='description' for c in h['changes']))
        ch=next(c for c in ev['changes'] if c['field']=='description')
        self.assertEqual(ch['before'],'Before'); self.assertEqual(ch['after'],'After')

    def test_status_only_change_does_not_retranslate_and_active_form_stays_source(self):
        task=self.write_task(description='Stable text', status='pending')
        bin_dir, log=self.make_fake_agy(); old_path=os.environ.get('PATH',''); os.environ['PATH']=str(bin_dir)+os.pathsep+old_path; os.environ['FAKE_AGY_LOG']=str(log)
        try:
            mod=load_server(); cfg=self.config(); s=mod.StateStore(cfg); s.reconcile_startup(); s.set_global_language('hu'); s.ensure_required_translations_sync()
            self.assertEqual(len(log.read_text().splitlines()),2)
            data=json.loads(task.read_text()); data['status']='in_progress'; task.write_text(json.dumps(data))
            s.poll_once(source='live'); s.ensure_required_translations_sync()
            self.assertEqual(len(log.read_text().splitlines()),2)
            t=s.api_state()['tasks'][0]
            self.assertEqual(t['activeForm'],'Working')
            self.assertEqual(t['description'],'HU: Stable text')
        finally:
            os.environ['PATH']=old_path; os.environ.pop('FAKE_AGY_LOG',None)

    def test_hu_history_localizes_old_and_new_description_versions_from_cache(self):
        task=self.write_task(description='Before text')
        bin_dir, log=self.make_fake_agy(); old_path=os.environ.get('PATH',''); os.environ['PATH']=str(bin_dir)+os.pathsep+old_path; os.environ['FAKE_AGY_LOG']=str(log)
        try:
            mod=load_server(); cfg=self.config(); s=mod.StateStore(cfg); s.reconcile_startup()
            data=json.loads(task.read_text()); data['description']='After text'; task.write_text(json.dumps(data)); s.poll_once(source='live')
            s.set_global_language('hu'); s.ensure_required_translations_sync()
            ev=next(e for e in s.history() if any(c['field']=='description' for c in e['changes']))
            ch=next(c for c in ev['changes'] if c['field']=='description')
            self.assertEqual(ch['before'],'HU: Before text')
            self.assertEqual(ch['after'],'HU: After text')
            # Two source text versions, each translator + validator.
            self.assertEqual(len(log.read_text().splitlines()),4)
        finally:
            os.environ['PATH']=old_path; os.environ.pop('FAKE_AGY_LOG',None)

    def test_http_api_serves_split_assets_and_localized_state(self):
        import threading
        import urllib.request
        self.write_task(subject='Server title', description='Server description')
        bin_dir, log=self.make_fake_agy(); old_path=os.environ.get('PATH',''); os.environ['PATH']=str(bin_dir)+os.pathsep+old_path; os.environ['FAKE_AGY_LOG']=str(log)
        try:
            mod=load_server(); cfg=self.config(); runtime=mod.DashboardRuntime(cfg)
            server=mod.QuietThreadingHTTPServer(('127.0.0.1',0),mod.make_handler(runtime)); server.daemon_threads=True
            thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start(); base=f'http://127.0.0.1:{server.server_port}'
            try:
                html=urllib.request.urlopen(base+'/',timeout=2).read().decode()
                self.assertIn('/styles.css',html); self.assertIn('/app.js',html)
                req=urllib.request.Request(base+'/api/language',data=json.dumps({'language':'hu'}).encode(),headers={'Content-Type':'application/json'},method='POST')
                state=json.loads(urllib.request.urlopen(req,timeout=2).read())
                self.assertEqual(state['globalLanguage'],'en')
                self.assertTrue(state['globalTranslationPending'])
                deadline=time.time()+5
                state2=None
                while time.time()<deadline:
                    state2=json.loads(urllib.request.urlopen(base+'/api/state',timeout=2).read())
                    if state2['tasks'][0]['subject']=='HU: Server title': break
                    time.sleep(.05)
                self.assertEqual(state2['tasks'][0]['subject'],'HU: Server title')
                self.assertEqual(state2['tasks'][0]['description'],'HU: Server description')
                self.assertEqual(state2['tasks'][0]['activeForm'],'Working')
                self.assertFalse(state2['tasks'][0]['translationPending'])
            finally:
                runtime.close(); server.shutdown(); server.server_close()
        finally:
            os.environ['PATH']=old_path; os.environ.pop('FAKE_AGY_LOG',None)

    def test_deterministic_validator_rejects_markdown_shape_change(self):
        mod=load_server()
        source={'title':'Keep **bold** and `code`','description':'# Head\n\n- item\n- [ ] todo'}
        candidate={'title':'Maradjon bold and `code`','description':'# Fej\n- elem\n- [ ] todo'}
        issues=mod.deterministic_translation_issues(source,candidate)
        self.assertTrue(any('title: Markdown' in x for x in issues))
        self.assertTrue(any('description: Markdown' in x for x in issues))

    def test_live_watcher_retranslates_changed_hu_text_and_emits_localized_notification(self):
        import http.client
        import threading
        task=self.write_task(description='Before live')
        bin_dir, log=self.make_fake_agy(); old_path=os.environ.get('PATH',''); os.environ['PATH']=str(bin_dir)+os.pathsep+old_path; os.environ['FAKE_AGY_LOG']=str(log)
        runtime=None; server=None
        try:
            mod=load_server(); cfg=self.config(); runtime=mod.DashboardRuntime(cfg); runtime.set_global_language('hu')
            server=mod.QuietThreadingHTTPServer(('127.0.0.1',0),mod.make_handler(runtime)); server.daemon_threads=True
            threading.Thread(target=server.serve_forever,daemon=True).start(); threading.Thread(target=runtime.watcher_loop,daemon=True).start()
            received=[]
            def listen():
                conn=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=15); conn.request('GET','/events'); resp=conn.getresponse(); event=None; data=[]
                while not any(e=='notification' for e,_ in received):
                    line=resp.fp.readline().decode().rstrip('\n')
                    if line.startswith('event: '): event=line[7:]
                    elif line.startswith('data: '): data.append(line[6:])
                    elif line=='' and event:
                        received.append((event,json.loads(''.join(data)) if data else {})); event=None; data=[]
                conn.close()
            th=threading.Thread(target=listen,daemon=True); th.start(); time.sleep(.35)
            data=json.loads(task.read_text()); data['description']='After live'; task.write_text(json.dumps(data))
            deadline=time.time()+15
            while time.time()<deadline and not any(e=='notification' for e,_ in received): time.sleep(.1)
            notif=next(payload for event,payload in received if event=='notification')
            change=notif['changes'][0]; field=next(x for x in change['changes'] if x['field']=='description')
            self.assertEqual(field['before'],'HU: Before live'); self.assertEqual(field['after'],'After live')
        finally:
            if runtime: runtime.stop_event.set()
            if server: server.shutdown(); server.server_close()
            os.environ['PATH']=old_path; os.environ.pop('FAKE_AGY_LOG',None)


if __name__=='__main__': unittest.main(verbosity=2)
