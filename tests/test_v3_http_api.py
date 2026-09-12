import json, pathlib, tempfile, threading, unittest, urllib.request
import server

ROOT=pathlib.Path(__file__).resolve().parents[1]

class HttpApiTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); base=pathlib.Path(self.tmp.name)
        (base/'tasks').mkdir(); (base/'cache').mkdir()
        self.cfg=server.Config(
            session_id='sess-v3', transcript='', project_cwd=str(base/'project'),
            task_root=base/'tasks', candidate_ids=[], cache_root=base/'cache',
            ui_dir=ROOT/'client', no_open=True, settings_file=base/'config.json',
            log_root=base/'logs',
        )
        self.runtime=server.DashboardRuntime(self.cfg)
        self.http=server.QuietThreadingHTTPServer(('127.0.0.1',0),server.make_handler(self.runtime))
        self.thread=threading.Thread(target=self.http.serve_forever,daemon=True);self.thread.start()
        self.base=f'http://127.0.0.1:{self.http.server_port}'
    def tearDown(self):
        self.runtime.close();self.http.shutdown();self.http.server_close();self.tmp.cleanup()
    def get(self,path):
        with urllib.request.urlopen(self.base+path,timeout=5) as r:return r.status,r.read().decode()
    def post(self,path,payload):
        req=urllib.request.Request(self.base+path,data=json.dumps(payload).encode(),headers={'content-type':'application/json'},method='POST')
        with urllib.request.urlopen(req,timeout=5) as r:return r.status,json.loads(r.read().decode())
    def test_browser_router_routes_fall_back_to_index(self):
        for path in ['/tasks','/flow','/translations/job-1','/prompts/translator-agent','/settings']:
            status,body=self.get(path);self.assertEqual(200,status);self.assertIn('type="importmap"',body)
    def test_flow_layout_http_roundtrip(self):
        status,payload=self.post('/api/flow-layout',{'nodes':{'sess-v3:1':{'x':12,'y':34}},'viewport':{'x':1,'y':2,'zoom':0.7}})
        self.assertEqual(200,status);self.assertEqual(12.0,payload['nodes']['sess-v3:1']['x'])
        _,body=self.get('/api/flow-layout');loaded=json.loads(body);self.assertEqual(0.7,loaded['viewport']['zoom'])

    def test_public_settings_redacts_api_key(self):
        self.post('/api/settings',{'translation':{'provider':'anthropic','anthropic':{'baseUrl':'http://127.0.0.1:8000','apiKey':'secret','model':'local-model'}}})
        _,body=self.get('/api/settings');payload=json.loads(body)
        self.assertNotIn('apiKey',payload['translation']['anthropic'])
        self.assertTrue(payload['translation']['anthropic']['apiKeyConfigured'])
    def test_prompt_save_response_contains_diff_and_required_variables(self):
        status,payload=self.post('/api/prompts/translator-request',{'body':'Translate exactly {{source_title}} {{source_description}} {{protected_source_json}}'})
        self.assertEqual(200,status)
        self.assertIn('diff',payload)
        self.assertIn('source_title',payload['requiredVariables'])

if __name__=='__main__': unittest.main()
