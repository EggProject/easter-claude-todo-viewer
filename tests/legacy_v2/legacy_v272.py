import importlib.util
import json
import pathlib
import sys
import tempfile
import time
import unittest

PKG = pathlib.Path(__file__).resolve().parents[1]
SERVER = PKG / 'server.py'


def load_server():
    name = f'claude_todos_server_v272_{time.time_ns()}'
    spec = importlib.util.spec_from_file_location(name, SERVER)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


class V272Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)
        self.home = self.root / 'home'
        self.claude = self.home / '.claude'
        self.cache_root = self.home / '.claude-todos' / 'cache'
        self.log_root = self.home / '.claude-todos' / 'logs'
        self.settings_file = self.home / '.claude-todos' / 'config.json'
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

    def write_task(self, task_id='18', subject='Build helper', description='Keep `mise exec --` and `/apps/plan/file.ts` unchanged.'):
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
            session_id=self.session, transcript=str(self.transcript), project_cwd=str(self.project),
            task_root=self.claude / 'tasks', candidate_ids=[self.store], initial_status='all',
            initial_sort='dependency', version='2.7.2', cache_root=self.cache_root,
            ui_dir=PKG / 'ui', agy_bin=agy_path, no_open=True, port=0,
            log_file=False, log_output=False, log_root=self.log_root, settings_file=self.settings_file,
        )

    def make_literal_aware_agy(self):
        bin_dir = self.root / f'bin-{time.time_ns()}'
        bin_dir.mkdir()
        calls = self.root / f'calls-{time.time_ns()}.jsonl'
        script = bin_dir / 'agy'
        script.write_text(r'''#!/usr/bin/env python3
import json, pathlib, sys
args=sys.argv[1:]
prompt=args[args.index('-p')+1]
agent=args[args.index('--agent')+1] if '--agent' in args else 'none'
with open(%r,'a',encoding='utf-8') as fh: fh.write(json.dumps({'agent':agent,'prompt':prompt})+'\n')
print(json.dumps({'event':'init','conversation_id':'conv','init':{'model':'gemini-3.8-flash-low','agent':agent}}), flush=True)
if 'validator' in agent:
    out={'valid': True, 'issues': []}
else:
    src=json.loads(prompt.split('Source JSON:\n',1)[1])
    # Simulate a translator that would normally mutate technical literals if it saw them.
    title='Magyar: '+src['title']
    desc='Magyar: '+src['description']
    if '`mise exec --`' in desc:
        desc=desc.replace('`mise exec --`','`mise exec`')
    if '/apps/plan/file.ts' in desc:
        desc=desc.replace('/apps/plan/file.ts','/apps/plan/fajl.ts')
    out={'title': title, 'description': desc}
print(json.dumps({'event':'result','result':{'conversation_id':'conv','status':'SUCCESS','structured_output':out,'usage':{'total_tokens':10}}}), flush=True)
''' % str(calls), encoding='utf-8')
        script.chmod(0o755)
        return script, calls

    def make_valid_agy(self):
        bin_dir = self.root / f'bin-valid-{time.time_ns()}'
        bin_dir.mkdir()
        script = bin_dir / 'agy'
        script.write_text(r'''#!/usr/bin/env python3
import json, sys
args=sys.argv[1:]
prompt=args[args.index('-p')+1]
agent=args[args.index('--agent')+1] if '--agent' in args else 'none'
print(json.dumps({'event':'init','conversation_id':'conv','init':{'model':'gemini-3.8-flash-high','agent':agent}}), flush=True)
if 'validator' in agent:
    out={'valid': True, 'issues': []}
else:
    src=json.loads(prompt.split('Source JSON:\n',1)[1])
    out={'title':'Magyar: '+src['title'],'description':'Magyar: '+src['description']}
print(json.dumps({'event':'result','result':{'conversation_id':'conv','status':'SUCCESS','structured_output':out,'usage':{'total_tokens':10}}}), flush=True)
''', encoding='utf-8')
        script.chmod(0o755)
        return script

    def wait_until(self, fn, timeout=5):
        end=time.monotonic()+timeout
        while time.monotonic()<end:
            value=fn()
            if value:
                return value
            time.sleep(.03)
        return None

    def test_translation_masks_protected_literals_before_agy_and_restores_them(self):
        mod=load_server(); agy,calls=self.make_literal_aware_agy()
        source={
            'title':'K8: build helper',
            'description':'Keep `mise exec --` and `/apps/plan/file.ts` unchanged.'
        }
        result=mod.translate_and_validate(str(agy), source, model='gemini-3.8-flash-low')
        self.assertTrue(result['validated'])
        self.assertIn('`mise exec --`', result['description'])
        self.assertIn('/apps/plan/file.ts', result['description'])
        rows=[json.loads(x) for x in calls.read_text().splitlines()]
        translator=rows[0]['prompt']
        self.assertNotIn('`mise exec --`', translator)
        self.assertNotIn('/apps/plan/file.ts', translator)
        self.assertNotIn('K8', translator)
        self.assertIn('__CLAUDE_TODOS_LITERAL_', translator)

    def test_retry_reuses_same_job_row_and_archives_previous_run(self):
        self.write_task()
        mod=load_server(); agy=self.make_valid_agy()
        runtime=mod.DashboardRuntime(self.config(mod,str(agy)))
        uid=f'{self.store}:18'
        try:
            rec=runtime.store.records[uid]
            tfp=rec['current']['textFingerprint']
            handle=runtime.store.job_manager.create(uid,tfp,'gemini-3.8-flash-low','task-hu',scope='task')
            runtime.store.job_manager.finish(handle.job_id,'validation_failed',error='bad candidate',issues=['bad candidate'])
            runtime.store._set_translation_failure(uid,tfp,'bad candidate')
            retried=runtime.retry_translation_job(handle.job_id)
            self.assertEqual(retried['id'], handle.job_id)
            self.assertEqual(len(runtime.translation_jobs()), 1)
            self.assertEqual(retried.get('run'), 2)
            self.assertEqual(retried.get('runs',[{}])[0].get('status'), 'validation_failed')
            success=self.wait_until(lambda: next((j for j in runtime.translation_jobs() if j['id']==handle.job_id and j['status']=='success'),None))
            self.assertIsNotNone(success)
            self.assertEqual(len(runtime.translation_jobs()), 1)
        finally:
            runtime.close()

    def test_delete_job_removes_job_file_runtime_failure_and_owned_translation_cache(self):
        self.write_task()
        mod=load_server(); runtime=mod.DashboardRuntime(self.config(mod,self.make_valid_agy()))
        uid=f'{self.store}:18'
        try:
            rec=runtime.store.records[uid]
            tfp=rec['current']['textFingerprint']
            handle=runtime.store.job_manager.create(uid,tfp,'gemini-3.8-flash-low','task-hu',scope='task')
            job_id=handle.job_id
            runtime.store.job_manager.finish(job_id,'success')
            rec.setdefault('translations',{}).setdefault('hu',{})[tfp]={
                'title':'Magyar cím','description':'Magyar leírás','validated':True,
                'translationPromptVersion':mod.TRANSLATION_PROMPT_VERSION,
                'validationPromptVersion':mod.VALIDATION_PROMPT_VERSION,
                'jobId':job_id,
            }
            runtime.store._set_translation_failure(uid,tfp,'old failure')
            runtime.store._save_record(rec)
            path=runtime.store.job_manager._path(job_id)
            self.assertTrue(path.exists())
            deleted=runtime.delete_translation_job(job_id)
            self.assertEqual(deleted['id'],job_id)
            self.assertFalse(path.exists())
            self.assertIsNone(runtime.store.job_manager.get(job_id))
            self.assertNotIn(tfp, runtime.store.records[uid]['translations']['hu'])
            self.assertIsNone(runtime.store._translation_error_for(uid,tfp))
        finally:
            runtime.close()

    def test_frontend_has_delete_action_and_retry_does_not_replace_open_row_id(self):
        js=(PKG/'ui'/'app.js').read_text(encoding='utf-8')
        self.assertIn('data-delete-job', js)
        self.assertIn('deleteTranslation', js)
        self.assertNotIn("openJobId=d.job?.id||openJobId", js)

    def test_legacy_retry_chain_is_collapsed_to_original_row_on_load(self):
        mod=load_server()
        session_dir=self.cache_root/'projects'/'p'/'sessions'/self.session
        jobs_dir=session_dir/'translation-jobs'; jobs_dir.mkdir(parents=True)
        root_id='rootjob'; retry_id='retryjob'; retry2_id='retryjob2'
        base={
            'uid':f'{self.store}:18','taskId':'18','textFingerprint':'abc','model':'gemini-3.8-flash-low',
            'scope':'task','requestId':None,'maxAttempts':2,'attempt':2,'attempts':[],
            'queuedAt':'2026-09-04T20:00:00+00:00','startedAt':'2026-09-04T20:00:01+00:00',
            'finishedAt':'2026-09-04T20:00:10+00:00','updatedAt':'2026-09-04T20:00:10+00:00','issues':[],
        }
        root=dict(base,id=root_id,trigger='task-hu',retryOf=None,status='validation_failed',phase='validation_failed',error='first')
        retry=dict(base,id=retry_id,trigger='manual-retry',retryOf=root_id,status='validation_failed',phase='validation_failed',error='second',queuedAt='2026-09-04T20:01:00+00:00',finishedAt='2026-09-04T20:01:10+00:00')
        retry2=dict(base,id=retry2_id,trigger='manual-retry',retryOf=retry_id,status='validation_failed',phase='validation_failed',error='third',queuedAt='2026-09-04T20:02:00+00:00',finishedAt='2026-09-04T20:02:10+00:00')
        (jobs_dir/f'{root_id}.json').write_text(json.dumps(root))
        (jobs_dir/f'{retry_id}.json').write_text(json.dumps(retry))
        (jobs_dir/f'{retry2_id}.json').write_text(json.dumps(retry2))
        mgr=mod.TranslationJobManager(session_dir)
        rows=mgr.list()
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]['id'],root_id)
        self.assertEqual(rows[0]['status'],'validation_failed')
        self.assertEqual(rows[0].get('run'),3)
        self.assertEqual(len(rows[0].get('runs',[])),2)
        self.assertFalse((jobs_dir/f'{retry_id}.json').exists())
        self.assertFalse((jobs_dir/f'{retry2_id}.json').exists())

    def test_retry_same_row_updates_to_current_task_text_fingerprint(self):
        path=self.write_task(description='Old `mise exec --` text.')
        mod=load_server(); agy=self.make_valid_agy()
        runtime=mod.DashboardRuntime(self.config(mod,str(agy)))
        uid=f'{self.store}:18'
        try:
            old_tfp=runtime.store.records[uid]['current']['textFingerprint']
            handle=runtime.store.job_manager.create(uid,old_tfp,'gemini-3.8-flash-low','task-hu',scope='task')
            runtime.store.job_manager.finish(handle.job_id,'validation_failed',error='bad')
            data=json.loads(path.read_text()); data['description']='New `mise exec --` text.'; path.write_text(json.dumps(data))
            runtime.store.poll_once(source='live')
            new_tfp=runtime.store.records[uid]['current']['textFingerprint']
            self.assertNotEqual(old_tfp,new_tfp)
            retried=runtime.retry_translation_job(handle.job_id)
            self.assertEqual(retried['id'],handle.job_id)
            self.assertEqual(retried['textFingerprint'],new_tfp)
            self.assertEqual(retried['runs'][0]['textFingerprint'],old_tfp)
        finally:
            runtime.close()

    def test_http_delete_translation_job_endpoint_removes_row(self):
        import http.client, threading
        self.write_task()
        mod=load_server(); runtime=mod.DashboardRuntime(self.config(mod,self.make_valid_agy()))
        uid=f'{self.store}:18'
        server=mod.QuietThreadingHTTPServer(('127.0.0.1',0),mod.make_handler(runtime)); server.daemon_threads=True
        threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            tfp=runtime.store.records[uid]['current']['textFingerprint']
            handle=runtime.store.job_manager.create(uid,tfp,'gemini-3.8-flash-low','task-hu',scope='task')
            runtime.store.job_manager.finish(handle.job_id,'validation_failed',error='bad')
            conn=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=5)
            conn.request('DELETE',f'/api/translations/{handle.job_id}')
            resp=conn.getresponse(); body=json.loads(resp.read())
            self.assertEqual(resp.status,200)
            self.assertEqual(body['job']['id'],handle.job_id)
            self.assertIsNone(runtime.store.job_manager.get(handle.job_id))
            conn.close()
        finally:
            server.shutdown(); server.server_close(); runtime.close()


if __name__=='__main__':
    unittest.main(verbosity=2)
