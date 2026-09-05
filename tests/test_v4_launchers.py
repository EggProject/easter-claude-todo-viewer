import pathlib,subprocess,tempfile,threading,time,urllib.request,unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]

class LauncherTests(unittest.TestCase):
    def test_scripts_exist_and_do_not_accept_session_id_contract(self):
        server=(ROOT/'start-server.sh').read_text(); client=(ROOT/'start-client.sh').read_text()
        self.assertIn('server.main',server); self.assertNotIn('SESSION_ID=',server)
        self.assertIn('client/serve.py',client); self.assertIn('--server-url',client)
    def test_client_spa_fallback_and_api_base_injection(self):
        import client.serve as serve
        httpd=serve.make_server('127.0.0.1',0,ROOT/'client','http://127.0.0.1:9999')
        threading.Thread(target=httpd.serve_forever,daemon=True).start()
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{httpd.server_port}/flow/test',timeout=5) as r:
                html=r.read().decode(); self.assertIn('window.CLAUDE_TODOS_API_BASE="http://127.0.0.1:9999"',html); self.assertIn('id="root"',html)
            with urllib.request.urlopen(f'http://127.0.0.1:{httpd.server_port}/src/api.js',timeout=5) as r:
                self.assertIn('API_BASE',r.read().decode())
        finally: httpd.shutdown();httpd.server_close()

if __name__=='__main__': unittest.main()
