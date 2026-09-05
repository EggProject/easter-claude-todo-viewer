import json
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


def read_import_map():
    html = (ROOT / "client" / "index.html").read_text()
    match = re.search(r'<script type="importmap">\s*(\{.*?\})\s*</script>', html, re.S)
    if not match:
        raise AssertionError("import map not found")
    return json.loads(match.group(1))["imports"]


class ReactSubpathImportMapTests(unittest.TestCase):
    def test_react_subpaths_are_mapped_for_lazy_react_flow_runtime(self):
        imports = read_import_map()
        self.assertIn(
            "react/",
            imports,
            "React Flow's browser ESM build imports react/jsx-runtime; the import map must map React subpaths",
        )
        self.assertTrue(imports["react/"].endswith("/"))
        self.assertIn("react@19.2.4", imports["react/"])


if __name__ == "__main__":
    unittest.main()
