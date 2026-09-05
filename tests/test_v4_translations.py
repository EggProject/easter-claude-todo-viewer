import pathlib,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class TranslationV4Tests(unittest.TestCase):
    def test_catalog_identity_and_children_are_session_qualified(self):
        s=(ROOT/'server/multi_runtime.py').read_text()
        self.assertIn("child['sessionId']=info['id']",s)
        self.assertIn("rec['sessionId']=info['id']",s)
    def test_translation_page_has_session_column_filter_and_sorting(self):
        s=(ROOT/'client/src/pages/translations.js').read_text()
        self.assertIn("id: 'session'",s)
        self.assertIn('sessionFilter',s)
        self.assertIn('getSortedRowModel',s)
        self.assertIn('getToggleSortingHandler',s)
        self.assertIn('Shift+click',s)
    def test_task_and_job_row_ids_include_session(self):
        s=(ROOT/'client/src/pages/translations.js').read_text()
        self.assertIn('task:${row.sessionId}:${row.uid}',s)
        self.assertIn('job:${row.sessionId}:${row.id}',s)
    def test_bulk_and_single_actions_use_session_qualified_refs(self):
        s=(ROOT/'client/src/pages/translations.js').read_text()
        self.assertIn('jobRefs',s)
        self.assertIn('job.sessionId',s)
        self.assertIn('app.retryJob(job.sessionId',s)
        self.assertIn('app.cancelJob(job.sessionId',s)
        self.assertIn('app.deleteJob(job.sessionId',s)
if __name__=='__main__':unittest.main()
