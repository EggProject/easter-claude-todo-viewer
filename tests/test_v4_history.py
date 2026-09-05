import pathlib,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class HistoryV4Tests(unittest.TestCase):
    def test_common_sidebar_has_session_search_type_sort_and_collapsed_cards(self):
        s=(ROOT/'client/src/components/overlays.js').read_text()
        for token in ['historyQuery','historySessionFilter','historyTypeFilter','historySort','Filter history','All watched sessions']:
            self.assertIn(token,s)
        self.assertIn("h('details'",s)
        self.assertIn('historyEventIcon',s)
    def test_notification_modal_marks_origin_session(self):
        s=(ROOT/'client/src/components/overlays.js').read_text()
        self.assertIn('modal.session',s)
        self.assertIn('modal-session',s)
    def test_task_history_is_session_qualified_and_source_translation_are_distinct(self):
        s=(ROOT/'client/src/components/task-history.js').read_text()
        self.assertIn('event.sessionId === task.sessionId',s)
        self.assertIn("event.source === 'translation'",s)
        self.assertIn('Original task event',s)
    def test_backend_common_history_does_not_localize_source_events(self):
        s=(ROOT/'server/multi_runtime.py').read_text()
        self.assertIn('for event in child.store.history()',s)
        self.assertNotIn('_localize_specific(copy.deepcopy(child.store.history()',s)
if __name__=='__main__':unittest.main()
