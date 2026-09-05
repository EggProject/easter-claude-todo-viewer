import importlib.util
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

class V3SettingsTests(unittest.TestCase):
    def test_v3_defaults_and_legacy_model_migration(self):
        spec=importlib.util.spec_from_file_location('v3settings',ROOT/'claude_todos'/'settings.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
        with tempfile.TemporaryDirectory() as d:
            path=pathlib.Path(d)/'config.json';path.write_text('{"translation":{"model":"gemini-3.7-flash-high"}}')
            cfg=m.AppSettingsStore(path).load()
            self.assertEqual(3,cfg['version']);self.assertTrue(cfg['prompts']['autoMigrate'])
            self.assertEqual('gemini-3.7-flash-high',cfg['translation']['agy']['model']);self.assertNotIn('model',cfg['translation'])
            self.assertEqual('agy',cfg['translation']['provider'])
            self.assertEqual('http://127.0.0.1:8000',cfg['translation']['anthropic']['baseUrl'])

class V3PromptTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.home = pathlib.Path(self.tmp.name)
        spec = importlib.util.spec_from_file_location('v3prompts', ROOT/'claude_todos'/'prompts.py')
        self.mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(self.mod)

    def tearDown(self): self.tmp.cleanup()

    def test_bootstrap_and_metadata(self):
        mgr = self.mod.PromptManager(self.home/'prompts', ROOT/'claude_todos'/'builtin_prompts', auto_migrate=True)
        states = mgr.ensure()
        self.assertEqual({'translator-agent','translator-request','validator-agent','validator-request'}, set(states))
        p = self.home/'prompts'/'translator-request.md'
        text = p.read_text()
        self.assertIn('promptId: translator-request', text)
        self.assertIn('builtinVersion:', text)
        self.assertIn('{{source_title}}', text)

    def test_translator_builtin_has_technical_few_shot_guidance(self):
        body=(ROOT/'claude_todos'/'builtin_prompts'/'translator-agent'/'v1.md').read_text()
        self.assertIn('neutral technical task style', body)
        self.assertIn('Build the socket URL helper', body)
        self.assertIn('<keep', body)

    def test_unmodified_prompt_auto_migrates_and_creates_backup(self):
        import shutil
        builtins=self.home/'builtins'; shutil.copytree(ROOT/'claude_todos'/'builtin_prompts', builtins)
        mgr=self.mod.PromptManager(self.home/'prompts', builtins, auto_migrate=True);mgr.ensure()
        v1=builtins/'translator-request'/'v1.md';body=v1.read_text().replace('Translate ONLY','Translate STRICTLY ONLY').replace('builtinVersion: 1','builtinVersion: 2')
        (builtins/'translator-request'/'v2.md').write_text(body)
        st=self.mod.PromptManager(self.home/'prompts',builtins,auto_migrate=True).ensure()['translator-request']
        self.assertEqual(2,st['installedVersion']);self.assertIn('STRICTLY',st['body'])
        self.assertTrue(any((self.home/'prompts'/'backups').glob('*')))

    def test_auto_migrate_false_reports_update_without_overwrite(self):
        import shutil
        builtins=self.home/'builtins'; shutil.copytree(ROOT/'claude_todos'/'builtin_prompts', builtins)
        mgr=self.mod.PromptManager(self.home/'prompts', builtins, auto_migrate=True);mgr.ensure()
        before=(self.home/'prompts'/'translator-request.md').read_text()
        v1=builtins/'translator-request'/'v1.md';(builtins/'translator-request'/'v2.md').write_text(v1.read_text().replace('builtinVersion: 1','builtinVersion: 2').replace('Translate ONLY','Translate NEW'))
        st=self.mod.PromptManager(self.home/'prompts',builtins,auto_migrate=False).ensure()['translator-request']
        self.assertEqual('update_available',st['status']);self.assertEqual(before,(self.home/'prompts'/'translator-request.md').read_text())

    def test_custom_prompt_is_not_overwritten_on_conflict(self):
        mgr = self.mod.PromptManager(self.home/'prompts', ROOT/'claude_todos'/'builtin_prompts', auto_migrate=True)
        mgr.ensure()
        p=self.home/'prompts'/'translator-request.md'; before=p.read_text(); p.write_text(before.replace('Translate ONLY','Translate ABSOLUTELY ONLY'))
        # Simulate a newer builtin touching same line.
        builtins=self.home/'builtins'; import shutil; shutil.copytree(ROOT/'claude_todos'/'builtin_prompts', builtins)
        v1=builtins/'translator-request'/'v1.md'; body=v1.read_text().replace('Translate ONLY','Translate STRICTLY ONLY')
        (builtins/'translator-request'/'v2.md').write_text(body.replace('builtinVersion: 1','builtinVersion: 2'))
        mgr2=self.mod.PromptManager(self.home/'prompts', builtins, auto_migrate=True)
        st=mgr2.ensure()['translator-request']
        self.assertEqual('conflict', st['status'])
        self.assertIn('ABSOLUTELY', p.read_text())
        self.assertTrue((self.home/'prompts'/'conflicts').exists())
        detail=mgr2.get('translator-request')
        self.assertTrue(detail['conflicts'])
        self.assertIn('<<<<<<<', detail['conflicts'][0]['content'])

if __name__=='__main__': unittest.main()

class V3PromptContractTests(unittest.TestCase):
    def test_translator_request_does_not_duplicate_source_as_json(self):
        root=pathlib.Path(__file__).resolve().parents[1]/'claude_todos'/'builtin_prompts'
        body=(root/'translator-request'/'v1.md').read_text(encoding='utf-8')
        self.assertNotIn('{{protected_source_json}}',body)
        from claude_todos.prompts import REQUIRED_VARS
        self.assertEqual(REQUIRED_VARS['translator-request'],{'source_title','source_description'})

def _v3_clean_merge_test(self):
    import shutil
    builtins=self.home/'builtins-clean'; shutil.copytree(ROOT/'claude_todos'/'builtin_prompts',builtins)
    mgr=self.mod.PromptManager(self.home/'prompts-clean',builtins,auto_migrate=True);mgr.ensure()
    p=self.home/'prompts-clean'/'translator-request.md'
    current=p.read_text().replace('Do not summarize, improve, simplify, expand, omit, or add information.','Do not summarize, improve, simplify, expand, omit, add, or editorialize information.')
    p.write_text(current)
    v1=builtins/'translator-request'/'v1.md'
    incoming=v1.read_text().replace('builtinVersion: 1','builtinVersion: 2').replace('Return only a JSON object','Return strictly only a JSON object')
    (builtins/'translator-request'/'v2.md').write_text(incoming)
    st=self.mod.PromptManager(self.home/'prompts-clean',builtins,auto_migrate=True).ensure()['translator-request']
    self.assertEqual(2,st['installedVersion']);self.assertEqual('modified',st['status'])
    self.assertIn('editorialize',st['body']);self.assertIn('strictly only',st['body'])
V3PromptTests.test_custom_prompt_clean_three_way_merge=_v3_clean_merge_test
