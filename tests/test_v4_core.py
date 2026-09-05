import pathlib, queue, tempfile, unittest
import server

ROOT=pathlib.Path(__file__).resolve().parents[1]

class CoreExternalSchedulerTests(unittest.TestCase):
    def config(self,base):
        task_root=base/'tasks'; task_root.mkdir()
        return server.Config(session_id='s1',transcript='',project_cwd=str(base/'p'),task_root=task_root,candidate_ids=[],cache_root=base/'cache',ui_dir=ROOT/'client',no_open=True,settings_file=base/'config.json',log_root=base/'logs')
    def test_runtime_can_use_shared_queue_hub_without_child_worker(self):
        with tempfile.TemporaryDirectory() as td:
            base=pathlib.Path(td); q=queue.Queue(); hub=server.EventHub()
            rt=server.DashboardRuntime(self.config(base), shared_translation_queue=q, shared_hub=hub, start_translation_worker=False)
            try:
                self.assertIs(rt.translation_requests,q)
                self.assertIs(rt.hub,hub)
                self.assertIsNone(rt.translation_thread)
                rt.schedule_translation('test')
                item=q.get_nowait()
                self.assertEqual('s1',item['sessionId'])
                self.assertEqual('reconcile',item['kind'])
            finally: rt.close()
    def test_process_translation_item_dispatches_without_queue_loop(self):
        with tempfile.TemporaryDirectory() as td:
            base=pathlib.Path(td); q=queue.Queue()
            rt=server.DashboardRuntime(self.config(base),shared_translation_queue=q,start_translation_worker=False)
            called=[]; rt._handle_reconcile=lambda item: called.append(item['reason'])
            try:
                rt.process_translation_item({'kind':'reconcile','reason':'x','sessionId':'s1'})
                self.assertEqual(['x'],called)
            finally: rt.close()

if __name__=='__main__': unittest.main()
