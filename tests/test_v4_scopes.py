import pathlib,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class ScopeTests(unittest.TestCase):
    def test_session_scope_component_uses_url_and_shortcuts(self):
        s=(ROOT/'client/src/components/session-select.js').read_text()
        self.assertIn('useSearchParams',s); self.assertIn("'sessions'",s); self.assertIn('All watched',s); self.assertIn('Current',s)
    def test_tasks_and_flow_load_selected_sessions_and_show_selector(self):
        tasks=(ROOT/'client/src/pages/tasks.js').read_text(); flow=(ROOT/'client/src/pages/flow.js').read_text()
        for text in [tasks,flow]: self.assertIn('SessionScopeSelect',text); self.assertIn('selectedSessionIds',text); self.assertIn('app.loadState',text)
        self.assertIn('session-badge',tasks); self.assertIn('sessionId',flow)
    def test_flow_builds_no_cross_session_edges_and_uses_session_flow_api(self):
        flow=(ROOT/'client/src/pages/flow.js').read_text()
        self.assertIn('groupTasksBySession',flow); self.assertIn('/api/sessions/${encodeURIComponent(sessionId)}/flow-layout',flow); self.assertIn('nodeId(task)',flow)
    def test_drawer_language_actions_are_session_explicit(self):
        drawer=(ROOT/'client/src/components/task-drawer.js').read_text(); history=(ROOT/'client/src/components/task-history.js').read_text()
        self.assertIn('task.sessionId',drawer); self.assertIn('app.toggleTaskLanguage(task.sessionId',drawer); self.assertIn('event.sessionId === task.sessionId',history)
if __name__=='__main__': unittest.main()
