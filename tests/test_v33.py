import json
import pathlib
import tempfile
import threading
import time
import unittest
from unittest import mock

import server
from claude_todos.settings import AppSettingsStore

ROOT = pathlib.Path(__file__).resolve().parents[1]


class V33LifecycleTests(unittest.TestCase):
    def test_startup_collapses_duplicate_uid_fingerprint_lifecycles(self):
        with tempfile.TemporaryDirectory() as td:
            session_dir = pathlib.Path(td) / 'session'
            jobs_dir = session_dir / 'translation-jobs'
            jobs_dir.mkdir(parents=True)
            common = {
                'uid': 'sess:29', 'taskId': '29', 'textFingerprint': 'fp29',
                'provider': 'anthropic', 'model': 'local', 'scope': 'retranslation',
                'requestId': None, 'retryOf': None, 'phase': 'canceled',
                'startedAt': None, 'finishedAt': '2026-09-05T15:54:33+02:00',
                'updatedAt': '2026-09-05T15:54:33+02:00', 'attempt': 0,
                'maxAttempts': 2, 'attempts': [], 'issues': [], 'error': 'canceled',
                'run': 1, 'runs': [],
            }
            old = dict(common, id='old29', trigger='tasks-updated', status='canceled', queuedAt='2026-09-05T15:54:33+02:00')
            startup = dict(common, id='startup29', trigger='startup', status='interrupted', queuedAt='2026-09-05T16:19:29+02:00')
            (jobs_dir/'old29.json').write_text(json.dumps(old))
            (jobs_dir/'startup29.json').write_text(json.dumps(startup))
            manager = server.TranslationJobManager(session_dir)
            rows = manager.list()
            self.assertEqual(1, len(rows))
            self.assertEqual('sess:29', rows[0]['uid'])
            self.assertEqual('fp29', rows[0]['textFingerprint'])
            self.assertEqual(2, rows[0]['run'])
            self.assertEqual(1, len(rows[0]['runs']))
            self.assertEqual({'tasks-updated', 'startup'}, {rows[0]['trigger'], rows[0]['runs'][0]['trigger']})

    def test_auto_create_can_restart_stale_success_lifecycle_without_duplicate_row(self):
        with tempfile.TemporaryDirectory() as td:
            manager = server.TranslationJobManager(pathlib.Path(td)/'session')
            handle = manager.create('sess:6', 'fp6', 'm1', 'old-success', provider='agy')
            manager.finish(handle.job_id, 'success')
            reused, created = manager.ensure_lifecycle('sess:6', 'fp6', 'm2', 'startup', provider='agy')
            self.assertFalse(created)
            self.assertEqual(handle.job_id, reused.job_id)
            row = manager.get(handle.job_id)
            self.assertEqual(2, row['run'])
            self.assertEqual('queued', row['status'])
            self.assertEqual('success', row['runs'][0]['status'])

    def test_auto_create_reuses_retryable_terminal_lifecycle_instead_of_new_row(self):
        with tempfile.TemporaryDirectory() as td:
            manager = server.TranslationJobManager(pathlib.Path(td)/'session')
            handle = manager.create('sess:5', 'fp5', 'm1', 'tasks-updated', provider='anthropic')
            manager.finish(handle.job_id, 'canceled', error='old cancel')
            reused, created = manager.ensure_lifecycle('sess:5', 'fp5', 'm2', 'startup', provider='anthropic')
            self.assertFalse(created)
            self.assertEqual(handle.job_id, reused.job_id)
            row = manager.get(handle.job_id)
            self.assertEqual(1, len(manager.list()))
            self.assertEqual(2, row['run'])
            self.assertEqual('startup', row['trigger'])
            self.assertEqual('tasks-updated', row['runs'][0]['trigger'])
            self.assertEqual('queued', row['status'])


class V33RuntimeTests(unittest.TestCase):
    def setUp(self):
        self.agy_patcher = mock.patch("server.session_core.run_agy", return_value=({"title": "HU", "description": "HU"}, {"status": "SUCCESS"}))
        self.agy_patcher.start()
        self.tmp = tempfile.TemporaryDirectory()
        base = pathlib.Path(self.tmp.name)
        self.base = base
        self.task_root = base/'tasks'
        self.store_id = 'sess'
        (self.task_root/self.store_id).mkdir(parents=True)
        self.cfg = server.Config(
            session_id='sess', transcript='', project_cwd=str(base/'project'),
            task_root=self.task_root, candidate_ids=[self.store_id], cache_root=base/'cache',
            ui_dir=ROOT/'client', no_open=True, settings_file=base/'config.json', log_root=base/'logs',
        )
        self.runtime = server.DashboardRuntime(self.cfg)

    def tearDown(self):
        self.runtime.close()
        self.agy_patcher.stop()
        self.tmp.cleanup()

    def write_task(self, task_id):
        path=self.task_root/self.store_id/f'{task_id}.json'
        path.write_text(json.dumps({'id':str(task_id),'subject':f'Task {task_id}','description':'Desc','status':'pending','blockedBy':[],'blocks':[]}))
        self.runtime.store.poll_once('live')
        return f'{self.store_id}:{task_id}'

    def make_job(self, task_id, status):
        uid=self.write_task(task_id)
        rec=self.runtime.store.records[uid]
        tfp=rec['current']['textFingerprint']
        h=self.runtime.store.job_manager.create(uid,tfp,'model','test',provider='anthropic')
        if status!='queued': self.runtime.store.job_manager.finish(h.job_id,status,error=None if status=='success' else status)
        return h.job_id

    def test_bulk_retry_skips_success_and_active_and_returns_summary(self):
        success=self.make_job(1,'success')
        canceled=self.make_job(2,'canceled')
        error=self.make_job(3,'error')
        queued=self.make_job(4,'queued')
        # Keep retry workers from finishing during summary assertions.
        gate=threading.Event()
        self.runtime.store.translation_executor=lambda *args,**kwargs: (gate.wait(1) or {'title':'HU','description':'HU','validated':True,'translationPromptVersion':1,'validationPromptVersion':1,'translatedAt':server.now_iso(),'attempts':1})
        summary=self.runtime.bulk_translation_action('retry',[success,canceled,error,queued])
        self.assertEqual(4,summary['selected'])
        self.assertEqual(2,summary['retryStarted'])
        self.assertEqual(1,summary['skippedSuccess'])
        self.assertEqual(1,summary['skippedActive'])
        self.assertEqual(4,len(self.runtime.translation_jobs()))
        gate.set()

    def test_stop_all_and_bulk_delete(self):
        q1=self.make_job(10,'queued')
        q2=self.make_job(11,'queued')
        stopped=self.runtime.bulk_translation_action('stop_all',[])
        self.assertEqual(2,stopped['stopped'])
        self.assertEqual('canceled',self.runtime.store.job_manager.get(q1)['status'])
        self.assertEqual('canceled',self.runtime.store.job_manager.get(q2)['status'])
        deleted=self.runtime.bulk_translation_action('delete',[q1,q2])
        self.assertEqual(2,deleted['deleted'])
        self.assertEqual([],self.runtime.translation_jobs())

    def test_retry_all_failed_only_retries_retryable_terminal_jobs(self):
        self.make_job(20,'success')
        c=self.make_job(21,'canceled')
        e=self.make_job(22,'error')
        summary=self.runtime.bulk_translation_action('retry_all_failed',[])
        self.assertEqual(2,summary['retryStarted'])
        self.assertEqual(1,summary['skippedSuccess'])
        self.assertEqual(3,len(self.runtime.translation_jobs()))
        self.assertIn(self.runtime.store.job_manager.get(c)['status'], {'queued','translating','validating','success'})
        self.assertIn(self.runtime.store.job_manager.get(e)['status'], {'queued','translating','validating','success'})


    def test_runtime_startup_reuses_existing_failed_lifecycle_row(self):
        self.runtime.store.set_global_language('hu')
        uid=self.write_task(99)
        rec=self.runtime.store.records[uid]; tfp=rec['current']['textFingerprint']
        handle=self.runtime.store.job_manager.create(uid,tfp,'old-model','tasks-updated',provider='agy')
        self.runtime.store.job_manager.finish(handle.job_id,'canceled',error='old cancel')
        job_id=handle.job_id
        # Re-open the same persisted cache as a fresh runtime. Startup reconciliation must
        # restart the existing lifecycle instead of creating a second row.
        self.runtime.close()
        self.runtime=server.DashboardRuntime(self.cfg)
        deadline=time.time()+4
        while time.time()<deadline:
            rows=[j for j in self.runtime.translation_jobs() if j.get('uid')==uid and j.get('textFingerprint')==tfp]
            if rows and rows[0].get('run',1)>=2:
                break
            time.sleep(.05)
        rows=[j for j in self.runtime.translation_jobs() if j.get('uid')==uid and j.get('textFingerprint')==tfp]
        self.assertEqual(1,len(rows))
        self.assertEqual(job_id,rows[0]['id'])
        self.assertGreaterEqual(rows[0].get('run',1),2)

    def test_provider_concurrency_limit_one_serializes_task_lifecycles(self):
        self.runtime.update_settings({'translation':{'provider':'anthropic','anthropic':{'baseUrl':'http://127.0.0.1:8000','model':'local','maxConcurrency':1}}})
        active=0; max_seen=0; lock=threading.Lock()
        def fake(source,handle,task_ref,provider,model):
            nonlocal active,max_seen
            with lock:
                active+=1; max_seen=max(max_seen,active)
            time.sleep(.12)
            with lock: active-=1
            return {'title':'HU','description':'HU','validated':True,'translationPromptVersion':1,'validationPromptVersion':1,'translatedAt':server.now_iso(),'attempts':1}
        self.runtime.store.translation_executor=fake
        prepared=[]
        for n in range(30,34):
            uid=self.write_task(n); rec=self.runtime.store.records[uid]; tfp=rec['current']['textFingerprint']
            handle=self.runtime.store.job_manager.create(uid,tfp,'local','bulk',provider='anthropic')
            prepared.append(((uid,tfp,{'title':f'T{n}','description':'D'}),handle))
        self.runtime.store._run_prepared_translation_jobs(prepared)
        self.assertEqual(1,max_seen)


class V33SettingsTests(unittest.TestCase):
    def test_provider_concurrency_defaults_and_persistence(self):
        with tempfile.TemporaryDirectory() as td:
            path=pathlib.Path(td)/'config.json'
            store=AppSettingsStore(path)
            cfg=store.load()
            self.assertEqual(2,cfg['translation']['agy']['maxConcurrency'])
            self.assertEqual(2,cfg['translation']['anthropic']['maxConcurrency'])
            cfg=store.save({'translation':{'anthropic':{'maxConcurrency':1}}})
            self.assertEqual(1,cfg['translation']['anthropic']['maxConcurrency'])

class V33HttpTests(unittest.TestCase):
    def test_bulk_endpoint_stops_active_jobs(self):
        import http.client
        with tempfile.TemporaryDirectory() as td:
            base=pathlib.Path(td); task_root=base/'tasks'; (task_root/'sess').mkdir(parents=True)
            cfg=server.Config(session_id='sess',transcript='',project_cwd=str(base/'project'),task_root=task_root,candidate_ids=['sess'],cache_root=base/'cache',ui_dir=ROOT/'client',no_open=True,settings_file=base/'config.json',log_root=base/'logs')
            runtime=server.DashboardRuntime(cfg)
            httpd=server.QuietThreadingHTTPServer(('127.0.0.1',0),server.make_handler(runtime))
            thread=threading.Thread(target=httpd.serve_forever,daemon=True);thread.start()
            try:
                handle=runtime.store.job_manager.create('sess:1','fp','model','test',provider='agy')
                conn=http.client.HTTPConnection('127.0.0.1',httpd.server_port,timeout=5)
                body=json.dumps({'action':'stop_all','jobIds':[]})
                conn.request('POST','/api/translations/bulk',body=body,headers={'Content-Type':'application/json'})
                response=conn.getresponse(); payload=json.loads(response.read())
                self.assertEqual(202,response.status)
                self.assertEqual(1,payload['summary']['stopped'])
                self.assertEqual('canceled',runtime.store.job_manager.get(handle.job_id)['status'])
                conn.close()
            finally:
                httpd.shutdown();httpd.server_close();runtime.close()

    def test_settings_api_exposes_concurrency_limits(self):
        with tempfile.TemporaryDirectory() as td:
            base=pathlib.Path(td); task_root=base/'tasks'; task_root.mkdir()
            cfg=server.Config(session_id='sess',transcript='',project_cwd=str(base/'project'),task_root=task_root,candidate_ids=[],cache_root=base/'cache',ui_dir=ROOT/'client',no_open=True,settings_file=base/'config.json',log_root=base/'logs')
            runtime=server.DashboardRuntime(cfg)
            try:
                state=runtime.settings_state()
                self.assertEqual(2,state['translation']['agy']['maxConcurrency'])
                self.assertEqual(2,state['translation']['anthropic']['maxConcurrency'])
            finally: runtime.close()


if __name__ == '__main__':
    unittest.main()
