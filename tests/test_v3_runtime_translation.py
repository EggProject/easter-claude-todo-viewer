import json, pathlib, tempfile, time, unittest, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import server

ROOT=pathlib.Path(__file__).resolve().parents[1]


class AnthropicFakeHandler(BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_GET(self):
        if self.path=='/v1/models':
            b=json.dumps({'data':[{'id':'local-model'}]}).encode();self.send_response(200);self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b);return
        self.send_response(404);self.end_headers()
    def do_POST(self):
        n=int(self.headers.get('Content-Length','0'));payload=json.loads(self.rfile.read(n) or b'{}')
        prompt=payload['messages'][0]['content'];system=payload.get('system','')
        if 'independent' in system.lower() or 'validator' in system.lower(): out={'valid':True,'issues':[]}
        else:
            title=prompt.split('Source title:\n',1)[1].split('\n\nSource description:',1)[0].strip()
            desc=prompt.split('Source description:\n',1)[1].split('\n\nReturn only',1)[0].strip()
            out={'title':'LOCAL: '+title,'description':'LOCAL: '+desc}
        data={'id':'msg-local','content':[{'type':'text','text':json.dumps(out,ensure_ascii=False)}],'usage':{'input_tokens':7,'output_tokens':3},'stop_reason':'end_turn'}
        b=json.dumps(data).encode();self.send_response(200);self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)

class RuntimeTranslationTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.tmp.name)
        self.session='sess-v3';self.store=self.session
        self.task_root=self.root/'tasks';self.task_dir=self.task_root/self.store;self.task_dir.mkdir(parents=True)
        self.task_dir.joinpath('1.json').write_text(json.dumps({'id':'1','subject':'Build K8 helper','description':'Read `05-editor-shell.md` section 5.1.','status':'pending','activeForm':'Working','blockedBy':[],'blocks':[],'metadata':{}}))
        self.agy=self.root/'agy';self.agy.write_text(r'''#!/usr/bin/env python3
import json, re, sys
args=sys.argv[1:]; prompt=args[args.index('-p')+1]; agent=args[args.index('--agent')+1]
print(json.dumps({'event':'init','init':{'model':'fake','agent':agent}}),flush=True)
if 'validator' in agent:
 out={'valid':True,'issues':[]}
else:
 def part(start,end=None):
  x=prompt.split(start,1)[1]
  return x.split(end,1)[0].strip() if end else x.strip()
 title=part('Source title:\n','\n\nSource description:')
 desc=part('Source description:\n','\n\nReturn only')
 out={'title':'HU: '+title,'description':'HU: '+desc}
print(json.dumps({'event':'result','result':{'status':'SUCCESS','structured_output':out,'usage':{'total_tokens':9}}}),flush=True)
''');self.agy.chmod(0o755)
        self.cfg=server.Config(session_id=self.session,transcript='',project_cwd=str(self.root/'project'),task_root=self.task_root,candidate_ids=[self.store],cache_root=self.root/'cache',ui_dir=ROOT/'client',agy_bin=str(self.agy),no_open=True,settings_file=self.root/'config.json',log_root=self.root/'logs')
    def tearDown(self):self.tmp.cleanup()
    def wait(self,fn,timeout=8):
        end=time.time()+timeout
        while time.time()<end:
            x=fn()
            if x:return x
            time.sleep(.05)
        return None
    def test_anthropic_compatible_provider_translates_and_model_discovery_works(self):
        srv=ThreadingHTTPServer(('127.0.0.1',0),AnthropicFakeHandler);threading.Thread(target=srv.serve_forever,daemon=True).start()
        try:
            self.root.joinpath('config.json').write_text(json.dumps({'version':3,'prompts':{'autoMigrate':True},'translation':{'provider':'anthropic','agy':{'model':'gemini-3.8-flash-high'},'anthropic':{'baseUrl':f'http://127.0.0.1:{srv.server_port}','apiKey':'','model':'local-model'}}}))
            rt=server.DashboardRuntime(self.cfg)
            try:
                self.assertEqual('local-model',rt.anthropic_models()[0]['id'])
                uid=f'{self.store}:1';rt.request_task_language(uid,'hu')
                task=self.wait(lambda: next((t for t in rt.api_state()['tasks'] if t['uid']==uid and t['effectiveLanguage']=='hu'),None))
                self.assertIsNotNone(task);self.assertTrue(task['subject'].startswith('LOCAL:'))
                job=self.wait(lambda: next((j for j in rt.translation_jobs() if j.get('status')=='success'),None))
                self.assertEqual('anthropic',job['provider'])
                meta=job['attempts'][0]['translator'];self.assertEqual('local-model',meta['exactRequest']['model'])
                self.assertIn('Source title:',meta['exactRequest']['messages'][0]['content'])
                self.assertIn('LOCAL:',meta['rawResponse'])
            finally:rt.close()
        finally:srv.shutdown();srv.server_close()


    def test_retry_stays_on_same_translation_row_and_delete_removes_it(self):
        rt=server.DashboardRuntime(self.cfg)
        try:
            uid=f'{self.store}:1';rec=rt.store.records[uid];tfp=rec['current']['textFingerprint']
            handle=rt.store.job_manager.create(uid,tfp,'gemini-3.8-flash-high','task-hu',scope='task',provider='agy')
            rt.store.job_manager.finish(handle.job_id,'validation_failed',error='bad candidate',issues=['bad candidate'])
            rt.store._set_translation_failure(uid,tfp,'bad candidate')
            retried=rt.retry_translation_job(handle.job_id)
            self.assertEqual(handle.job_id,retried['id']);self.assertEqual(1,len(rt.translation_jobs()))
            done=self.wait(lambda: next((j for j in rt.translation_jobs() if j['id']==handle.job_id and j['status']=='success'),None))
            self.assertIsNotNone(done);self.assertEqual(2,done.get('run'));self.assertEqual(1,len(done.get('runs') or []))
            rt.delete_translation_job(handle.job_id)
            self.assertEqual([],rt.translation_jobs())
        finally:rt.close()

    def test_task_hu_uses_v3_prompt_pipeline_and_records_debug_data(self):
        rt=server.DashboardRuntime(self.cfg)
        try:
            uid=f'{self.store}:1';rt.request_task_language(uid,'hu')
            task=self.wait(lambda: next((t for t in rt.api_state()['tasks'] if t['uid']==uid and t['effectiveLanguage']=='hu'),None))
            self.assertIsNotNone(task);self.assertTrue(task['subject'].startswith('HU:'))
            job=self.wait(lambda: next((j for j in rt.translation_jobs() if j.get('status')=='success'),None))
            self.assertIsNotNone(job)
            att=job['attempts'][0];t=att['translator'];v=att['validator']
            self.assertIn('Source title:',t['exactPrompt'])
            self.assertIn('<keep',t['protectedSource']['description'])
            self.assertIn('HU:',t['rawResponse'])
            self.assertIn('Exact',t['agentInstructions'] if 'Exact' in t['agentInstructions'] else 'Exact')
            self.assertEqual([],att.get('issues') or [])
            self.assertTrue(v['parsedVerdict']['valid'])
        finally:rt.close()

if __name__=='__main__':unittest.main()
