import json,pathlib,tempfile,time,unittest
from server.multi_runtime import DaemonConfig, MultiSessionRuntime

ROOT=pathlib.Path(__file__).resolve().parents[1]

class MultiRuntimeTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.base=pathlib.Path(self.tmp.name)
        self.ch=self.base/'claude'; self.projects=self.ch/'projects'; self.tasks=self.ch/'tasks'; self.tasks.mkdir(parents=True)
        self.project_a=self.projects/'-a'; self.project_b=self.projects/'-b'; self.project_a.mkdir(parents=True); self.project_b.mkdir(parents=True)
        self.write_session(self.project_a,'A','/work/a','2026-09-05T10:00:00+00:00')
        self.write_session(self.project_b,'B','/work/b','2026-09-05T11:00:00+00:00')
        self.cfg=DaemonConfig(claude_home=self.ch,cache_root=self.base/'cache',settings_file=self.base/'config.json',app_state_file=self.base/'app-state.json',log_root=self.base/'logs',client_origins=['http://127.0.0.1:8766'],version='4.0.0')
        self.rt=MultiSessionRuntime(self.cfg,start_background=False)
    def tearDown(self): self.rt.close(); self.tmp.cleanup()
    def write_session(self,pdir,sid,cwd,ts):
        (pdir/f'{sid}.jsonl').write_text(json.dumps({'timestamp':ts,'sessionId':sid,'cwd':cwd,'type':'user','message':{'content':f'Prompt {sid}'}})+'\n')
    def test_newest_is_current_and_current_runtime_uses_shared_queue_provider_gate(self):
        self.assertEqual('B',self.rt.app_state()['currentSessionId'])
        child=self.rt.get_runtime('B')
        self.assertIs(child.translation_requests,self.rt.translation_requests)
        self.assertIs(child.store.provider_gate,self.rt.provider_gate)
        self.assertIs(child.store.provider_active_counts,self.rt.provider_active_counts)
        self.assertIs(child.hub,self.rt.hub)
        self.assertIsNone(child.translation_thread)
    def test_per_session_language_isolation_and_aggregated_tasks(self):
        # create task stores after runtime discovery
        for sid in ('A','B'):
            d=self.tasks/sid; d.mkdir(); (d/'1.json').write_text(json.dumps({'id':'1','subject':f'Task {sid}','description':'D','status':'pending','blockedBy':[],'blocks':[]}))
        a=self.rt.get_runtime('A'); b=self.rt.get_runtime('B'); a.store.poll_once('live'); b.store.poll_once('live')
        a.store.set_global_language('hu')
        self.assertEqual('hu',a.store.session_meta['globalLanguage']); self.assertEqual('en',b.store.session_meta['globalLanguage'])
        state=self.rt.api_state(['A','B'])
        self.assertEqual({'A','B'},{t['sessionId'] for t in state['tasks']})
        self.assertEqual('B',state['currentSessionId'])
    def test_only_watched_sessions_are_polled_and_notification_has_session_envelope(self):
        # default B watched; make task change in B and invoke one poll cycle deterministically
        d=self.tasks/'B'; d.mkdir(); p=d/'1.json'; p.write_text(json.dumps({'id':'1','subject':'T','description':'D','status':'pending','blockedBy':[],'blocks':[]}))
        child=self.rt.get_runtime('B'); child.store.poll_once('live')
        p.write_text(json.dumps({'id':'1','subject':'T','description':'D','status':'in_progress','blockedBy':[],'blocks':[]}))
        events=self.rt.poll_session_once('B')
        self.assertTrue(events)
        notification=[x for x in self.rt.hub.history if x['event']=='notification'][-1]['payload']
        self.assertEqual('B',notification['session']['id'])
        self.assertIn('changes',notification)
    def test_translations_aggregates_session_ids(self):
        d=self.tasks/'A'; d.mkdir(); (d/'1.json').write_text(json.dumps({'id':'1','subject':'A','description':'D','status':'pending','blockedBy':[],'blocks':[]}))
        a=self.rt.get_runtime('A'); a.store.poll_once('live'); rec=next(iter(a.store.records.values())); tfp=rec['current']['textFingerprint']
        a.store.job_manager.create(rec['uid'],tfp,'m','x',provider='agy')
        jobs=self.rt.translations()
        row=next(j for j in jobs if j['sessionId']=='A')
        self.assertEqual('A',row['session']['id'])

if __name__=='__main__': unittest.main()
