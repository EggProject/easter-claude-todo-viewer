import pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class SpaTests(unittest.TestCase):
    def test_pages_are_separate_modules_and_router_uses_browser_router(self):
        router=(ROOT/'client'/'src'/'router.js').read_text()
        self.assertIn('BrowserRouter',router)
        for name in ['tasks','flow','translations','prompts','settings']:
            self.assertTrue((ROOT/'client'/'src'/'pages'/f'{name}.js').exists(),name)
            self.assertIn(f"./pages/{name}.js",router)
    def test_react_flow_is_used(self):
        flow=(ROOT/'client'/'src'/'pages'/'flow.js').read_text()
        self.assertIn('@xyflow/react',flow)
        self.assertIn('ReactFlow',flow)
    def test_importmap_maps_react_dom_for_react_flow(self):
        html=(ROOT/'client'/'index.html').read_text()
        self.assertIn('\"react-dom\":',html)
        self.assertIn('\"react-dom/\":',html)
    def test_translation_page_has_derived_sort_values_and_human_debug_sections(self):
        page=(ROOT/'client'/'src'/'pages'/'translations.js').read_text()
        self.assertIn('getSortedRowModel',page)
        self.assertIn('getToggleSortingHandler',page)
        for label in ['Translator instructions','Exact prompt sent','Exact model output','Parsed translation','Deterministic checks','Validator instructions']:
            self.assertIn(label,page)
    def test_flow_is_timeline_draggable_and_wave_free(self):
        flow=(ROOT/'client'/'src'/'pages'/'flow.js').read_text()
        self.assertIn('onNodeDragStop',flow)
        self.assertIn('Each selected session is a separate lane',flow)
        self.assertNotIn('wave-header',flow)
        self.assertNotIn('YOU ARE HERE',flow)
    def test_prompt_editor_exposes_migration_conflicts(self):
        page=(ROOT/'client'/'src'/'pages'/'prompts.js').read_text()
        self.assertIn('Migration conflict',page)
        self.assertIn('conflicts',page)
    def test_shell_launch_checks_v4_split_client_server(self):
        client_sh=(ROOT/'start-client.sh').read_text()
        server_sh=(ROOT/'start-server.sh').read_text()
        html=(ROOT/'client'/'index.html').read_text()
        self.assertIn('client/serve.py',client_sh)
        self.assertIn('server.main',server_sh)
        self.assertIn('/src/main.js',html)
    def test_task_drawer_resolves_dependency_titles(self):
        drawer=(ROOT/'client'/'src'/'components'/'task-drawer.js').read_text()
        self.assertIn('dependencyLabel',drawer)
        self.assertIn('Blocked by',drawer)
    def test_no_legacy_monolithic_app(self):
        self.assertFalse((ROOT/'client'/'app.js').exists())
if __name__=='__main__':unittest.main()

class ImportMapRuntimeTests(unittest.TestCase):
    def test_importmap_has_no_malformed_react_dom_prefix_url(self):
        html=(ROOT/'client'/'index.html').read_text()
        self.assertNotIn('react-dom@19.2.4&external=react/',html)
        self.assertIn('react-router@8.3.1?external=react,react-dom',html)

class TaskDefaultsTests(unittest.TestCase):
    def test_tasks_page_uses_server_initial_status_and_sort(self):
        page=(ROOT/'client'/'src'/'pages'/'tasks.js').read_text()
        self.assertIn('initialStatus',page)
        self.assertIn('initialSort',page)

class OverlayKeyboardTests(unittest.TestCase):
    def test_task_drawer_and_history_sidebar_close_on_escape(self):
        drawer=(ROOT/'client'/'src'/'components'/'task-drawer.js').read_text()
        overlays=(ROOT/'client'/'src'/'components'/'overlays.js').read_text()
        self.assertIn('Escape',drawer);self.assertIn('keydown',drawer)
        self.assertIn('Escape',overlays);self.assertIn('keydown',overlays)
