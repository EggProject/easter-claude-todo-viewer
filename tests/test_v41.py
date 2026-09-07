import json
import pathlib
import tempfile
import unittest
from unittest import mock

from server.multi_runtime import DaemonConfig, MultiSessionRuntime
from server.session_registry import SessionRegistry


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


if __name__ == '__main__':
    unittest.main()
