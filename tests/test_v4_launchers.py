import http.client
import io
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class MockBytesIO(io.BytesIO):
    def close(self):
        pass


class MockSocket:
    def __init__(self, request_bytes=b""):
        self.rfile = io.BytesIO(request_bytes)
        self.wfile = MockBytesIO()

    def makefile(self, mode="r", *args, **kwargs):
        if "b" in mode and "r" in mode:
            return self.rfile
        return self.wfile

    def sendall(self, data):
        self.wfile.write(data)

    def close(self):
        pass


class FakeSocket:
    def __init__(self, data):
        self.data = data

    def makefile(self, *args, **kwargs):
        return io.BytesIO(self.data)


class FakeServer:
    root = ROOT / "client"
    api_base = "http://127.0.0.1:9999"


class LauncherTests(unittest.TestCase):
    def test_scripts_exist_and_do_not_accept_session_id_contract(self):
        server = (ROOT / "start-server.sh").read_text()
        client = (ROOT / "start-client.sh").read_text()
        self.assertIn("server.main", server)
        self.assertNotIn("SESSION_ID=", server)
        self.assertIn("client/serve.py", client)
        self.assertIn("--server-url", client)

    def test_client_spa_fallback_and_api_base_injection(self):
        import client.serve as serve

        sock = MockSocket(b"GET /flow/test HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n")
        serve.ClientHandler(sock, ("127.0.0.1", 12345), FakeServer)
        resp = http.client.HTTPResponse(FakeSocket(sock.wfile.getvalue()))
        resp.begin()
        self.assertEqual(resp.status, 200)
        html = resp.read().decode("utf-8")
        self.assertIn('window.CLAUDE_TODOS_API_BASE="http://127.0.0.1:9999"', html)
        self.assertIn('id="root"', html)

        sock_js = MockSocket(b"GET /src/api.js HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n")
        serve.ClientHandler(sock_js, ("127.0.0.1", 12345), FakeServer)
        resp_js = http.client.HTTPResponse(FakeSocket(sock_js.wfile.getvalue()))
        resp_js.begin()
        self.assertEqual(resp_js.status, 200)
        js = resp_js.read().decode("utf-8")
        self.assertIn("API_BASE", js)


if __name__ == "__main__":
    unittest.main()
