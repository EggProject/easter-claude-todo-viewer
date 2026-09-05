import importlib.util, pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('tr',ROOT/'claude_todos'/'translation.py');tr=importlib.util.module_from_spec(spec)
try: spec.loader.exec_module(tr)
except FileNotFoundError: pass

class TranslationTests(unittest.TestCase):
    def test_line_wrap_is_not_markdown_failure(self):
        src={'title':'Build K8 helper','description':'Paragraph with `file.ts` and enough text on one line.'}
        dst={'title':'K8 segéd létrehozása','description':'Bekezdés a `file.ts` elemmel és elegendő szöveggel\nkét fizikai sorban.'}
        self.assertNotIn('Markdown structure changed',';'.join(tr.deterministic_translation_issues(src,dst)))
    def test_visible_protection_keeps_literal_context(self):
        source={'title':'Build K8 helper','description':'Read `05-editor-shell.md` section 5.1.'}
        protected,mapping=tr.protect_source(source)
        self.assertIn('05-editor-shell.md', protected['description'])
        self.assertIn('<keep', protected['description'])
        restored,issues=tr.restore_protected_spans({'title':protected['title'],'description':protected['description']},mapping)
        self.assertEqual([],issues)
        self.assertIn('`05-editor-shell.md`',restored['description'])

if __name__=='__main__':unittest.main()
