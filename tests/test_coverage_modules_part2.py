import contextlib
import datetime
import http.client
import io
import json
import os
import pathlib
import queue
import sys
import tempfile
import threading
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

import server.session_registry as session_registry
from server.session_registry import (
    SessionRegistry,
    _content_text,
    _iso_key,
    _nested_value,
    _task_list_from_settings,
)
import server.http_api as http_api
from server.http_api import _session_ids, make_handler, make_server


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


class ParsedResponse:
    def __init__(self, status, headers, body):
        self.status = status
        self.headers = headers
        self.body = body
        self.json = None
        if body:
            try:
                self.json = json.loads(body.decode("utf-8"))
            except Exception:
                pass


def parse_response(raw_bytes):
    if not raw_bytes:
        return ParsedResponse(0, {}, b"")

    class FakeSocket:
        def __init__(self, data):
            self.data = data

        def makefile(self, *args, **kwargs):
            return io.BytesIO(self.data)

    resp = http.client.HTTPResponse(FakeSocket(raw_bytes))
    resp.begin()
    status = resp.status
    headers = dict(resp.headers)
    body = resp.read()
    return ParsedResponse(status, headers, body)


def make_request(handler_cls, method, path, headers=None, body=None):
    if headers is None:
        headers = {}
    hdrs = dict(headers)
    if "Host" not in hdrs:
        hdrs["Host"] = "localhost"
    if "Connection" not in hdrs:
        hdrs["Connection"] = "close"

    body_bytes = b""
    if body is not None:
        if isinstance(body, (dict, list)):
            body_bytes = json.dumps(body, ensure_ascii=False).encode("utf-8")
            if "Content-Type" not in hdrs:
                hdrs["Content-Type"] = "application/json"
        elif isinstance(body, str):
            body_bytes = body.encode("utf-8")
        elif isinstance(body, bytes):
            body_bytes = body
        if "Content-Length" not in hdrs:
            hdrs["Content-Length"] = str(len(body_bytes))

    header_lines = [f"{k}: {v}" for k, v in hdrs.items()]
    req_bytes = f"{method} {path} HTTP/1.1\r\n".encode("utf-8")
    req_bytes += "\r\n".join(header_lines).encode("utf-8") + b"\r\n\r\n" + body_bytes

    sock = MockSocket(req_bytes)
    mock_server = mock.MagicMock()
    handler = handler_cls(sock, ("127.0.0.1", 54321), mock_server)
    return parse_response(sock.wfile.getvalue()), handler


def make_handler_instance(handler_cls, method="GET", path="/", headers=None, body_bytes=b""):
    handler = handler_cls.__new__(handler_cls)
    handler.command = method
    handler.path = path
    handler.request_version = "HTTP/1.1"
    handler.requestline = f"{method} {path} HTTP/1.1"
    handler.close_connection = True
    hdrs = headers or {}
    import email.message
    msg = email.message.Message()
    for k, v in hdrs.items():
        msg[k] = v
    handler.headers = msg
    handler.rfile = io.BytesIO(body_bytes)
    handler.wfile = io.BytesIO()
    handler.server = mock.MagicMock()
    return handler


class CustomClientList(list):
    def __init__(self, *args, on_append=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.on_append = on_append

    def append(self, item):
        super().append(item)
        if self.on_append:
            self.on_append(item)


class DummyHub:
    def __init__(self):
        self.lock = threading.Lock()
        self.clients = CustomClientList()


class DummyConfig:
    def __init__(self, port=8765, client_origins=None):
        self.port = port
        self.client_origins = client_origins if client_origins is not None else ["http://localhost:3000"]


class DummyRuntime:
    def __init__(self, port=8765, client_origins=None):
        self.config = DummyConfig(port=port, client_origins=client_origins)
        self.hub = DummyHub()
        self.stop_event = threading.Event()
        self.sessions = [
            {"id": "sess-1", "label": "Session 1"},
            {"id": "sess-2", "label": "Session 2"},
        ]
        self._app_state = {
            "currentSessionId": "sess-1",
            "watchedSessionIds": ["sess-1"],
        }
        self.switched = []
        self.watched_calls = []

    def sessions_state(self):
        return {"sessions": self.sessions}

    def app_state(self):
        return dict(self._app_state)

    def api_state(self, session_ids=None):
        return {"sessionIds": session_ids, "active": True}

    def history(self, session_ids=None):
        return [{"id": "h1", "sessionIds": session_ids}]

    def translations(self):
        return [{"id": "tr-1", "status": "done"}]

    def translation_catalog(self):
        return {"languages": ["hu", "en"]}

    def settings_state(self):
        return {"provider": "anthropic", "apiKey": "test-key"}

    def prompts_state(self):
        return [{"name": "system", "body": "hello"}]

    def anthropic_models(self):
        return ["claude-3-5-sonnet", "claude-3-opus"]

    def prompt_detail(self, name):
        return {"name": name, "body": f"content of {name}"}

    def flow_layout(self, session_id):
        return {"sessionId": session_id, "nodes": []}

    def translation_job(self, session_id, job_id):
        if job_id == "not-found":
            return None
        return {"sessionId": session_id, "jobId": job_id, "status": "completed"}

    def switch_session(self, session_id):
        self.switched.append(session_id)
        self._app_state["currentSessionId"] = session_id
        return self.app_state()

    def set_watched(self, session_id, watched):
        self.watched_calls.append((session_id, watched))
        current = set(self._app_state.get("watchedSessionIds") or [])
        if watched:
            current.add(session_id)
        else:
            current.discard(session_id)
        self._app_state["watchedSessionIds"] = sorted(current)
        return self.app_state()

    def refresh_sessions(self, force=True):
        return {"refreshed": force, "sessions": self.sessions}

    def update_settings(self, data):
        return {"updated": True, "settings": data}

    def migrate_prompts(self):
        return [{"name": "migrated-1"}]

    def anthropic_test(self, data):
        return {"success": True, "data": data}

    def bulk_translation_action(self, action, job_refs):
        return {"action": action, "count": len(job_refs), "jobs": job_refs}

    def restore_prompt(self, name):
        return {"restored": name}

    def save_prompt(self, name, body):
        return {"saved": name, "body": body}

    def request_global_language(self, session_id, language):
        return {"sessionId": session_id, "requestedLanguage": language}

    def cancel_global_translation(self, session_id):
        return [{"sessionId": session_id, "cancelled": True}]

    def request_task_language(self, session_id, task_id, language):
        return {"sessionId": session_id, "taskId": task_id, "language": language}

    def cancel_task_translation(self, session_id, task_id):
        return [{"sessionId": session_id, "taskId": task_id, "cancelled": True}]

    def save_flow_layout(self, session_id, data):
        return {"sessionId": session_id, "saved": data}

    def retry_translation_job(self, session_id, job_id):
        return {"sessionId": session_id, "jobId": job_id, "action": "retry"}

    def cancel_translation_job(self, session_id, job_id):
        return {"sessionId": session_id, "jobId": job_id, "action": "cancel"}

    def reset_flow_layout(self, session_id):
        return {"sessionId": session_id, "reset": True}

    def delete_translation_job(self, session_id, job_id):
        return {"sessionId": session_id, "jobId": job_id, "deleted": True}


# ==============================================================================
# Unit and Integration Tests for server/session_registry.py
# ==============================================================================

class SessionRegistryHelperTests(unittest.TestCase):
    def test_iso_key(self):
        self.assertEqual(_iso_key("2026-09-05T12:00:00Z"), "2026-09-05T12:00:00Z")
        self.assertEqual(_iso_key(None), "")
        self.assertEqual(_iso_key(""), "")
        self.assertEqual(_iso_key(0), "")
        self.assertEqual(_iso_key(False), "")

    def test_content_text(self):
        # String input
        self.assertEqual(_content_text("  hello world  "), "hello world")
        self.assertEqual(_content_text("plain"), "plain")
        self.assertEqual(_content_text("   "), "")

        # Non-string, non-list input
        self.assertEqual(_content_text(None), "")
        self.assertEqual(_content_text(12345), "")
        self.assertEqual(_content_text({"type": "text", "text": "foo"}), "")

        # List input with various items
        items = [
            {"type": "text", "text": "First line"},
            {"type": "image", "data": "abc"},
            {"type": "text", "text": ""},
            {"type": "text", "text": None},
            "Second line",
            123,
            None,
            "Third line",
        ]
        self.assertEqual(_content_text(items), "First line\nSecond line\nThird line")
        self.assertEqual(_content_text([]), "")
        self.assertEqual(_content_text([{"type": "text", "text": "   "}]), "")

    def test_nested_value(self):
        # Top-level match
        rec1 = {"cwd": "/path/to/project", "branch": "main"}
        self.assertEqual(_nested_value(rec1, ("cwd", "projectCwd")), "/path/to/project")
        self.assertEqual(_nested_value(rec1, ("gitBranch", "branch")), "main")

        # Top-level contains empty or None value, falls through to next candidate name
        rec2 = {"gitBranch": "", "branch": "feat-1"}
        self.assertEqual(_nested_value(rec2, ("gitBranch", "branch")), "feat-1")
        rec2_none = {"gitBranch": None, "branch": "feat-2"}
        self.assertEqual(_nested_value(rec2_none, ("gitBranch", "branch")), "feat-2")

        # Metadata match
        rec3 = {"metadata": {"projectPath": "/meta/path", "sessionName": "Custom Title"}}
        self.assertEqual(_nested_value(rec3, ("cwd", "projectPath")), "/meta/path")
        self.assertEqual(_nested_value(rec3, ("customTitle", "sessionName")), "Custom Title")

        # Metadata with empty first candidate
        rec4 = {"metadata": {"customTitle": "", "sessionName": "Fallback Title"}}
        self.assertEqual(_nested_value(rec4, ("customTitle", "sessionName")), "Fallback Title")

        # Missing everywhere
        self.assertIsNone(_nested_value({}, ("cwd", "branch")))
        self.assertIsNone(_nested_value({"metadata": {}}, ("cwd", "branch")))
        self.assertIsNone(_nested_value({"metadata": {"other": "val"}}, ("cwd", "branch")))

        # Metadata not a dict
        self.assertIsNone(_nested_value({"metadata": "not-a-dict"}, ("cwd", "branch")))
        self.assertIsNone(_nested_value({"metadata": None}, ("cwd", "branch")))

    def test_task_list_from_settings(self):
        with tempfile.TemporaryDirectory() as td:
            tmp_dir = pathlib.Path(td)

            # Nonexistent file
            self.assertIsNone(_task_list_from_settings(tmp_dir / "nonexistent.json"))

            # Invalid JSON file
            bad_json = tmp_dir / "bad.json"
            bad_json.write_text("{invalid-json", encoding="utf-8")
            self.assertIsNone(_task_list_from_settings(bad_json))

            # Non-dict JSON file
            list_json = tmp_dir / "list.json"
            list_json.write_text("[1, 2, 3]", encoding="utf-8")
            self.assertIsNone(_task_list_from_settings(list_json))

            # taskListId
            f1 = tmp_dir / "s1.json"
            f1.write_text(json.dumps({"taskListId": "  tl-id-1  "}), encoding="utf-8")
            self.assertEqual(_task_list_from_settings(f1), "tl-id-1")

            # task_list_id
            f2 = tmp_dir / "s2.json"
            f2.write_text(json.dumps({"task_list_id": "tl-id-2"}), encoding="utf-8")
            self.assertEqual(_task_list_from_settings(f2), "tl-id-2")

            # taskList
            f3 = tmp_dir / "s3.json"
            f3.write_text(json.dumps({"taskList": "tl-id-3"}), encoding="utf-8")
            self.assertEqual(_task_list_from_settings(f3), "tl-id-3")

            # task_list
            f4 = tmp_dir / "s4.json"
            f4.write_text(json.dumps({"task_list": "tl-id-4"}), encoding="utf-8")
            self.assertEqual(_task_list_from_settings(f4), "tl-id-4")

            # Empty/whitespace values or non-string values
            f5 = tmp_dir / "s5.json"
            f5.write_text(json.dumps({"taskListId": "   ", "task_list_id": 12345}), encoding="utf-8")
            self.assertIsNone(_task_list_from_settings(f5))


class SessionRegistryDiscoveryTests(unittest.TestCase):
    def test_find_git_branch_scenarios(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            pdir = root / "projects" / "test-proj"
            pdir.mkdir(parents=True)

            # Scenario 1: Valid git repo with gitBranch in record
            t1 = pdir / "sess-branch-1.jsonl"
            t1.write_text(json.dumps({"sessionId": "sess-branch-1", "gitBranch": "feature/ui-v2"}) + "\n", encoding="utf-8")

            # Scenario 2: Detached HEAD / branch in metadata
            t2 = pdir / "sess-branch-2.jsonl"
            t2.write_text(json.dumps({
                "sessionId": "sess-branch-2",
                "metadata": {"branch": "HEAD (detached at 7fa5932)"},
            }) + "\n", encoding="utf-8")

            # Scenario 3: Non-git directory (no branch key in record or metadata)
            t3 = pdir / "sess-branch-3.jsonl"
            t3.write_text(json.dumps({"sessionId": "sess-branch-3", "cwd": "/tmp/non-git"}) + "\n", encoding="utf-8")

            # Scenario 4: Subprocess error / missing git binary simulation
            # In transcript scanning, git branch is read from records; if branch is empty or subprocess fails, it defaults to ''
            t4 = pdir / "sess-branch-4.jsonl"
            t4.write_text(json.dumps({"sessionId": "sess-branch-4", "gitBranch": ""}) + "\n", encoding="utf-8")

            reg = SessionRegistry(root)
            sessions = {s["id"]: s for s in reg.discover()}

            self.assertEqual(sessions["sess-branch-1"]["gitBranch"], "feature/ui-v2")
            self.assertEqual(sessions["sess-branch-2"]["gitBranch"], "HEAD (detached at 7fa5932)")
            self.assertEqual(sessions["sess-branch-3"]["gitBranch"], "")
            self.assertEqual(sessions["sess-branch-4"]["gitBranch"], "")

    def test_parse_transcript_scenarios(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            pdir = root / "projects" / "p-main"
            pdir.mkdir(parents=True)

            # Valid lines, truncated lines, non-json lines, empty transcript
            t_valid = pdir / "full-session.jsonl"
            lines = [
                json.dumps({"timestamp": "2026-09-05T10:00:00Z", "cwd": "/my/project", "type": "system", "customTitle": "Auth System", "summary": "Authentication redesign"}),
                "{truncated json line",
                "non json raw text",
                "12345",
                "[1, 2, 3]",
                json.dumps({
                    "timestamp": "2026-09-05T10:05:00Z",
                    "cwd": "/should/be/ignored/because/cwd/already/set",
                    "type": "user",
                    "message": {"content": [{"type": "text", "text": "Fix login modal bug"}]},
                }),
                json.dumps({
                    "timestamp": "2026-09-05T10:10:00Z",
                    "type": "user",
                    "message": {"content": "Second user message"},
                }),
                json.dumps({"timestamp": "2026-09-05T10:02:00Z", "type": "assistant", "message": "working on it"}),
                json.dumps({"timestamp": "2026-09-05T10:15:00Z", "type": "assistant", "message": "done"}),
            ]
            t_valid.write_text("\n".join(lines) + "\n", encoding="utf-8")

            # Empty transcript file
            t_empty = pdir / "empty-session.jsonl"
            t_empty.write_text("", encoding="utf-8")

            # Subagent transcript in subdirectory (should be ignored by SessionRegistry)
            sub_dir = pdir / "full-session" / "subagents"
            sub_dir.mkdir(parents=True)
            sub_file = sub_dir / "agent-worker.jsonl"
            sub_file.write_text(json.dumps({"type": "assistant", "message": "subagent work"}) + "\n", encoding="utf-8")

            reg = SessionRegistry(root)
            sessions = {s["id"]: s for s in reg.discover()}

            # Verify subagents file was filtered out
            self.assertNotIn("agent-worker", sessions)
            self.assertIn("full-session", sessions)
            self.assertIn("empty-session", sessions)

            s_full = sessions["full-session"]
            self.assertEqual(s_full["customTitle"], "Auth System")
            self.assertEqual(s_full["summary"], "Authentication redesign")
            self.assertEqual(s_full["firstPrompt"], "Fix login modal bug")
            self.assertEqual(s_full["messageCount"], 5)  # 5 valid json dict records
            self.assertEqual(s_full["createdAt"], "2026-09-05T10:00:00Z")
            self.assertEqual(s_full["lastActivity"], "2026-09-05T10:15:00Z")

            s_empty = sessions["empty-session"]
            self.assertEqual(s_empty["messageCount"], 0)
            self.assertEqual(s_empty["firstPrompt"], "")
            self.assertTrue(len(s_empty["createdAt"]) > 0)
            self.assertTrue(len(s_empty["lastActivity"]) > 0)

    def test_parse_transcript_message_variations(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            pdir = root / "projects" / "p-variations"
            pdir.mkdir(parents=True)

            # User message where message is a string directly
            t1 = pdir / "user-str.jsonl"
            t1.write_text(json.dumps({
                "type": "user",
                "message": "Simple string message",
                "sessionName": "Named Session",
                "conversationSummary": "Conv Summary",
            }) + "\n", encoding="utf-8")

            # User message where message is None
            t2 = pdir / "user-none.jsonl"
            t2.write_text(json.dumps({
                "type": "user",
                "message": None,
                "name": "Name Key Session",
            }) + "\n", encoding="utf-8")

            reg = SessionRegistry(root)
            sessions = {s["id"]: s for s in reg.discover()}

            self.assertEqual(sessions["user-str"]["firstPrompt"], "Simple string message")
            self.assertEqual(sessions["user-str"]["customTitle"], "Named Session")
            self.assertEqual(sessions["user-str"]["summary"], "Conv Summary")

            self.assertEqual(sessions["user-none"]["firstPrompt"], "")
            self.assertEqual(sessions["user-none"]["customTitle"], "Name Key Session")

    def test_session_registry_lifecycle_and_caching(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            projects = root / "projects"

            # Case 1: projects_root does not exist
            reg = SessionRegistry(root)
            self.assertEqual(reg.discover(), [])
            self.assertEqual(reg.snapshot(), [])

            # Case 2: projects_root exists with non-directory entry and valid project
            projects.mkdir(parents=True)
            (projects / "ignored-file.txt").write_text("not a dir", encoding="utf-8")

            proj_dir = projects / "project-a"
            proj_dir.mkdir()

            s1 = proj_dir / "sess-1.jsonl"
            s1.write_text(json.dumps({"timestamp": "2026-09-05T11:00:00Z", "summary": "First"}) + "\n", encoding="utf-8")
            s2 = proj_dir / "sess-2.jsonl"
            s2.write_text(json.dumps({"timestamp": "2026-09-05T12:00:00Z", "summary": "Second"}) + "\n", encoding="utf-8")

            # First scan: cache miss, populates cache
            results1 = reg.discover()
            self.assertEqual(len(results1), 2)
            # Verify sorting: newest lastActivity first
            self.assertEqual([s["id"] for s in results1], ["sess-2", "sess-1"])

            # Snapshot returns deep copies
            snap = reg.snapshot()
            snap[0]["customTitle"] = "Mutated"
            self.assertNotEqual(reg.snapshot()[0].get("customTitle"), "Mutated")

            # Second scan without force: cache hit
            results2 = reg.discover(force=False)
            self.assertEqual([s["id"] for s in results2], ["sess-2", "sess-1"])

            # Test cache hit with cached info being None or empty dict
            first_key = list(reg._file_cache.keys())[0]
            orig_info = reg._file_cache[first_key]["info"]
            reg._file_cache[first_key]["info"] = None
            cached_res = reg.discover(force=False)
            self.assertEqual(len(cached_res), 1)
            reg._file_cache[first_key]["info"] = orig_info

            # Third scan with force=True: bypasses cache
            results3 = reg.discover(force=True)
            self.assertEqual(len(results3), 2)

            # Modify file s1 (changes size and signature): cache miss and update
            s1.write_text(json.dumps({"timestamp": "2026-09-05T13:00:00Z", "summary": "First Updated"}) + "\n", encoding="utf-8")
            results4 = reg.discover(force=False)
            self.assertEqual([s["id"] for s in results4], ["sess-1", "sess-2"])

            # Delete file s2: deleted file cleanup from cache
            s2.unlink()
            results5 = reg.discover(force=False)
            self.assertEqual(len(results5), 1)
            self.assertEqual(results5[0]["id"], "sess-1")
            self.assertNotIn(str(s2), reg._file_cache)

            # Test get()
            self.assertIsNotNone(reg.get("sess-1"))
            self.assertIsNone(reg.get("nonexistent"))
            self.assertIsNone(reg.get("nonexistent", refresh_if_missing=True))

            # Add new session and test get with refresh_if_missing=True
            s3 = proj_dir / "sess-3.jsonl"
            s3.write_text(json.dumps({"timestamp": "2026-09-05T14:00:00Z", "summary": "Third"}) + "\n", encoding="utf-8")
            self.assertIsNone(reg.get("sess-3", refresh_if_missing=False))
            found_s3 = reg.get("sess-3", refresh_if_missing=True)
            self.assertIsNotNone(found_s3)
            self.assertEqual(found_s3["id"], "sess-3")

    def test_session_registry_error_handling_and_branches(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            proj = root / "projects" / "err-proj"
            proj.mkdir(parents=True)

            # Entry ending in .jsonl that is a directory instead of a file
            dir_jsonl = proj / "not-a-file.jsonl"
            dir_jsonl.mkdir()

            # Normal file
            f1 = proj / "normal.jsonl"
            f1.write_text(json.dumps({"timestamp": "2026-09-05T10:00:00Z"}) + "\n", encoding="utf-8")

            reg = SessionRegistry(root)

            # Mock project_dir.glob to raise OSError on a directory
            with mock.patch.object(pathlib.Path, "glob", side_effect=OSError("Permission denied")):
                self.assertEqual(reg.discover(), [])

            # Mock stat on transcript to raise OSError inside the loop
            with mock.patch.object(pathlib.Path, "stat", side_effect=OSError("Stat failed")):
                self.assertEqual(reg.discover(), [])

            # Mock _scan_transcript returning None to cover branch 77->79
            with mock.patch.object(reg, "_scan_transcript", return_value=None):
                self.assertEqual(reg.discover(), [])

    def test_scan_transcript_details_and_fallbacks(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            proj = root / "projects" / "scan-proj"
            proj.mkdir(parents=True)

            # Test path.stat() raising OSError in _scan_transcript
            reg = SessionRegistry(root)
            nonexistent = proj / "ghost.jsonl"
            self.assertIsNone(reg._scan_transcript(nonexistent, proj))

            # Test path.open() raising OSError in _scan_transcript
            t_unreadable = proj / "unreadable.jsonl"
            t_unreadable.write_text("{}\n", encoding="utf-8")
            with mock.patch.object(pathlib.Path, "open", side_effect=OSError("Cannot open")):
                info_fallback = reg._scan_transcript(t_unreadable, proj)
                self.assertIsNotNone(info_fallback)
                self.assertEqual(info_fallback["messageCount"], 0)

            # Test fallback timestamp exception handling
            t_fallback = proj / "no-ts.jsonl"
            t_fallback.write_text(json.dumps({"type": "other"}) + "\n", encoding="utf-8")
            with mock.patch("datetime.datetime") as mock_dt:
                mock_dt.fromtimestamp.side_effect = ValueError("Timestamp conversion error")
                info_dt_err = reg._scan_transcript(t_fallback, proj)
                self.assertEqual(info_dt_err["createdAt"], "")
                self.assertEqual(info_dt_err["lastActivity"], "")

            # Test cwd handling, settings task lists, and env variable CLAUDE_CODE_TASK_LIST_ID
            workspace_dir = pathlib.Path(td) / "workspace"
            workspace_dir.mkdir()
            claude_conf = workspace_dir / ".claude"
            claude_conf.mkdir()
            (claude_conf / "settings.json").write_text(json.dumps({"taskListId": "main-task-list"}), encoding="utf-8")
            (claude_conf / "settings.local.json").write_text(json.dumps({"task_list": "local-task-list"}), encoding="utf-8")

            t_cwd = proj / "with-cwd.jsonl"
            t_cwd.write_text(json.dumps({
                "cwd": str(workspace_dir),
                "timestamp": "2026-09-05T09:00:00Z",
                "customTitle": "Short Title",
            }) + "\n", encoding="utf-8")

            with mock.patch.dict(os.environ, {"CLAUDE_CODE_TASK_LIST_ID": "env-task-list"}):
                info_cwd = reg._scan_transcript(t_cwd, proj)
                self.assertEqual(info_cwd["cwd"], str(workspace_dir))
                self.assertIn("main-task-list", info_cwd["candidateIds"])
                self.assertIn("local-task-list", info_cwd["candidateIds"])
                self.assertIn("env-task-list", info_cwd["candidateIds"])
                self.assertIn(workspace_dir.name, info_cwd["candidateIds"])

            # Test without cwd: hits 'if not cwd:' branch and does not check settings files
            t_nocwd = proj / "without-cwd.jsonl"
            t_nocwd.write_text(json.dumps({"timestamp": "2026-09-05T09:00:00Z"}) + "\n", encoding="utf-8")
            with mock.patch.dict(os.environ, {}, clear=True):
                info_nocwd = reg._scan_transcript(t_nocwd, proj)
                self.assertEqual(info_nocwd["cwd"], "")
                self.assertEqual(info_nocwd["projectKey"], proj.name)

            # Test label precedence and label truncation when > 120 chars
            long_title = "A" * 150
            t_long = proj / "long-label.jsonl"
            t_long.write_text(json.dumps({"customTitle": long_title}) + "\n", encoding="utf-8")
            info_long = reg._scan_transcript(t_long, proj)
            self.assertTrue(info_long["label"].endswith("…"))
            self.assertEqual(len(info_long["label"]), 118)  # 117 chars + '…'

            # Label precedence: summary when no customTitle
            t_sum = proj / "sum-label.jsonl"
            t_sum.write_text(json.dumps({"summary": "Summary Title"}) + "\n", encoding="utf-8")
            info_sum = reg._scan_transcript(t_sum, proj)
            self.assertEqual(info_sum["label"], "Summary Title")

            # Label precedence: firstPrompt when no customTitle and no summary
            t_prompt = proj / "prompt-label.jsonl"
            t_prompt.write_text(json.dumps({
                "type": "user",
                "message": {"content": "First Prompt Title"},
            }) + "\n", encoding="utf-8")
            info_prompt = reg._scan_transcript(t_prompt, proj)
            self.assertEqual(info_prompt["label"], "First Prompt Title")

            # Label precedence: session_id when everything is empty
            t_id = proj / "id-label.jsonl"
            t_id.write_text("{}\n", encoding="utf-8")
            info_id = reg._scan_transcript(t_id, proj)
            self.assertEqual(info_id["label"], "id-label")

            # Secondary sorting coverage when item has no id or None id
            dummy_sessions = [
                {"id": None, "lastActivity": "2026-09-05T10:00:00Z"},
                {"id": "s-a", "lastActivity": "2026-09-05T10:00:00Z"},
            ]
            dummy_sessions.sort(
                key=lambda item: (_iso_key(item.get("lastActivity")), item.get("id") or ""),
                reverse=True,
            )
            self.assertEqual(dummy_sessions[0]["id"], "s-a")


# ==============================================================================
# Unit and Integration Tests for server/http_api.py
# ==============================================================================

class HttpApiHelperTests(unittest.TestCase):
    def test_session_ids_parsing(self):
        self.assertEqual(_session_ids({"sessionIds": ["s1,s2,s3"]}), ["s1", "s2", "s3"])
        self.assertEqual(_session_ids({"sessionIds": ["sess%201,sess%202"]}), ["sess 1", "sess 2"])
        self.assertEqual(_session_ids({"sessionIds": [""]}), [])
        self.assertEqual(_session_ids({"sessionIds": []}), [])
        self.assertEqual(_session_ids({}), [])
        self.assertEqual(_session_ids({"sessionIds": [",s1,,s2,"]}), ["s1", "s2"])


class HttpApiHandlerTests(unittest.TestCase):
    def setUp(self):
        self.runtime = DummyRuntime(client_origins=["http://localhost:3000", "http://127.0.0.1:3000"])
        self.handler_cls = make_handler(self.runtime)

    def test_log_message_suppression(self):
        handler = make_handler_instance(self.handler_cls)
        self.assertIsNone(handler.log_message("Format %s", "arg"))

    def test_cors_and_origin_guard(self):
        # 1. Allowed origin
        resp, _ = make_request(self.handler_cls, "GET", "/api/sessions", headers={"Origin": "http://localhost:3000"})
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.headers.get("Access-Control-Allow-Origin"), "http://localhost:3000")
        self.assertEqual(resp.headers.get("Vary"), "Origin")

        # 2. Missing origin (direct browser navigation or local tool)
        resp, _ = make_request(self.handler_cls, "GET", "/api/sessions")
        self.assertEqual(resp.status, 200)
        self.assertNotIn("Access-Control-Allow-Origin", resp.headers)

        # 3. Disallowed origin
        resp, _ = make_request(self.handler_cls, "GET", "/api/sessions", headers={"Origin": "http://malicious.org"})
        self.assertEqual(resp.status, 403)
        self.assertEqual(resp.json, {"error": "Origin is not allowed"})

        # 4. OPTIONS preflight with allowed origin
        resp, _ = make_request(self.handler_cls, "OPTIONS", "/api/sessions", headers={"Origin": "http://localhost:3000"})
        self.assertEqual(resp.status, 204)
        self.assertEqual(resp.headers.get("Access-Control-Allow-Origin"), "http://localhost:3000")
        self.assertIn("GET,POST,PATCH,DELETE,OPTIONS", resp.headers.get("Access-Control-Allow-Methods", ""))
        self.assertEqual(resp.headers.get("Access-Control-Max-Age"), "600")

        # 5. OPTIONS preflight with disallowed origin
        resp, _ = make_request(self.handler_cls, "OPTIONS", "/api/sessions", headers={"Origin": "http://malicious.org"})
        self.assertEqual(resp.status, 403)

        # 6. Runtime with client_origins as None
        rt_no_origins = DummyRuntime(client_origins=[])
        rt_no_origins.config.client_origins = None
        handler_no_origins = make_handler(rt_no_origins)
        resp, _ = make_request(handler_no_origins, "GET", "/api/sessions", headers={"Origin": "http://any.com"})
        self.assertEqual(resp.status, 403)
        resp, _ = make_request(handler_no_origins, "GET", "/api/sessions")
        self.assertEqual(resp.status, 200)

        # 7. Other HTTP methods blocked by guard
        resp, _ = make_request(self.handler_cls, "POST", "/api/sessions/refresh", headers={"Origin": "http://bad.org"})
        self.assertEqual(resp.status, 403)
        resp, _ = make_request(self.handler_cls, "PATCH", "/api/app-state", headers={"Origin": "http://bad.org"})
        self.assertEqual(resp.status, 403)
        resp, _ = make_request(self.handler_cls, "DELETE", "/api/sessions/sess-1/watch", headers={"Origin": "http://bad.org"})
        self.assertEqual(resp.status, 403)

    def test_send_bytes_and_send_json(self):
        handler = make_handler_instance(self.handler_cls)
        # Empty payload
        handler.send_bytes(204, "text/plain", b"")
        output = handler.wfile.getvalue()
        self.assertIn(b"204", output)
        self.assertIn(b"Content-Length: 0", output)

        # Non-empty payload with extra headers
        handler2 = make_handler_instance(self.handler_cls)
        handler2.send_bytes(200, "text/plain", b"sample payload", extra={"X-Custom": "CustomValue"})
        output2 = handler2.wfile.getvalue()
        self.assertIn(b"X-Custom: CustomValue", output2)
        self.assertIn(b"sample payload", output2)

        # send_json
        handler3 = make_handler_instance(self.handler_cls)
        handler3.send_json(200, {"success": True})
        output3 = handler3.wfile.getvalue()
        self.assertIn(b'{"success":true}', output3)

    def test_read_body_json(self):
        # Missing Content-Length
        h1 = make_handler_instance(self.handler_cls, headers={})
        self.assertEqual(h1.read_body_json(), {})

        # Invalid Content-Length
        h2 = make_handler_instance(self.handler_cls, headers={"Content-Length": "not-an-int"})
        self.assertEqual(h2.read_body_json(), {})

        # Content-Length <= 0
        h3 = make_handler_instance(self.handler_cls, headers={"Content-Length": "0"})
        self.assertEqual(h3.read_body_json(), {})

        # Content-Length > 0, but empty rfile
        h4 = make_handler_instance(self.handler_cls, headers={"Content-Length": "10"}, body_bytes=b"")
        self.assertEqual(h4.read_body_json(), {})

        # Valid JSON object
        body = b'{"hello": "world"}'
        h5 = make_handler_instance(self.handler_cls, headers={"Content-Length": str(len(body))}, body_bytes=body)
        self.assertEqual(h5.read_body_json(), {"hello": "world"})

        # Valid JSON but not a dict (array or primitive) raises ValueError
        body_list = b"[1, 2, 3]"
        h6 = make_handler_instance(self.handler_cls, headers={"Content-Length": str(len(body_list))}, body_bytes=body_list)
        with self.assertRaises(ValueError) as cm:
            h6.read_body_json()
        self.assertEqual(str(cm.exception), "JSON body must be an object")

    def test_get_endpoints(self):
        # GET /api/sessions
        resp, _ = make_request(self.handler_cls, "GET", "/api/sessions")
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json, {"sessions": self.runtime.sessions})

        # GET /api/app-state
        resp, _ = make_request(self.handler_cls, "GET", "/api/app-state")
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["currentSessionId"], "sess-1")

        # GET /api/state with and without sessionIds
        resp, _ = make_request(self.handler_cls, "GET", "/api/state")
        self.assertEqual(resp.status, 200)
        self.assertIsNone(resp.json["sessionIds"])

        resp, _ = make_request(self.handler_cls, "GET", "/api/state?sessionIds=sess-1,sess-2")
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["sessionIds"], ["sess-1", "sess-2"])

        # GET /api/history with and without sessionIds
        resp, _ = make_request(self.handler_cls, "GET", "/api/history")
        self.assertEqual(resp.status, 200)
        self.assertIsNone(resp.json["history"][0]["sessionIds"])

        resp, _ = make_request(self.handler_cls, "GET", "/api/history?sessionIds=sess-1")
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["history"][0]["sessionIds"], ["sess-1"])

        # GET /api/translations
        resp, _ = make_request(self.handler_cls, "GET", "/api/translations")
        self.assertEqual(resp.status, 200)
        self.assertEqual(len(resp.json["jobs"]), 1)

        # GET /api/translation-catalog
        resp, _ = make_request(self.handler_cls, "GET", "/api/translation-catalog")
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["languages"], ["hu", "en"])

        # GET /api/settings
        resp, _ = make_request(self.handler_cls, "GET", "/api/settings")
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["provider"], "anthropic")

        # GET /api/prompts
        resp, _ = make_request(self.handler_cls, "GET", "/api/prompts")
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["prompts"][0]["name"], "system")

        # GET /api/providers/anthropic/models (success and failure)
        resp, _ = make_request(self.handler_cls, "GET", "/api/providers/anthropic/models")
        self.assertEqual(resp.status, 200)
        self.assertIn("claude-3-5-sonnet", resp.json["models"])

        with mock.patch.object(self.runtime, "anthropic_models", side_effect=RuntimeError("API down")):
            resp, _ = make_request(self.handler_cls, "GET", "/api/providers/anthropic/models")
            self.assertEqual(resp.status, 503)
            self.assertEqual(resp.json["error"], "API down")
            self.assertEqual(resp.json["models"], [])

        # GET /api/prompts/<name>
        resp, _ = make_request(self.handler_cls, "GET", "/api/prompts/my-prompt")
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["name"], "my-prompt")

        # GET /api/sessions/<id>/flow-layout
        resp, _ = make_request(self.handler_cls, "GET", "/api/sessions/sess-1/flow-layout")
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["sessionId"], "sess-1")

        # GET /api/sessions/<id>/translations/<job_id>
        resp, _ = make_request(self.handler_cls, "GET", "/api/sessions/sess-1/translations/job-1")
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["job"]["jobId"], "job-1")

        resp, _ = make_request(self.handler_cls, "GET", "/api/sessions/sess-1/translations/not-found")
        self.assertEqual(resp.status, 404)
        self.assertEqual(resp.json["error"], "Translation job not found")

        # GET /events via do_GET dispatch
        self.runtime.stop_event.clear()
        handler_events = make_handler_instance(self.handler_cls, path="/events")

        def stop_on_connect(q):
            self.runtime.stop_event.set()

        self.runtime.hub.clients.on_append = stop_on_connect
        handler_events.do_GET()
        self.runtime.hub.clients.on_append = None
        self.assertIn(b": connected\n\n", handler_events.wfile.getvalue())

        # GET 404 Not Found
        resp, _ = make_request(self.handler_cls, "GET", "/api/nonexistent")
        self.assertEqual(resp.status, 404)
        self.assertEqual(resp.json["error"], "Not found")

        # GET KeyError -> 404
        with mock.patch.object(self.runtime, "sessions_state", side_effect=KeyError("invalid_key")):
            resp, _ = make_request(self.handler_cls, "GET", "/api/sessions")
            self.assertEqual(resp.status, 404)
            self.assertIn("Not found:", resp.json["error"])

        # GET Generic Exception -> 500
        with mock.patch.object(self.runtime, "sessions_state", side_effect=Exception("Database crash")):
            resp, _ = make_request(self.handler_cls, "GET", "/api/sessions")
            self.assertEqual(resp.status, 500)
            self.assertEqual(resp.json["error"], "Database crash")

    def test_patch_endpoints(self):
        # PATCH /api/app-state: switch current session
        resp, _ = make_request(self.handler_cls, "PATCH", "/api/app-state", body={"currentSessionId": "sess-2"})
        self.assertEqual(resp.status, 200)
        self.assertEqual(self.runtime.app_state()["currentSessionId"], "sess-2")

        # PATCH /api/app-state: update watched sessions
        resp, _ = make_request(self.handler_cls, "PATCH", "/api/app-state", body={"watchedSessionIds": ["sess-2"]})
        self.assertEqual(resp.status, 200)
        self.assertEqual(self.runtime.app_state()["watchedSessionIds"], ["sess-2"])

        # PATCH /api/app-state: watchedSessionIds as None
        resp, _ = make_request(self.handler_cls, "PATCH", "/api/app-state", body={"watchedSessionIds": None})
        self.assertEqual(resp.status, 200)

        # PATCH /api/app-state: empty body
        resp, _ = make_request(self.handler_cls, "PATCH", "/api/app-state", body={})
        self.assertEqual(resp.status, 200)

        # PATCH 404
        resp, _ = make_request(self.handler_cls, "PATCH", "/api/unsupported", body={})
        self.assertEqual(resp.status, 404)

        # PATCH KeyError -> 404
        with mock.patch.object(self.runtime, "switch_session", side_effect=KeyError("Session does not exist")):
            resp, _ = make_request(self.handler_cls, "PATCH", "/api/app-state", body={"currentSessionId": "missing"})
            self.assertEqual(resp.status, 404)

        # PATCH invalid body -> 400
        resp, _ = make_request(self.handler_cls, "PATCH", "/api/app-state", body="[1, 2, 3]")
        self.assertEqual(resp.status, 400)
        self.assertEqual(resp.json["error"], "JSON body must be an object")

    def test_post_endpoints(self):
        # POST /api/sessions/refresh
        resp, _ = make_request(self.handler_cls, "POST", "/api/sessions/refresh")
        self.assertEqual(resp.status, 200)
        self.assertTrue(resp.json["refreshed"])

        # POST /api/settings
        resp, _ = make_request(self.handler_cls, "POST", "/api/settings", body={"provider": "ollama"})
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["settings"]["provider"], "ollama")

        # POST /api/prompts/migrate
        resp, _ = make_request(self.handler_cls, "POST", "/api/prompts/migrate")
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["prompts"][0]["name"], "migrated-1")

        # POST /api/providers/anthropic/test
        resp, _ = make_request(self.handler_cls, "POST", "/api/providers/anthropic/test", body={"key": "test"})
        self.assertEqual(resp.status, 200)
        self.assertTrue(resp.json["success"])

        # POST /api/translations/bulk with jobRefs
        resp, _ = make_request(self.handler_cls, "POST", "/api/translations/bulk", body={"action": "retry", "jobRefs": ["r1", "r2"]})
        self.assertEqual(resp.status, 202)
        self.assertEqual(resp.json["summary"]["count"], 2)

        # POST /api/translations/bulk with jobIds fallback
        resp, _ = make_request(self.handler_cls, "POST", "/api/translations/bulk", body={"action": "cancel", "jobIds": ["id1"]})
        self.assertEqual(resp.status, 202)
        self.assertEqual(resp.json["summary"]["count"], 1)

        # POST /api/translations/bulk with neither
        resp, _ = make_request(self.handler_cls, "POST", "/api/translations/bulk", body={"action": "delete"})
        self.assertEqual(resp.status, 202)
        self.assertEqual(resp.json["summary"]["count"], 0)

        # POST /api/prompts/<name>/restore
        resp, _ = make_request(self.handler_cls, "POST", "/api/prompts/system/restore")
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["restored"], "system")

        # POST /api/prompts/<name>
        resp, _ = make_request(self.handler_cls, "POST", "/api/prompts/system", body={"body": "New prompt body"})
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["body"], "New prompt body")

        # POST /api/sessions/<id>/switch
        resp, _ = make_request(self.handler_cls, "POST", "/api/sessions/sess-2/switch")
        self.assertEqual(resp.status, 200)
        self.assertEqual(self.runtime.app_state()["currentSessionId"], "sess-2")

        # POST /api/sessions/<id>/watch
        resp, _ = make_request(self.handler_cls, "POST", "/api/sessions/sess-2/watch")
        self.assertEqual(resp.status, 200)
        self.assertIn("sess-2", self.runtime.app_state()["watchedSessionIds"])

        # POST /api/sessions/<id>/language
        resp, _ = make_request(self.handler_cls, "POST", "/api/sessions/sess-1/language", body={"language": "hu"})
        self.assertEqual(resp.status, 202)
        self.assertEqual(resp.json["requestedLanguage"], "hu")

        # POST /api/sessions/<id>/language/cancel
        resp, _ = make_request(self.handler_cls, "POST", "/api/sessions/sess-1/language/cancel")
        self.assertEqual(resp.status, 200)
        self.assertEqual(len(resp.json["jobs"]), 1)

        # POST /api/sessions/<id>/tasks/<tid>/language
        resp, _ = make_request(self.handler_cls, "POST", "/api/sessions/sess-1/tasks/task-abc/language", body={"language": "en"})
        self.assertEqual(resp.status, 202)
        self.assertEqual(resp.json["taskId"], "task-abc")

        # POST /api/sessions/<id>/tasks/<tid>/translation/cancel
        resp, _ = make_request(self.handler_cls, "POST", "/api/sessions/sess-1/tasks/task-abc/translation/cancel")
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["jobs"][0]["taskId"], "task-abc")

        # POST /api/sessions/<id>/flow-layout
        resp, _ = make_request(self.handler_cls, "POST", "/api/sessions/sess-1/flow-layout", body={"pos": 10})
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["saved"], {"pos": 10})

        # POST /api/sessions/<id>/translations/<jid>/retry
        resp, _ = make_request(self.handler_cls, "POST", "/api/sessions/sess-1/translations/job-1/retry")
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["job"]["action"], "retry")

        # POST /api/sessions/<id>/translations/<jid>/cancel
        resp, _ = make_request(self.handler_cls, "POST", "/api/sessions/sess-1/translations/job-1/cancel")
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["job"]["action"], "cancel")

        # Compatibility aliases: /api/language and /api/language/cancel
        self.runtime._app_state["currentSessionId"] = "sess-1"
        resp, _ = make_request(self.handler_cls, "POST", "/api/language", body={"language": "hu"})
        self.assertEqual(resp.status, 202)
        self.assertEqual(resp.json["sessionId"], "sess-1")

        resp, _ = make_request(self.handler_cls, "POST", "/api/language/cancel")
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.json["jobs"][0]["sessionId"], "sess-1")

        # Compatibility aliases when currentSessionId is None -> 404
        self.runtime._app_state["currentSessionId"] = None
        resp, _ = make_request(self.handler_cls, "POST", "/api/language", body={"language": "hu"})
        self.assertEqual(resp.status, 404)

        resp, _ = make_request(self.handler_cls, "POST", "/api/language/cancel")
        self.assertEqual(resp.status, 404)

        # POST 404
        resp, _ = make_request(self.handler_cls, "POST", "/api/unmatched-endpoint")
        self.assertEqual(resp.status, 404)

        # POST exception mappings
        with mock.patch.object(self.runtime, "refresh_sessions", side_effect=KeyError("Key error occurred")):
            resp, _ = make_request(self.handler_cls, "POST", "/api/sessions/refresh")
            self.assertEqual(resp.status, 404)

        with mock.patch.object(self.runtime, "refresh_sessions", side_effect=ValueError("Value conflict")):
            resp, _ = make_request(self.handler_cls, "POST", "/api/sessions/refresh")
            self.assertEqual(resp.status, 409)

        with mock.patch.object(self.runtime, "refresh_sessions", side_effect=Exception("Internal failure")):
            resp, _ = make_request(self.handler_cls, "POST", "/api/sessions/refresh")
            self.assertEqual(resp.status, 500)

    def test_delete_endpoints(self):
        # DELETE /api/sessions/<id>/watch
        resp, _ = make_request(self.handler_cls, "DELETE", "/api/sessions/sess-1/watch")
        self.assertEqual(resp.status, 200)
        self.assertNotIn("sess-1", self.runtime.app_state()["watchedSessionIds"])

        # DELETE /api/sessions/<id>/flow-layout
        resp, _ = make_request(self.handler_cls, "DELETE", "/api/sessions/sess-1/flow-layout")
        self.assertEqual(resp.status, 200)
        self.assertTrue(resp.json["reset"])

        # DELETE /api/sessions/<id>/translations/<jid>
        resp, _ = make_request(self.handler_cls, "DELETE", "/api/sessions/sess-1/translations/job-1")
        self.assertEqual(resp.status, 200)
        self.assertTrue(resp.json["job"]["deleted"])

        # DELETE 404
        resp, _ = make_request(self.handler_cls, "DELETE", "/api/unknown-delete")
        self.assertEqual(resp.status, 404)

        # DELETE exception mappings
        with mock.patch.object(self.runtime, "reset_flow_layout", side_effect=KeyError("No layout")):
            resp, _ = make_request(self.handler_cls, "DELETE", "/api/sessions/sess-1/flow-layout")
            self.assertEqual(resp.status, 404)

        with mock.patch.object(self.runtime, "reset_flow_layout", side_effect=ValueError("Invalid layout")):
            resp, _ = make_request(self.handler_cls, "DELETE", "/api/sessions/sess-1/flow-layout")
            self.assertEqual(resp.status, 409)

        with mock.patch.object(self.runtime, "reset_flow_layout", side_effect=Exception("Failed to reset")):
            resp, _ = make_request(self.handler_cls, "DELETE", "/api/sessions/sess-1/flow-layout")
            self.assertEqual(resp.status, 500)

    def test_events_sse_stream_and_disconnects(self):
        # 1. Event transmission and clean shutdown
        handler = make_handler_instance(self.handler_cls, path="/events", headers={"Origin": "http://localhost:3000"})

        def custom_append(q):
            q.put({"id": "evt-1", "event": "status", "payload": {"active": True}})
            orig_get = q.get

            def get_and_stop(timeout=15):
                res = orig_get(timeout=timeout)
                self.runtime.stop_event.set()
                return res

            q.get = get_and_stop

        self.runtime.hub.clients.on_append = custom_append
        handler.handle_events()
        self.runtime.hub.clients.on_append = None

        output = handler.wfile.getvalue().decode("utf-8")
        self.assertIn("HTTP/1.1 200 OK", output)
        self.assertIn("Content-Type: text/event-stream", output)
        self.assertIn("Access-Control-Allow-Origin: http://localhost:3000", output)
        self.assertIn(": connected\n\n", output)
        self.assertIn("id: evt-1\nevent: status\ndata: {\"active\":true}\n\n", output)
        self.assertEqual(len(self.runtime.hub.clients), 0)

        # 2. Heartbeat on queue.Empty timeout
        self.runtime.stop_event.clear()
        handler_hb = make_handler_instance(self.handler_cls, path="/events")

        first_get = True

        def mock_get(timeout=15):
            nonlocal first_get
            if first_get:
                first_get = False
                raise queue.Empty()
            self.runtime.stop_event.set()
            return {"id": "evt-2", "event": "done", "payload": {}}

        with mock.patch("queue.Queue.get", side_effect=mock_get):
            handler_hb.handle_events()

        output_hb = handler_hb.wfile.getvalue().decode("utf-8")
        self.assertIn(": heartbeat\n\n", output_hb)

        # 3. Disconnect handling: BrokenPipeError, ConnectionResetError, ConnectionAbortedError
        for exc_cls in (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            self.runtime.stop_event.clear()
            handler_disc = make_handler_instance(self.handler_cls, path="/events")
            orig_write = handler_disc.wfile.write

            def raise_pipe(data, cls=exc_cls):
                if b": connected" in data:
                    raise cls("Client disconnected")
                return orig_write(data)

            handler_disc.wfile.write = raise_pipe
            handler_disc.handle_events()
            self.assertEqual(len(self.runtime.hub.clients), 0)

        # 4. Finally block handles ValueError if client was already removed
        self.runtime.stop_event.clear()
        handler_valerr = make_handler_instance(self.handler_cls, path="/events")

        def append_and_premature_remove(q):
            self.runtime.hub.clients.remove(q)  # pre-emptively remove
            self.runtime.stop_event.set()

        self.runtime.hub.clients.on_append = append_and_premature_remove
        handler_valerr.handle_events()
        self.runtime.hub.clients.on_append = None

    def test_make_server_lifecycle(self):
        # Default port from config
        with mock.patch("server.session_core.QuietThreadingHTTPServer") as mock_server_cls:
            mock_inst = mock.MagicMock()
            mock_server_cls.return_value = mock_inst

            srv = make_server(self.runtime, port=None)
            self.assertIs(srv, mock_inst)
            mock_server_cls.assert_called_once_with(("127.0.0.1", 8765), mock.ANY)
            self.assertTrue(srv.daemon_threads)

        # Explicit integer port
        with mock.patch("server.session_core.QuietThreadingHTTPServer") as mock_server_cls:
            mock_inst = mock.MagicMock()
            mock_server_cls.return_value = mock_inst

            srv = make_server(self.runtime, port=9999)
            mock_server_cls.assert_called_once_with(("127.0.0.1", 9999), mock.ANY)

        # Port 0 / empty string
        with mock.patch("server.session_core.QuietThreadingHTTPServer") as mock_server_cls:
            mock_inst = mock.MagicMock()
            mock_server_cls.return_value = mock_inst

            srv = make_server(self.runtime, port="")
            mock_server_cls.assert_called_once_with(("127.0.0.1", 0), mock.ANY)


if __name__ == "__main__":
    unittest.main()
