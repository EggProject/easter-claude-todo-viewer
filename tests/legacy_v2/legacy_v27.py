import importlib.util
import json
import os
import pathlib
import sys
import tempfile
import threading
import time
import unittest

PKG = pathlib.Path(__file__).resolve().parents[1]
SERVER = PKG / 'server.py'


def load_server():
    name = f'claude_todos_server_v27_{time.time_ns()}'
    spec = importlib.util.spec_from_file_location(name, SERVER)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


class V27Tests(unittest.TestCase):
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
            task_root=self.claude / 'tasks', candidate_ids=[self.store],
            initial_status='all', initial_sort='dependency', version='2.7.0',
            cache_root=self.cache_root, ui_dir=PKG / 'ui', agy_bin=agy_path,
            no_open=True, port=0, log_file=False, log_output=False, log_root=self.log_root,
            settings_file=self.settings_file,
        )

    def make_agy(self, delay=0.01, validator_valid=True, log_path=None):
        bin_dir = self.root / f'bin-{time.time_ns()}'
        bin_dir.mkdir()
        script = bin_dir / 'agy'
        script.write_text(r'''#!/usr/bin/env python3
import json, os, sys, time
args=sys.argv[1:]
prompt=args[args.index('-p')+1]
model=args[args.index('--model')+1]
log=os.environ.get('FAKE_AGY_CALLS')
if log:
    with open(log,'a',encoding='utf-8') as fh: fh.write(json.dumps({'phase':'validator' if 'independent translation fidelity validator' in prompt else 'translator','model':model})+'\n')
print(json.dumps({'event':'init','conversation_id':'conv-x','init':{'model':model,'permission_mode':'request-review'}}),flush=True)
time.sleep(%r)
if 'independent translation fidelity validator' in prompt:
    out={'valid': %r, 'issues': [] if %r else ['synthetic semantic mismatch']}
else:
    src=json.loads(prompt.split('Source JSON:\n',1)[1])
    out={'title':'HU: '+src['title'],'description':'HU: '+src['description']}
print(json.dumps({'event':'result','result':{'conversation_id':'conv-x','status':'SUCCESS','structured_output':out,'duration_seconds':%r,'usage':{'input_tokens':10,'output_tokens':5,'thinking_tokens':2,'cache_read_tokens':0,'total_tokens':15}}}),flush=True)
''' % (delay, validator_valid, validator_valid, delay), encoding='utf-8')
        script.chmod(0o755)
        return script

    def wait_until(self, fn, timeout=6):
        deadline=time.monotonic()+timeout
        while time.monotonic()<deadline:
            value=fn()
            if value: return value
            time.sleep(.03)
        return None

    def test_task_change_notification_is_published_before_slow_retranslation_finishes(self):
        task = self.write_task(description='Before')
        mod = load_server()
        fast = self.make_agy(delay=.01)
        runtime = mod.DashboardRuntime(self.config(mod, str(fast)))
        try:
            runtime.set_global_language('hu')
            slow = self.make_agy(delay=1.2)
            runtime.store.config.agy_bin = str(slow)
            threading.Thread(target=runtime.watcher_loop, daemon=True).start()
            time.sleep(.35)
            data=json.loads(task.read_text()); data['description']='After'; task.write_text(json.dumps(data))
            started=time.monotonic()
            notif=self.wait_until(lambda: next((x for x in runtime.hub.history if x['event']=='notification'),None), timeout=1.4)
            self.assertIsNotNone(notif, 'notification must not wait for translation')
            self.assertLess(time.monotonic()-started, 1.4)
        finally:
            runtime.close()

    def test_bell_has_no_badge(self):
        html=(PKG/'ui'/'index.html').read_text(encoding='utf-8')
        js=(PKG/'ui'/'app.js').read_text(encoding='utf-8')
        self.assertNotIn('id="badge"', html)
        self.assertNotIn("$('#badge')", js)

    def test_translation_pipeline_uses_at_most_two_attempts(self):
        self.write_task()
        mod=load_server()
        calls=self.root/'calls.jsonl'; os.environ['FAKE_AGY_CALLS']=str(calls)
        agy=self.make_agy(delay=.01, validator_valid=False)
        try:
            with self.assertRaises(Exception):
                mod.translate_and_validate(str(agy), {'title':'A','description':'B'}, model='gemini-3.8-flash-high')
            rows=[json.loads(x) for x in calls.read_text().splitlines()]
            self.assertEqual(len(rows),4, '2 attempts = translator+validator twice')
        finally:
            os.environ.pop('FAKE_AGY_CALLS',None)

    def test_settings_file_persists_selected_translation_model(self):
        self.write_task()
        mod=load_server(); agy=self.make_agy()
        runtime=mod.DashboardRuntime(self.config(mod,str(agy)))
        try:
            settings=runtime.update_settings({'translationModel':'gemini-3.8-flash-medium'})
            self.assertEqual(settings['translationModel'],'gemini-3.8-flash-medium')
            raw=json.loads(self.settings_file.read_text())
            self.assertEqual(raw['translation']['model'],'gemini-3.8-flash-medium')
            self.assertEqual(runtime.api_state()['translationModel'],'gemini-3.8-flash-medium')
        finally:
            runtime.close()

    def test_translation_jobs_are_persisted_and_exposed(self):
        self.write_task()
        mod=load_server(); agy=self.make_agy(delay=.03)
        runtime=mod.DashboardRuntime(self.config(mod,str(agy)))
        uid=f'{self.store}:18'
        try:
            runtime.request_task_language(uid,'hu')
            done=self.wait_until(lambda: [j for j in runtime.translation_jobs() if j.get('status')=='success'])
            self.assertTrue(done)
            job=done[-1]
            self.assertEqual(job['taskId'],'18')
            self.assertEqual(job['model'],'gemini-3.8-flash-high')
            self.assertTrue((runtime.store.session_dir/'translation-jobs'/f"{job['id']}.json").exists())
        finally:
            runtime.close()

    def test_running_translation_job_can_be_canceled_and_preference_stays_en(self):
        self.write_task()
        mod=load_server(); agy=self.make_agy(delay=2.0)
        runtime=mod.DashboardRuntime(self.config(mod,str(agy)))
        uid=f'{self.store}:18'
        try:
            runtime.request_task_language(uid,'hu')
            job=self.wait_until(lambda: next((j for j in runtime.translation_jobs() if j.get('status') in ('translating','validating')),None),timeout=3)
            self.assertIsNotNone(job)
            runtime.cancel_translation_job(job['id'])
            canceled=self.wait_until(lambda: next((j for j in runtime.translation_jobs() if j['id']==job['id'] and j.get('status') in ('canceled','interrupted')),None),timeout=3)
            self.assertIsNotNone(canceled)
            task=next(t for t in runtime.api_state()['tasks'] if t['uid']==uid)
            self.assertEqual(task['languagePreference'],'en')
        finally:
            runtime.close()

    def test_validation_rejection_is_distinct_job_status(self):
        self.write_task()
        mod=load_server(); agy=self.make_agy(delay=.01,validator_valid=False)
        runtime=mod.DashboardRuntime(self.config(mod,str(agy)))
        uid=f'{self.store}:18'
        try:
            runtime.request_task_language(uid,'hu')
            job=self.wait_until(lambda: next((j for j in runtime.translation_jobs() if j.get('status')=='validation_failed'),None),timeout=8)
            self.assertIsNotNone(job)
            self.assertIn('synthetic semantic mismatch', json.dumps(job))
        finally:
            runtime.close()

    def test_frontend_has_translations_and_settings_views_with_filter_sort_and_cancel(self):
        html=(PKG/'ui'/'index.html').read_text(encoding='utf-8')
        js=(PKG/'ui'/'app.js').read_text(encoding='utf-8')
        self.assertIn('data-view="translations"',html)
        self.assertIn('data-view="settings"',html)
        self.assertIn('/api/translations',js)
        self.assertIn('/api/settings',js)
        self.assertIn('translationTableSort',js)
        self.assertIn('translationFilter',js)
        self.assertIn('cancelTranslation',js)


if __name__=='__main__':
    unittest.main(verbosity=2)
