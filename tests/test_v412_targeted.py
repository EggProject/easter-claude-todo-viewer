import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class TranslationTableRegressionTests(unittest.TestCase):
    def test_translations_restores_uploaded_subrow_tree_table(self):
        page = (ROOT / 'client/src/pages/translations.js').read_text()
        self.assertIn('getSubRows: row => row.children || []', page)
        self.assertIn('getExpandedRowModel()', page)
        self.assertIn("row.original.kind === 'task'", page)
        self.assertIn("row.original.kind === 'version'", page)
        self.assertIn("header: 'Task / version'", page)
        self.assertIn("header: 'Wanted'", page)
        self.assertIn("header: 'Shown'", page)
        self.assertIn('tree-table', page)
        self.assertIn('Task translation history', page)

    def test_translations_subrow_headers_are_click_sortable(self):
        page = (ROOT / 'client/src/pages/translations.js').read_text()
        self.assertIn('getSortedRowModel', page)
        self.assertIn('onSortingChange: setSorting', page)
        self.assertIn('getToggleSortingHandler()', page)
        self.assertIn('sortIndicator(header.column.getIsSorted())', page)
        self.assertIn("title: header.column.getCanSort() ? 'Click to sort. Shift+click adds another sort column.'", page)

    def test_v411_filter_persistence_is_preserved(self):
        page = (ROOT / 'client/src/pages/translations.js').read_text()
        self.assertIn('usePersistentPageFilters', page)
        self.assertIn("usePersistentPageFilters('translations'", page)
        self.assertIn("setFilter('q'", page)
        self.assertIn("setFilter('session'", page)
        self.assertIn("setFilter('sort'", page)
        self.assertNotIn('setGlobalFilter', page)
        self.assertIn("onGlobalFilterChange: updater =>", page)


class FlowAutoArrangeRegressionTests(unittest.TestCase):
    def test_numeric_node_id_helper_exists_for_disconnected_sort(self):
        page = (ROOT / 'client/src/pages/flow.js').read_text()
        self.assertIn('numericNodeId(a) - numericNodeId(b)', page)
        self.assertIn('function numericNodeId(node)', page)
        self.assertIn('node?.data?.taskId', page)


if __name__ == '__main__':
    unittest.main()
