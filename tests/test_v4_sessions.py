import json
import pathlib
import tempfile
import unittest

from server.session_registry import SessionRegistry
from server.app_state import AppStateStore


class NoSdkContractTests(unittest.TestCase):
    def test_server_package_does_not_import_claude_agent_sdk(self):
        root=pathlib.Path(__file__).resolve().parents[1]
        text='\n'.join(path.read_text(encoding='utf-8',errors='replace') for path in (root/'server').glob('*.py'))
        self.assertNotIn('claude_agent_sdk',text)
        self.assertNotIn('list_sessions(',text)
        self.assertNotIn('get_session_info(',text)

class SessionRegistryTests(unittest.TestCase):
    def test_discovers_jsonl_without_sdk_and_extracts_metadata(self):
        with tempfile.TemporaryDirectory() as td:
            root=pathlib.Path(td); projects=root/'projects'; pdir=projects/'-Users-me-proj'; pdir.mkdir(parents=True)
            s1=pdir/'aaa-bbb.jsonl'
            rows=[
                {'timestamp':'2026-09-05T10:00:00+00:00','sessionId':'aaa-bbb','cwd':'/Users/me/proj','gitBranch':'feature/x','type':'user','message':{'content':'First prompt'}},
                {'timestamp':'2026-09-05T10:01:00+00:00','type':'assistant','message':{'content':'hello'}},
                {'timestamp':'2026-09-05T10:02:00+00:00','type':'system','customTitle':'Auth refactor','summary':'Refactor auth flow'},
            ]
            s1.write_text('\n'.join(json.dumps(x) for x in rows)+'\n{broken')
            sub=(pdir/'aaa-bbb'/'subagents'); sub.mkdir(parents=True); (sub/'agent-1.jsonl').write_text('{}\n')
            registry=SessionRegistry(root)
            sessions=registry.discover()
            self.assertEqual(1,len(sessions))
            info=sessions[0]
            self.assertEqual('aaa-bbb',info['id'])
            self.assertEqual('/Users/me/proj',info['cwd'])
            self.assertEqual('feature/x',info['gitBranch'])
            self.assertEqual('Auth refactor',info['customTitle'])
            self.assertEqual('Refactor auth flow',info['summary'])
            self.assertEqual('First prompt',info['firstPrompt'])
            self.assertEqual(3,info['messageCount'])
            self.assertTrue(info['fileSize']>0)
            self.assertIn('aaa-bbb',info['candidateIds'])
            self.assertIn('session-aaa-bbb',info['candidateIds'])
            self.assertIn('proj',info['candidateIds'])

    def test_sessions_sorted_newest_first_and_malformed_files_tolerated(self):
        with tempfile.TemporaryDirectory() as td:
            root=pathlib.Path(td); p=root/'projects'/'p'; p.mkdir(parents=True)
            (p/'old.jsonl').write_text(json.dumps({'timestamp':'2026-09-04T10:00:00+00:00','cwd':'/old'})+'\n')
            (p/'new.jsonl').write_text(json.dumps({'timestamp':'2026-09-05T10:00:00+00:00','cwd':'/new'})+'\nnot-json\n')
            ids=[x['id'] for x in SessionRegistry(root).discover()]
            self.assertEqual(['new','old'],ids)


class AppStateTests(unittest.TestCase):
    def test_first_run_selects_newest_and_current_is_always_watched(self):
        with tempfile.TemporaryDirectory() as td:
            path=pathlib.Path(td)/'app-state.json'
            store=AppStateStore(path)
            state=store.load([{'id':'b','lastActivity':'2026-09-05T11:00:00Z'},{'id':'a','lastActivity':'2026-09-05T10:00:00Z'}])
            self.assertEqual('b',state['currentSessionId'])
            self.assertEqual(['b'],state['watchedSessionIds'])
            state=store.set_watched('b',False,[{'id':'b'},{'id':'a'}])
            self.assertIn('b',state['watchedSessionIds'])
            state=store.switch('a',[{'id':'b'},{'id':'a'}])
            self.assertEqual('a',state['currentSessionId'])
            self.assertIn('a',state['watchedSessionIds'])
            self.assertTrue(path.exists())

if __name__=='__main__': unittest.main()
