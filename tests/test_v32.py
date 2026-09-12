import json
import pathlib
import tempfile
import threading
import time
import unittest

import server

ROOT = pathlib.Path(__file__).resolve().parents[1]

class V32BackendTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = pathlib.Path(self.tmp.name)
        self.base = base
        self.task_root = base / 'tasks'
        self.store_id = 'sess'
        (self.task_root / self.store_id).mkdir(parents=True)
        self.cfg = server.Config(
            session_id='sess', transcript='', project_cwd=str(base / 'project'),
            task_root=self.task_root, candidate_ids=[self.store_id], cache_root=base / 'cache',
            ui_dir=ROOT / 'client', no_open=True, settings_file=base / 'config.json', log_root=base / 'logs',
        )
        self.runtime = server.DashboardRuntime(self.cfg)

    def tearDown(self):
        self.runtime.close()
        self.tmp.cleanup()

    def write_task(self, task_id='1', status='pending', subject=None, description='Desc'):
        path = self.task_root / self.store_id / f'{task_id}.json'
        path.write_text(json.dumps({
            'id': task_id, 'subject': subject or f'Task {task_id}', 'description': description,
            'status': status, 'blockedBy': [], 'blocks': [],
        }))
        return path

    def test_deleted_task_remains_in_public_state_with_last_known_status(self):
        path = self.write_task(status='completed')
        self.runtime.store.poll_once('live')
        path.unlink()
        self.runtime.store.poll_once('live')
        task = next(t for t in self.runtime.api_state()['tasks'] if t['uid'] == 'sess:1')
        self.assertEqual('deleted', task['status'])
        self.assertEqual('completed', task['lastKnownStatus'])
        self.assertFalse(task['present'])
        self.assertTrue(task['deletedAt'])

    def test_global_hu_event_prepares_translation_job_before_task_can_disappear(self):
        self.runtime.store.set_global_language('hu')
        path = self.write_task(task_id='9', subject='Fresh task', description='Fresh desc')
        events = self.runtime.store.poll_once('live')
        prepared = self.runtime.store.prepare_event_translations(events, trigger='tasks-updated')
        self.assertEqual(1, len(prepared))
        job, handle = prepared[0]
        state = self.runtime.store.job_manager.get(handle.job_id)
        self.assertEqual('queued', state['status'])
        self.assertEqual('tasks-updated', state['trigger'])
        self.assertEqual('sess:9', state['uid'])
        path.unlink()
        self.runtime.store.poll_once('live')
        self.assertIsNotNone(self.runtime.store.job_manager.get(handle.job_id))
        self.assertEqual('deleted', next(t for t in self.runtime.api_state()['tasks'] if t['uid'] == 'sess:9')['status'])


    def test_live_global_hu_create_then_delete_keeps_translation_job_and_snapshot(self):
        gate = threading.Event()
        def fake_translate(source, handle, task_ref, provider, model):
            gate.wait(3)
            return {
                "title": "HU: " + source["title"],
                "description": "HU: " + source["description"],
                "model": model,
                "translationPromptVersion": server.TRANSLATION_PROMPT_VERSION,
                "validationPromptVersion": server.VALIDATION_PROMPT_VERSION,
                "validated": True,
                "translatedAt": server.now_iso(),
                "attempts": 1,
            }
        self.runtime.store.translation_executor = fake_translate
        watcher = threading.Thread(target=self.runtime.watcher_loop, daemon=True)
        watcher.start()
        self.runtime.store.set_global_language('hu')
        path = self.write_task(task_id='12', subject='Ephemeral task', description='Translate me')
        deadline = time.time() + 5
        job = None
        while time.time() < deadline:
            job = next((j for j in self.runtime.translation_jobs() if j.get('uid') == 'sess:12'), None)
            if job:
                break
            time.sleep(0.05)
        self.assertIsNotNone(job, 'watcher should create a translation row immediately')
        path.unlink()
        deadline = time.time() + 4
        while time.time() < deadline:
            task = next((t for t in self.runtime.api_state()['tasks'] if t['uid'] == 'sess:12'), None)
            if task and task['status'] == 'deleted':
                break
            time.sleep(0.05)
        self.assertIsNotNone(task)
        self.assertEqual('deleted', task['status'])
        gate.set()
        deadline = time.time() + 5
        while time.time() < deadline:
            job = next((j for j in self.runtime.translation_jobs() if j.get('uid') == 'sess:12'), None)
            if job and job.get('status') == 'success':
                break
            time.sleep(0.05)
        self.assertEqual('success', job.get('status'))
        task = next(t for t in self.runtime.api_state()['tasks'] if t['uid'] == 'sess:12')
        self.assertEqual('hu', task['effectiveLanguage'])
        self.assertTrue(task['subject'].startswith('HU:'))

    def test_event_translation_preparation_deduplicates_active_uid_fingerprint(self):
        self.runtime.store.set_global_language('hu')
        self.write_task(task_id='7', subject='Fresh task', description='Fresh desc')
        events = self.runtime.store.poll_once('live')
        first = self.runtime.store.prepare_event_translations(events, trigger='tasks-updated')
        second = self.runtime.store.prepare_event_translations(events, trigger='tasks-updated')
        self.assertEqual(1, len(first))
        self.assertEqual([], second)


if __name__ == '__main__':
    unittest.main()
