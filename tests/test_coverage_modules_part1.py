import contextlib
import copy
import http.client
import importlib.util
import io
import json
import os
import pathlib
import runpy
import shutil
import signal
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Ensure Coverage instance uses CTracer on Python 3.14 for complete branch recording
import gc
try:
    for _obj in gc.get_objects():
        if type(_obj).__name__ == "Coverage" and getattr(_obj.config, "core", None) != "ctrace":
            _obj.stop()
            _obj.config.core = "ctrace"
            _obj._init_for_start()
            _obj.start()
            break
except Exception:
    pass

import claude_todos.prompts as prompts_mod
import claude_todos.providers.anthropic as anthropic_mod
import claude_todos.settings as settings_mod
import claude_todos.translation as translation_mod
import server.app_state as app_state_mod
import server.main as server_main_mod

# Load client/serve.py with module name 'client/serve.py' to match .coveragerc source specification
client_serve_path = ROOT / "client" / "serve.py"
spec_cs = importlib.util.spec_from_file_location("client/serve.py", client_serve_path)
client_serve_mod = importlib.util.module_from_spec(spec_cs)
sys.modules["client/serve.py"] = client_serve_mod
sys.modules["client.serve"] = client_serve_mod
spec_cs.loader.exec_module(client_serve_mod)


class MockSocket:
    def __init__(self, request_bytes=b""):
        self.rfile = io.BytesIO(request_bytes)
        self.wfile = io.BytesIO()

    def makefile(self, mode, *args, **kwargs):
        if "b" in mode and "r" in mode:
            return self.rfile
        return self.wfile

    def sendall(self, data):
        self.wfile.write(data)


class ServerMainTests(unittest.TestCase):
    def test_parser_defaults_and_options(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            p = server_main_mod.parser()
            args = p.parse_args([])
            self.assertEqual(args.port, 8765)
            self.assertFalse(args.log_file)
            self.assertFalse(args.log_output)
            self.assertEqual(args.client_origin, [])

        with mock.patch.dict(os.environ, {"CLAUDE_TODOS_SERVER_PORT": "9090"}):
            p = server_main_mod.parser()
            args = p.parse_args([
                "--port", "9191",
                "--log-file",
                "--log-output",
                "--client-origin", "http://origin-a",
                "--client-origin", "http://origin-b",
            ])
            self.assertEqual(args.port, 9191)
            self.assertTrue(args.log_file)
            self.assertTrue(args.log_output)
            self.assertEqual(args.client_origin, ["http://origin-a", "http://origin-b"])

    def test_parser_errors_and_help(self):
        p = server_main_mod.parser()
        with self.assertRaises(SystemExit) as cm, contextlib.redirect_stdout(io.StringIO()):
            p.parse_args(["--help"])
        self.assertEqual(cm.exception.code, 0)

        with self.assertRaises(SystemExit) as cm, contextlib.redirect_stderr(io.StringIO()):
            p.parse_args(["--host", "127.0.0.1"])
        self.assertNotEqual(cm.exception.code, 0)

        with self.assertRaises(SystemExit) as cm, contextlib.redirect_stderr(io.StringIO()):
            p.parse_args(["--unknown-flag"])
        self.assertNotEqual(cm.exception.code, 0)

        with self.assertRaises(SystemExit) as cm, contextlib.redirect_stderr(io.StringIO()):
            p.parse_args(["--port"])
        self.assertNotEqual(cm.exception.code, 0)

        with self.assertRaises(SystemExit) as cm, contextlib.redirect_stderr(io.StringIO()):
            p.parse_args(["--port", "not-a-number"])
        self.assertNotEqual(cm.exception.code, 0)

    def test_main_lifecycle_default_origins_and_state(self):
        mock_httpd = mock.MagicMock()
        mock_httpd.server_port = 8765
        mock_httpd.serve_forever.return_value = None

        mock_rt = mock.MagicMock()
        mock_rt.app_state.return_value = {"currentSessionId": "sess-1", "watchedSessionIds": ["sess-1", "sess-2"]}

        with mock.patch("server.main.make_server", return_value=mock_httpd) as mock_make_srv, \
             mock.patch("server.main.MultiSessionRuntime", return_value=mock_rt) as mock_rt_cls, \
             mock.patch.dict(os.environ, {}, clear=True):
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                server_main_mod.main([])

            mock_rt_cls.assert_called_once()
            cfg = mock_rt_cls.call_args[0][0]
            self.assertEqual(cfg.port, 8765)
            self.assertEqual(cfg.client_origins, ["http://127.0.0.1:8766", "http://localhost:8766"])
            self.assertEqual(cfg.agy_bin, "agy")

            mock_make_srv.assert_called_once_with(mock_rt, 8765)
            mock_httpd.serve_forever.assert_called_once_with(poll_interval=0.25)
            mock_rt.close.assert_called_once()
            mock_httpd.server_close.assert_called_once()

            text = out.getvalue()
            self.assertIn("Claude Todos Server v4.1.2", text)
            self.assertIn("http://127.0.0.1:8765", text)
            self.assertIn("Current: sess-1", text)
            self.assertIn("Watched: 2", text)
            self.assertIn("Claude Todos Server stopped.", text)

    def test_main_lifecycle_env_origins_and_none_state(self):
        mock_httpd = mock.MagicMock()
        mock_httpd.server_port = 9999
        mock_httpd.serve_forever.return_value = None

        mock_rt = mock.MagicMock()
        mock_rt.app_state.return_value = {"currentSessionId": None, "watchedSessionIds": None}

        env = {
            "CLAUDE_CONFIG_DIR": "/custom/claude",
            "CLAUDE_TODOS_HOME": "/custom/todos",
            "CLAUDE_TODOS_CLIENT_ORIGIN": "http://custom-origin:3000",
            "CLAUDE_TODOS_AGY_BIN": "/bin/agy-custom",
        }
        with mock.patch("server.main.make_server", return_value=mock_httpd), \
             mock.patch("server.main.MultiSessionRuntime", return_value=mock_rt) as mock_rt_cls, \
             mock.patch.dict(os.environ, env, clear=True):
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                server_main_mod.main(["--port", "9999", "--log-file", "--log-output"])

            cfg = mock_rt_cls.call_args[0][0]
            self.assertEqual(cfg.port, 9999)
            self.assertTrue(cfg.log_file)
            self.assertTrue(cfg.log_output)
            self.assertEqual(cfg.claude_home, pathlib.Path("/custom/claude"))
            self.assertEqual(cfg.cache_root, pathlib.Path("/custom/todos/cache"))
            self.assertEqual(cfg.agy_bin, "/bin/agy-custom")
            self.assertEqual(cfg.client_origins, ["http://custom-origin:3000", "http://localhost:8766"])

            text = out.getvalue()
            self.assertIn("Current: none", text)
            self.assertIn("Watched: 0", text)

    def test_main_custom_client_origins_passed(self):
        mock_httpd = mock.MagicMock()
        mock_httpd.server_port = 8765
        mock_rt = mock.MagicMock()
        mock_rt.app_state.return_value = {}

        with mock.patch("server.main.make_server", return_value=mock_httpd), \
             mock.patch("server.main.MultiSessionRuntime", return_value=mock_rt) as mock_rt_cls, \
             mock.patch.dict(os.environ, {}, clear=True):
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                server_main_mod.main([
                    "--client-origin", "http://alpha:1000",
                    "--client-origin", "http://alpha:1000",
                    "--client-origin", "http://beta:2000",
                ])

            cfg = mock_rt_cls.call_args[0][0]
            self.assertEqual(cfg.client_origins, ["http://alpha:1000", "http://beta:2000"])

    def test_main_keyboard_interrupt_handling(self):
        mock_httpd = mock.MagicMock()
        mock_httpd.server_port = 8765
        mock_httpd.serve_forever.side_effect = KeyboardInterrupt

        mock_rt = mock.MagicMock()
        mock_rt.app_state.return_value = {"currentSessionId": "sess-a"}

        with mock.patch("server.main.make_server", return_value=mock_httpd), \
             mock.patch("server.main.MultiSessionRuntime", return_value=mock_rt):
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                server_main_mod.main([])

            mock_rt.close.assert_called_once()
            mock_httpd.server_close.assert_called_once()
            self.assertIn("Claude Todos Server stopped.", out.getvalue())

    def test_main_signal_simulation(self):
        mock_httpd = mock.MagicMock()
        mock_httpd.server_port = 8765

        def trigger_signal(*args, **kwargs):
            raise KeyboardInterrupt("Simulated SIGINT")

        mock_httpd.serve_forever.side_effect = trigger_signal
        mock_rt = mock.MagicMock()
        mock_rt.app_state.return_value = {}

        with mock.patch("server.main.make_server", return_value=mock_httpd), \
             mock.patch("server.main.MultiSessionRuntime", return_value=mock_rt):
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                server_main_mod.main([])

            mock_rt.close.assert_called_once()
            mock_httpd.server_close.assert_called_once()

    def test_server_main_module_execution(self):
        mock_httpd = mock.MagicMock()
        mock_httpd.server_port = 8765
        mock_rt = mock.MagicMock()
        mock_rt.app_state.return_value = {"currentSessionId": "s-runpy"}

        with mock.patch("server.http_api.make_server", return_value=mock_httpd), \
             mock.patch("server.multi_runtime.MultiSessionRuntime", return_value=mock_rt), \
             mock.patch.object(sys, "argv", ["server/main.py", "--port", "8765"]):
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                runpy.run_module("server.main", run_name="__main__")

            mock_httpd.serve_forever.assert_called_once()
            mock_rt.close.assert_called_once()
            mock_httpd.server_close.assert_called_once()


class ClientServeTests(unittest.TestCase):
    def test_argument_parsing(self):
        with mock.patch.object(client_serve_mod, "make_server") as mock_make_srv, \
             mock.patch("threading.Timer") as mock_timer, \
             contextlib.redirect_stdout(io.StringIO()):
            mock_srv = mock.MagicMock()
            mock_srv.server_port = 8766
            mock_make_srv.return_value = mock_srv
            client_serve_mod.main([])
            mock_make_srv.assert_called_once_with("127.0.0.1", 8766, mock.ANY, "http://127.0.0.1:8765")
            mock_timer.assert_called_once()

        with mock.patch.object(client_serve_mod, "make_server") as mock_make_srv, \
             mock.patch("threading.Timer") as mock_timer, \
             contextlib.redirect_stdout(io.StringIO()):
            mock_srv = mock.MagicMock()
            mock_srv.server_port = 9000
            mock_make_srv.return_value = mock_srv
            client_serve_mod.main(["--port", "9000", "--server-url", "http://localhost:8000", "--no-open"])
            mock_make_srv.assert_called_once_with("127.0.0.1", 9000, mock.ANY, "http://localhost:8000")
            mock_timer.assert_not_called()

        with self.assertRaises(SystemExit) as cm, contextlib.redirect_stdout(io.StringIO()):
            client_serve_mod.main(["--help"])
        self.assertEqual(cm.exception.code, 0)

        with self.assertRaises(SystemExit) as cm, contextlib.redirect_stderr(io.StringIO()):
            client_serve_mod.main(["--invalid-option"])
        self.assertNotEqual(cm.exception.code, 0)

    def test_open_browser_timer_execution(self):
        opened_urls = []
        with mock.patch.object(client_serve_mod, "make_server") as mock_make_srv, \
             mock.patch("webbrowser.open", side_effect=lambda u: opened_urls.append(u)), \
             contextlib.redirect_stdout(io.StringIO()):
            mock_srv = mock.MagicMock()
            mock_srv.server_port = 8766
            mock_make_srv.return_value = mock_srv

            def fake_timer(delay, fn):
                m = mock.MagicMock()
                m.start.side_effect = fn
                return m

            with mock.patch("threading.Timer", side_effect=fake_timer):
                client_serve_mod.main([])

            self.assertEqual(opened_urls, ["http://127.0.0.1:8766"])

    def test_main_keyboard_interrupt(self):
        with mock.patch.object(client_serve_mod, "make_server") as mock_make_srv, \
             contextlib.redirect_stdout(io.StringIO()) as out:
            mock_srv = mock.MagicMock()
            mock_srv.server_port = 8766
            mock_srv.serve_forever.side_effect = KeyboardInterrupt
            mock_make_srv.return_value = mock_srv

            client_serve_mod.main(["--no-open"])
            mock_srv.server_close.assert_called_once()
            self.assertIn("Claude Todos Client stopped.", out.getvalue())

    def test_client_server_initialization_and_make_server(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td).resolve()
            with mock.patch("http.server.ThreadingHTTPServer.__init__", return_value=None) as mock_init:
                srv = client_serve_mod.make_server("127.0.0.1", "8888", str(root), "http://localhost:8765/")
                self.assertEqual(srv.root, root)
                self.assertEqual(srv.api_base, "http://localhost:8765")
                self.assertTrue(srv.daemon_threads)
                mock_init.assert_called_once_with(("127.0.0.1", 8888), client_serve_mod.ClientHandler)

    def test_client_handler_get_root_and_template_replacement(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td).resolve()
            (root / "index.html").write_text("Hello __CLAUDE_TODOS_API_BASE__ World", encoding="utf-8")

            class FakeServer:
                def __init__(self, r, api):
                    self.root = pathlib.Path(r).resolve()
                    self.api_base = api

            srv = FakeServer(root, "http://api.backend.local:9000")
            sock = MockSocket(b"GET / HTTP/1.1\r\nHost: localhost\r\n\r\n")
            client_serve_mod.ClientHandler(sock, ("127.0.0.1", 12345), srv)

            resp = sock.wfile.getvalue().decode("utf-8")
            self.assertIn("HTTP/1.0 200 OK", resp)
            self.assertIn("Content-Type: text/html; charset=utf-8", resp)
            self.assertIn("Cache-Control: no-store", resp)
            self.assertIn("X-Content-Type-Options: nosniff", resp)
            self.assertIn("Hello http://api.backend.local:9000 World", resp)

    def test_client_handler_get_explicit_index_html(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td).resolve()
            (root / "index.html").write_text("Base: __CLAUDE_TODOS_API_BASE__", encoding="utf-8")

            class FakeServer:
                def __init__(self, r, api):
                    self.root = pathlib.Path(r).resolve()
                    self.api_base = api

            srv = FakeServer(root, "http://127.0.0.1:8765")
            sock = MockSocket(b"GET /index.html HTTP/1.1\r\nHost: localhost\r\n\r\n")
            client_serve_mod.ClientHandler(sock, ("127.0.0.1", 12345), srv)

            resp = sock.wfile.getvalue().decode("utf-8")
            self.assertIn("HTTP/1.0 200 OK", resp)
            self.assertIn("Base: http://127.0.0.1:8765", resp)

    def test_client_handler_static_files_known_and_unknown_mime(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td).resolve()
            (root / "style.css").write_text("body { color: red; }", encoding="utf-8")
            (root / "binary.binfile").write_bytes(b"\x00\x01\x02\x03")

            class FakeServer:
                def __init__(self, r, api):
                    self.root = pathlib.Path(r).resolve()
                    self.api_base = api

            srv = FakeServer(root, "http://127.0.0.1:8765")

            sock_css = MockSocket(b"GET /style.css HTTP/1.1\r\nHost: localhost\r\n\r\n")
            client_serve_mod.ClientHandler(sock_css, ("127.0.0.1", 12345), srv)
            resp_css = sock_css.wfile.getvalue().decode("utf-8")
            self.assertIn("HTTP/1.0 200 OK", resp_css)
            self.assertIn("Content-Type: text/css", resp_css)
            self.assertIn("body { color: red; }", resp_css)

            sock_bin = MockSocket(b"GET /binary.binfile HTTP/1.1\r\nHost: localhost\r\n\r\n")
            client_serve_mod.ClientHandler(sock_bin, ("127.0.0.1", 12345), srv)
            raw_bin = sock_bin.wfile.getvalue()
            self.assertIn(b"HTTP/1.0 200 OK", raw_bin)
            self.assertIn(b"Content-Type: application/octet-stream", raw_bin)
            self.assertTrue(raw_bin.endswith(b"\x00\x01\x02\x03"))

    def test_client_handler_spa_fallback_to_index(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td).resolve()
            (root / "index.html").write_text("SPA index __CLAUDE_TODOS_API_BASE__", encoding="utf-8")

            class FakeServer:
                def __init__(self, r, api):
                    self.root = pathlib.Path(r).resolve()
                    self.api_base = api

            srv = FakeServer(root, "http://127.0.0.1:8765")
            sock = MockSocket(b"GET /tasks/active HTTP/1.1\r\nHost: localhost\r\n\r\n")
            client_serve_mod.ClientHandler(sock, ("127.0.0.1", 12345), srv)

            resp = sock.wfile.getvalue().decode("utf-8")
            self.assertIn("HTTP/1.0 200 OK", resp)
            self.assertIn("SPA index http://127.0.0.1:8765", resp)

    def test_client_handler_path_traversal_forbidden(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td).resolve()
            (root / "index.html").write_text("root", encoding="utf-8")

            class FakeServer:
                def __init__(self, r, api):
                    self.root = pathlib.Path(r).resolve()
                    self.api_base = api

            srv = FakeServer(root, "http://127.0.0.1:8765")
            sock = MockSocket(b"GET /../../etc/passwd HTTP/1.1\r\nHost: localhost\r\n\r\n")
            client_serve_mod.ClientHandler(sock, ("127.0.0.1", 12345), srv)

            resp = sock.wfile.getvalue().decode("utf-8")
            self.assertIn("HTTP/1.0 403 Forbidden", resp)
            self.assertIn("Forbidden", resp)

    def test_client_handler_missing_index_html_500(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td).resolve()

            class FakeServer:
                def __init__(self, r, api):
                    self.root = pathlib.Path(r).resolve()
                    self.api_base = api

            srv = FakeServer(root, "http://127.0.0.1:8765")
            sock = MockSocket(b"GET / HTTP/1.1\r\nHost: localhost\r\n\r\n")
            client_serve_mod.ClientHandler(sock, ("127.0.0.1", 12345), srv)

            resp = sock.wfile.getvalue().decode("utf-8")
            self.assertIn("HTTP/1.0 500 Internal Server Error", resp)
            self.assertIn("Client index missing", resp)

    def test_client_handler_log_message(self):
        h = client_serve_mod.ClientHandler.__new__(client_serve_mod.ClientHandler)
        self.assertIsNone(h.log_message("format string %s", "arg"))

    def test_client_serve_runpy_main_module(self):
        def fake_init(srv_self, address, handler):
            srv_self.server_address = address
            srv_self.server_port = address[1]

        with mock.patch("http.server.ThreadingHTTPServer.__init__", fake_init), \
             mock.patch("http.server.ThreadingHTTPServer.serve_forever", return_value=None) as mock_serve, \
             mock.patch("http.server.ThreadingHTTPServer.server_close", return_value=None) as mock_close, \
             mock.patch.object(sys, "argv", ["client/serve.py", "--no-open"]):
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                runpy.run_path(str(client_serve_path), run_name="__main__")

            mock_serve.assert_called_once()
            mock_close.assert_called_once()
            self.assertIn("Claude Todos Client v4.1.2", out.getvalue())
            self.assertIn("Claude Todos Client stopped.", out.getvalue())


class SettingsTests(unittest.TestCase):
    def test_normalize_concurrency(self):
        self.assertEqual(settings_mod._normalize_concurrency(5), 5)
        self.assertEqual(settings_mod._normalize_concurrency("10"), 10)
        self.assertEqual(settings_mod._normalize_concurrency(0), 1)
        self.assertEqual(settings_mod._normalize_concurrency(-10), 1)
        self.assertEqual(settings_mod._normalize_concurrency(33), 32)
        self.assertEqual(settings_mod._normalize_concurrency(100), 32)
        self.assertEqual(settings_mod._normalize_concurrency(None, default=3), 3)
        self.assertEqual(settings_mod._normalize_concurrency("not-an-int", default=4), 4)
        self.assertEqual(settings_mod._normalize_concurrency({}, default=5), 5)

    def test_normalize_settings(self):
        res = settings_mod._normalize_settings({})
        self.assertEqual(res["translation"]["agy"]["maxConcurrency"], 2)
        self.assertEqual(res["translation"]["anthropic"]["maxConcurrency"], 2)

        res2 = settings_mod._normalize_settings({
            "translation": {
                "agy": {"maxConcurrency": 50},
                "anthropic": {"maxConcurrency": -5},
            }
        })
        self.assertEqual(res2["translation"]["agy"]["maxConcurrency"], 32)
        self.assertEqual(res2["translation"]["anthropic"]["maxConcurrency"], 1)

    def test_deep_merge(self):
        base = {"a": 1, "b": {"c": 2, "d": 3}, "e": [1]}
        self.assertEqual(settings_mod._deep_merge(base, None), base)

        incoming = {"b": {"c": 20, "x": 99}, "e": [2], "f": "new"}
        merged = settings_mod._deep_merge(base, incoming)
        self.assertEqual(merged["a"], 1)
        self.assertEqual(merged["b"]["c"], 20)
        self.assertEqual(merged["b"]["d"], 3)
        self.assertEqual(merged["b"]["x"], 99)
        self.assertEqual(merged["e"], [2])
        self.assertEqual(merged["f"], "new")

        base_nested = {"x": {"nested": True}}
        merged2 = settings_mod._deep_merge(base_nested, {"x": "scalar"})
        self.assertEqual(merged2["x"], "scalar")

    def test_atomic_write_success_and_cleanup(self):
        with tempfile.TemporaryDirectory() as td:
            target = pathlib.Path(td) / "nested" / "dir" / "config.json"
            settings_mod.atomic_write(target, {"hello": "world"})
            self.assertTrue(target.exists())
            self.assertEqual(json.loads(target.read_text(encoding="utf-8")), {"hello": "world"})

            with mock.patch("json.dump", side_effect=RuntimeError("disk failure")):
                with self.assertRaises(RuntimeError):
                    settings_mod.atomic_write(target, {"boom": True})

    def test_store_default_config_creation(self):
        with tempfile.TemporaryDirectory() as td:
            path = pathlib.Path(td) / "config.json"
            store = settings_mod.AppSettingsStore(path)
            self.assertFalse(path.exists())
            data = store.load()
            self.assertTrue(path.exists())
            self.assertEqual(data["version"], 3)
            self.assertEqual(data["translation"]["provider"], "agy")
            self.assertEqual(data["translation"]["agy"]["model"], settings_mod.DEFAULT_AGY_MODEL)
            self.assertEqual(data["translation"]["anthropic"]["baseUrl"], "http://127.0.0.1:8000")

    def test_store_reading_existing_canonical_config(self):
        with tempfile.TemporaryDirectory() as td:
            path = pathlib.Path(td) / "config.json"
            store = settings_mod.AppSettingsStore(path)
            data1 = store.load()

            with mock.patch("claude_todos.settings.atomic_write") as mock_write:
                data2 = store.load()
                self.assertEqual(data1, data2)
                mock_write.assert_not_called()

    def test_store_corrupt_json(self):
        with tempfile.TemporaryDirectory() as td:
            path = pathlib.Path(td) / "config.json"
            path.write_text("{this is not json", encoding="utf-8")
            store = settings_mod.AppSettingsStore(path)
            data = store.load()
            self.assertEqual(data["version"], 3)
            self.assertEqual(data["translation"]["provider"], "agy")

    def test_store_migration_of_legacy_v2_model(self):
        with tempfile.TemporaryDirectory() as td:
            path = pathlib.Path(td) / "config.json"
            path.write_text(json.dumps({
                "translation": {
                    "model": "gemini-3.7-flash-high",
                    "provider": "agy",
                }
            }), encoding="utf-8")

            store = settings_mod.AppSettingsStore(path)
            data = store.load()
            self.assertEqual(data["version"], 3)
            self.assertEqual(data["translation"]["agy"]["model"], "gemini-3.7-flash-high")
            self.assertNotIn("model", data["translation"])

    def test_store_save_and_update(self):
        with tempfile.TemporaryDirectory() as td:
            path = pathlib.Path(td) / "config.json"
            store = settings_mod.AppSettingsStore(path)
            store.load()

            updated = store.save({
                "translation": {
                    "provider": "anthropic",
                    "anthropic": {
                        "apiKey": "sk-ant-test-1234",
                        "model": "claude-3-5-sonnet",
                        "maxConcurrency": 10,
                    }
                }
            })
            self.assertEqual(updated["version"], 3)
            self.assertEqual(updated["translation"]["provider"], "anthropic")
            self.assertEqual(updated["translation"]["anthropic"]["apiKey"], "sk-ant-test-1234")
            self.assertEqual(updated["translation"]["anthropic"]["maxConcurrency"], 10)

            saved_none = store.save(None)
            self.assertEqual(saved_none["version"], 3)

    def test_public_redaction(self):
        cfg = {
            "version": 3,
            "translation": {
                "provider": "anthropic",
                "anthropic": {
                    "baseUrl": "http://127.0.0.1:8000",
                    "apiKey": "secret-token-key",
                    "model": "claude-3-5-sonnet",
                }
            }
        }
        pub = settings_mod.AppSettingsStore.public(cfg)
        self.assertNotIn("apiKey", pub["translation"]["anthropic"])
        self.assertTrue(pub["translation"]["anthropic"]["apiKeyConfigured"])
        self.assertEqual(cfg["translation"]["anthropic"]["apiKey"], "secret-token-key")

        cfg_empty = {
            "translation": {
                "anthropic": {
                    "apiKey": "",
                }
            }
        }
        pub_empty = settings_mod.AppSettingsStore.public(cfg_empty)
        self.assertFalse(pub_empty["translation"]["anthropic"]["apiKeyConfigured"])

        pub_none = settings_mod.AppSettingsStore.public({})
        self.assertEqual(pub_none, {})

        pub_no_anth = settings_mod.AppSettingsStore.public({"translation": {}})
        self.assertEqual(pub_no_anth, {"translation": {}})


class PromptsTests(unittest.TestCase):
    def setUp(self):
        self.td = tempfile.TemporaryDirectory()
        self.base = pathlib.Path(self.td.name)
        self.user_dir = self.base / "user_prompts"
        self.builtin_root = self.base / "builtins"
        self._setup_builtins()

    def tearDown(self):
        self.td.cleanup()

    def _setup_builtins(self):
        for pid in prompts_mod.PROMPT_IDS:
            pdir = self.builtin_root / pid
            pdir.mkdir(parents=True, exist_ok=True)
            if pid == "translator-request":
                body = "Translate title: {{source_title}} and description: {{source_description}}"
            elif pid == "validator-request":
                body = "Validate {{source_title}} {{source_description}} {{translated_title}} {{translated_description}}"
            else:
                body = f"Agent prompt for {pid}"

            content = prompts_mod.render_prompt(
                {"promptId": pid, "schemaVersion": 1, "builtinVersion": 1, "baseBuiltinSha256": prompts_mod.sha(body)},
                body
            )
            (pdir / "v1.md").write_text(content, encoding="utf-8")

    def test_sha_and_split_prompt(self):
        text = "sample text"
        self.assertEqual(prompts_mod.sha(text), prompts_mod.sha(text))

        self.assertEqual(prompts_mod.split_prompt("just plain body"), ({}, "just plain body"))
        self.assertEqual(prompts_mod.split_prompt("---\nkey: val\nno closing"), ({}, "---\nkey: val\nno closing"))

        valid = "---\npromptId: test-p\nschemaVersion: 1\ncomment line without colon\n---\nActual body text"
        meta, body = prompts_mod.split_prompt(valid)
        self.assertEqual(meta["promptId"], "test-p")
        self.assertEqual(meta["schemaVersion"], "1")
        self.assertEqual(body, "Actual body text")

    def test_current_builtin_version(self):
        pid = "translator-agent"
        ver, path = prompts_mod.current_builtin_version(self.builtin_root, pid)
        self.assertEqual(ver, 1)
        self.assertEqual(path.name, "v1.md")

        (self.builtin_root / pid / "v2.md").write_text("v2", encoding="utf-8")
        (self.builtin_root / pid / "v_invalid.md").write_text("bad", encoding="utf-8")
        ver2, path2 = prompts_mod.current_builtin_version(self.builtin_root, pid)
        self.assertEqual(ver2, 2)
        self.assertEqual(path2.name, "v2.md")

        empty_pid_dir = self.builtin_root / "empty-prompt"
        empty_pid_dir.mkdir(parents=True, exist_ok=True)
        with self.assertRaises(FileNotFoundError):
            prompts_mod.current_builtin_version(self.builtin_root, "empty-prompt")

    def test_prompt_manager_ensure_initial_installation(self):
        mgr = prompts_mod.PromptManager(self.user_dir, self.builtin_root, auto_migrate=True)
        states = mgr.ensure()
        self.assertEqual(set(states.keys()), set(prompts_mod.PROMPT_IDS))
        for pid in prompts_mod.PROMPT_IDS:
            self.assertTrue((self.user_dir / f"{pid}.md").exists())
            self.assertEqual(states[pid]["status"], "current")
            self.assertEqual(states[pid]["installedVersion"], 1)
            self.assertFalse(states[pid]["modified"])

        states2 = mgr.ensure()
        self.assertEqual(states2["translator-agent"]["status"], "current")

    def test_prompt_manager_auto_migrate_false(self):
        mgr = prompts_mod.PromptManager(self.user_dir, self.builtin_root, auto_migrate=True)
        mgr.ensure()

        pid = "translator-request"
        v2_body = "Translate v2 {{source_title}} {{source_description}}"
        (self.builtin_root / pid / "v2.md").write_text(
            prompts_mod.render_prompt({"promptId": pid, "builtinVersion": 2, "baseBuiltinSha256": prompts_mod.sha(v2_body)}, v2_body),
            encoding="utf-8"
        )

        mgr_no_migrate = prompts_mod.PromptManager(self.user_dir, self.builtin_root, auto_migrate=False)
        states = mgr_no_migrate.ensure()
        self.assertEqual(states[pid]["status"], "update_available")
        self.assertEqual(states[pid]["installedVersion"], 1)

    def test_prompt_manager_unmodified_auto_migration_with_backup(self):
        mgr = prompts_mod.PromptManager(self.user_dir, self.builtin_root, auto_migrate=True)
        mgr.ensure()

        pid = "translator-request"
        v2_body = "Translate v2 {{source_title}} {{source_description}}"
        (self.builtin_root / pid / "v2.md").write_text(
            prompts_mod.render_prompt({"promptId": pid, "builtinVersion": 2, "baseBuiltinSha256": prompts_mod.sha(v2_body)}, v2_body),
            encoding="utf-8"
        )

        states = mgr.ensure()
        self.assertEqual(states[pid]["status"], "current")
        self.assertEqual(states[pid]["installedVersion"], 2)
        self.assertEqual(states[pid]["body"], v2_body)

        backups = list((self.user_dir / "backups").glob("*"))
        self.assertTrue(len(backups) >= 1)

    def test_prompt_manager_modified_clean_three_way_merge(self):
        mgr = prompts_mod.PromptManager(self.user_dir, self.builtin_root, auto_migrate=True)
        mgr.ensure()

        pid = "translator-agent"
        user_file = self.user_dir / f"{pid}.md"
        meta, body = prompts_mod.split_prompt(user_file.read_text(encoding="utf-8"))
        user_file.write_text(prompts_mod.render_prompt(meta, "Customized user content"), encoding="utf-8")

        (self.builtin_root / pid / "v2.md").write_text(
            prompts_mod.render_prompt({"promptId": pid, "builtinVersion": 2}, "Builtin v2 content"),
            encoding="utf-8"
        )

        with mock.patch("shutil.which", return_value="/mock/bin/git"), \
             mock.patch("subprocess.run", return_value=subprocess.CompletedProcess([], 0, stdout="Cleanly merged prompt content", stderr="")):
            states = mgr.ensure()
            self.assertEqual(states[pid]["installedVersion"], 2)
            self.assertEqual(states[pid]["body"], "Cleanly merged prompt content")

    def test_prompt_manager_modified_conflict_merge(self):
        mgr = prompts_mod.PromptManager(self.user_dir, self.builtin_root, auto_migrate=True)
        mgr.ensure()

        pid = "translator-agent"
        user_file = self.user_dir / f"{pid}.md"
        meta, body = prompts_mod.split_prompt(user_file.read_text(encoding="utf-8"))
        user_file.write_text(prompts_mod.render_prompt(meta, "Conflicting user edits"), encoding="utf-8")

        (self.builtin_root / pid / "v2.md").write_text(
            prompts_mod.render_prompt({"promptId": pid, "builtinVersion": 2}, "Conflicting builtin edits"),
            encoding="utf-8"
        )

        conflict_output = "<<<<<<< current\nConflicting user edits\n=======\nConflicting builtin edits\n>>>>>>> incoming"
        with mock.patch("shutil.which", return_value="/mock/bin/git"), \
             mock.patch("subprocess.run", return_value=subprocess.CompletedProcess([], 1, stdout=conflict_output, stderr="")):
            states = mgr.ensure()
            self.assertEqual(states[pid]["status"], "conflict")
            conflict_file = self.user_dir / "conflicts" / pid / "v1-to-v2.md"
            self.assertTrue(conflict_file.exists())
            self.assertEqual(conflict_file.read_text(encoding="utf-8"), conflict_output)

    def test_prompt_manager_merge_when_git_missing(self):
        mgr = prompts_mod.PromptManager(self.user_dir, self.builtin_root, auto_migrate=True)
        with mock.patch("shutil.which", return_value=None):
            stdout, has_conflict = mgr._merge("base", "current", "incoming")
            self.assertIsNone(stdout)
            self.assertTrue(has_conflict)

    def test_prompt_manager_ensure_builtin_version_missing_exception(self):
        mgr = prompts_mod.PromptManager(self.user_dir, self.builtin_root, auto_migrate=True)
        mgr.ensure()

        pid = "translator-agent"
        user_file = self.user_dir / f"{pid}.md"
        meta, body = prompts_mod.split_prompt(user_file.read_text(encoding="utf-8"))
        meta["builtinVersion"] = 0
        user_file.write_text(prompts_mod.render_prompt(meta, "Modified content"), encoding="utf-8")

        with mock.patch("shutil.which", return_value=None):
            states = mgr.ensure()
            self.assertEqual(states[pid]["status"], "conflict")

    def test_prompt_manager_state_variations(self):
        mgr = prompts_mod.PromptManager(self.user_dir, self.builtin_root, auto_migrate=True)
        pid = "translator-agent"

        st_missing = mgr.state(pid)
        self.assertEqual(st_missing["installedVersion"], 0)
        self.assertEqual(st_missing["status"], "update_available")

        mgr.ensure()
        st_curr = mgr.state(pid)
        self.assertEqual(st_curr["status"], "current")

        meta = {"promptId": pid, "builtinVersion": 1, "baseBuiltinSha256": "original_hash"}
        (self.user_dir / f"{pid}.md").write_text(prompts_mod.render_prompt(meta, "Modified text"), encoding="utf-8")
        st_mod = mgr.state(pid)
        self.assertEqual(st_mod["status"], "modified")

        cdir = self.user_dir / "conflicts" / pid
        cdir.mkdir(parents=True, exist_ok=True)
        st_empty_conf = mgr.state(pid)
        self.assertEqual(st_empty_conf["status"], "modified")

        (cdir / "conflict.md").write_text("conflict markers", encoding="utf-8")
        st_conf = mgr.state(pid)
        self.assertEqual(st_conf["status"], "conflict")

    def test_prompt_manager_list_and_get(self):
        mgr = prompts_mod.PromptManager(self.user_dir, self.builtin_root, auto_migrate=True)
        mgr.ensure()

        items = mgr.list()
        self.assertEqual(len(items), 4)

        item = mgr.get("translator-request")
        self.assertEqual(item["id"], "translator-request")
        self.assertEqual(item["requiredVariables"], ["source_description", "source_title"])
        self.assertEqual(item["conflicts"], [])

        with self.assertRaises(KeyError):
            mgr.get("non-existent-prompt")

        cdir = self.user_dir / "conflicts" / "translator-request"
        cdir.mkdir(parents=True, exist_ok=True)
        (cdir / "c1.md").write_text("conflict detail", encoding="utf-8")
        item_conf = mgr.get("translator-request")
        self.assertEqual(len(item_conf["conflicts"]), 1)
        self.assertEqual(item_conf["conflicts"][0]["name"], "c1.md")
        self.assertEqual(item_conf["conflicts"][0]["content"], "conflict detail")

    def test_prompt_manager_save_and_required_variables(self):
        mgr = prompts_mod.PromptManager(self.user_dir, self.builtin_root, auto_migrate=True)
        mgr.ensure()

        pid = "translator-request"
        with self.assertRaises(ValueError) as cm:
            mgr.save(pid, "No variables here")
        self.assertIn("Missing required template variables", str(cm.exception))
        self.assertIn("{{source_title}}", str(cm.exception))

        with self.assertRaises(ValueError) as cm:
            mgr.save(pid, "Only {{source_title}} here")
        self.assertIn("{{source_description}}", str(cm.exception))

        saved = mgr.save(pid, "Has {{ source_title }} and {{ source_description }} formatted")
        self.assertEqual(saved["status"], "modified")
        self.assertIn("source_title", saved["body"])

    def test_prompt_manager_restore_diff_and_render(self):
        mgr = prompts_mod.PromptManager(self.user_dir, self.builtin_root, auto_migrate=True)
        mgr.ensure()

        pid = "translator-agent"
        mgr.save(pid, "Edited agent body")
        diff_text = mgr.diff(pid)
        self.assertIn("--- builtin", diff_text)
        self.assertIn("+++ current", diff_text)
        self.assertIn("Edited agent body", diff_text)

        restored = mgr.restore(pid)
        self.assertEqual(restored["status"], "current")
        self.assertNotIn("Edited agent body", restored["body"])

        rendered = mgr.render("translator-request", {"source_title": "My Title", "source_description": "My Desc"})
        self.assertIn("Translate title: My Title and description: My Desc", rendered)


class TranslationTests(unittest.TestCase):
    def test_matches_patterns_and_overlaps(self):
        self.assertEqual(translation_mod._matches(""), [])
        self.assertEqual(translation_mod._matches(None), [])

        text = (
            "Here is ```python\nprint(1)\n``` and ~~~sh\necho 2\n~~~ and `foo` inline code. "
            "Visit https://example.com/api/v1 and http://insecure.org. "
            "Check path /usr/local/bin/app.sh and issue PROJ-1234. "
            "Tech id ABC123DEF and task #456 with version v1.2.3 and 2.0.0-beta."
        )
        matches = translation_mod._matches(text)
        kinds = {m[3] for m in matches}
        self.assertIn("fenced_code", kinds)
        self.assertIn("inline_code", kinds)
        self.assertIn("url", kinds)
        self.assertIn("path", kinds)
        self.assertIn("issue", kinds)
        self.assertIn("tech_id", kinds)
        self.assertIn("task_id", kinds)
        self.assertIn("version", kinds)

        overlapping_text = "https://example.com/a/b/c"
        matched_overlapping = translation_mod._matches(overlapping_text)
        self.assertEqual(len(matched_overlapping), 1)
        self.assertEqual(matched_overlapping[0][3], "url")

    def test_protect_source_and_restore_spans(self):
        source = {
            "title": "Fix bug PROJ-101 in `auth.py`",
            "description": "Deploy to /var/www and see https://docs.site.org task #99",
        }
        protected, mapping = translation_mod.protect_source(source)
        self.assertIn('<keep id="T0001"', protected["title"])
        self.assertIn('<keep id="D0001"', protected["description"])

        restored, issues = translation_mod.restore_protected_spans(protected, mapping)
        self.assertEqual(restored["title"], source["title"])
        self.assertEqual(restored["description"], source["description"])
        self.assertEqual(issues, [])

    def test_restore_protected_spans_tampering_and_issues(self):
        source = {"title": "Use `cache` at /tmp/cache"}
        protected, mapping = translation_mod.protect_source(source)

        tampered_unexpected = {"title": protected["title"] + '<keep id="T9999" kind="inline_code">`extra`</keep>'}
        _, issues = translation_mod.restore_protected_spans(tampered_unexpected, mapping)
        self.assertTrue(any("unexpected protected span T9999" in i for i in issues))

        tampered_kind = {"title": protected["title"].replace('kind="inline_code"', 'kind="url"')}
        _, issues = translation_mod.restore_protected_spans(tampered_kind, mapping)
        self.assertTrue(any("kind changed" in i for i in issues))

        tampered_content = {"title": protected["title"].replace("`cache`", "`other`")}
        _, issues = translation_mod.restore_protected_spans(tampered_content, mapping)
        self.assertTrue(any("content changed" in i for i in issues))

        tampered_missing = {"title": "Omitted all keep tags completely"}
        _, issues = translation_mod.restore_protected_spans(tampered_missing, mapping)
        self.assertTrue(any("protected span missing" in i for i in issues))

        t_id = list(mapping["title"].keys())[0]
        literal = mapping["title"][t_id]["literal"]
        kind = mapping["title"][t_id]["kind"]
        tag = f'<keep id="{t_id}" kind="{kind}">{literal}</keep>'
        tampered_dup = {"title": protected["title"] + " " + tag}
        _, issues = translation_mod.restore_protected_spans(tampered_dup, mapping)
        self.assertTrue(any("protected span duplicated" in i for i in issues))

        restored_none, _ = translation_mod.restore_protected_spans(None, mapping)
        self.assertEqual(restored_none, {"title": "", "description": ""})

    def test_markdown_shape(self):
        self.assertEqual(translation_mod.markdown_shape("")["blocks"], [])
        self.assertEqual(translation_mod.markdown_shape(None)["blocks"], [])

        doc = (
            "# Heading 1\n"
            "## Heading 2\n"
            "- [ ] Todo item\n"
            "* [x] Done item\n"
            "- Bullet list\n"
            "  continuation prose inside bullet\n"
            "1. Numbered item\n"
            "> Quote block\n"
            "  quote continuation line\n"
            "```python\n"
            "code line 1\n"
            "code line 2\n"
            "```\n"
            "Paragraph line 1\n"
            "Paragraph line 2 continuation\n"
        )
        shape = translation_mod.markdown_shape(doc)
        kinds = [entry[1] for entry in shape["blocks"]]
        self.assertIn("heading", kinds)
        self.assertIn("task-item", kinds)
        self.assertIn("bullet", kinds)
        self.assertIn("number", kinds)
        self.assertIn("quote", kinds)
        self.assertIn("fence", kinds)
        self.assertIn("paragraph", kinds)
        self.assertEqual(shape["fenceCount"], 2)

    def test_inline_shape(self):
        self.assertEqual(translation_mod.inline_shape(None), {"bold": 0, "strike": 0, "inlineCode": 0, "links": 0})
        shape_odd = translation_mod.inline_shape("**bold text and ~~strike and `code` and [link](http://url)")
        self.assertEqual(shape_odd["bold"], 1)
        self.assertEqual(shape_odd["strike"], 1)
        self.assertEqual(shape_odd["inlineCode"], 1)
        self.assertEqual(shape_odd["links"], 1)

        shape_even = translation_mod.inline_shape("**bold** and ~~strike~~")
        self.assertEqual(shape_even["bold"], 0)
        self.assertEqual(shape_even["strike"], 0)

    def test_deterministic_translation_issues(self):
        source = {
            "title": "Short title",
            "description": "Paragraph 1\n\n- Bullet A\n- Bullet B",
        }
        self.assertEqual(translation_mod.deterministic_translation_issues(source, copy.deepcopy(source)), [])

        bad_title = {"title": "# Heading title", "description": source["description"]}
        issues = translation_mod.deterministic_translation_issues(source, bad_title)
        self.assertIn("title: Markdown structure changed", issues)

        bad_desc = {"title": source["title"], "description": "1. Numbered item instead"}
        issues2 = translation_mod.deterministic_translation_issues(source, bad_desc)
        self.assertIn("description: Markdown structure changed", issues2)

        bad_inline = {"title": "Short title **mismatched bold", "description": source["description"]}
        issues3 = translation_mod.deterministic_translation_issues(source, bad_inline)
        self.assertIn("title: inline Markdown structure changed", issues3)

    def test_render_prompt(self):
        tpl = "Hello {{ name }}, task is {{ task }}!"
        rendered = translation_mod.render_prompt(tpl, {"name": "Alice", "task": "Review"})
        self.assertEqual(rendered, "Hello Alice, task is Review!")


class AnthropicProviderTests(unittest.TestCase):
    def test_initialization_defaults_and_custom(self):
        p_def = anthropic_mod.AnthropicProvider()
        self.assertEqual(p_def.base_url, "http://127.0.0.1:8000")
        self.assertEqual(p_def.api_key, "")
        self.assertEqual(p_def.model, "")
        self.assertEqual(p_def.max_tokens, 32768)
        self.assertEqual(p_def.timeout, 300.0)

        p_custom = anthropic_mod.AnthropicProvider(
            base_url="https://api.anthropic.com:8443/v1/",
            api_key="sk-test",
            model="claude-3-haiku",
            max_tokens=1024,
            timeout=45.5,
        )
        self.assertEqual(p_custom.base_url, "https://api.anthropic.com:8443/v1")
        self.assertEqual(p_custom.api_key, "sk-test")
        self.assertEqual(p_custom.model, "claude-3-haiku")
        self.assertEqual(p_custom.max_tokens, 1024)
        self.assertEqual(p_custom.timeout, 45.5)

    def test_connection_validation_and_schemes(self):
        with self.assertRaises(ValueError):
            anthropic_mod.AnthropicProvider(base_url="ftp://localhost:8000")._connection()

        with self.assertRaises(ValueError):
            anthropic_mod.AnthropicProvider(base_url="http://:8000")._connection()

        p_https = anthropic_mod.AnthropicProvider(base_url="https://remote.host:443/proxy")
        conn, prefix = p_https._connection()
        self.assertIsInstance(conn, http.client.HTTPSConnection)
        self.assertEqual(prefix, "/proxy")

        p_http = anthropic_mod.AnthropicProvider(base_url="http://local.host:8080")
        conn_http, prefix_http = p_http._connection()
        self.assertIsInstance(conn_http, http.client.HTTPConnection)
        self.assertEqual(prefix_http, "")

    def test_headers_formatting(self):
        p_no_key = anthropic_mod.AnthropicProvider(api_key="")
        h1 = p_no_key._headers()
        self.assertNotIn("x-api-key", h1)
        self.assertEqual(h1["anthropic-version"], "2023-06-01")

        p_key = anthropic_mod.AnthropicProvider(api_key="my-secret-key")
        h2 = p_key._headers()
        self.assertEqual(h2["x-api-key"], "my-secret-key")

    def test_list_models_success_and_edge_cases(self):
        p = anthropic_mod.AnthropicProvider(base_url="http://127.0.0.1:8000")

        mock_resp = mock.MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = json.dumps({
            "data": [
                {"id": "claude-3-opus", "display_name": "Claude 3 Opus"},
                {"id": "claude-3-sonnet"},
                {"no_id": True},
                "not-a-dict",
            ]
        }).encode("utf-8")

        mock_conn = mock.MagicMock()
        mock_conn.getresponse.return_value = mock_resp

        with mock.patch.object(p, "_connection", return_value=(mock_conn, "")):
            models = p.list_models()
            self.assertEqual(len(models), 2)
            self.assertEqual(models[0], {"id": "claude-3-opus", "label": "Claude 3 Opus"})
            self.assertEqual(models[1], {"id": "claude-3-sonnet", "label": "claude-3-sonnet"})
            mock_conn.close.assert_called_once()

    def test_list_models_non_200_error(self):
        p = anthropic_mod.AnthropicProvider(base_url="http://127.0.0.1:8000")
        mock_resp = mock.MagicMock()
        mock_resp.status = 500
        mock_resp.read.return_value = b"Internal Server Error"

        mock_conn = mock.MagicMock()
        mock_conn.getresponse.return_value = mock_resp

        with mock.patch.object(p, "_connection", return_value=(mock_conn, "")):
            with self.assertRaises(RuntimeError) as cm:
                p.list_models()
            self.assertIn("model discovery HTTP 500", str(cm.exception))
            mock_conn.close.assert_called_once()

    def test_test_connection(self):
        p = anthropic_mod.AnthropicProvider()
        with mock.patch.object(p, "list_models", return_value=[{"id": "m1"}]) as mock_lm:
            res = p.test_connection()
            self.assertEqual(res, {"ok": True, "models": [{"id": "m1"}], "count": 1})
            mock_lm.assert_called_once()

    def test_extract_text(self):
        self.assertEqual(anthropic_mod.AnthropicProvider._extract_text(None), "")
        self.assertEqual(anthropic_mod.AnthropicProvider._extract_text("string"), "")

        payload = {
            "content": [
                {"type": "thinking", "text": "hidden"},
                {"type": "text", "text": "Part 1 "},
                {"type": "tool_use", "name": "fn"},
                {"type": "text", "text": "Part 2"},
                {"type": "text", "text": None},
                "not-a-dict",
            ]
        }
        self.assertEqual(anthropic_mod.AnthropicProvider._extract_text(payload), "Part 1 Part 2")

    def test_parse_structured(self):
        self.assertEqual(
            anthropic_mod.AnthropicProvider._parse_structured('{"key": "value"}'),
            {"key": "value"}
        )

        fence_json = "```json\n{\"fenced\": true}\n```"
        self.assertEqual(
            anthropic_mod.AnthropicProvider._parse_structured(fence_json),
            {"fenced": True}
        )

        fence_plain = "```\n{\"plain_fence\": 123}\n```"
        self.assertEqual(
            anthropic_mod.AnthropicProvider._parse_structured(fence_plain),
            {"plain_fence": 123}
        )

        fence_fallback = "```json\ninvalid\n```\nHere is the real data: {\"fallback\": 42} thank you."
        self.assertEqual(
            anthropic_mod.AnthropicProvider._parse_structured(fence_fallback),
            {"fallback": 42}
        )

        prose = "Prefix text {\"embedded\": \"yes\"} suffix text"
        self.assertEqual(
            anthropic_mod.AnthropicProvider._parse_structured(prose),
            {"embedded": "yes"}
        )

        with self.assertRaises(RuntimeError) as cm:
            anthropic_mod.AnthropicProvider._parse_structured("No json object at all here")
        self.assertIn("Anthropic-compatible response did not contain a JSON object", str(cm.exception))

        with self.assertRaises(RuntimeError) as cm:
            anthropic_mod.AnthropicProvider._parse_structured("prefix {not valid json} suffix")
        self.assertIn("Anthropic-compatible response did not contain a JSON object", str(cm.exception))

    def test_run_missing_model(self):
        p = anthropic_mod.AnthropicProvider(model="")
        with self.assertRaises(RuntimeError) as cm:
            p.run("sys", "user", {})
        self.assertIn("No Anthropic-compatible model is selected", str(cm.exception))

    def test_run_successful_translation_and_job_handle(self):
        p = anthropic_mod.AnthropicProvider(base_url="http://127.0.0.1:8000", model="claude-3-opus")

        mock_resp = mock.MagicMock()
        mock_resp.status = 200
        response_payload = {
            "id": "msg_test_123",
            "content": [{"type": "text", "text": json.dumps({"title": "Translated", "description": "Desc"})}],
            "usage": {"input_tokens": 100, "output_tokens": 50},
            "stop_reason": "end_turn",
        }
        mock_resp.read.return_value = json.dumps(response_payload).encode("utf-8")

        mock_conn = mock.MagicMock()
        mock_conn.getresponse.return_value = mock_resp

        job_handle = mock.MagicMock()

        with mock.patch.object(p, "_connection", return_value=(mock_conn, "")):
            res = p.run("sys prompt", "user prompt", {}, job_handle=job_handle, phase="translator")

            job_handle.set_abort_callback.assert_called_once_with(mock_conn.close)
            job_handle.clear_abort_callback.assert_called_once()
            mock_conn.close.assert_called_once()

            self.assertEqual(res.provider, "anthropic")
            self.assertEqual(res.model, "claude-3-opus")
            self.assertEqual(res.remote_id, "msg_test_123")
            self.assertEqual(res.structured, {"title": "Translated", "description": "Desc"})
            self.assertEqual(res.usage, {"input_tokens": 100, "output_tokens": 50})
            self.assertEqual(res.metadata["phase"], "translator")
            self.assertEqual(res.metadata["stopReason"], "end_turn")
            self.assertEqual(res.metadata["httpStatus"], 200)

    def test_run_http_error(self):
        p = anthropic_mod.AnthropicProvider(model="claude-3-opus")
        mock_resp = mock.MagicMock()
        mock_resp.status = 401
        mock_resp.read.return_value = b"Unauthorized API key"

        mock_conn = mock.MagicMock()
        mock_conn.getresponse.return_value = mock_resp

        with mock.patch.object(p, "_connection", return_value=(mock_conn, "")):
            with self.assertRaises(RuntimeError) as cm:
                p.run("sys", "user", {})
            self.assertIn("Anthropic-compatible HTTP 401", str(cm.exception))
            mock_conn.close.assert_called_once()

    def test_run_network_exception(self):
        p = anthropic_mod.AnthropicProvider(model="claude-3-opus")
        mock_conn = mock.MagicMock()
        mock_conn.request.side_effect = ConnectionResetError("Connection reset by peer")

        with mock.patch.object(p, "_connection", return_value=(mock_conn, "")):
            with self.assertRaises(ConnectionResetError):
                p.run("sys", "user", {})
            mock_conn.close.assert_called_once()

    def test_anthropic_standalone_import_fallback(self):
        p = pathlib.Path(anthropic_mod.__file__).resolve()
        spec = importlib.util.spec_from_file_location("standalone_anthropic_test", p)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        self.assertTrue(hasattr(mod, "ProviderResult"))


class AppStateTests(unittest.TestCase):
    def test_write_atomic_and_exception_handling(self):
        with tempfile.TemporaryDirectory() as td:
            path = pathlib.Path(td) / "sub" / "app-state.json"
            app_state_mod._write(path, {"schemaVersion": 1, "test": True})
            self.assertTrue(path.exists())
            self.assertEqual(json.loads(path.read_text(encoding="utf-8"))["test"], True)

            with mock.patch("json.dump", side_effect=ValueError("Dump failed")):
                with self.assertRaises(ValueError):
                    app_state_mod._write(path, {"will": "fail"})

    def test_load_non_existent_and_corrupt_file(self):
        with tempfile.TemporaryDirectory() as td:
            path = pathlib.Path(td) / "app-state.json"
            store = app_state_mod.AppStateStore(path)
            self.assertFalse(path.exists())

            state = store.load([])
            self.assertTrue(path.exists())
            self.assertIsNone(state["currentSessionId"])
            self.assertEqual(state["watchedSessionIds"], [])

            path.write_text("{bad json", encoding="utf-8")
            state_corrupt = store.load([{"id": "s1"}, {"id": "s2"}])
            self.assertEqual(state_corrupt["currentSessionId"], "s1")
            self.assertEqual(state_corrupt["watchedSessionIds"], ["s1"])

            path.write_text('"a string"', encoding="utf-8")
            state_str = store.load([{"id": "s-alpha"}])
            self.assertEqual(state_str["currentSessionId"], "s-alpha")

    def test_load_session_id_selection_and_deduplication(self):
        with tempfile.TemporaryDirectory() as td:
            path = pathlib.Path(td) / "app-state.json"
            path.write_text(json.dumps({
                "currentSessionId": "ghost-session",
                "watchedSessionIds": ["s2", "ghost-session", "s2", "s1"],
            }), encoding="utf-8")

            store = app_state_mod.AppStateStore(path)
            sessions = [{"id": "s1"}, {"id": "s2"}, {"id": None}, {"no_id": True}]
            state = store.load(sessions)

            self.assertEqual(state["currentSessionId"], "s1")
            self.assertEqual(state["watchedSessionIds"], ["s2", "s1"])

    def test_get_returns_deep_copy(self):
        with tempfile.TemporaryDirectory() as td:
            path = pathlib.Path(td) / "app-state.json"
            store = app_state_mod.AppStateStore(path)
            store.load([{"id": "s1"}])
            g1 = store.get()
            g1["watchedSessionIds"].append("tampered")
            g2 = store.get()
            self.assertNotIn("tampered", g2["watchedSessionIds"])

    def test_switch_sessions(self):
        with tempfile.TemporaryDirectory() as td:
            path = pathlib.Path(td) / "app-state.json"
            store = app_state_mod.AppStateStore(path)
            sessions = [{"id": "s1"}, {"id": "s2"}]
            store.load(sessions)

            with self.assertRaises(KeyError):
                store.switch("unknown-session", sessions)

            st = store.switch("s2", sessions)
            self.assertEqual(st["currentSessionId"], "s2")
            self.assertIn("s2", st["watchedSessionIds"])

            st2 = store.switch("s2", sessions)
            self.assertEqual(st2["watchedSessionIds"].count("s2"), 1)

    def test_set_watched_variations(self):
        with tempfile.TemporaryDirectory() as td:
            path = pathlib.Path(td) / "app-state.json"
            store = app_state_mod.AppStateStore(path)
            sessions = [{"id": "s1"}, {"id": "s2"}, {"id": "s3"}]
            store.load(sessions)

            with self.assertRaises(KeyError):
                store.set_watched("unknown", True, sessions)

            st = store.set_watched("s2", True, sessions)
            self.assertEqual(st["watchedSessionIds"], ["s1", "s2"])

            st_dup = store.set_watched("s2", True, sessions)
            self.assertEqual(st_dup["watchedSessionIds"], ["s1", "s2"])

            st_un = store.set_watched("s2", False, sessions)
            self.assertEqual(st_un["watchedSessionIds"], ["s1"])

            st_curr = store.set_watched("s1", False, sessions)
            self.assertIn("s1", st_curr["watchedSessionIds"])

            store.state["watchedSessionIds"] = ["s3"]
            st_reinsert = store.set_watched("s3", True, sessions)
            self.assertEqual(st_reinsert["watchedSessionIds"], ["s1", "s3"])


if __name__ == "__main__":
    unittest.main()
