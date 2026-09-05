import json, os, pathlib, tempfile, unittest
import server

class AgyDebugTests(unittest.TestCase):
    def test_structured_output_is_used_as_raw_response_fallback(self):
        with tempfile.TemporaryDirectory() as d:
            agy=pathlib.Path(d)/'agy'
            agy.write_text("""#!/usr/bin/env python3
import json
print(json.dumps({'event':'init','init':{'model':'fake','agent':'claude-todos-translator'}}),flush=True)
out={'title':'Magyar cím','description':'Magyar leírás'}
print(json.dumps({'event':'result','result':{'status':'SUCCESS','structured_output':out,'usage':{'total_tokens':4}}}),flush=True)
""")
            agy.chmod(0o755)
            out,meta=server.run_agy(str(agy),'PROMPT',{'type':'object'},phase='translator',model='fake',return_meta=True)
            self.assertEqual('Magyar cím',out['title'])
            self.assertIn('Magyar cím',meta['rawResponse'])
            self.assertIn('rawStream',meta)

if __name__=='__main__': unittest.main()
