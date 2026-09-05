import pathlib,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class ClientSessionTests(unittest.TestCase):
    def test_sessions_route_nav_and_sortable_table(self):
        router=(ROOT/'client/src/router.js').read_text(); top=(ROOT/'client/src/components/topbar.js').read_text(); page=(ROOT/'client/src/pages/sessions.js').read_text()
        self.assertIn("'/sessions'",router); self.assertIn("['/sessions'",top)
        self.assertIn('getSortedRowModel',page); self.assertIn('getToggleSortingHandler',page); self.assertIn('Switch',page); self.assertIn('watched',page)
    def test_topbar_session_metadata_is_button_and_tooltip(self):
        top=(ROOT/'client/src/components/topbar.js').read_text()
        self.assertIn("to:'/sessions'",top); self.assertIn('sessionTooltip',top); self.assertIn('currentSession',top)
    def test_app_context_uses_explicit_current_session_api_and_cross_origin_events(self):
        ctx=(ROOT/'client/src/app-context.js').read_text()
        self.assertIn("'/api/sessions'",ctx); self.assertIn('switchSession',ctx); self.assertIn('setSessionWatched',ctx); self.assertIn("apiUrl('/events')",ctx); self.assertIn('/api/sessions/${',ctx)
if __name__=='__main__': unittest.main()
