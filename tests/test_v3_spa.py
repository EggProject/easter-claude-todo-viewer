import pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]

class SpaTests(unittest.TestCase):
    def test_no_legacy_monolithic_app(self):
        self.assertFalse((ROOT/'client'/'app.js').exists())

    def test_client_serves_html(self):
        import http.client
        import io
        import client.serve as serve

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
            api_base = "http://127.0.0.1:8765"

        sock = MockSocket(b"GET / HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n")
        serve.ClientHandler(sock, ("127.0.0.1", 12345), FakeServer)
        resp = http.client.HTTPResponse(FakeSocket(sock.wfile.getvalue()))
        resp.begin()
        self.assertEqual(resp.status, 200)
        html = resp.read().decode("utf-8")
        self.assertIn('id="root"', html)

class ImportMapRuntimeTests(unittest.TestCase):
    def test_importmap_has_no_malformed_react_dom_prefix_url(self):
        html=(ROOT/'client'/'index.html').read_text()
        self.assertNotIn('react-dom@19.2.4&external=react/',html)
        self.assertIn('react-router@8.3.1?external=react,react-dom',html)

if __name__=='__main__':
    unittest.main()
