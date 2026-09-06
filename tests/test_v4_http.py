import http.client
import io
import json
import pathlib
import tempfile
import unittest
from unittest import mock

from server.multi_runtime import DaemonConfig, MultiSessionRuntime
from server.http_api import make_handler

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


class HeaderDict(dict):
    def __getitem__(self, key):
        if key in self:
            return super().__getitem__(key)
        for k, v in self.items():
            if k.lower() == key.lower():
                return v
        return super().__getitem__(key)

    def get(self, key, default=None):
        try:
            return self[key]
        except KeyError:
            return default


class HttpTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        b = pathlib.Path(self.tmp.name)
        ch = b / "claude"
        p = ch / "projects" / "p"
        p.mkdir(parents=True)
        (ch / "tasks").mkdir()
        (p / "S.jsonl").write_text(
            json.dumps({"timestamp": "2026-09-05T12:00:00Z", "cwd": "/work/s", "type": "user", "message": {"content": "Hello"}}) + "\n",
            encoding="utf-8",
        )
        cfg = DaemonConfig(
            claude_home=ch,
            cache_root=b / "cache",
            settings_file=b / "config.json",
            app_state_file=b / "app-state.json",
            log_root=b / "logs",
            client_origins=["http://127.0.0.1:8766"],
            port=0,
        )
        self.rt = MultiSessionRuntime(cfg, start_background=False)
        self.handler_cls = make_handler(self.rt)

    def tearDown(self):
        self.rt.close()
        self.tmp.cleanup()

    def request(self, method, path, payload=None, origin="http://127.0.0.1:8766"):
        headers = {"Host": "127.0.0.1:8766", "Connection": "close"}
        if origin:
            headers["Origin"] = origin
        body_bytes = b""
        if payload is not None:
            body_bytes = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
            headers["Content-Length"] = str(len(body_bytes))

        req_lines = [f"{method} {path} HTTP/1.1"]
        for k, v in headers.items():
            req_lines.append(f"{k}: {v}")
        req_bytes = "\r\n".join(req_lines).encode("utf-8") + b"\r\n\r\n" + body_bytes

        sock = MockSocket(req_bytes)
        self.handler_cls(sock, ("127.0.0.1", 8766), mock.MagicMock())
        raw_out = sock.wfile.getvalue()
        resp = http.client.HTTPResponse(FakeSocket(raw_out))
        resp.begin()
        raw = resp.read()
        data = json.loads(raw.decode("utf-8")) if raw else None
        return resp.status, data, HeaderDict(resp.headers)

    def test_cors_guard_and_sessions_overview(self):
        st, data, h = self.request("GET", "/api/sessions")
        self.assertEqual(200, st)
        self.assertEqual("S", data["currentSessionId"])
        self.assertEqual("http://127.0.0.1:8766", h["Access-Control-Allow-Origin"])
        st, data, _ = self.request("POST", "/api/sessions/S/switch", {})
        self.assertEqual(200, st)
        self.assertEqual("S", data["currentSessionId"])
        st, data, _ = self.request("DELETE", "/api/sessions/S/watch")
        self.assertEqual(200, st)
        self.assertIn("S", data["watchedSessionIds"])
        st, data, _ = self.request("GET", "/api/sessions", origin="http://evil.test")
        self.assertEqual(403, st)

    test_sessions_switch_watch_and_cors = test_cors_guard_and_sessions_overview

    def test_session_scoped_state_history_language_and_flow(self):
        st, data, _ = self.request("GET", "/api/state?sessionIds=S")
        self.assertEqual(200, st)
        self.assertEqual("S", data["currentSessionId"])
        st, data, _ = self.request("POST", "/api/sessions/S/language", {"language": "en"})
        self.assertEqual(202, st)
        self.assertEqual("en", data["globalLanguage"])
        st, data, _ = self.request("POST", "/api/sessions/S/flow-layout", {"nodes": {"x": {"x": 1, "y": 2}}})
        self.assertEqual(200, st)
        st, data, _ = self.request("GET", "/api/sessions/S/flow-layout")
        self.assertEqual(1.0, data["nodes"]["x"]["x"])

    def test_sessions_snapshot_is_fast_and_explicit_refresh_discovers_new_transcript(self):
        p = pathlib.Path(self.rt.claude_home) / "projects" / "p" / "NEW.jsonl"
        p.write_text(
            json.dumps({"timestamp": "2026-09-05T13:00:00Z", "cwd": "/work/new", "type": "user", "message": {"content": "New prompt"}}) + "\n",
            encoding="utf-8",
        )
        st, data, _ = self.request("GET", "/api/sessions")
        self.assertEqual(200, st)
        self.assertNotIn("NEW", {row["id"] for row in data["sessions"]})
        st, data, _ = self.request("POST", "/api/sessions/refresh", {})
        self.assertEqual(200, st)
        self.assertIn("NEW", {row["id"] for row in data["sessions"]})

    def test_global_settings_not_session_specific(self):
        st, data, _ = self.request("GET", "/api/settings")
        self.assertEqual(200, st)
        self.assertIn("translation", data)
        st, data, _ = self.request(
            "POST",
            "/api/settings",
            {"translation": {"provider": "agy", "agy": {"model": "gemini-3.8-flash-high", "maxConcurrency": 3}}},
        )
        self.assertEqual(200, st)
        self.assertEqual(3, data["translation"]["agy"]["maxConcurrency"])


if __name__ == "__main__":
    unittest.main()
