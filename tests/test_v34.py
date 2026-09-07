import copy
import json
import pathlib
import tempfile
import threading
import urllib.request
import time
import unittest
from unittest import mock

import server

ROOT = pathlib.Path(__file__).resolve().parents[1]


class V34RuntimeCase(unittest.TestCase):
    def setUp(self):
        self.agy_patcher = mock.patch("server.session_core.run_agy", return_value=({"title": "HU title", "description": "HU desc"}, {"status": "SUCCESS"}))
        self.agy_patcher.start()
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
            version='3.4.0',
        )
        self.runtime = server.DashboardRuntime(self.cfg)

    def tearDown(self):
        self.runtime.close()
        self.agy_patcher.stop()
        self.tmp.cleanup()

    def write_task(self, task_id='1', subject=None, description='Desc', status='pending'):
        path = self.task_root / self.store_id / f'{task_id}.json'
        path.write_text(json.dumps({
            'id': str(task_id), 'subject': subject or f'Task {task_id}', 'description': description,
            'status': status, 'blockedBy': [], 'blocks': [], 'metadata': {},
        }))
        events = self.runtime.store.poll_once('live')
        return path, f'{self.store_id}:{task_id}', events

    @staticmethod
    def valid_translation(title='HU title', description='HU desc', job_id='cached'):
        return {
            'title': title, 'description': description, 'validated': True,
            'translationPromptVersion': server.TRANSLATION_PROMPT_VERSION,
            'validationPromptVersion': server.VALIDATION_PROMPT_VERSION,
            'translatedAt': server.now_iso(), 'attempts': 1, 'jobId': job_id, 'run': 1,
        }


class V34LanguageTests(V34RuntimeCase):
    def test_new_task_uses_global_language_as_view_language(self):
        self.runtime.store.set_global_language('hu')
        _path, uid, _events = self.write_task('1')
        task = next(t for t in self.runtime.api_state()['tasks'] if t['uid'] == uid)
        self.assertEqual('hu', task['viewLanguage'])
        self.assertEqual('hu', task['desiredLanguage'])
        self.assertEqual('en', task['effectiveLanguage'])
        self.assertIn(task['translationState'], {'missing', 'queued'})

    def test_global_language_bulk_sets_every_existing_task_view_language(self):
        self.write_task('1')
        self.write_task('2')
        self.runtime._schedule_language_request = lambda *a, **k: None
        state = self.runtime.request_global_language('hu')
        self.assertEqual('hu', state['globalLanguage'])
        self.assertEqual({'hu'}, {t['viewLanguage'] for t in state['tasks']})
        state = self.runtime.request_global_language('en')
        self.assertEqual({'en'}, {t['viewLanguage'] for t in state['tasks']})

    def test_task_en_overrides_global_hu_everywhere_in_api_state(self):
        _path, uid, _events = self.write_task('3', subject='English title', description='English description')
        rec = self.runtime.store.records[uid]
        tfp = rec['current']['textFingerprint']
        rec.setdefault('translations', {}).setdefault('hu', {})[tfp] = self.valid_translation('Magyar cím', 'Magyar leírás')
        self.runtime.store._save_record(rec)
        self.runtime.store.set_global_language('hu')
        self.runtime.store.set_task_language(uid, 'en')
        task = next(t for t in self.runtime.api_state()['tasks'] if t['uid'] == uid)
        self.assertEqual('en', task['viewLanguage'])
        self.assertEqual('en', task['effectiveLanguage'])
        self.assertEqual('English title', task['subject'])
        self.assertEqual('English description', task['description'])
        self.assertEqual('ready', task['translationState'])

    def test_cached_hu_toggle_does_not_create_new_translation_job(self):
        _path, uid, _events = self.write_task('4', subject='English title', description='English description')
        rec = self.runtime.store.records[uid]
        tfp = rec['current']['textFingerprint']
        rec.setdefault('translations', {}).setdefault('hu', {})[tfp] = self.valid_translation('Magyar cím', 'Magyar leírás')
        self.runtime.store._save_record(rec)
        before = len(self.runtime.translation_jobs())
        state = self.runtime.request_task_language(uid, 'hu')
        after = len(self.runtime.translation_jobs())
        task = next(t for t in state['tasks'] if t['uid'] == uid)
        self.assertEqual(before, after)
        self.assertEqual('hu', task['viewLanguage'])
        self.assertEqual('hu', task['effectiveLanguage'])
        self.assertFalse(task['translationPending'])
        self.assertEqual('ready', task['translationState'])
        self.assertEqual('Magyar cím', task['subject'])

    def test_text_change_queues_new_fingerprint_only_when_task_view_is_hu(self):
        path, uid, _events = self.write_task('5', subject='v1', description='d1')
        self.runtime.store.set_global_language('hu')
        self.runtime.store.set_task_language(uid, 'en')
        path.write_text(json.dumps({'id':'5','subject':'v2','description':'d2','status':'pending','blockedBy':[],'blocks':[]}))
        events = self.runtime.store.poll_once('live')
        self.assertEqual([], self.runtime.store.prepare_event_translations(events, trigger='tasks-updated'))

        self.runtime.store.set_task_language(uid, 'hu')
        path.write_text(json.dumps({'id':'5','subject':'v3','description':'d3','status':'pending','blockedBy':[],'blocks':[]}))
        events = self.runtime.store.poll_once('live')
        prepared = self.runtime.store.prepare_event_translations(events, trigger='tasks-updated')
        self.assertEqual(1, len(prepared))
        job, handle = prepared[0]
        self.assertEqual(self.runtime.store.records[uid]['current']['textFingerprint'], job[1])
        self.assertEqual('queued', self.runtime.store.job_manager.get(handle.job_id)['status'])

    def test_live_notification_title_follows_current_task_view_language_without_rewriting_history(self):
        path, uid, _events = self.write_task('8', subject='English title', description='English description')
        rec = self.runtime.store.records[uid]
        tfp = rec['current']['textFingerprint']
        rec.setdefault('translations', {}).setdefault('hu', {})[tfp] = self.valid_translation('Magyar cím', 'Magyar leírás')
        self.runtime.store._save_record(rec)
        self.runtime.store.set_task_language(uid, 'hu')
        path.write_text(json.dumps({'id':'8','subject':'English title','description':'English description','status':'in_progress','blockedBy':[],'blocks':[]}))
        events = self.runtime.store.poll_once('live')
        shown = self.runtime._localize_specific(events)
        self.assertEqual('Magyar cím', shown[0]['title'])
        raw = next(event for event in self.runtime.store.history() if event['id'] == events[0]['id'])
        self.assertEqual('English title', raw['title'])

        self.runtime.store.set_task_language(uid, 'en')
        path.write_text(json.dumps({'id':'8','subject':'English title','description':'English description','status':'completed','blockedBy':[],'blocks':[]}))
        events = self.runtime.store.poll_once('live')
        shown = self.runtime._localize_specific(events)
        self.assertEqual('English title', shown[0]['title'])

    def test_deleted_task_can_still_be_explicitly_requested_in_hu(self):
        path, uid, _events = self.write_task('9', subject='Deleted source', description='Deleted desc')
        path.unlink(); self.runtime.store.poll_once('live')
        self.runtime.store.set_task_language(uid, 'hu')
        jobs = self.runtime.store._translation_jobs(force_uids={uid}, include_failed=True)
        self.assertEqual(1, len(jobs))
        self.assertEqual(uid, jobs[0][0])

    def test_v33_global_hu_cache_migrates_existing_tasks_to_view_hu(self):
        _path, uid, _events = self.write_task('6')
        self.runtime.store.session_meta['globalLanguage'] = 'hu'
        self.runtime.store._save_session()
        rec = self.runtime.store.records[uid]
        rec.pop('viewLanguage', None)
        rec['languagePreference'] = 'en'
        self.runtime.store._save_record(rec)
        self.runtime.close()
        self.runtime = server.DashboardRuntime(self.cfg)
        task = next(t for t in self.runtime.api_state()['tasks'] if t['uid'] == uid)
        self.assertEqual('hu', task['viewLanguage'])
        persisted = self.runtime.store.records[uid]
        self.assertEqual('hu', persisted['viewLanguage'])


class V34HistoryTests(V34RuntimeCase):
    def test_translation_success_appends_later_translation_event_without_mutating_source_event(self):
        _path, uid, events = self.write_task('10', subject='Build helper', description='Run validator')
        self.assertTrue(events)
        source_event = copy.deepcopy(events[-1])
        rec = self.runtime.store.records[uid]
        tfp = rec['current']['textFingerprint']
        self.runtime.store.set_task_language(uid, 'hu')
        self.runtime.store.translation_executor = lambda *args, **kwargs: self.valid_translation('Segéd megvalósítása', 'Validátor futtatása')
        handle = self.runtime.store.job_manager.create(uid, tfp, 'm', 'task-hu', provider='agy')
        self.runtime.store._translate_job((uid, tfp, {'title':'Build helper','description':'Run validator'}), handle)
        history = [e for e in self.runtime.store.history() if e['uid'] == uid]
        self.assertGreaterEqual(len(history), 2)
        raw_source = next(e for e in history if e['id'] == source_event['id'])
        self.assertEqual('Build helper', raw_source['title'])
        self.assertEqual('created', raw_source['kind'])
        translated = next(e for e in history if e.get('kind') == 'translated')
        self.assertGreater(translated['detectedAt'], raw_source['detectedAt'])
        self.assertEqual('translation', translated['source'])
        title_change = next(c for c in translated['changes'] if c['field'] == 'subject')
        self.assertEqual('Build helper', title_change['before'])
        self.assertEqual('Segéd megvalósítása', title_change['after'])

    def test_translation_history_event_is_deduplicated_by_job_run(self):
        _path, uid, _events = self.write_task('11', subject='Source', description='Desc')
        rec = self.runtime.store.records[uid]
        tfp = rec['current']['textFingerprint']
        result = self.valid_translation('HU', 'HU D', job_id='job-x')
        job_state = {'id':'job-x','run':1,'provider':'agy','model':'m'}
        self.runtime.store.record_translation_history(uid, tfp, result, job_state)
        self.runtime.store.record_translation_history(uid, tfp, result, job_state)
        events = [e for e in self.runtime.store.history() if e.get('kind') == 'translated' and e['uid'] == uid]
        self.assertEqual(1, len(events))


class V34TranslationCatalogTests(V34RuntimeCase):
    def test_catalog_parent_title_follows_task_view_language(self):
        _path, uid, _events = self.write_task('19', subject='English catalog title', description='English desc')
        rec = self.runtime.store.records[uid]
        tfp = rec['current']['textFingerprint']
        rec.setdefault('translations', {}).setdefault('hu', {})[tfp] = self.valid_translation('Magyar katalóguscím', 'Magyar leírás')
        self.runtime.store._save_record(rec)
        self.runtime.store.set_task_language(uid, 'hu')
        parent = next(item for item in self.runtime.translation_catalog()['tasks'] if item['uid'] == uid)
        self.assertEqual('Magyar katalóguscím', parent['title'])
        self.runtime.store.set_task_language(uid, 'en')
        parent = next(item for item in self.runtime.translation_catalog()['tasks'] if item['uid'] == uid)
        self.assertEqual('English catalog title', parent['title'])

    def test_translation_catalog_has_one_parent_per_task_and_children_per_fingerprint(self):
        path, uid, _events = self.write_task('20', subject='v1', description='d1')
        rec = self.runtime.store.records[uid]
        fp1 = rec['current']['textFingerprint']
        h1 = self.runtime.store.job_manager.create(uid, fp1, 'm', 'task-hu', provider='agy')
        self.runtime.store.job_manager.finish(h1.job_id, 'success')
        path.write_text(json.dumps({'id':'20','subject':'v2','description':'d2','status':'pending','blockedBy':[],'blocks':[]}))
        self.runtime.store.poll_once('live')
        fp2 = self.runtime.store.records[uid]['current']['textFingerprint']
        h2 = self.runtime.store.job_manager.create(uid, fp2, 'm', 'tasks-updated', provider='agy')
        self.runtime.store.job_manager.finish(h2.job_id, 'canceled')
        catalog = self.runtime.translation_catalog()['tasks']
        parent = next(x for x in catalog if x['uid'] == uid)
        self.assertEqual(2, len(parent['children']))
        self.assertEqual({fp1, fp2}, {c['textFingerprint'] for c in parent['children']})
        self.assertEqual(2, parent['versionCount'])
        current = next(c for c in parent['children'] if c['current'])
        self.assertEqual(fp2, current['textFingerprint'])

    def test_retry_run_does_not_create_second_child(self):
        _path, uid, _events = self.write_task('21')
        rec = self.runtime.store.records[uid]
        tfp = rec['current']['textFingerprint']
        h = self.runtime.store.job_manager.create(uid, tfp, 'm', 'task-hu', provider='agy')
        self.runtime.store.job_manager.finish(h.job_id, 'canceled')
        self.runtime.store.job_manager.restart(h.job_id, 'm', trigger='manual-retry')
        catalog = self.runtime.translation_catalog()['tasks']
        parent = next(x for x in catalog if x['uid'] == uid)
        self.assertEqual(1, len(parent['children']))
        self.assertEqual(2, parent['children'][0]['run'])
        self.assertEqual(1, len(parent['children'][0]['runs']))

class V34HttpTests(unittest.TestCase):
    def setUp(self):
        self.agy_patcher = mock.patch("server.session_core.run_agy", return_value=({"title": "HU title", "description": "HU desc"}, {"status": "SUCCESS"}))
        self.agy_patcher.start()
        self.tmp = tempfile.TemporaryDirectory()
        base = pathlib.Path(self.tmp.name)
        self.task_root = base/'tasks'; self.store_id='sess'; (self.task_root/self.store_id).mkdir(parents=True)
        self.cfg = server.Config(session_id='sess', transcript='', project_cwd=str(base/'project'), task_root=self.task_root,
                                 candidate_ids=[self.store_id], cache_root=base/'cache', ui_dir=ROOT/'client', no_open=True,
                                 settings_file=base/'config.json', log_root=base/'logs', version='3.4.0')
        self.runtime = server.DashboardRuntime(self.cfg)
        self.http = server.QuietThreadingHTTPServer(('127.0.0.1',0), server.make_handler(self.runtime))
        threading.Thread(target=self.http.serve_forever, daemon=True).start()
        self.base = f'http://127.0.0.1:{self.http.server_port}'

    def tearDown(self):
        self.runtime.close(); self.http.shutdown(); self.http.server_close(); self.agy_patcher.stop(); self.tmp.cleanup()

    def get(self, path):
        with urllib.request.urlopen(self.base+path, timeout=5) as response:
            return response.status, json.loads(response.read().decode())

    def post(self, path, payload):
        req = urllib.request.Request(self.base+path, data=json.dumps(payload).encode(), headers={'content-type':'application/json'}, method='POST')
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status, json.loads(response.read().decode())

    def test_translation_catalog_and_history_http_reflect_explicit_task_language(self):
        path = self.task_root/self.store_id/'1.json'
        path.write_text(json.dumps({'id':'1','subject':'English title','description':'English desc','status':'pending','blockedBy':[],'blocks':[]}))
        self.runtime.store.poll_once('live')
        uid='sess:1'; rec=self.runtime.store.records[uid]; tfp=rec['current']['textFingerprint']
        rec.setdefault('translations',{}).setdefault('hu',{})[tfp] = V34RuntimeCase.valid_translation('Magyar cím','Magyar leírás')
        self.runtime.store._save_record(rec)
        status, state = self.post('/api/tasks/sess%3A1/language', {'language':'hu'})
        self.assertEqual(200,status)
        task=next(t for t in state['tasks'] if t['uid']==uid)
        self.assertEqual('hu',task['viewLanguage']); self.assertEqual('Magyar cím',task['subject'])
        status,catalog=self.get('/api/translation-catalog'); self.assertEqual(200,status)
        parent=next(t for t in catalog['tasks'] if t['uid']==uid); self.assertEqual('Magyar cím',parent['title'])
        status,history=self.get('/api/history'); self.assertEqual(200,status); self.assertTrue(history['history'])

if __name__ == '__main__':
    unittest.main()
