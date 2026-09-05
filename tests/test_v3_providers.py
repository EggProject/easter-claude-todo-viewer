import importlib.util, json, pathlib, threading, unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
ROOT=pathlib.Path(__file__).resolve().parents[1]

class H(BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_GET(self):
        if self.path=='/v1/models':
            b=json.dumps({'data':[{'id':'local-a'},{'id':'local-b'}]}).encode(); self.send_response(200); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
        else:self.send_response(404);self.end_headers()
    def do_POST(self):
        n=int(self.headers.get('content-length','0')); raw=self.rfile.read(n); self.server.last=json.loads(raw)
        payload={'id':'msg_1','content':[{'type':'text','text':'{"title":"HU title","description":"HU desc"}'}],'usage':{'input_tokens':12,'output_tokens':4},'stop_reason':'end_turn'}
        b=json.dumps(payload).encode(); self.send_response(200); self.send_header('Content-Type','application/json'); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)

class AgyProviderTests(unittest.TestCase):
    def test_agy_provider_normalizes_runner_result(self):
        spec=importlib.util.spec_from_file_location('agyp',ROOT/'claude_todos'/'providers'/'agy.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
        def runner(agy_bin,prompt,schema,**kw):
            return {'title':'HU','description':'Leiras'},{'status':'SUCCESS','conversationId':'conv1','durationSeconds':1.2,'usage':{'total_tokens':8},'rawResponse':'RAW','rawStream':'STREAM','exactRequest':{'model':'fake'},'agent':'x'}
        p=m.AgyProvider('agy','fake',runner)
        r=p.run('SYS','PROMPT',{'type':'object'},phase='translator',task_ref='#1',agent_spec='AGENT')
        self.assertEqual('HU',r.structured['title'])
        self.assertEqual('RAW',r.raw_response)
        self.assertEqual('conv1',r.remote_id)
        self.assertEqual('agy',r.provider)

class ProviderTests(unittest.TestCase):
    def test_anthropic_models_and_message(self):
        spec=importlib.util.spec_from_file_location('ap',ROOT/'claude_todos'/'providers'/'anthropic.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
        srv=ThreadingHTTPServer(('127.0.0.1',0),H);t=threading.Thread(target=srv.serve_forever,daemon=True);t.start()
        try:
            p=m.AnthropicProvider(f'http://127.0.0.1:{srv.server_port}', '', 'local-a')
            self.assertEqual(['local-a','local-b'], [x['id'] for x in p.list_models()])
            r=p.run('SYS','PROMPT',{'type':'object'},None)
            self.assertEqual('HU title',r.structured['title'])
            self.assertEqual('SYS',srv.last['system'])
            self.assertEqual('PROMPT',srv.last['messages'][0]['content'])
            self.assertIn('raw_response',r.__dict__)
        finally:srv.shutdown();srv.server_close()

if __name__=='__main__':unittest.main()
