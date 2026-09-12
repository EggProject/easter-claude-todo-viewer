import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class HistoryV4Tests(unittest.TestCase):
    def test_backend_common_history_does_not_localize_source_events(self):
        s = (ROOT / 'server/multi_runtime.py').read_text()
        self.assertIn('for event in child.store.history()', s)
        self.assertNotIn('_localize_specific(copy.deepcopy(child.store.history()', s)


if __name__ == '__main__':
    unittest.main()
