import json, pathlib, tempfile, unittest
import server

ROOT = pathlib.Path(__file__).resolve().parents[1]

class V31FrontendTests(unittest.TestCase):
    def test_execution_route_redirects_to_flow_and_nav_removed(self):
        router=(ROOT/'client/src/router.js').read_text()
        topbar=(ROOT/'client/src/components/topbar.js').read_text()
        self.assertIn("path:'/execution'", router)
        self.assertIn("'/flow'", router)
        self.assertNotIn("['/execution'", topbar)

    def test_flow_is_draggable_persistent_and_wave_free(self):
        flow=(ROOT/'client/src/pages/flow.js').read_text()
        self.assertIn('applyNodeChanges', flow)
        self.assertIn('onNodeDragStop', flow)
        self.assertIn('/api/sessions/${encodeURIComponent(sessionId)}/flow-layout', flow)
        self.assertIn('Reset layout', flow)
        self.assertNotIn('Wave ', flow)
        self.assertNotIn('YOU ARE HERE', flow)
        self.assertNotIn('nodesDraggable:false', flow)

    def test_tasks_status_filter_is_checkbox_multiselect(self):
        tasks=(ROOT/'client/src/pages/tasks.js').read_text()
        status=(ROOT/'client/src/components/status-multiselect.js').read_text()
        self.assertIn('StatusMultiSelect', tasks)
        self.assertIn("type: 'checkbox'", status)
        self.assertIn('All', status)
        self.assertNotIn("['all', 'in_progress'", tasks)
        self.assertNotIn('Wave ', tasks)

    def test_translations_detail_renders_inline_after_selected_row(self):
        page=(ROOT/'client/src/pages/translations.js').read_text()
        self.assertIn('translation-detail-row', page)
        self.assertIn('colSpan', page)
        self.assertNotIn("job&&h(JobDetail", page)

    def test_settings_are_split_into_cards(self):
        page=(ROOT/'client/src/pages/settings.js').read_text()
        self.assertGreaterEqual(page.count('settings-card'), 2)
        self.assertIn('Translation provider', page)
        self.assertIn('Prompt management', page)

    def test_topbar_live_status_is_dot_only_before_logo(self):
        topbar=(ROOT/'client/src/components/topbar.js').read_text()
        self.assertIn('connection-dot', topbar)
        self.assertIn('aria-label', topbar)
        self.assertNotIn(",a.live)", topbar)

    def test_initial_connecting_state_uses_reconnecting_indicator(self):
        topbar=(ROOT/'client/src/components/topbar.js').read_text()
        self.assertIn("a.live==='CONNECTING'", topbar)
        self.assertIn("?'reconnecting'", topbar)

class V31BackendTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); base=pathlib.Path(self.tmp.name)
        self.task_root=base/'tasks'; self.task_root.mkdir()
        self.store_id='sess'; (self.task_root/self.store_id).mkdir()
        self.cfg=server.Config(
            session_id='sess', transcript='', project_cwd=str(base/'project'),
            task_root=self.task_root, candidate_ids=[self.store_id], cache_root=base/'cache',
            ui_dir=ROOT/'client', no_open=True, settings_file=base/'config.json', log_root=base/'logs',
        )
        self.runtime=server.DashboardRuntime(self.cfg)
    def tearDown(self):
        self.runtime.close(); self.tmp.cleanup()

    def _task(self, task_id='1', status='pending'):
        p=self.task_root/self.store_id/f'{task_id}.json'
        p.write_text(json.dumps({'id':task_id,'subject':f'Task {task_id}','description':'Desc','status':status,'blockedBy':[],'blocks':[]}))
        self.runtime.store.poll_once('live')
        return f'{self.store_id}:{task_id}'

    def test_flow_layout_persists_positions_and_viewport(self):
        self._task()
        payload={'nodes':{'sess:1':{'x':123.5,'y':456.0}},'viewport':{'x':10,'y':20,'zoom':0.8}}
        saved=self.runtime.save_flow_layout(payload)
        self.assertEqual(123.5,saved['nodes']['sess:1']['x'])
        self.assertEqual(0.8,self.runtime.flow_layout()['viewport']['zoom'])
        self.assertTrue((self.runtime.store.session_dir/'flow-layout.json').exists())
        self.runtime.reset_flow_layout()
        self.assertEqual({},self.runtime.flow_layout()['nodes'])

    def test_global_hu_is_committed_before_translation_finishes(self):
        self._task()
        self.runtime._schedule_language_request=lambda *a,**k: None
        state=self.runtime.request_global_language('hu')
        self.assertEqual('hu',state['globalLanguage'])
        self.assertEqual('hu',self.runtime.store.session_meta['globalLanguage'])


    def test_global_stop_cancels_automatic_retranslation_jobs_when_no_language_request_exists(self):
        uid=self._task()
        self.runtime.store.set_global_language('hu')
        handle=self.runtime.store.job_manager.create(uid,'fp1','model','tasks-updated',scope='retranslation',provider='agy')
        canceled=self.runtime.cancel_global_translation()
        self.assertEqual(1,len(canceled))
        self.assertEqual('canceled',self.runtime.store.job_manager.get(handle.job_id)['status'])

    def test_task_hu_is_committed_before_translation_finishes(self):
        uid=self._task()
        self.runtime._schedule_language_request=lambda *a,**k: None
        state=self.runtime.request_task_language(uid,'hu')
        task=next(t for t in state['tasks'] if t['uid']==uid)
        self.assertEqual('hu',task['languagePreference'])
        self.assertEqual('hu',task['desiredLanguage'])

if __name__=='__main__': unittest.main()

class V31LanguageFailureTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); base=pathlib.Path(self.tmp.name)
        self.task_root=base/'tasks'; self.task_root.mkdir(); self.store_id='sess'; (self.task_root/self.store_id).mkdir()
        (self.task_root/self.store_id/'1.json').write_text(json.dumps({'id':'1','subject':'Task 1','description':'Desc','status':'pending','blockedBy':[],'blocks':[]}))
        self.cfg=server.Config(session_id='sess',transcript='',project_cwd=str(base/'project'),task_root=self.task_root,candidate_ids=[self.store_id],cache_root=base/'cache',ui_dir=ROOT/'client',no_open=True,settings_file=base/'config.json',log_root=base/'logs')
        self.runtime=server.DashboardRuntime(self.cfg)
    def tearDown(self):
        self.runtime.close(); self.tmp.cleanup()
    def test_failed_global_translation_does_not_roll_back_hu(self):
        self.runtime._schedule_language_request=lambda *a,**k: None
        self.runtime.request_global_language('hu')
        item=copy_request(self.runtime.pending_global_request, scope='global')
        self.runtime.store.ensure_translations_for_uids_sync=lambda *a,**k: (_ for _ in ()).throw(server.TranslationBatchError([{'uid':'sess:1','taskId':'1','textFingerprint':'abc','message':'synthetic failure'}]))
        self.runtime._handle_language_request(item)
        state=self.runtime.api_state()
        self.assertEqual('hu',state['globalLanguage'])
        self.assertIsNone(self.runtime.pending_global_request)
    def test_failed_task_translation_does_not_roll_back_task_preference(self):
        uid='sess:1'; self.runtime._schedule_language_request=lambda *a,**k: None
        self.runtime.request_task_language(uid,'hu')
        item=copy_request(self.runtime.pending_task_requests[uid], scope='task', uid=uid)
        self.runtime.store.ensure_translations_for_uids_sync=lambda *a,**k: (_ for _ in ()).throw(server.TranslationBatchError([{'uid':uid,'taskId':'1','textFingerprint':'abc','message':'synthetic failure'}]))
        self.runtime._handle_language_request(item)
        task=next(t for t in self.runtime.api_state()['tasks'] if t['uid']==uid)
        self.assertEqual('hu',task['languagePreference'])
        self.assertEqual('hu',task['desiredLanguage'])

def copy_request(req, **extra):
    out=dict(req or {}); out.update(extra); return out

class V31TranscriptTimelineTests(unittest.TestCase):
    def test_transcript_task_updates_enrich_lifecycle(self):
        with tempfile.TemporaryDirectory() as td:
            base=pathlib.Path(td); task_root=base/'tasks'; store='sess'; (task_root/store).mkdir(parents=True)
            (task_root/store/'1.json').write_text(json.dumps({'id':'1','subject':'Timeline task','description':'x','status':'completed','blockedBy':[],'blocks':[]}))
            transcript=base/'sess.jsonl'
            rows=[
                {'timestamp':'2026-09-05T10:00:00+00:00','message':{'content':[{'type':'tool_use','name':'TaskCreate','input':{'subject':'Timeline task'}}]}},
                {'timestamp':'2026-09-05T10:01:00+00:00','message':{'content':[{'type':'tool_use','name':'TaskUpdate','input':{'taskId':'1','status':'in_progress'}}]}},
                {'timestamp':'2026-09-05T10:02:00+00:00','message':{'content':[{'type':'tool_use','name':'TaskUpdate','input':{'taskId':'1','status':'completed'}}]}},
            ]
            transcript.write_text('\n'.join(json.dumps(x) for x in rows)+'\n')
            cfg=server.Config(session_id='sess',transcript=str(transcript),project_cwd=str(base/'project'),task_root=task_root,candidate_ids=[store],cache_root=base/'cache',ui_dir=ROOT/'client',no_open=True,settings_file=base/'config.json',log_root=base/'logs')
            rt=server.DashboardRuntime(cfg)
            try:
                life=rt.api_state()['tasks'][0]['lifecycle']
                self.assertEqual('2026-09-05T10:00:00+00:00',life['createdAt'])
                self.assertEqual('2026-09-05T10:01:00+00:00',life['startedAt'])
                self.assertEqual('2026-09-05T10:02:00+00:00',life['completedAt'])
                self.assertEqual('transcript',life['source'])
            finally: rt.close()
