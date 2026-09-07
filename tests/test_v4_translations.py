import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class TranslationV4Tests(unittest.TestCase):
    def test_catalog_identity_and_children_are_session_qualified(self):
        s = (ROOT / 'server/multi_runtime.py').read_text()
        self.assertIn("child['sessionId']=info['id']", s)
        self.assertIn("rec['sessionId']=info['id']", s)


if __name__ == '__main__':
    unittest.main()
