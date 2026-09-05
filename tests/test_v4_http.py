import http.client,json,pathlib,tempfile,threading,unittest
from server.multi_runtime import DaemonConfig,MultiSessionRuntime
from server.http_api import make_server

ROOT=pathlib.Path(__file__).resolve().parents[1]

class HttpTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); b=pathlib.Path(self.tmp.name); ch=b/'claude'; p=ch/'projects'/'p'; p.mkdir(parents=True); (ch/'tasks').mkdir()
        (p/'S.jsonl').write_text(json.dumps({'timestamp':'2026-09-05T12:00:00Z','cwd':'/work/s','type':'user','message':{'content':'Hello'}})+'\n')
        cfg=DaemonConfig(claude_home=ch,cache_root=b/'cache',settings_file=b/'config.json',app_state_file=b/'app-state.json',log_root=b/'logs',client_origins=['http://127.0.0.1:8766'],port=0)
        self.rt=MultiSessionRuntime(cfg,start_background=False); self.http=make_server(self.rt,0); threading.Thread(target=self.http.serve_forever,daemon=True).start(); self.port=self.http.server_port
    def tearDown(self): self.http.shutdown(); self.http.server_close(); self.rt.close(); self.tmp.cleanup()
    def request(self,method,path,payload=None,origin='http://127.0.0.1:8766'):
        c=http.client.HTTPConnection('127.0.0.1',self.port,timeout=5); headers={'Origin':origin}; body=None
        if payload is not None: body=json.dumps(payload); headers['Content-Type']='application/json'
        c.request(method,path,body=body,headers=headers); r=c.getresponse(); raw=r.read(); data=json.loads(raw) if raw else None; headers=dict(r.getheaders()); c.close(); return r.status,data,headers
    def test_sessions_switch_watch_and_cors(self):
        st,data,h=self.request('GET','/api/sessions'); self.assertEqual(200,st); self.assertEqual('S',data['currentSessionId']); self.assertEqual('http://127.0.0.1:8766',h['Access-Control-Allow-Origin'])
        st,data,_=self.request('POST','/api/sessions/S/switch',{}); self.assertEqual(200,st); self.assertEqual('S',data['currentSessionId'])
        st,data,_=self.request('DELETE','/api/sessions/S/watch'); self.assertEqual(200,st); self.assertIn('S',data['watchedSessionIds'])
        st,data,_=self.request('GET','/api/sessions',origin='http://evil.test'); self.assertEqual(403,st)
    def test_session_scoped_state_history_language_and_flow(self):
        st,data,_=self.request('GET','/api/state?sessionIds=S'); self.assertEqual(200,st); self.assertEqual('S',data['currentSessionId'])
        st,data,_=self.request('POST','/api/sessions/S/language',{'language':'en'}); self.assertEqual(202,st); self.assertEqual('en',data['globalLanguage'])
        st,data,_=self.request('POST','/api/sessions/S/flow-layout',{'nodes':{'x':{'x':1,'y':2}}}); self.assertEqual(200,st)
        st,data,_=self.request('GET','/api/sessions/S/flow-layout'); self.assertEqual(1.0,data['nodes']['x']['x'])
    def test_sessions_snapshot_is_fast_and_explicit_refresh_discovers_new_transcript(self):
        p=(pathlib.Path(self.rt.claude_home)/'projects'/'p'/'NEW.jsonl')
        p.write_text(json.dumps({'timestamp':'2026-09-05T13:00:00Z','cwd':'/work/new','type':'user','message':{'content':'New prompt'}})+'\n')
        st,data,_=self.request('GET','/api/sessions')
        self.assertEqual(200,st)
        self.assertNotIn('NEW',{row['id'] for row in data['sessions']})
        st,data,_=self.request('POST','/api/sessions/refresh',{})
        self.assertEqual(200,st)
        self.assertIn('NEW',{row['id'] for row in data['sessions']})

    def test_global_settings_not_session_specific(self):
        st,data,_=self.request('GET','/api/settings'); self.assertEqual(200,st); self.assertIn('translation',data)
        st,data,_=self.request('POST','/api/settings',{'translation':{'provider':'agy','agy':{'model':'gemini-3.8-flash-high','maxConcurrency':3}}}); self.assertEqual(200,st); self.assertEqual(3,data['translation']['agy']['maxConcurrency'])

if __name__=='__main__': unittest.main()
