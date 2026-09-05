import json, pathlib, subprocess, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]

class V411FlowTests(unittest.TestCase):
    def test_disconnected_nodes_wrap_in_rows_instead_of_one_long_tail(self):
        module=(ROOT/'client/src/flow-layout.js').as_uri()
        nodes=[{'id':f'n{i}','data':{'taskId':str(i+1)},'position':{'x':0,'y':0}} for i in range(14)]
        script=f"""import {{packDisconnectedNodes}} from {json.dumps(module)}; const nodes={json.dumps(nodes)}; console.log(JSON.stringify(packDisconnectedNodes([],nodes,2400)));"""
        out=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],text=True))
        xs=[n['position']['x'] for n in out]; ys=[n['position']['y'] for n in out]
        self.assertGreater(len(set(ys)),1)
        self.assertLessEqual(len(set(xs)),5)
        self.assertLess(max(xs)-min(xs),2300)
        self.assertEqual([str(i) for i in range(1,15)],[n['data']['taskId'] for n in out])

    def test_flow_auto_arrange_uses_canvas_width_aware_packing(self):
        src=(ROOT/'client/src/pages/flow.js').read_text()
        self.assertIn('flowContainer.current?.clientWidth',src)
        self.assertIn('layoutWithElk(sessionNodes, sessionEdges, canvasWidth)',src)

class V411TranslationsTests(unittest.TestCase):
    def test_translations_table_restores_task_version_subrows_with_sorting(self):
        src=(ROOT/'client/src/pages/translations.js').read_text()
        self.assertIn('getSubRows',src)
        self.assertIn('getExpandedRowModel',src)
        self.assertIn('translation-task-row',src)
        self.assertIn('tree-table',src)
        self.assertIn("id: 'session'",src)
        self.assertIn("id: 'taskId'",src)
        self.assertIn('getToggleSortingHandler',src)
        self.assertIn('getSortedRowModel',src)
        self.assertIn('translation-detail-row',src)
        for text in ['Stop all','Retry all failed','bulk-summary']:
            self.assertIn(text,src)

class V411FilterPersistenceTests(unittest.TestCase):
    def test_filter_state_url_overrides_storage_and_storage_is_fallback(self):
        module=(ROOT/'client/src/filter-state-core.js').as_uri()
        script=f"""import {{resolvePersistedFilters}} from {json.dumps(module)};
const defaults={{q:'',sort:'dependency',status:'in_progress'}};
const stored={{q:'old',sort:'status',status:'pending'}};
console.log(JSON.stringify([resolvePersistedFilters(defaults,new URLSearchParams('q=url&sort=id'),stored),resolvePersistedFilters(defaults,new URLSearchParams(''),stored)]));"""
        a,b=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],text=True))
        self.assertEqual('url',a['q']); self.assertEqual('id',a['sort']); self.assertEqual('pending',a['status'])
        self.assertEqual({'q':'old','sort':'status','status':'pending'},b)

    def test_routed_pages_use_persistent_filter_hook(self):
        for page in ['tasks','flow','sessions','translations']:
            src=(ROOT/f'client/src/pages/{page}.js').read_text()
            self.assertIn('usePersistentPageFilters',src,page)

    def test_history_filters_are_persisted_in_local_storage(self):
        src=(ROOT/'client/src/components/overlays.js').read_text()
        self.assertIn('usePersistentLocalState',src)
        self.assertIn('claude-todos:history-filters',src)

    def test_session_scope_uses_page_local_storage_fallback(self):
        src=(ROOT/'client/src/components/session-select.js').read_text()
        self.assertIn('claude-todos:session-scope:',src)
        self.assertIn('window.localStorage',src)

if __name__=='__main__': unittest.main()
