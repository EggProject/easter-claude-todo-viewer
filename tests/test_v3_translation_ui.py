import pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class TranslationUiTests(unittest.TestCase):
    def test_translation_debug_is_human_sectioned(self):
        s=(ROOT/'client/src/pages/translations.js').read_text()
        for marker in ['🔌 Provider','🌍 Translator instructions','✉️ Exact prompt sent','📤 Exact model output','🧩 Parsed translation','✅ Deterministic checks','🔎 Validator instructions','🧾 Validator verdict','🧮 Translator tokens']:
            self.assertIn(marker,s)
        self.assertNotIn('JSON.stringify(job',s)
    def test_prompt_and_settings_controls_exist(self):
        p=(ROOT/'client/src/pages/prompts.js').read_text(); st=(ROOT/'client/src/pages/settings.js').read_text()
        for text in ['Prompt files','💾 Save','Restore builtin','Diff vs builtin','Check / migrate updates']:
            self.assertIn(text,p)
        for text in ['Anthropic-compatible API','Refresh models','Test connection','Automatically migrate built-in prompt updates',"getJSON('/api/providers/anthropic/models')"]:
            self.assertIn(text,st)
    def test_translation_table_exposes_provider_sort_filter_retry_delete(self):
        s=(ROOT/'client/src/pages/translations.js').read_text()
        for text in ['Filter every translation field','provider','↻ Retry','🗑 Delete','getSortedRowModel','getToggleSortingHandler']:
            self.assertIn(text,s)
if __name__=='__main__':unittest.main()

class TranslationResponsePresentationTests(unittest.TestCase):
    def test_exact_model_output_is_humanized_before_raw_provider_payload(self):
        page=(ROOT/'client'/'src'/'pages'/'translations.js').read_text()
        self.assertIn('humanModelOutput',page)
        self.assertIn('Raw provider payload',page)
        self.assertNotIn("section('📤 Exact model output',t.rawResponse)",page)
