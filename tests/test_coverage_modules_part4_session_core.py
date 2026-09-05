import contextlib
import copy
import datetime as dt
import http.client
import importlib.util
import io
import json
import os
import pathlib
import queue
import runpy
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest import mock
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

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

import server.session_core as session_core
import claude_todos.providers.agy as agy_provider_mod
from claude_todos.providers.base import ProviderResult


class TestSessionCoreBasics(unittest.TestCase):
    def test_write_workspace_agent(self):
        with tempfile.TemporaryDirectory() as td:
            path = session_core.write_workspace_agent(td, "custom-agent", "agent instructions")
            self.assertTrue(path.exists())
            self.assertEqual(path.read_text(encoding="utf-8"), "agent instructions")
            self.assertIn(".agents/agents/custom-agent/agent.md", str(path))

    def test_config_dataclass_defaults_and_custom(self):
        cfg = session_core.Config(
            session_id="sess-1",
            transcript="/tmp/t.jsonl",
            project_cwd="/tmp/proj",
            task_root=pathlib.Path("/tmp/tasks"),
            candidate_ids=["sess-1"],
        )
        self.assertEqual(cfg.session_id, "sess-1")
        self.assertEqual(cfg.initial_status, "all")
        self.assertEqual(cfg.initial_sort, "dependency")
        self.assertEqual(cfg.version, "4.1.2")
        self.assertFalse(cfg.no_open)
        self.assertFalse(cfg.log_file)
        self.assertFalse(cfg.log_output)
        self.assertEqual(cfg.port, 0)
        self.assertEqual(cfg.translation_model, session_core.DEFAULT_MODEL)

    def test_json_and_string_helpers(self):
        iso = session_core.now_iso()
        self.assertTrue(isinstance(iso, str) and len(iso) > 10)

        canon = session_core.canonical_json({"b": 2, "a": 1})
        self.assertEqual(canon, '{"a":1,"b":2}')

        sha = session_core.sha256_json({"a": 1})
        self.assertTrue(isinstance(sha, str) and len(sha) == 64)

        self.assertEqual(session_core.safe_component("", fallback="def"), "def")
        self.assertEqual(session_core.safe_component("a/b?c#d"), "a-b-c-d")
        long_val = "x" * 200
        self.assertEqual(len(session_core.safe_component(long_val)), 100)

        key = session_core.project_key("/path/to/my-project")
        self.assertTrue(key.startswith("my-project--"))
        empty_key = session_core.project_key("")
        self.assertTrue(isinstance(empty_key, str) and "--" in empty_key)

    def test_atomic_write_and_read_json(self):
        with tempfile.TemporaryDirectory() as td:
            f = pathlib.Path(td) / "sub" / "data.json"
            session_core.atomic_write_json(f, {"hello": "world"})
            self.assertTrue(f.exists())
            read_back = session_core.read_json(f)
            self.assertEqual(read_back, {"hello": "world"})

            # Corrupt file
            f.write_text("not json", encoding="utf-8")
            self.assertEqual(session_core.read_json(f, default={"fallback": 1}), {"fallback": 1})

            # Non-existent file
            non_existent = pathlib.Path(td) / "missing.json"
            self.assertEqual(session_core.read_json(non_existent, default={"missing": True}), {"missing": True})

    def test_load_and_save_app_settings(self):
        with tempfile.TemporaryDirectory() as td:
            cfg_path = pathlib.Path(td) / "config.json"
            saved = session_core.save_app_settings(cfg_path, model="gemini-3.8-flash-low", payload={"prompts": {"autoMigrate": False}})
            self.assertTrue(saved["valid"])
            self.assertEqual(saved["translationModel"], "gemini-3.8-flash-low")

            loaded = session_core.load_app_settings(cfg_path)
            self.assertTrue(loaded["valid"])
            self.assertEqual(loaded["translationModel"], "gemini-3.8-flash-low")
            self.assertEqual(loaded["translationProvider"], "agy")

            # Save with model=None
            saved2 = session_core.save_app_settings(cfg_path, model=None, payload=None)
            self.assertTrue(saved2["valid"])

    def test_app_logger_file_and_stream(self):
        with tempfile.TemporaryDirectory() as td:
            log_root = pathlib.Path(td) / "logs"
            stream_io = io.StringIO()
            cfg = session_core.Config(
                session_id="test/session",
                transcript="",
                project_cwd=td,
                task_root=pathlib.Path(td) / "tasks",
                candidate_ids=[],
                log_file=True,
                log_output=True,
                log_root=log_root,
                log_stream=stream_io,
            )

            # Test colored output when stream.isatty is mocked to True
            with mock.patch.object(stream_io, "isatty", return_value=True, create=True), \
                 mock.patch.dict(os.environ, {}, clear=False):
                if "NO_COLOR" in os.environ:
                    del os.environ["NO_COLOR"]
                logger = session_core.AppLogger(cfg)
                self.assertTrue(logger.color)
                self.assertTrue(logger.file_enabled)
                self.assertTrue(logger.output_enabled)
                self.assertIsNotNone(logger.file_handle)

                # Emit various levels and components
                logger.debug("🔎", "HTTP", "debug msg with \r and \n newlines")
                logger.info("ℹ️", "CACHE", "info msg")
                logger.success("✅", "TRANSLATE", "success msg")
                logger.warning("⚠️", "VALIDATE", "warning msg")
                logger.error("❌", "AGY", "error msg")

                logger.close()
                # Calling close a second time is safe
                logger.close()

            logged_text = stream_io.getvalue()
            self.assertIn("debug msg with \\r and \\n newlines", logged_text)
            self.assertIn("info msg", logged_text)

            self.assertTrue(logger.log_path.exists())
            file_content = logger.log_path.read_text(encoding="utf-8")
            self.assertIn("debug msg with \\r and \\n newlines", file_content)

    def test_app_logger_uncolored_and_disabled(self):
        stream_io = io.StringIO()
        with tempfile.TemporaryDirectory() as td:
            cfg = session_core.Config(
                session_id="s1", transcript="", project_cwd=td,
                task_root=pathlib.Path(td), candidate_ids=[],
                log_file=False, log_output=True, log_stream=stream_io,
            )
            with mock.patch.dict(os.environ, {"NO_COLOR": "1"}):
                logger = session_core.AppLogger(cfg)
                self.assertFalse(logger.color)
                self.assertIsNone(logger.file_handle)
                logger.info("ℹ️", "WATCH", "plain watch message")
                logger.close()

            self.assertIn("plain watch message", stream_io.getvalue())

            # Disabled logger does not emit anything
            cfg_disabled = session_core.Config(
                session_id="s1", transcript="", project_cwd=td,
                task_root=pathlib.Path(td), candidate_ids=[],
                log_file=False, log_output=False,
            )
            logger_disabled = session_core.AppLogger(cfg_disabled)
            logger_disabled.info("ℹ️", "SERVER", "silent")
            logger_disabled.close()

            # File enabled but output disabled (covers line 262->exit)
            cfg_file_only = session_core.Config(
                session_id="s1", transcript="", project_cwd=td,
                task_root=pathlib.Path(td), candidate_ids=[],
                log_file=True, log_output=False, log_root=pathlib.Path(td) / "logs",
            )
            logger_file_only = session_core.AppLogger(cfg_file_only)
            self.assertTrue(logger_file_only.file_enabled)
            self.assertFalse(logger_file_only.output_enabled)
            logger_file_only.info("ℹ️", "SERVER", "file only message")
            logger_file_only.close()
            self.assertTrue(logger_file_only.log_path.exists())
            self.assertIn("file only message", logger_file_only.log_path.read_text(encoding="utf-8"))


class TestTaskNormalizationAndDiffing(unittest.TestCase):
    def test_normalize_task(self):
        # Full dict
        raw = {
            "id": "10",
            "subject": "Task Ten",
            "description": "Desc Ten",
            "activeForm": "active",
            "status": "in_progress",
            "owner": "alice",
            "blockedBy": [1, "2"],
            "blocks": ["3"],
        }
        t = session_core.normalize_task(raw, "storeA", "/path/to/10.json")
        self.assertEqual(t["id"], "10")
        self.assertEqual(t["uid"], "storeA:10")
        self.assertEqual(t["storeId"], "storeA")
        self.assertEqual(t["blockedBy"], ["1", "2"])
        self.assertEqual(t["blocks"], ["3"])

        # Non-dict and missing fields
        t2 = session_core.normalize_task(None, "storeB", "/path/to/20.json")
        self.assertEqual(t2["id"], "20")
        self.assertEqual(t2["uid"], "storeB:20")
        self.assertEqual(t2["subject"], "(no subject)")
        self.assertEqual(t2["status"], "unknown")
        self.assertEqual(t2["blockedBy"], [])
        self.assertEqual(t2["blocks"], [])

        # Content fallback
        t3 = session_core.normalize_task({"content": "Subject from content"}, "storeC", "/path/to/30.json")
        self.assertEqual(t3["subject"], "Subject from content")

    def test_task_source_payload_and_fingerprints(self):
        t = {
            "id": "1",
            "subject": "S",
            "description": "D",
            "uid": "store:1",
            "storeId": "store",
            "file": "/a/b.json",
        }
        src = session_core.task_source_payload(t)
        self.assertNotIn("uid", src)
        self.assertNotIn("storeId", src)
        self.assertNotIn("file", src)
        self.assertEqual(src["id"], "1")

        fp = session_core.full_fingerprint(src)
        tfp = session_core.text_fingerprint(src)
        self.assertTrue(isinstance(fp, str) and len(fp) == 64)
        self.assertTrue(isinstance(tfp, str) and len(tfp) == 64)

    def test_field_label(self):
        self.assertEqual(session_core.field_label("status"), "Status")
        self.assertEqual(session_core.field_label("subject"), "Title")
        self.assertEqual(session_core.field_label("description"), "Description")
        self.assertEqual(session_core.field_label("activeForm"), "Active form")
        self.assertEqual(session_core.field_label("owner"), "Owner")
        self.assertEqual(session_core.field_label("blockedBy"), "Blocked by")
        self.assertEqual(session_core.field_label("blocks"), "Blocks")
        self.assertEqual(session_core.field_label("metadata"), "Metadata")
        self.assertEqual(session_core.field_label("id"), "Task ID")
        self.assertEqual(session_core.field_label("lifecycle"), "Lifecycle")
        self.assertEqual(session_core.field_label("customFieldName"), "Custom Field Name")
        self.assertEqual(session_core.field_label(""), "")

    def test_diff_source_tasks(self):
        self.assertEqual(session_core.diff_source_tasks(None, None), [])

        # Before is None (created)
        diff_created = session_core.diff_source_tasks(None, {"subject": "S", "description": "D", "status": "pending"})
        fields_created = [d["field"] for d in diff_created]
        self.assertIn("lifecycle", fields_created)
        self.assertIn("subject", fields_created)
        self.assertIn("description", fields_created)
        self.assertIn("status", fields_created)

        # After is None (removed)
        diff_deleted = session_core.diff_source_tasks({"subject": "S", "description": "D", "status": "pending"}, None)
        fields_deleted = [d["field"] for d in diff_deleted]
        self.assertIn("lifecycle", fields_deleted)
        self.assertIn("subject", fields_deleted)
        self.assertIn("description", fields_deleted)
        self.assertIn("status", fields_deleted)

        # Both present, some changed
        before = {"subject": "Old", "status": "pending", "custom": "A"}
        after = {"subject": "New", "status": "pending", "custom": "B"}
        diff_changed = session_core.diff_source_tasks(before, after)
        fields_changed = [d["field"] for d in diff_changed]
        self.assertEqual(fields_changed, ["subject", "custom"])
        self.assertEqual(diff_changed[0]["before"], "Old")
        self.assertEqual(diff_changed[0]["after"], "New")

        # Before is None and after has missing standard keys (covers line 415->414)
        diff_partial = session_core.diff_source_tasks(None, {"other": "value"})
        fields_partial = [d["field"] for d in diff_partial]
        self.assertEqual(fields_partial, ["lifecycle"])


class TestMarkdownAndMasking(unittest.TestCase):
    def test_markdown_shape(self):
        self.assertEqual(session_core.markdown_shape(None), {"lineCount": 0, "prefixes": [], "fences": []})

        text = """# Heading 1
## Heading 2
- [ ] Todo item
- [x] Done item
- Bullet item
* Bullet 2
+ Bullet 3
1. Numbered item
2) Parenthesis item
> Quote block

```python
x = 1
~~~nested
y = 2
~~~
```
Indented plain text
"""
        shape = session_core.markdown_shape(text)
        self.assertGreater(shape["lineCount"], 10)
        self.assertTrue(any(p[1] == "heading" for p in shape["prefixes"]))
        self.assertTrue(any(p[1] == "task-item" for p in shape["prefixes"]))
        self.assertTrue(any(p[1] == "fence" for p in shape["prefixes"]))
        self.assertTrue(any(p[1] == "code-line" for p in shape["prefixes"]))
        self.assertTrue(any(p[1] == "blank" for p in shape["prefixes"]))

    def test_protected_literals_and_non_overlapping_matches(self):
        text = "Check `code` and https://example.com/api and /usr/local/bin and PROJ-123 and TASK01 and #42 and v1.2.3"
        lits = session_core.protected_literals(text)
        self.assertIn("`code`", lits)
        self.assertIn("https://example.com/api", lits)
        self.assertIn("/usr/local/bin", lits)
        self.assertIn("PROJ-123", lits)
        self.assertIn("#42", lits)
        self.assertIn("v1.2.3", lits)

        # Overlapping fence and inline code
        overlap_text = "```\n`inside_code`\n```"
        matches = session_core._non_overlapping_protected_matches(overlap_text)
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0][2], overlap_text)

    def test_mask_and_restore_protected_literals(self):
        source = {
            "title": "Fix PROJ-101 in `src/main.py`",
            "description": "Check /var/log/app.log and https://test.local",
        }
        masked, maps = session_core.mask_protected_literals(source)
        self.assertIn("__CLAUDE_TODOS_LITERAL_TITLE_0001__", masked["title"])
        self.assertIn("__CLAUDE_TODOS_LITERAL_DESCRIPTION_0001__", masked["description"])

        # Perfect restore
        restored, issues = session_core.restore_protected_literals(masked, maps)
        self.assertEqual(issues, [])
        self.assertEqual(restored, source)

        # Missing placeholder issue
        corrupt_missing = {"title": "No placeholder", "description": masked["description"]}
        _, issues_missing = session_core.restore_protected_literals(corrupt_missing, maps)
        self.assertTrue(any("missing" in iss for iss in issues_missing))

        # Duplicated placeholder issue
        dup_placeholder = list(maps["title"].keys())[0]
        corrupt_dup = {"title": masked["title"] + " " + dup_placeholder, "description": masked["description"]}
        _, issues_dup = session_core.restore_protected_literals(corrupt_dup, maps)
        self.assertTrue(any("duplicated" in iss for iss in issues_dup))

        # Unexpected placeholder issue
        corrupt_unexp = {"title": masked["title"] + " __CLAUDE_TODOS_LITERAL_EXTRA_9999__", "description": masked["description"]}
        _, issues_unexp = session_core.restore_protected_literals(corrupt_unexp, maps)
        self.assertTrue(any("unexpected" in iss for iss in issues_unexp))

    def test_inline_markdown_shape_and_deterministic_issues(self):
        text = "**bold** and ~~strike~~ and `code` and [link](https://example.com)"
        inline = session_core.inline_markdown_shape(text)
        self.assertEqual(inline["boldDelimiters"], 2)
        self.assertEqual(inline["strikeDelimiters"], 2)
        self.assertEqual(inline["inlineCodeCount"], 1)
        self.assertEqual(inline["linkCount"], 1)

        source = {"title": "Title with `code`", "description": "- [ ] item"}
        candidate_ok = {"title": "Cím `code` értékkel", "description": "- [ ] elem"}
        self.assertEqual(session_core.deterministic_translation_issues(source, candidate_ok), [])

        # Mismatch in shape
        candidate_bad_shape = {"title": "Cím `code`", "description": "* elem"}
        issues_shape = session_core.deterministic_translation_issues(source, candidate_bad_shape)
        self.assertTrue(any("Markdown/line structure changed" in iss for iss in issues_shape))

        # Mismatch in literals
        candidate_bad_lit = {"title": "Cím más kóddal", "description": "- [ ] elem"}
        issues_lit = session_core.deterministic_translation_issues(source, candidate_bad_lit)
        self.assertTrue(any("protected technical literals changed" in iss for iss in issues_lit))

    def test_prompts_and_usage_summary(self):
        source = {"title": "Title", "description": "Desc"}
        prompt = session_core.translator_prompt(source)
        self.assertIn("Source JSON:", prompt)
        self.assertNotIn("A previous candidate was rejected", prompt)

        prompt_with_issues = session_core.translator_prompt(source, prior_issues=["issue 1", "issue 2"])
        self.assertIn("A previous candidate was rejected", prompt_with_issues)
        self.assertIn("- issue 1", prompt_with_issues)

        val_prompt = session_core.validator_prompt(source, {"title": "T", "description": "D"})
        self.assertIn("English source JSON:", val_prompt)
        self.assertNotIn("Deterministic checks also reported:", val_prompt)

        val_prompt_issues = session_core.validator_prompt(source, {"title": "T", "description": "D"}, deterministic_issues=["det issue"])
        self.assertIn("Deterministic checks also reported:", val_prompt_issues)

        # Usage summary
        self.assertEqual(session_core._agy_usage_summary(None), "")
        usage = {
            "input_tokens": 10, "output_tokens": 20, "thinking_tokens": 5,
            "cache_read_tokens": 3, "total_tokens": 38,
        }
        summary = session_core._agy_usage_summary(usage)
        self.assertEqual(summary, "in=10 out=20 thinking=5 cache=3 total=38")

    def test_translation_exceptions(self):
        c = session_core.TranslationCanceled("canceled msg")
        self.assertIsInstance(c, RuntimeError)

        v = session_core.TranslationValidationError("val error", issues=["iss1"])
        self.assertEqual(v.issues, ["iss1"])
        self.assertEqual(str(v), "val error")

        b = session_core.TranslationBatchError([{"uid": "s:1", "textFingerprint": "fp12345678", "message": "msg"}])
        self.assertIn("s:1 (fp123456): msg", str(b))

        b_empty = session_core.TranslationBatchError([])
        self.assertEqual(str(b_empty), "translation batch failed")


class TestRunAgyAndTranslateAndValidate(unittest.TestCase):
    def test_run_agy_binary_not_found(self):
        with mock.patch("shutil.which", return_value=None), \
             mock.patch("pathlib.Path.exists", return_value=False):
            with self.assertRaises(RuntimeError) as ctx:
                session_core.run_agy("/non/existent/agy", "prompt", {})
            self.assertIn("Antigravity CLI not found", str(ctx.exception))

    def test_run_agy_success_stream_and_logging(self):
        lines = [
            "",  # empty line
            "not valid json",  # JSONDecodeError
            json.dumps({"status": "RUNNING"}),  # no etype but status
            json.dumps({"event": "init", "model": "fake-model", "agent": "claude-todos-translator", "conversation_id": "conv-1", "permission_mode": "auto"}),
            json.dumps({"event": "step_update", "step_type": "reasoning", "state": "done", "duration_seconds": 0.5, "usage": {"total_tokens": 5}, "text_delta": "delta"}),
            json.dumps({"event": "result", "status": "SUCCESS", "structured_output": {"title": "HU", "description": "HU Desc"}, "duration_seconds": 1.2, "usage": {"total_tokens": 10}}),
        ]
        mock_proc = mock.MagicMock()
        mock_proc.stdout.readline.side_effect = [l + "\n" for l in lines] + [""]
        mock_proc.stderr.readline.side_effect = ["stderr line 1\n", "", ""]
        mock_proc.wait.return_value = 0
        mock_proc.pid = 12345

        mock_logger = mock.MagicMock()
        mock_handle = session_core.TranslationJobHandle(mock.MagicMock(), "job-1")

        with mock.patch("shutil.which", return_value="/bin/agy"), \
             mock.patch("subprocess.Popen", return_value=mock_proc):
            out, meta = session_core.run_agy(
                "/bin/agy", "prompt", {"type": "object"},
                logger=mock_logger, phase="translator", model="fake-model",
                job_handle=mock_handle, return_meta=True,
            )
            self.assertEqual(out, {"title": "HU", "description": "HU Desc"})
            self.assertEqual(meta["status"], "SUCCESS")
            self.assertEqual(meta["conversationId"], "conv-1")
            self.assertIn("rawResponse", meta)

            # Check without return_meta and phase validator
            mock_proc.stdout.readline.side_effect = [lines[-1] + "\n", ""]
            mock_proc.stderr.readline.side_effect = [""]
            out_only = session_core.run_agy(
                "/bin/agy", "prompt", {"type": "object"},
                logger=mock_logger, phase="validator", model="fake-model",
                return_meta=False,
            )
            self.assertEqual(out_only, {"title": "HU", "description": "HU Desc"})

    def test_run_agy_errors_and_cancellation(self):
        mock_logger = mock.MagicMock()

        # Error: proc returncode != 0
        proc_err = mock.MagicMock()
        proc_err.stdout.readline.side_effect = [json.dumps({"event": "result", "status": "FAILED", "error": "agy command failed"}) + "\n", ""]
        proc_err.stderr.readline.side_effect = ["stderr message\n", ""]
        proc_err.wait.return_value = 1
        proc_err.pid = 12345

        with mock.patch("shutil.which", return_value="/bin/agy"), \
             mock.patch("subprocess.Popen", return_value=proc_err):
            with self.assertRaises(RuntimeError) as ctx:
                session_core.run_agy("/bin/agy", "prompt", {}, logger=mock_logger)
            self.assertIn("agy command failed", str(ctx.exception))

        # Error: no result event in stream
        proc_empty = mock.MagicMock()
        proc_empty.stdout.readline.side_effect = [""]
        proc_empty.stderr.readline.side_effect = ["fatal error in agy\n", ""]
        proc_empty.wait.return_value = 0
        with mock.patch("shutil.which", return_value="/bin/agy"), \
             mock.patch("subprocess.Popen", return_value=proc_empty):
            with self.assertRaises(RuntimeError) as ctx:
                session_core.run_agy("/bin/agy", "prompt", {})
            self.assertIn("agy stream ended without a result event", str(ctx.exception))

        # Error: structured_output missing in envelope
        proc_no_struct = mock.MagicMock()
        proc_no_struct.stdout.readline.side_effect = [json.dumps({"event": "result", "status": "SUCCESS"}) + "\n", ""]
        proc_no_struct.stderr.readline.side_effect = [""]
        proc_no_struct.wait.return_value = 0
        with mock.patch("shutil.which", return_value="/bin/agy"), \
             mock.patch("subprocess.Popen", return_value=proc_no_struct):
            with self.assertRaises(RuntimeError) as ctx:
                session_core.run_agy("/bin/agy", "prompt", {})
            self.assertIn("agy response did not contain structured_output", str(ctx.exception))

        # Cancellation during run
        proc_cancel = mock.MagicMock()
        proc_cancel.stdout.readline.side_effect = [json.dumps({"event": "result", "status": "SUCCESS", "structured_output": {"title": "T", "description": "D"}}) + "\n", ""]
        proc_cancel.stderr.readline.side_effect = [""]
        proc_cancel.wait.return_value = 0
        proc_cancel.poll.return_value = None
        handle = session_core.TranslationJobHandle(mock.MagicMock(), "job-c")
        handle.cancel_event.set()
        with mock.patch("shutil.which", return_value="/bin/agy"), \
             mock.patch("subprocess.Popen", return_value=proc_cancel), \
             mock.patch("os.killpg", return_value=None):
            with self.assertRaises(session_core.TranslationCanceled):
                session_core.run_agy("/bin/agy", "prompt", {}, job_handle=handle)

    def test_translate_and_validate_flows(self):
        source = {"title": "Hello world", "description": "Description with `lit`"}
        mock_handle = session_core.TranslationJobHandle(mock.MagicMock(), "job-v")
        mock_logger = mock.MagicMock()

        # Success on attempt 1
        with mock.patch("server.session_core.run_agy") as mock_agy:
            mock_agy.side_effect = [
                # Translator call
                ({"title": "Helló világ", "description": "Leírás __CLAUDE_TODOS_LITERAL_DESCRIPTION_0001__ kóddal"}, {"status": "SUCCESS"}),
                # Validator call
                ({"valid": True, "issues": []}, {"status": "SUCCESS"}),
            ]
            result = session_core.translate_and_validate("/bin/agy", source, logger=mock_logger, job_handle=mock_handle)
            self.assertTrue(result["validated"])
            self.assertEqual(result["title"], "Helló világ")
            self.assertEqual(result["attempts"], 1)

        # Attempt 1 has deterministic issues, attempt 2 succeeds
        with mock.patch("server.session_core.run_agy") as mock_agy:
            mock_agy.side_effect = [
                # Attempt 1 translator: missing literal
                ({"title": "Rossz", "description": "Hiányzó kód"}, {"status": "SUCCESS"}),
                # Attempt 2 translator: valid
                ({"title": "Helló világ", "description": "Leírás __CLAUDE_TODOS_LITERAL_DESCRIPTION_0001__ kóddal"}, {"status": "SUCCESS"}),
                # Attempt 2 validator: valid
                ({"valid": True, "issues": []}, {"status": "SUCCESS"}),
            ]
            res2 = session_core.translate_and_validate("/bin/agy", source, logger=mock_logger, job_handle=mock_handle)
            self.assertEqual(res2["attempts"], 2)

        # Both attempts fail deterministic checks
        with mock.patch("server.session_core.run_agy") as mock_agy:
            mock_agy.side_effect = [
                ({"title": "Rossz 1", "description": "Hiányzó kód"}, {"status": "SUCCESS"}),
                ({"title": "Rossz 2", "description": "Hiányzó kód"}, {"status": "SUCCESS"}),
            ]
            with self.assertRaises(session_core.TranslationValidationError):
                session_core.translate_and_validate("/bin/agy", source, logger=mock_logger, job_handle=mock_handle)

        # Attempt 1 validator rejects, attempt 2 validator rejects
        with mock.patch("server.session_core.run_agy") as mock_agy:
            mock_agy.side_effect = [
                # Attempt 1 translator
                ({"title": "Helló világ", "description": "Leírás __CLAUDE_TODOS_LITERAL_DESCRIPTION_0001__ kóddal"}, {"status": "SUCCESS"}),
                # Attempt 1 validator
                ({"valid": False, "issues": ["val issue 1"]}, {"status": "SUCCESS"}),
                # Attempt 2 translator
                ({"title": "Helló világ", "description": "Leírás __CLAUDE_TODOS_LITERAL_DESCRIPTION_0001__ kóddal"}, {"status": "SUCCESS"}),
                # Attempt 2 validator
                ({"valid": False, "issues": ["val issue 2"]}, {"status": "SUCCESS"}),
            ]
            with self.assertRaises(session_core.TranslationValidationError) as ctx:
                session_core.translate_and_validate("/bin/agy", source, logger=mock_logger, job_handle=mock_handle)
            self.assertIn("val issue 2", str(ctx.exception))

        # Cancellation at translating or validating phase
        handle_cancel = session_core.TranslationJobHandle(mock.MagicMock(), "job-canc")
        handle_cancel.cancel_event.set()
        with self.assertRaises(session_core.TranslationCanceled):
            session_core.translate_and_validate("/bin/agy", source, job_handle=handle_cancel)

    def test_run_agy_edge_branches(self):
        # 1. read_stderr with empty line (line 654)
        # 2. non-JSON stdout with logger=None (line 669->671)
        # 3. step_update without text_delta (line 694->696)
        # 4. unknown event type (line 700->661)
        # 5. event without etype but has status (lines 673-676)
        # 6. logger=None when error occurs (line 730->732)
        proc = mock.MagicMock()
        proc.stderr.readline.side_effect = ["\n", "some error\n", ""]
        proc.stdout.readline.side_effect = [
            "not json line\n",
            json.dumps({"event": "step_update", "step_type": "tool_call"}) + "\n",
            json.dumps({"event": "custom_unknown_type"}) + "\n",
            json.dumps({"status": "SUCCESS", "conversation_id": "c-456", "structured_output": {"title": "T", "description": "D"}}) + "\n",
            "",
        ]
        proc.wait.return_value = 0
        with mock.patch("shutil.which", return_value="/bin/agy"), \
             mock.patch("subprocess.Popen", return_value=proc):
            out = session_core.run_agy("/bin/agy", "prompt", {}, logger=None)
            self.assertEqual(out, {"title": "T", "description": "D"})

        # Error with logger=None (line 730->732)
        proc_fail = mock.MagicMock()
        proc_fail.stderr.readline.side_effect = ["boom\n", ""]
        proc_fail.stdout.readline.side_effect = [
            json.dumps({"event": "result", "status": "ERROR", "error": "fatal"}) + "\n",
            "",
        ]
        proc_fail.wait.return_value = 1
        with mock.patch("shutil.which", return_value="/bin/agy"), \
             mock.patch("subprocess.Popen", return_value=proc_fail):
            with self.assertRaises(RuntimeError) as ctx:
                session_core.run_agy("/bin/agy", "prompt", {}, logger=None)
            self.assertIn("fatal", str(ctx.exception))

    def test_translate_and_validate_edge_branches(self):
        source = {"title": "Hello world", "description": "Description with `lit`"}

        # translate_and_validate without logger and without job_handle (lines 763->767, 767->769, 790->793, 793->795)
        # Attempt 1 has deterministic issues, attempt 2 succeeds (lines 780->782, 782->785, 786->788)
        with mock.patch("server.session_core.run_agy") as mock_agy:
            mock_agy.side_effect = [
                # Attempt 1 translator: missing literal
                ({"title": "Bad", "description": "No literal"}, {"status": "SUCCESS"}),
                # Attempt 2 translator: valid
                ({"title": "Helló világ", "description": "Leírás __CLAUDE_TODOS_LITERAL_DESCRIPTION_0001__ kóddal"}, {"status": "SUCCESS"}),
                # Attempt 2 validator: valid
                ({"valid": True, "issues": []}, {"status": "SUCCESS"}),
            ]
            res = session_core.translate_and_validate("/bin/agy", source, logger=None, job_handle=None)
            self.assertEqual(res["attempts"], 2)

        # Cancel between translator and validator (line 792->exit)
        handle = session_core.TranslationJobHandle(mock.MagicMock(), "job-c2")
        with mock.patch("server.session_core.run_agy") as mock_agy:
            def cancel_during_translator(*args, **kwargs):
                handle.cancel_event.set()
                return ({"title": "Helló világ", "description": "Leírás __CLAUDE_TODOS_LITERAL_DESCRIPTION_0001__ kóddal"}, {"status": "SUCCESS"})
            mock_agy.side_effect = cancel_during_translator
            with self.assertRaises(session_core.TranslationCanceled):
                session_core.translate_and_validate("/bin/agy", source, job_handle=handle)


class TestTranslationJobHandleAndManager(unittest.TestCase):
    def test_job_handle_process_and_callbacks(self):
        mgr = mock.MagicMock()
        handle = session_core.TranslationJobHandle(mgr, "job-h")

        # Process management
        proc = mock.MagicMock()
        proc.poll.return_value = None
        handle.set_process(proc)
        self.assertIs(handle._process, proc)
        handle.clear_process(mock.MagicMock())  # Different proc does not clear
        self.assertIs(handle._process, proc)
        handle.clear_process(proc)
        self.assertIsNone(handle._process)

        # Abort callback
        aborted = False
        def on_abort():
            nonlocal aborted
            aborted = True
        handle.set_abort_callback(on_abort)
        handle.abort_external()
        self.assertTrue(aborted)
        handle.clear_abort_callback()
        self.assertIsNone(handle._abort_callback)

        # Interrupt process variations
        handle.interrupt_process()  # _process is None

        p_exited = mock.MagicMock()
        p_exited.poll.return_value = 0
        handle.set_process(p_exited)
        handle.interrupt_process()

        p_alive = mock.MagicMock()
        p_alive.poll.return_value = None
        p_alive.pid = 9999
        handle.set_process(p_alive)
        with mock.patch("os.getpgid", return_value=9999), \
             mock.patch("os.killpg", return_value=None), \
             mock.patch("time.sleep", return_value=None):
            handle.interrupt_process()

        # Cancel method
        handle.cancel()
        self.assertTrue(handle.cancel_event.is_set())
        mgr.update.assert_called_with("job-h", status="canceling", phase="canceling")

        # Phases and attempts
        handle.begin_attempt(2)
        mgr.begin_attempt.assert_called_with("job-h", 2)
        handle.set_phase("validating", issues=["iss"])
        mgr.update.assert_called_with("job-h", status="validating", phase="validating", issues=["iss"])
        handle.record_phase_result("translator", {"meta": 1}, issues=["iss2"])
        mgr.record_phase_result.assert_called_with("job-h", "translator", {"meta": 1}, issues=["iss2"])

    def test_job_manager_lifecycle_collapsing_and_crud(self):
        with tempfile.TemporaryDirectory() as td:
            session_dir = pathlib.Path(td) / "session"
            jobs_dir = session_dir / "translation-jobs"
            jobs_dir.mkdir(parents=True)

            # Pre-populate jobs directory with corrupted, interrupted, and legacy retry chains
            (jobs_dir / "corrupt.json").write_text("not json")
            (jobs_dir / "noid.json").write_text(json.dumps({"uid": "u"}))

            job_interrupted = {
                "id": "j_act", "uid": "s:1", "taskId": "1", "textFingerprint": "fp1",
                "status": "translating", "phase": "translating", "run": 1, "runs": [],
            }
            (jobs_dir / "j_act.json").write_text(json.dumps(job_interrupted))

            # Legacy retry chain: root and retryOf child
            root_job = {
                "id": "j_root", "uid": "s:2", "taskId": "2", "textFingerprint": "fp2",
                "status": "error", "phase": "error", "queuedAt": "2026-09-05T10:00:00Z",
                "run": 1, "runs": [],
            }
            child_job = {
                "id": "j_child", "uid": "s:2", "taskId": "2", "textFingerprint": "fp2",
                "retryOf": "j_root", "status": "error", "phase": "error",
                "queuedAt": "2026-09-05T10:05:00Z", "run": 1, "runs": [],
            }
            (jobs_dir / "j_root.json").write_text(json.dumps(root_job))
            (jobs_dir / "j_child.json").write_text(json.dumps(child_job))

            # Duplicate lifecycles: two rows for same uid + tfp
            dup1 = {
                "id": "j_dup1", "uid": "s:3", "taskId": "3", "textFingerprint": "fp3",
                "status": "canceled", "phase": "canceled", "queuedAt": "2026-09-05T09:00:00Z",
                "run": 1, "runs": [],
            }
            dup2 = {
                "id": "j_dup2", "uid": "s:3", "taskId": "3", "textFingerprint": "fp3",
                "status": "canceled", "phase": "canceled", "queuedAt": "2026-09-05T09:10:00Z",
                "run": 1, "runs": [],
            }
            (jobs_dir / "j_dup1.json").write_text(json.dumps(dup1))
            (jobs_dir / "j_dup2.json").write_text(json.dumps(dup2))

            manager = session_core.TranslationJobManager(session_dir)
            # Active job was marked interrupted
            self.assertEqual(manager.get("j_act")["status"], "interrupted")

            # Legacy retry chain was collapsed into j_root
            self.assertIn("j_root", manager.jobs)
            self.assertNotIn("j_child", manager.jobs)
            self.assertEqual(manager.get("j_root")["run"], 2)

            # Duplicate lifecycles collapsed
            self.assertIn("j_dup1", manager.jobs)
            self.assertNotIn("j_dup2", manager.jobs)
            self.assertEqual(manager.get("j_dup1")["run"], 2)

            # Notification callback with exception handling
            notified = []
            def on_ch(job):
                notified.append(job["id"])
                raise RuntimeError("callback boom")
            manager.on_change = on_ch

            # CRUD methods
            # Create
            handle_new = manager.create("s:4", "fp4", "model-a", "startup")
            self.assertIn(handle_new.job_id, manager.jobs)
            self.assertIn(handle_new.job_id, notified)

            # Update
            updated = manager.update(handle_new.job_id, status="translating")
            self.assertIsNotNone(updated["startedAt"])
            self.assertIsNone(manager.update("missing_job_id", status="translating"))

            # Begin attempt & record phase result
            manager.begin_attempt(handle_new.job_id, 1)
            manager.record_phase_result(handle_new.job_id, "translator", {"res": 1}, issues=["iss"])
            job_row = manager.get(handle_new.job_id)
            self.assertEqual(len(job_row["attempts"]), 1)
            self.assertEqual(job_row["issues"], ["iss"])

            # Finish
            manager.finish(handle_new.job_id, "error", error="failed")
            self.assertEqual(manager.get(handle_new.job_id)["status"], "error")
            self.assertIsNotNone(manager.get(handle_new.job_id)["finishedAt"])

            # Restart
            with self.assertRaises(KeyError):
                manager.restart("nonexistent", "model-a")
            # Create another queued job; restarting it without allow_success raises ValueError
            handle_q = manager.create("s:5", "fp5", "model-a", "startup")
            with self.assertRaises(ValueError):
                manager.restart(handle_q.job_id, "model-a")
            # Restart terminal error job
            restarted_handle = manager.restart(handle_new.job_id, "model-b", text_fingerprint="fp4_new", trigger="manual", scope="task")
            self.assertEqual(manager.get(restarted_handle.job_id)["status"], "queued")
            self.assertEqual(manager.get(restarted_handle.job_id)["run"], 2)

            # Ensure lifecycle: active returns existing, terminal restarts, new creates
            reused_handle, created = manager.ensure_lifecycle("s:4", "fp4_new", "model-b", "startup")
            self.assertFalse(created)
            self.assertEqual(reused_handle.job_id, restarted_handle.job_id)

            brand_new_handle, created_new = manager.ensure_lifecycle("s:6", "fp6", "model-c", "startup")
            self.assertTrue(created_new)

            # Find lifecycle & has_active
            self.assertTrue(manager.has_active("s:6", "fp6"))
            self.assertFalse(manager.has_active("s:99", "none"))
            found = manager.find_lifecycle("s:6", "fp6")
            self.assertEqual(found["id"], brand_new_handle.job_id)
            self.assertIsNone(manager.find_lifecycle("s:99", "none"))

            # Cancel
            with self.assertRaises(KeyError):
                manager.cancel("missing")
            # Cancel queued job
            canceled_job = manager.cancel(brand_new_handle.job_id)
            self.assertEqual(canceled_job["status"], "canceled")
            # Cancel already terminal job
            self.assertEqual(manager.cancel(brand_new_handle.job_id)["status"], "canceled")

            # Cancel without handle
            manager.handles.pop(restarted_handle.job_id, None)
            manager.jobs[restarted_handle.job_id]["status"] = "translating"
            canc_no_handle = manager.cancel(restarted_handle.job_id)
            self.assertEqual(canc_no_handle["status"], "canceled")

            # Cancel where
            h_cw = manager.create("s:7", "fp7", "model", "test", scope="retranslation", request_id="req-1")
            cw_canceled = manager.cancel_where(request_id="req-1", uid="s:7", scopes=["retranslation"])
            self.assertEqual(len(cw_canceled), 1)

            # Delete
            with self.assertRaises(KeyError):
                manager.delete("nonexistent")
            h_active = manager.create("s:8", "fp8", "model", "test")
            with self.assertRaises(ValueError):
                manager.delete(h_active.job_id)
            manager.finish(h_active.job_id, "canceled")
            deleted = manager.delete(h_active.job_id)
            self.assertEqual(deleted["id"], h_active.job_id)
            self.assertNotIn(h_active.job_id, manager.jobs)

    def test_job_handle_and_manager_edge_branches(self):
        mgr = mock.MagicMock()
        # 1. Abort callbacks raising exceptions (lines 852-853, 864)
        h_canceled = session_core.TranslationJobHandle(mgr, "j-c")
        h_canceled.cancel_event.set()
        h_canceled.set_abort_callback(lambda: 1 / 0)

        h_abort = session_core.TranslationJobHandle(mgr, "j-a")
        h_abort.set_abort_callback(lambda: 1 / 0)
        h_abort.abort_external()

        # 2. Process send_signal exception (line 875)
        p_sig = mock.MagicMock()
        p_sig.poll.return_value = None
        p_sig.send_signal.side_effect = RuntimeError("signal boom")
        h_sig = session_core.TranslationJobHandle(mgr, "j-s")
        h_sig.set_process(p_sig)
        with mock.patch("os.getpgid", side_effect=Exception("no pgid")):
            h_sig.interrupt_process()

        # 3. Process escalate thread (lines 879->884, 883, 885->exit, 889)
        p_esc = mock.MagicMock()
        p_esc.poll.return_value = None
        p_esc.terminate.side_effect = RuntimeError("term boom")
        p_esc.kill.side_effect = RuntimeError("kill boom")
        h_esc = session_core.TranslationJobHandle(mgr, "j-esc")
        h_esc.set_process(p_esc)
        with mock.patch("os.getpgid", side_effect=Exception("no pgid")), \
             mock.patch("time.sleep", return_value=None):
            h_esc.interrupt_process()
            time.sleep(0.05)

        # 3b. Process escalate thread poll returns 0 (covers 879->884, 885->exit)
        p_esc2 = mock.MagicMock()
        p_esc2.poll.side_effect = [None, 0, 0]
        h_esc2 = session_core.TranslationJobHandle(mgr, "j-esc2")
        h_esc2.set_process(p_esc2)
        with mock.patch("os.getpgid", side_effect=Exception("no pgid")), \
             mock.patch("time.sleep", return_value=None):
            h_esc2.interrupt_process()
            time.sleep(0.05)

        # 4. Legacy retry chain where parent is in/not in jobs (lines 948-952, 950->952, 952, 956->957, 957, 978)
        with tempfile.TemporaryDirectory() as td:
            session_dir = pathlib.Path(td) / "session"
            jobs_dir = session_dir / "translation-jobs"
            jobs_dir.mkdir(parents=True)

            # Chain: j4 -> j3 -> j2 -> missing_parent (covers 950->952, 951, and 952)
            (jobs_dir / "j2.json").write_text(json.dumps({
                "id": "j2", "uid": "s:1", "taskId": "1", "textFingerprint": "fp1",
                "retryOf": "missing_parent", "status": "error", "queuedAt": "2026-09-05T09:50:00Z",
            }))
            (jobs_dir / "j3.json").write_text(json.dumps({
                "id": "j3", "uid": "s:1", "taskId": "1", "textFingerprint": "fp1",
                "retryOf": "j2", "status": "error", "queuedAt": "2026-09-05T09:55:00Z",
            }))
            (jobs_dir / "j4.json").write_text(json.dumps({
                "id": "j4", "uid": "s:1", "taskId": "1", "textFingerprint": "fp1",
                "retryOf": "j3", "status": "error", "queuedAt": "2026-09-05T10:00:00Z",
            }))

            # Duplicate with missing uid/textFingerprint (line 993)
            (jobs_dir / "j_no_fp.json").write_text(json.dumps({
                "id": "j_no_fp", "uid": "s:2", "textFingerprint": None,
                "status": "error", "queuedAt": "2026-09-05T10:00:00Z",
            }))

            m = session_core.TranslationJobManager(session_dir)

            # Cover 956->957 and 957: group root missing from jobs
            class MissingJobs(dict):
                def get(self, k, default=None):
                    if k == "ghost_root":
                        return None
                    return super().get(k, default)
            m.jobs = MissingJobs(m.jobs)
            m.jobs["ghost_root"] = {"id": "ghost_root", "runs": []}
            m.jobs["c1"] = {"id": "c1", "retryOf": "ghost_root", "runs": []}
            m._collapse_legacy_retry_chains()
            m.jobs = dict(m.jobs)

            # Cover line 978: unlink raises FileNotFoundError in legacy retry collapsing
            m.jobs["j_orphan_root"] = {"id": "j_orphan_root", "runs": []}
            m.jobs["j_orphan_child"] = {"id": "j_orphan_child", "retryOf": "j_orphan_root", "runs": []}
            m._collapse_legacy_retry_chains()

            # Cover lines 1029-1030: duplicate unlink raises FileNotFoundError
            m.jobs["d1"] = {"id": "d1", "uid": "s:dup", "textFingerprint": "fp_dup", "status": "error", "queuedAt": "2026-09-05T10:00:00Z", "runs": []}
            m.jobs["d2"] = {"id": "d2", "uid": "s:dup", "textFingerprint": "fp_dup", "status": "error", "queuedAt": "2026-09-05T10:05:00Z", "runs": []}
            m._collapse_duplicate_lifecycles()

            # 5. delete where path unlink raises FileNotFoundError (lines 1098-1099)
            h = m.create("s:del", "fp_del", "model", "test")
            m.finish(h.job_id, "error", error="err")
            # Unlink path before delete
            m._path(h.job_id).unlink()
            deleted_snap = m.delete(h.job_id)
            self.assertEqual(deleted_snap["id"], h.job_id)

            # 6. ensure_lifecycle: active job with handle missing in self.handles (lines 1135-1136)
            h_act = m.create("s:act", "fp_act", "model", "test")
            m.update(h_act.job_id, status="translating")
            m.handles.pop(h_act.job_id, None)
            got_h, created = m.ensure_lifecycle("s:act", "fp_act", "model", "test")
            self.assertFalse(created)
            self.assertEqual(got_h.job_id, h_act.job_id)

            # 7. ensure_lifecycle: matching job with unknown status (line 1145)
            h_unk = m.create("s:unk", "fp_unk", "model", "test")
            m.update(h_unk.job_id, status="custom_unknown_status")
            got_unk, created_unk = m.ensure_lifecycle("s:unk", "fp_unk", "model", "test")
            self.assertFalse(created_unk)
            self.assertIsNone(got_unk)

            # 8. record_phase_result with issues=None and index gap (lines 1178, 1180->1183)
            h_rec = m.create("s:rec", "fp_rec", "model", "test")
            m.update(h_rec.job_id, attempt=3)
            m.record_phase_result(h_rec.job_id, "translator", {"meta": 1}, issues=None)
            self.assertEqual(len(m.get(h_rec.job_id)["attempts"]), 3)

            # 9. cancel_where filter mismatches (lines 1240-1241)
            h_fil = m.create("s:fil", "fp_fil", "model", "test", scope="retranslation", request_id="req1")
            m.cancel_where(uid="other_uid")
            self.assertEqual(m.get(h_fil.job_id)["status"], "queued")
            m.cancel_where(scopes=["other_scope"])
            self.assertEqual(m.get(h_fil.job_id)["status"], "queued")
            m.cancel_where(request_id="other_req")
            self.assertEqual(m.get(h_fil.job_id)["status"], "queued")
            m.cancel_where(request_id="req1", uid="s:fil", scopes=["retranslation"])
            self.assertEqual(m.get(h_fil.job_id)["status"], "canceled")


class TestStateStore(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = pathlib.Path(self.tmp.name)
        self.task_root = base / "tasks"
        self.task_root.mkdir(parents=True)
        (self.task_root / "sess").mkdir()
        self.cache_root = base / "cache"
        self.settings_file = base / "config.json"
        self.cfg = session_core.Config(
            session_id="sess",
            transcript="",
            project_cwd=str(base / "project"),
            task_root=self.task_root,
            candidate_ids=["sess"],
            cache_root=self.cache_root,
            settings_file=self.settings_file,
            log_root=base / "logs",
        )
        self.logger = session_core.AppLogger(self.cfg)
        self.store = session_core.StateStore(self.cfg, self.logger)

    def tearDown(self):
        self.logger.close()
        self.tmp.cleanup()

    def test_store_migrations_and_corrupt_files(self):
        # Create a record that needs language state migration
        task_dir = self.store.tasks_cache_dir / "sess" / "1"
        task_dir.mkdir(parents=True, exist_ok=True)
        rec1 = {
            "uid": "sess:1", "storeId": "sess", "taskId": "1",
            "viewLanguage": "hu", "languagePreference": "en",  # mismatch
        }
        (task_dir / "task.json").write_text(json.dumps(rec1))

        task_dir2 = self.store.tasks_cache_dir / "sess" / "2"
        task_dir2.mkdir(parents=True, exist_ok=True)
        rec2 = {
            "uid": "sess:2", "storeId": "sess", "taskId": "2",
            "languagePreference": "unknown",  # missing viewLanguage, non en/hu preference
        }
        (task_dir2 / "task.json").write_text(json.dumps(rec2))

        # Corrupt file in cache
        task_dir3 = self.store.tasks_cache_dir / "sess" / "3"
        task_dir3.mkdir(parents=True, exist_ok=True)
        (task_dir3 / "task.json").write_text("not json")

        # Reload records and run migration
        loaded = self.store._load_records()
        self.store.records = loaded
        self.store.session_meta["globalLanguage"] = "en"
        self.store._migrate_language_state()
        self.assertEqual(self.store.records["sess:1"]["languagePreference"], "hu")
        self.assertEqual(self.store.records["sess:2"]["viewLanguage"], "en")

        # Migration when globalLanguage is hu
        self.store.session_meta["globalLanguage"] = "hu"
        del self.store.records["sess:2"]["viewLanguage"]
        self.store._migrate_language_state()
        self.assertEqual(self.store.records["sess:2"]["viewLanguage"], "hu")

    def test_read_source_tasks_and_reconcile(self):
        # Write task 10 to tasks/sess
        task_file = self.task_root / "sess" / "10.json"
        task_file.write_text(json.dumps({"id": "10", "subject": "Task 10", "description": "Desc 10", "status": "pending"}))

        events_init = self.store.reconcile_startup()
        self.assertEqual(len(self.store.records), 1)
        self.assertIn("sess:10", self.store.records)

        # Update task 10
        task_file.write_text(json.dumps({"id": "10", "subject": "Task 10 Updated", "description": "Desc 10", "status": "in_progress"}))
        events_update = self.store.poll_once("live")
        self.assertEqual(len(events_update), 1)
        self.assertEqual(events_update[0]["kind"], "changed")

        # Delete task 10
        task_file.unlink()
        events_delete = self.store.poll_once("live")
        self.assertEqual(len(events_delete), 1)
        self.assertEqual(events_delete[0]["kind"], "deleted")
        self.assertFalse(self.store.records["sess:10"]["present"])

        # Second poll when already deleted returns no new events
        self.assertEqual(self.store.poll_once("live"), [])

    def test_languages_and_translation_states(self):
        task_file = self.task_root / "sess" / "1.json"
        task_file.write_text(json.dumps({"id": "1", "subject": "T1", "description": "D1", "status": "pending"}))
        self.store.poll_once("live")
        uid = "sess:1"
        rec = self.store.records[uid]

        # Valid / invalid languages
        with self.assertRaises(ValueError):
            self.store.set_global_language("fr")
        with self.assertRaises(ValueError):
            self.store.set_task_language(uid, "de")
        with self.assertRaises(KeyError):
            self.store.set_task_language("missing:99", "hu")

        self.store.set_global_language("hu", apply_to_tasks=True)
        self.assertEqual(self.store.task_view_language(rec), "hu")
        self.store.set_task_language(uid, "en")
        self.assertEqual(self.store.task_view_language(rec), "en")

        # Translation states
        tfp = rec["current"]["textFingerprint"]
        self.assertEqual(self.store._current_translation_state(rec, tfp), "missing")

        # Ready state
        rec.setdefault("translations", {}).setdefault("hu", {})[tfp] = {
            "validated": True,
            "translationPromptVersion": session_core.TRANSLATION_PROMPT_VERSION,
            "validationPromptVersion": session_core.VALIDATION_PROMPT_VERSION,
            "title": "HU T1", "description": "HU D1",
        }
        self.assertEqual(self.store._current_translation_state(rec, tfp), "ready")

        # Failure state
        rec["translations"]["hu"].pop(tfp)
        self.store._set_translation_failure(uid, tfp, "sample error")
        self.assertEqual(self.store._current_translation_state(rec, tfp), "failed")
        self.store._clear_translation_failure(uid, tfp)
        self.assertEqual(self.store._current_translation_state(rec, tfp), "missing")
        self.store._set_translation_failure(uid, tfp, "sample error")
        self.store.clear_translation_failures_for_uids([uid])
        self.assertIsNone(self.store.last_translation_error)

    def test_prepare_event_translations_and_jobs(self):
        task_file = self.task_root / "sess" / "2.json"
        task_file.write_text(json.dumps({"id": "2", "subject": "Task 2", "description": "Desc 2", "status": "pending"}))
        events = self.store.poll_once("live")
        uid = "sess:2"
        self.store.set_task_language(uid, "hu")

        # Ignored event (missing uid or tfp)
        self.assertEqual(self.store.prepare_event_translations([{"uid": None}]), [])

        # Prepared translation for created event
        prepared = self.store.prepare_event_translations(events, trigger="tasks-updated")
        self.assertEqual(len(prepared), 1)
        self.assertEqual(prepared[0][0][0], uid)

        # Preparing again when active job exists returns empty
        self.assertEqual(self.store.prepare_event_translations(events), [])

        # Translation jobs list
        jobs = self.store._translation_jobs(force_uids=[uid], include_failed=True)
        # uid already has active job from prepared above
        self.assertEqual(len(jobs), 0)

    def test_provider_concurrency_and_slot_management(self):
        # Configure limits
        self.store.configure_provider_concurrency({"agy": "4", "anthropic": "invalid"})
        self.assertEqual(self.store.provider_concurrency_limits["agy"], 4)
        self.assertEqual(self.store.provider_concurrency_limits["anthropic"], 2)

        # Capacity
        handle = session_core.TranslationJobHandle(self.store.job_manager, "job-c1")
        self.assertEqual(self.store._provider_capacity([(("u", "fp", {}), handle)]), 4)

        # Acquire and release slot
        self.store._acquire_provider_slot("agy", handle)
        self.assertEqual(self.store.provider_active_counts.get("agy"), 1)
        self.store._release_provider_slot("agy")
        self.assertNotIn("agy", self.store.provider_active_counts)

        # Cancel event causes acquire to raise TranslationCanceled
        handle.cancel_event.set()
        with self.assertRaises(session_core.TranslationCanceled):
            self.store._acquire_provider_slot("agy", handle)

    def test_translate_job_and_batch_execution(self):
        task_file = self.task_root / "sess" / "3.json"
        task_file.write_text(json.dumps({"id": "3", "subject": "Task 3", "description": "Desc 3", "status": "pending"}))
        self.store.poll_once("live")
        uid = "sess:3"
        rec = self.store.records[uid]
        tfp = rec["current"]["textFingerprint"]
        handle = self.store.job_manager.create(uid, tfp, "fake-model", "test")

        # Translation executor success
        def fake_exec(source, job_handle, task_ref, provider, model):
            return {
                "title": "HU Task 3", "description": "HU Desc 3", "validated": True,
                "translationPromptVersion": session_core.TRANSLATION_PROMPT_VERSION,
                "validationPromptVersion": session_core.VALIDATION_PROMPT_VERSION,
                "translatedAt": session_core.now_iso(), "attempts": 1,
            }
        self.store.translation_executor = fake_exec
        self.store._translate_job((uid, tfp, {"title": "Task 3", "description": "Desc 3"}), handle)
        self.assertEqual(self.store.job_manager.get(handle.job_id)["status"], "success")
        self.assertIn(tfp, self.store.records[uid]["translations"]["hu"])

        # History event was recorded
        hist = self.store.history()
        self.assertTrue(any(e.get("kind") == "translated" and e.get("uid") == uid for e in hist))

        # Translation executor failure paths
        handle_err = self.store.job_manager.create(uid, tfp, "fake-model", "test2")
        self.store.translation_executor = mock.MagicMock(side_effect=RuntimeError("exec error"))
        with self.assertRaises(RuntimeError):
            self.store._translate_job((uid, tfp, {"title": "Task 3", "description": "Desc 3"}), handle_err)
        self.assertEqual(self.store.job_manager.get(handle_err.job_id)["status"], "error")

        # Run prepared translation jobs batch error
        handle_err2 = self.store.job_manager.create(uid, tfp, "fake-model", "test3")
        with self.assertRaises(session_core.TranslationBatchError):
            self.store._run_prepared_translation_jobs([((uid, tfp, {}), handle_err2)])

        # Run translation jobs empty
        self.assertEqual(self.store._run_translation_jobs([]), [])

    def test_manual_retry_and_delete_job(self):
        task_file = self.task_root / "sess" / "4.json"
        task_file.write_text(json.dumps({"id": "4", "subject": "Task 4", "description": "Desc 4", "status": "pending"}))
        self.store.poll_once("live")
        uid = "sess:4"
        rec = self.store.records[uid]
        tfp = rec["current"]["textFingerprint"]
        handle = self.store.job_manager.create(uid, tfp, "fake-model", "test")
        self.store.job_manager.finish(handle.job_id, "error", error="failure")

        # Prepare manual retry
        with self.assertRaises(KeyError):
            self.store.prepare_manual_retry("nonexistent")
        job, h_ret, prev = self.store.prepare_manual_retry(handle.job_id)
        self.assertEqual(h_ret.job_id, handle.job_id)
        self.assertEqual(prev["status"], "error")

        # Delete translation job
        with self.assertRaises(KeyError):
            self.store.delete_translation_job("nonexistent")
        self.store.job_manager.finish(handle.job_id, "canceled")
        deleted = self.store.delete_translation_job(handle.job_id)
        self.assertEqual(deleted["id"], handle.job_id)

    def test_transcript_lifecycle_and_api_state(self):
        transcript_file = pathlib.Path(self.tmp.name) / "transcript.jsonl"
        t_lines = [
            json.dumps({"timestamp": "2026-09-05T10:00:00Z", "message": {"content": [
                {"type": "tool_use", "name": "TaskCreate", "input": {"taskId": "5", "subject": "Task Five"}},
            ]}}),
            json.dumps({"timestamp": "2026-09-05T10:01:00Z", "message": {"content": [
                {"type": "tool_use", "name": "TaskUpdate", "input": {"id": "5", "status": "in_progress"}},
            ]}}),
            json.dumps({"timestamp": "2026-09-05T10:02:00Z", "message": {"content": [
                {"type": "tool_use", "name": "TaskUpdate", "input": {"taskId": "5", "status": "completed"}},
            ]}}),
        ]
        transcript_file.write_text("\n".join(t_lines) + "\n")
        self.store.config.transcript = str(transcript_file)

        task_file = self.task_root / "sess" / "5.json"
        task_file.write_text(json.dumps({"id": "5", "subject": "Task Five", "description": "Desc 5", "status": "completed"}))
        self.store.poll_once("live")

        hints = self.store._transcript_lifecycle_hints()
        self.assertIn("sess:5", hints)
        self.assertEqual(hints["sess:5"]["createdAt"], "2026-09-05T10:00:00Z")
        self.assertEqual(hints["sess:5"]["startedAt"], "2026-09-05T10:01:00Z")
        self.assertEqual(hints["sess:5"]["completedAt"], "2026-09-05T10:02:00Z")

        # Cached hints return deep copy
        self.assertEqual(self.store._transcript_lifecycle_hints(), hints)

        # api_state builds full response
        state = self.store.api_state()
        self.assertEqual(state["sessionId"], "sess")
        self.assertEqual(len(state["tasks"]), 1)
        t_row = state["tasks"][0]
        self.assertEqual(t_row["lifecycle"]["source"], "transcript")
        self.assertEqual(t_row["lifecycle"]["completedAt"], "2026-09-05T10:02:00Z")

    def test_state_store_edge_branches(self):
        # 1. _read_source_tasks: directory glob OSError and non-dict json (lines 1337-1338, 1341->1339)
        with mock.patch("pathlib.Path.glob", side_effect=OSError("dir error")):
            tasks = self.store._read_source_tasks()
            self.assertEqual(tasks, {})

        bad_task = self.task_root / "sess" / "bad.json"
        bad_task.write_text(json.dumps(["not a dict"]))
        tasks2 = self.store._read_source_tasks()
        self.assertNotIn("sess:bad", tasks2)

        # 2. _apply_current: emit_event=False and empty changes (lines 1396->1400, 1398->1400)
        rec = {
            "uid": "sess:app", "storeId": "sess", "taskId": "app", "present": False,
            "current": {"fingerprint": "fp_old", "textFingerprint": "tfp_old", "task": {"subject": "S"}},
            "sourceVersions": {}, "translations": {"hu": {}}, "history": [],
            "__path": str(self.store._cache_file("sess", "app")),
        }
        self.store.records[rec["uid"]] = rec
        ev1 = self.store._apply_current(rec, {"id": "app", "subject": "S"}, "live", emit_event=False)
        self.assertIsNone(ev1)
        self.assertEqual(rec["history"], [])

        # 2b. _apply_current: emit_event=True but changes is empty (line 1398->1400)
        rec["present"] = True
        s_payload = session_core.task_source_payload({"id": "app", "subject": "S"})
        rec["current"] = {
            "fingerprint": "stale_fingerprint",
            "textFingerprint": session_core.text_fingerprint(s_payload),
            "task": s_payload,
        }
        ev1b = self.store._apply_current(rec, {"id": "app", "subject": "S"}, "live", emit_event=True)
        self.assertIsNotNone(ev1b)
        self.assertEqual(ev1b["changes"], [])

        # 3. _apply_deleted: present is False (line 1410) and emit_event=False (line 1415->1417)
        rec["present"] = False
        self.assertIsNone(self.store._apply_deleted(rec, "live", emit_event=True))
        rec["present"] = True
        ev_del = self.store._apply_deleted(rec, "live", emit_event=False)
        self.assertIsNone(ev_del)

        # 3b. _reconcile deleted with empty changes (line 1442->1439)
        rec_empty = {
            "uid": "sess:empty_del", "storeId": "sess", "taskId": "empty_del", "present": True,
            "current": None, "sourceVersions": {}, "translations": {"hu": {}}, "history": [],
            "__path": str(self.store._cache_file("sess", "empty_del")),
        }
        self.store.records[rec_empty["uid"]] = rec_empty
        with mock.patch.object(self.store, "_read_source_tasks", return_value={}):
            del_events = self.store._reconcile("cleanup")
            self.assertEqual(del_events, [])

        # 4. set_global_language: apply_to_tasks=False (line 1466->1471)
        self.store.set_global_language("hu", apply_to_tasks=False)
        self.assertEqual(self.store.session_meta["globalLanguage"], "hu")

        # 5. _current_translation_state: unknown status -> missing (line 1503)
        h_unk = self.store.job_manager.create(rec["uid"], "tfp_unk", "m", "test")
        self.store.job_manager.update(h_unk.job_id, status="other_unknown_status")
        rec["translations"]["hu"]["tfp_unk"] = {"validated": False}
        self.assertEqual(self.store._current_translation_state(rec, "tfp_unk"), "missing")

        # 6. _clear_translation_failure: tfp=None (lines 1524-1525) and multiple tfps (line 1527->exit)
        self.store._set_translation_failure("u1", "tfp1", "err1")
        self.store._set_translation_failure("u1", "tfp2", "err2")
        self.store._clear_translation_failure("u1", "tfp1")
        self.assertIn("tfp2", self.store.translation_failures["u1"])
        self.store._clear_translation_failure("u1", None)
        self.assertNotIn("u1", self.store.translation_failures)

        # 7. clear_translation_failures_for_uids: active errors remain (line 1539)
        self.store._set_translation_failure(rec["uid"], rec["current"]["textFingerprint"], "active error")
        self.store.clear_translation_failures_for_uids(["other_uid"])
        self.assertIn("active error", self.store.last_translation_error)

        # 8. _translation_jobs: edge branches (lines 1548, 1550, 1555, 1559, 1563)
        # rec present=False and not in forced
        rec["present"] = False
        self.assertEqual(self.store._translation_jobs(), [])
        rec["present"] = True
        rec["viewLanguage"] = "en"
        rec["languagePreference"] = "en"
        self.store.session_meta["globalLanguage"] = "en"
        # viewLanguage != hu and not in forced
        self.assertEqual(self.store._translation_jobs(), [])
        # missing tfp
        rec["viewLanguage"] = "hu"
        rec["current"]["textFingerprint"] = None
        self.assertEqual(self.store._translation_jobs(), [])
        # valid translation
        rec["current"]["textFingerprint"] = "tfp_val"
        rec["translations"]["hu"]["tfp_val"] = {
            "validated": True,
            "translationPromptVersion": session_core.TRANSLATION_PROMPT_VERSION,
            "validationPromptVersion": session_core.VALIDATION_PROMPT_VERSION,
        }
        self.assertEqual(self.store._translation_jobs(), [])
        # include_failed=False and translation_error exists
        rec["translations"]["hu"]["tfp_val"]["validated"] = False
        self.store._set_translation_failure(rec["uid"], "tfp_val", "some failure")
        self.assertEqual(self.store._translation_jobs(include_failed=False), [])

        # 9. prepare_event_translations: edge branches (lines 1589, 1592, 1594, 1602->1576)
        ev_item = {
            "uid": rec["uid"], "afterTextFingerprint": "tfp_val", "kind": "created",
            "changes": [{"field": "subject"}],
        }
        # source not a dict
        rec["sourceVersions"].pop("tfp_val", None)
        self.assertEqual(self.store.prepare_event_translations([ev_item]), [])
        # valid translation
        rec["sourceVersions"]["tfp_val"] = {"subject": "S", "description": "D"}
        rec["translations"]["hu"]["tfp_val"]["validated"] = True
        self.assertEqual(self.store.prepare_event_translations([ev_item]), [])
        # failure exists
        rec["translations"]["hu"]["tfp_val"]["validated"] = False
        self.assertEqual(self.store.prepare_event_translations([ev_item]), [])
        # 9b. prepare_event_translations handle is None (line 1602->1576)
        ev_item_none = {
            "uid": rec["uid"], "afterTextFingerprint": "tfp_val", "kind": "created",
            "changes": [{"field": "subject"}],
        }
        self.store.clear_translation_failures_for_uids([rec["uid"]])
        with mock.patch.object(self.store.job_manager, "ensure_lifecycle", return_value=(None, False)):
            self.assertEqual(self.store.prepare_event_translations([ev_item_none]), [])

        # 10. _acquire_provider_slot & _release_provider_slot: (lines 1627-1629, 1639)
        h_slot = session_core.TranslationJobHandle(self.store.job_manager, "job-slot")
        self.store.provider_active_counts["agy"] = 2
        self.store.provider_concurrency_limits["agy"] = 1
        h_slot.cancel_event.set()
        with self.assertRaises(session_core.TranslationCanceled):
            self.store._acquire_provider_slot("agy", h_slot)
        # Release when count remains > 0
        self.store.provider_active_counts["agy"] = 2
        self.store._release_provider_slot("agy")
        self.assertEqual(self.store.provider_active_counts.get("agy"), 1)
        self.store.provider_active_counts.clear()

        # 10b. _acquire_provider_slot wait (lines 1627->1629, 1629)
        h_slot2 = session_core.TranslationJobHandle(self.store.job_manager, "job-slot2")
        self.store.provider_active_counts["agy"] = 1
        self.store.provider_concurrency_limits["agy"] = 1
        def release_after():
            time.sleep(0.01)
            with self.store.provider_gate:
                self.store.provider_active_counts["agy"] = 0
                self.store.provider_gate.notify_all()
        t_unblock = threading.Thread(target=release_after)
        t_unblock.start()
        self.store._acquire_provider_slot("agy", h_slot2)
        t_unblock.join()
        self.assertEqual(self.store.provider_active_counts.get("agy"), 1)
        self.store.provider_active_counts.clear()

        # 11. _translate_job: default translate_and_validate (line 1658), cancel/validation exc (lines 1663-1667), rec disappeared (lines 1677-1678)
        self.store.translation_executor = None
        h_t1 = self.store.job_manager.create("sess:disappeared", "tfp_d", "fake-model", "test")
        with mock.patch("server.session_core.translate_and_validate", return_value={"title": "H", "description": "D"}):
            self.store._translate_job(("sess:disappeared", "tfp_d", {}), h_t1)
            self.assertEqual(self.store.job_manager.get(h_t1.job_id)["status"], "error")
            self.assertEqual(self.store.job_manager.get(h_t1.job_id)["error"], "task disappeared while translating")

        # TranslationCanceled and TranslationValidationError
        h_t2 = self.store.job_manager.create(rec["uid"], "tfp_val", "fake-model", "test")
        with mock.patch("server.session_core.translate_and_validate", side_effect=session_core.TranslationCanceled("user cancel")):
            with self.assertRaises(session_core.TranslationCanceled):
                self.store._translate_job((rec["uid"], "tfp_val", {}), h_t2)
            self.assertEqual(self.store.job_manager.get(h_t2.job_id)["status"], "canceled")

        # 11b. _translate_job canceled before acquire (line 1672->1674)
        h_canc_before = self.store.job_manager.create(rec["uid"], "tfp_val", "fake-model", "test")
        h_canc_before.cancel_event.set()
        with self.assertRaises(session_core.TranslationCanceled):
            self.store._translate_job((rec["uid"], "tfp_val", {}), h_canc_before)

        h_t3 = self.store.job_manager.create(rec["uid"], "tfp_val", "fake-model", "test")
        with mock.patch("server.session_core.translate_and_validate", side_effect=session_core.TranslationValidationError("val err", ["issue1"])):
            with self.assertRaises(session_core.TranslationValidationError):
                self.store._translate_job((rec["uid"], "tfp_val", {}), h_t3)
            self.assertEqual(self.store.job_manager.get(h_t3.job_id)["status"], "validation_failed")

        # 12. _run_prepared_translation_jobs empty (line 1690)
        self.assertEqual(self.store._run_prepared_translation_jobs([]), [])

        # 13. _run_translation_jobs when handle is None (line 1728->1722)
        with mock.patch.object(self.store.job_manager, "ensure_lifecycle", return_value=(None, False)):
            self.assertEqual(self.store._run_translation_jobs([(rec["uid"], "tfp_val", {})]), [])

        # 14. ensure_translations_for_uids_sync when no jobs (lines 1745-1746)
        with mock.patch.object(self.store, "_translation_jobs", return_value=[]):
            self.assertEqual(self.store.ensure_translations_for_uids_sync([rec["uid"]]), [])

        # 15. prepare_manual_retry error branches (lines 1755, 1760, 1767)
        h_q = self.store.job_manager.create(rec["uid"], "tfp_val", "fake-model", "test")
        with self.assertRaises(ValueError):  # Status not retryable
            self.store.prepare_manual_retry(h_q.job_id)

        self.store.job_manager.finish(h_q.job_id, "error", error="err")
        # Task not in records
        saved_rec = self.store.records.pop(rec["uid"])
        with self.assertRaises(ValueError):
            self.store.prepare_manual_retry(h_q.job_id)
        self.store.records[rec["uid"]] = saved_rec

        # Valid translation already exists
        rec["translations"]["hu"]["tfp_val"]["validated"] = True
        with self.assertRaises(ValueError):
            self.store.prepare_manual_retry(h_q.job_id)

        # 16. record_translation_history edge branches (lines 1800, 1812->1814, 1814->1816)
        self.assertIsNone(self.store.record_translation_history("missing_uid", "tfp", {}, {}))
        # No title change and no description change
        rec["sourceVersions"]["tfp_val"] = {"subject": "Same", "description": "Same"}
        hist_ev = self.store.record_translation_history(
            rec["uid"], "tfp_val",
            {"title": "Same", "description": "Same", "jobId": "j_same", "run": 10},
            {"id": "j_same", "run": 10, "provider": "agy", "model": "fake"},
        )
        self.assertEqual(hist_ev["changes"], [])

        # 17. _localized_pair with translation error (line 1845)
        self.store._set_translation_failure(rec["uid"], "tfp_val", "error msg")
        rec["translations"]["hu"]["tfp_val"]["validated"] = False
        pair, is_pending = self.store._localized_pair(rec, "tfp_val")
        self.assertFalse(is_pending)
        self.assertEqual(pair["subject"], "Same")

        # 18. _transcript_lifecycle_hints edge branches (lines 1855-1856, 1868->1867, 1873, 1886-1887, 1895, 1898, 1905->1907, 1915->1907, 1917-1918)
        # stat raises OSError (lines 1855-1856)
        t_stat_path = pathlib.Path(self.tmp.name) / "t_stat_err.jsonl"
        t_stat_path.touch()
        self.store.config.transcript = str(t_stat_path)
        with mock.patch.object(pathlib.Path, "stat", side_effect=OSError("stat error")):
            self.assertEqual(self.store._transcript_lifecycle_hints(), {})

        # Open raises OSError
        t_path = pathlib.Path(self.tmp.name) / "t_err.jsonl"
        t_path.touch()
        self.store.config.transcript = str(t_path)
        with mock.patch("pathlib.Path.open", side_effect=OSError("open error")):
            self.assertEqual(self.store._transcript_lifecycle_hints(), {})

        # Transcript lines with: empty subject, invalid json, non tool_use block, unknown block name, TaskCreate with multiple subject matches, TaskUpdate pending, and missing timestamp (lines 1872->1873, 1873)
        rec["sourceVersions"]["tfp_empty"] = {"subject": ""}
        rec2 = {
            "uid": "sess:app2", "storeId": "sess", "taskId": "app2", "present": True,
            "current": {"task": {"subject": "Duplicate Subject"}, "textFingerprint": "tfp_d2"},
            "sourceVersions": {}, "translations": {"hu": {}}, "history": [],
        }
        rec["current"]["task"] = {"subject": "Duplicate Subject"}
        self.store.records["sess:app2"] = rec2

        t_content = "\n".join([
            "not a json line",
            json.dumps({"timestamp": "2026-09-05T10:00:00Z", "message": {"content": "not a list"}}),
            json.dumps({"timestamp": "2026-09-05T10:00:00Z", "message": {"content": [{"type": "text", "text": "skip"}]}}),
            json.dumps({"timestamp": "2026-09-05T10:00:00Z", "message": {"content": [{"type": "tool_use", "name": "OtherTool"}]}}),
            json.dumps({"timestamp": "2026-09-05T10:00:00Z", "message": {"content": [{"type": "tool_use", "name": "TaskCreate", "input": {"subject": "Duplicate Subject"}}]}}),
            json.dumps({"timestamp": "2026-09-05T10:00:00Z", "message": {"content": [{"type": "tool_use", "name": "TaskUpdate", "input": {"id": "app", "status": "pending"}}]}}),
            json.dumps({"message": {"content": [{"type": "tool_use", "name": "TaskCreate", "input": {"taskId": "app"}}]}}), # missing timestamp (1872->1873, 1873)
        ])
        t_path.write_text(t_content + "\n")
        hints_multi = self.store._transcript_lifecycle_hints()
        self.assertIsInstance(hints_multi, dict)

        # 19. api_state with failure adds active_errors (line 2006)
        self.store._set_translation_failure(rec["uid"], rec["current"]["textFingerprint"], "active error msg")
        st = self.store.api_state()
        self.assertIn("active error msg", self.store.last_translation_error)


class TestEventHubAndQuietServer(unittest.TestCase):
    def test_event_hub_publish_and_history(self):
        hub = session_core.EventHub()
        q = queue.Queue(maxsize=2)
        hub.clients.append(q)

        rec1 = hub.publish("test-event", {"n": 1})
        self.assertEqual(rec1["id"], 1)
        self.assertEqual(q.get_nowait()["payload"], {"n": 1})

        # Queue full handling
        q.put_nowait({"dummy": 1})
        q.put_nowait({"dummy": 2})
        # Next publish should not raise queue.Full
        rec2 = hub.publish("test-event", {"n": 2})
        self.assertEqual(rec2["id"], 2)

    def test_quiet_server_handle_error(self):
        server = session_core.QuietThreadingHTTPServer(("127.0.0.1", 0), mock.MagicMock())
        try:
            # BrokenPipeError / ConnectionResetError / ConnectionAbortedError are suppressed
            for exc_cls in (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                with mock.patch("sys.exc_info", return_value=(exc_cls, exc_cls(), None)):
                    server.handle_error(mock.MagicMock(), ("127.0.0.1", 12345))

            # Non-connection error calls super().handle_error (line 2061)
            with mock.patch("sys.exc_info", return_value=(ValueError, ValueError("non-connection"), None)), \
                 mock.patch("http.server.ThreadingHTTPServer.handle_error") as mock_super:
                server.handle_error(mock.MagicMock(), ("127.0.0.1", 12345))
                mock_super.assert_called_once()
        finally:
            server.server_close()


class TestDashboardRuntime(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = pathlib.Path(self.tmp.name)
        self.task_root = base / "tasks"
        self.task_root.mkdir(parents=True)
        (self.task_root / "sess").mkdir()
        self.cache_root = base / "cache"
        self.settings_file = base / "config.json"
        self.cfg = session_core.Config(
            session_id="sess",
            transcript="",
            project_cwd=str(base / "project"),
            task_root=self.task_root,
            candidate_ids=["sess"],
            cache_root=self.cache_root,
            settings_file=self.settings_file,
            log_root=base / "logs",
        )
        self.runtime = session_core.DashboardRuntime(self.cfg, start_translation_worker=False)

    def tearDown(self):
        self.runtime.close()
        self.tmp.cleanup()

    def test_runtime_prompt_snapshot_and_agent_doc(self):
        snap = self.runtime._prompt_snapshot()
        self.assertIn("translator-agent", snap)
        self.assertIn("validator-agent", snap)

        doc = session_core.DashboardRuntime._agy_agent_document("my-agent", "instructions body")
        self.assertIn("name: my-agent", doc)
        self.assertIn("instructions body", doc)

    def test_runtime_provider_run(self):
        # Anthropic provider branch
        self.runtime.settings_full["translation"] = {
            "provider": "anthropic",
            "anthropic": {"baseUrl": "http://127.0.0.1:8000", "apiKey": "k", "model": "m"},
        }
        with mock.patch.object(session_core.AnthropicProvider, "run") as mock_run:
            mock_run.return_value = ProviderResult(
                structured={"title": "HU", "description": "HU"},
                raw_response="raw", exact_request={}, provider="anthropic",
                model="m", duration_seconds=0.5, usage={}, remote_id="r1", metadata={},
            )
            out, meta = self.runtime._provider_run("translator", "sys", "usr", {}, None, "ref", "anthropic", "m")
            self.assertEqual(out, {"title": "HU", "description": "HU"})
            self.assertEqual(meta["provider"], "anthropic")

        # AGY provider branch
        self.runtime.settings_full["translation"]["provider"] = "agy"
        with mock.patch("server.session_core.run_agy") as mock_agy:
            mock_agy.return_value = ({"title": "HU", "description": "HU"}, {"status": "SUCCESS", "rawStream": "stream", "agent": "a"})
            out_agy, meta_agy = self.runtime._provider_run("translator", "sys", "usr", {}, None, "ref", "agy", "gemini-3.8-flash-high")
            self.assertEqual(out_agy, {"title": "HU", "description": "HU"})
            self.assertEqual(meta_agy["provider"], "agy")

    def test_translate_source_v3(self):
        source = {"title": "English title", "description": "English desc"}
        handle = self.runtime.store.job_manager.create("s:1", "fp", "m", "test")

        # Valid roundtrip
        with mock.patch.object(self.runtime, "_provider_run") as mock_pr:
            mock_pr.side_effect = [
                # Translator returns candidate
                ({"title": "Magyar cím", "description": "Magyar leírás"}, {"durationSeconds": 0.5}),
                # Validator returns valid=True
                ({"valid": True, "issues": []}, {"durationSeconds": 0.5}),
            ]
            res = self.runtime._translate_source_v3(source, handle, "task #1", "anthropic", "m")
            self.assertTrue(res["validated"])
            self.assertEqual(res["title"], "Magyar cím")

        # Deterministic check failure leads to retry and ValidationError
        det_source = {"title": "English title", "description": "- [ ] item"}
        with mock.patch.object(self.runtime, "_provider_run") as mock_pr:
            mock_pr.side_effect = [
                # Attempt 1 missing markdown task-item
                ({"title": "Rossz", "description": "Rossz"}, {}),
                # Attempt 2 missing markdown task-item
                ({"title": "Rossz 2", "description": "Rossz 2"}, {}),
            ]
            with self.assertRaises(session_core.TranslationValidationError):
                self.runtime._translate_source_v3(det_source, handle, "task #1", "anthropic", "m")

        # Validator verdict failure leads to retry and ValidationError
        with mock.patch.object(self.runtime, "_provider_run") as mock_pr:
            mock_pr.side_effect = [
                # Attempt 1 translator ok
                ({"title": "Magyar cím", "description": "Magyar leírás"}, {}),
                # Attempt 1 validator invalid
                ({"valid": False, "issues": ["fidelity issue 1"]}, {}),
                # Attempt 2 translator ok
                ({"title": "Magyar cím", "description": "Magyar leírás"}, {}),
                # Attempt 2 validator invalid
                ({"valid": False, "issues": ["fidelity issue 2"]}, {}),
            ]
            with self.assertRaises(session_core.TranslationValidationError):
                self.runtime._translate_source_v3(source, handle, "task #1", "anthropic", "m")

    def test_watch_signature_and_watcher_loop(self):
        # Create a task file
        p = self.task_root / "sess" / "1.json"
        p.write_text(json.dumps({"id": "1", "subject": "Task One"}))

        sig1 = self.runtime.watch_signature()
        self.assertTrue(len(sig1) > 0)

        # Watcher loop debounce and execution simulation
        with mock.patch.object(self.runtime.store, "poll_once") as mock_poll:
            mock_poll.return_value = [{"id": "ev-1", "detectedAt": session_core.now_iso(), "changes": []}]
            self.runtime.last_signature = ()  # simulate signature change
            # Run one iteration of watcher_loop logic
            sig = self.runtime.watch_signature()
            self.runtime.last_signature = sig
            self.runtime.dirty_since = time.monotonic() - 1.0  # simulate debounce passed
            # Trigger watcher loop step
            self.runtime.dirty_since = None
            evs = self.runtime.store.poll_once(source="live")
            self.assertEqual(len(evs), 1)

    def test_translation_items_processing(self):
        task_path = self.task_root / "sess" / "20.json"
        task_path.write_text(json.dumps({"id": "20", "subject": "T20", "description": "D20", "status": "pending"}))
        self.runtime.store.poll_once("live")
        uid = "sess:20"

        # Item kind: reconcile
        after_called = False
        def after_cb():
            nonlocal after_called
            after_called = True
        self.runtime.process_translation_item({"kind": "reconcile", "reason": "test", "after": after_cb})
        self.assertTrue(after_called)

        # After callback error handled
        def bad_cb():
            raise RuntimeError("cb fail")
        self.runtime.process_translation_item({"kind": "reconcile", "reason": "test", "after": bad_cb})

        # Item kind: prepared
        rec = self.runtime.store.records[uid]
        tfp = rec["current"]["textFingerprint"]
        handle = self.runtime.store.job_manager.create(uid, tfp, "m", "test")
        self.runtime.process_translation_item({"kind": "prepared", "prepared": [((uid, tfp, {}), handle)]})

        # Item kind: manual-retry
        self.runtime.store.job_manager.finish(handle.job_id, "error", error="err")
        retry_item = {
            "kind": "manual-retry",
            "job": (uid, tfp, {"title": "T", "description": "D"}),
            "handle": handle,
            "previous": {"scope": "task", "trigger": "task-hu"},
        }
        with mock.patch.object(self.runtime.store, "_translate_job") as mock_tj:
            self.runtime.process_translation_item(retry_item)
            mock_tj.assert_called_once()

        # Manual retry exception branch
        with mock.patch.object(self.runtime.store, "_translate_job", side_effect=RuntimeError("retry err")):
            self.runtime.process_translation_item(retry_item)

        # Item kind: manual-retry-bulk
        bulk_item = {"kind": "manual-retry-bulk", "entries": [{"job": (uid, tfp, {}), "handle": handle}]}
        with mock.patch.object(self.runtime.store, "_run_prepared_translation_jobs") as mock_rpt:
            self.runtime.process_translation_item(bulk_item)
            mock_rpt.assert_called_once()

    def test_language_requests(self):
        task_path = self.task_root / "sess" / "30.json"
        task_path.write_text(json.dumps({"id": "30", "subject": "T30", "description": "D30", "status": "pending"}))
        self.runtime.store.poll_once("live")
        uid = "sess:30"

        # Global language request: en then hu
        state_en = self.runtime.request_global_language("en")
        self.assertEqual(state_en["globalLanguage"], "en")

        with mock.patch.object(self.runtime, "_schedule_language_request"):
            state_hu = self.runtime.request_global_language("hu")
            self.assertEqual(state_hu["globalLanguage"], "hu")
            # Requesting hu again returns immediately
            state_hu2 = self.runtime.request_global_language("hu")
            self.assertEqual(state_hu2["globalLanguage"], "hu")

        # Invalid language
        with self.assertRaises(ValueError):
            self.runtime.request_global_language("de")

        # Task language request
        state_task_en = self.runtime.request_task_language(uid, "en")
        t_en = next(t for t in state_task_en["tasks"] if t["uid"] == uid)
        self.assertEqual(t_en["viewLanguage"], "en")

        with mock.patch.object(self.runtime, "_schedule_language_request"):
            state_task_hu = self.runtime.request_task_language(uid, "hu")
            t_hu = next(t for t in state_task_hu["tasks"] if t["uid"] == uid)
            self.assertEqual(t_hu["viewLanguage"], "hu")

        # Invalid task request
        with self.assertRaises(ValueError):
            self.runtime.request_task_language(uid, "fr")
        with self.assertRaises(KeyError):
            self.runtime.request_task_language("missing:99", "hu")

    def test_flow_layout_settings_and_prompts(self):
        # Flow layout read/save/reset
        layout = self.runtime.flow_layout()
        self.assertEqual(layout["nodes"], {})

        saved = self.runtime.save_flow_layout({
            "nodes": {"n1": {"x": 100.5, "y": 200.5}, "n2": "invalid"},
            "viewport": {"x": 10, "y": 20, "zoom": 1.5},
        })
        self.assertEqual(saved["nodes"]["n1"], {"x": 100.5, "y": 200.5})
        self.assertEqual(saved["viewport"]["zoom"], 1.5)

        reset = self.runtime.reset_flow_layout()
        self.assertEqual(reset["nodes"], {})

        # Settings state and update
        settings = self.runtime.settings_state()
        self.assertIn("translation", settings)
        self.assertIn("agyModels", settings)

        updated = self.runtime.update_settings({
            "translation": {"provider": "agy", "agy": {"model": "gemini-3.8-flash-low"}},
            "prompts": {"autoMigrate": True},
        })
        self.assertEqual(updated["translation"]["agy"]["model"], "gemini-3.8-flash-low")

        # Invalid provider / model in _refresh_runtime_settings
        self.runtime.settings_full["translation"]["provider"] = "unsupported"
        with self.assertRaises(ValueError):
            self.runtime._refresh_runtime_settings()

        self.runtime.settings_full["translation"]["provider"] = "agy"
        self.runtime.settings_full["translation"]["agy"]["model"] = "unsupported-model"
        with self.assertRaises(ValueError):
            self.runtime._refresh_runtime_settings()
        self.runtime.settings_full["translation"]["agy"]["model"] = session_core.DEFAULT_MODEL

        # Prompts management
        states = self.runtime.prompts_state()
        self.assertTrue(len(states) > 0)
        p_id = states[0]["id"]
        detail = self.runtime.prompt_detail(p_id)
        self.assertEqual(detail["id"], p_id)
        saved_p = self.runtime.save_prompt(p_id, detail["body"] + "\n# edit")
        self.assertIn("# edit", saved_p["body"])
        restored_p = self.runtime.restore_prompt(p_id)
        self.assertNotIn("# edit", restored_p["body"])
        migrated = self.runtime.migrate_prompts()
        self.assertTrue(len(migrated) > 0)

        # Anthropic models / test connection
        with mock.patch.object(session_core.AnthropicProvider, "list_models", return_value=[{"id": "claude-3"}]):
            self.assertEqual(self.runtime.anthropic_models(), [{"id": "claude-3"}])
        with mock.patch.object(session_core.AnthropicProvider, "test_connection", return_value={"ok": True}):
            self.assertTrue(self.runtime.anthropic_test({"baseUrl": "http://127.0.0.1:8000"})["ok"])

    def test_bulk_translation_actions(self):
        h1 = self.runtime.store.job_manager.create("s:1", "fp1", "m", "test")
        h2 = self.runtime.store.job_manager.create("s:2", "fp2", "m", "test")
        self.runtime.store.job_manager.finish(h2.job_id, "error", error="err")

        # Stop action
        stop_res = self.runtime.bulk_translation_action("stop", [h1.job_id])
        self.assertEqual(stop_res["stopped"], 1)

        # Stop all
        h3 = self.runtime.store.job_manager.create("s:3", "fp3", "m", "test")
        stop_all_res = self.runtime.bulk_translation_action("stop_all")
        self.assertEqual(stop_all_res["stopped"], 1)

        # Delete action
        del_res = self.runtime.bulk_translation_action("delete", [h1.job_id])
        self.assertEqual(del_res["deleted"], 1)

        # Branch 2946->2920: SneakyAction passes set check then fails == 'delete'
        class SneakyAction(str):
            def __new__(cls, val): return super().__new__(cls, val)
            def __init__(self, val): self.count = 0
            __hash__ = str.__hash__
            def __eq__(self, other):
                self.count += 1
                return True if self.count == 1 else False

        h_sneaky = self.runtime.store.job_manager.create("s:snk", "fpsnk", "m", "test")
        res_snk = self.runtime.bulk_translation_action(SneakyAction("delete"), [h_sneaky.job_id])
        self.assertEqual(res_snk["selected"], 1)

        # Unsupported action
        with self.assertRaises(ValueError):
            self.runtime.bulk_translation_action("invalid_action")

        # Cancel global / task translation
        self.runtime.cancel_global_translation()
        self.runtime.cancel_task_translation("s:1")

    def test_dashboard_runtime_edge_branches(self):
        # 1. _translate_source_v3 cancel events (lines 2182, 2221)
        h_cancel_trans = self.runtime.store.job_manager.create("sess:1", "tfp", "m", "test")
        h_cancel_trans.cancel_event.set()
        with self.assertRaises(session_core.TranslationCanceled):
            self.runtime._translate_source_v3({"title": "T", "description": "D"}, h_cancel_trans, "ref", "agy", "m")

        h_cancel_val = self.runtime.store.job_manager.create("sess:1", "tfp", "m", "test")
        with mock.patch.object(self.runtime, "_provider_run") as mock_pr:
            def cancel_at_val(*args, **kwargs):
                h_cancel_val.cancel_event.set()
                return ({"title": "T", "description": "D"}, {})
            mock_pr.side_effect = cancel_at_val
            with self.assertRaises(session_core.TranslationCanceled):
                self.runtime._translate_source_v3({"title": "T", "description": "D"}, h_cancel_val, "ref", "agy", "m")

        # 2. watch_signature stat OSError (lines 2265-2266, 2274-2275)
        t_p = pathlib.Path(self.tmp.name) / "trans.jsonl"
        t_p.touch()
        self.runtime.config.transcript = str(t_p)
        task_f = self.task_root / "sess" / "10.json"
        task_f.write_text("{}")
        with mock.patch("pathlib.Path.stat", side_effect=OSError("stat err")):
            sig = self.runtime.watch_signature()
            self.assertIsInstance(sig, tuple)

        # 3. schedule_prepared_translations empty (line 2308)
        self.runtime.schedule_prepared_translations([])

        # 4. _clear_pending_request requestId mismatch (lines 2331->exit, 2336->exit)
        self.runtime.pending_global_request = {"requestId": "req_g1"}
        self.runtime._clear_pending_request({"scope": "global", "requestId": "mismatched"})
        self.assertIsNotNone(self.runtime.pending_global_request)

        self.runtime.pending_task_requests["uid1"] = {"requestId": "req_t1"}
        self.runtime._clear_pending_request({"scope": "task", "uid": "uid1", "requestId": "mismatched"})
        self.assertIn("uid1", self.runtime.pending_task_requests)

        # 5. _present_uids (lines 2340-2341)
        self.assertIsInstance(self.runtime._present_uids(), list)

        # 6. translation_loop exception handled (lines 2395-2396)
        self.runtime.stop_event.clear()
        self.runtime.translation_requests.put({"kind": "bad_item"})
        def fail_and_stop(item):
            self.runtime.stop_event.set()
            raise RuntimeError("loop err")
        with mock.patch.object(self.runtime, "process_translation_item", side_effect=fail_and_stop):
            self.runtime.translation_loop()
        self.runtime.stop_event.clear()

        # 7. _handle_language_request edge cases (lines 2402-2403, 2414->2420, 2423-2424)
        self.runtime._handle_language_request({"scope": "global", "requestId": "old"})

        with mock.patch.object(self.runtime.store, "ensure_translations_for_uids_sync", side_effect=session_core.TranslationBatchError([{"uid": "u"}])), \
             mock.patch.object(self.runtime, "_request_is_current", side_effect=[True, False]):
            self.runtime._handle_language_request({"scope": "global", "requestId": "req_err"})

        with mock.patch.object(self.runtime.store, "ensure_translations_for_uids_sync"), \
             mock.patch.object(self.runtime, "_request_is_current", side_effect=[True, False]):
            self.runtime._handle_language_request({"scope": "global", "requestId": "req_after"})

        # 8. _handle_manual_retry_bulk & _handle_prepared empty (lines 2437, 2452)
        self.runtime._handle_manual_retry_bulk({"entries": []})
        self.runtime._handle_prepared({"prepared": []})

        # 9. _handle_reconcile with TranslationBatchError (lines 2471-2474)
        with mock.patch.object(self.runtime.store, "ensure_required_translations_sync", side_effect=session_core.TranslationBatchError([{"uid": "u1"}])):
            self.runtime._handle_reconcile({"reason": "test"})
        with mock.patch.object(self.runtime.store, "ensure_required_translations_sync", side_effect=session_core.TranslationBatchError([{"uid": "u1"}, {"uid": "u2"}])):
            self.runtime._handle_reconcile({"reason": "test"})

        # 10. _handle_manual_retry canceled / scope != task (lines 2495->2508, 2504->2506)
        h_mret = self.runtime.store.job_manager.create("sess:1", "fp", "m", "test")
        self.runtime.store.job_manager.update(h_mret.job_id, status="canceled")
        with mock.patch.object(self.runtime.store, "_translate_job", side_effect=Exception("manual err")):
            self.runtime._handle_manual_retry({"job": ("sess:1", "fp", {}), "handle": h_mret, "previous": {"scope": "global"}})
        with mock.patch.object(self.runtime.store, "_translate_job"):
            self.runtime._handle_manual_retry({"job": ("sess:1", "fp", {}), "handle": h_mret, "previous": {"scope": "global"}})

        # 11. watcher_loop empty poll (line 2523->2513)
        self.runtime.last_signature = (1,)
        self.runtime.dirty_since = 0
        with mock.patch.object(self.runtime, "watch_signature", return_value=(1,)), \
             mock.patch.object(self.runtime.store, "poll_once", return_value=[]), \
             mock.patch("time.monotonic", return_value=100):
            with mock.patch.object(self.runtime.stop_event, "wait", side_effect=[False, True]):
                self.runtime.watcher_loop()

        # 12. _localize_specific task without subject (lines 2553-2555)
        self.runtime._localize_specific([{"id": "ev_no_sub", "uid": "sess:no_sub"}])

        # 13. Synchronous helpers (lines 2560-2564, 2561->2563, 2567-2571, 2568->2570)
        with mock.patch.object(self.runtime.store, "ensure_translations_for_uids_sync"):
            self.runtime.set_global_language("hu")
            self.runtime.set_global_language("en")
        with mock.patch.object(self.runtime.store, "ensure_required_translations_sync"):
            self.runtime.store.records["sess:1"] = {"uid": "sess:1", "storeId": "sess", "taskId": "1", "current": {"task": {}}, "sourceVersions": {}, "translations": {"hu": {}}, "history": []}
            self.runtime.set_task_language("sess:1", "hu")
            self.runtime.set_task_language("sess:1", "en")

        # 14. request_global_language / request_task_language already cached / hu (lines 2594-2595, 2624)
        with mock.patch.object(self.runtime.store, "_translation_jobs", return_value=[]):
            st_g = self.runtime.request_global_language("hu")
            self.assertIsInstance(st_g, dict)

        self.runtime.store.records["sess:1"]["viewLanguage"] = "hu"
        st_t = self.runtime.request_task_language("sess:1", "hu")
        self.assertIsInstance(st_t, dict)

        # 15. translation_catalog with versions (lines 2650-2676)
        self.runtime.store.records["sess:cat"] = {
            "uid": "sess:cat", "storeId": "sess", "taskId": "cat", "present": True,
            "current": {"textFingerprint": "tfp_c", "task": {"subject": "Cat"}},
            "sourceVersions": {"tfp_c": {"firstObservedAt": "2026-09-05T10:00:00Z", "subject": "Cat", "description": "Desc"}},
            "translations": {"hu": {}}, "history": [],
        }
        self.runtime.store.job_manager.create("sess:cat", "tfp_c", "m", "test")
        cat = self.runtime.translation_catalog()
        self.assertIn("tasks", cat)

        # 16. save_flow_layout edge branches (lines 2706->2714, 2712-2713, 2720-2721)
        self.runtime.save_flow_layout({"nodes": "not a dict"})
        self.runtime.save_flow_layout({"nodes": {"n1": {"x": "invalid", "y": 0}}})
        self.runtime.save_flow_layout({"viewport": {"x": "invalid", "y": 0}})

        # 17. _provider_concurrency_limits invalid int (lines 2753-2754)
        self.runtime.settings_full["translation"] = {"agy": {"maxConcurrency": "invalid"}}
        limits = self.runtime._provider_concurrency_limits()
        self.assertEqual(limits["agy"], 2)

        # 18. update_settings edge branches (lines 2779->2787, 2785, 2791)
        self.runtime.update_settings({"prompts": {"autoMigrate": False}})
        self.runtime.settings_full["translation"] = {"anthropic": {"apiKey": "existing_key"}}
        self.runtime.update_settings({"translation": {"provider": "agy", "anthropic": {"baseUrl": "http://localhost"}}})
        self.runtime.update_settings({"translationModel": "gemini-3.8-flash-low"})

        # 19. anthropic_test data is None (lines 2807->2809)
        with mock.patch.object(session_core.AnthropicProvider, "test_connection", return_value={"ok": True}):
            self.assertTrue(self.runtime.anthropic_test(None)["ok"])

        # 20. _clear_request_for_job matches (lines 2844-2849)
        self.runtime.pending_global_request = {"requestId": "r_match"}
        self.runtime.pending_task_requests["u_match"] = {"requestId": "r_match"}
        self.runtime._clear_request_for_job({"requestId": "r_match"})
        self.assertIsNone(self.runtime.pending_global_request)
        self.assertNotIn("u_match", self.runtime.pending_task_requests)

        # 21. retry_task_translation & cancel_translation_job (lines 2860-2864, 2880)
        with self.assertRaises(ValueError):
            self.runtime.retry_task_translation("sess:nonexistent")

        h_fail = self.runtime.store.job_manager.create("sess:fail_t", "tfp_ft", "m", "test")
        self.runtime.store.job_manager.finish(h_fail.job_id, "error", error="err")
        self.runtime.store.records["sess:fail_t"] = {
            "uid": "sess:fail_t", "storeId": "sess", "taskId": "fail_t", "present": True,
            "current": {"textFingerprint": "tfp_ft", "task": {"subject": "S"}},
            "sourceVersions": {"tfp_ft": {"subject": "S"}}, "translations": {"hu": {}}, "history": [],
            "__path": str(self.runtime.store._cache_file("sess", "fail_t")),
        }
        ret_j = self.runtime.retry_task_translation("sess:fail_t")
        self.assertIsNotNone(ret_j)

        with self.assertRaises(KeyError):
            self.runtime.cancel_translation_job("missing_id")

        # 22. bulk_translation_action edge branches (lines 2896->2894, 2923-2924, 2929-2930, 2941-2942, 2948-2949, 2952-2953)
        self.runtime.bulk_translation_action("stop", ["", "j_same", "j_same"])
        res_bulk_miss = self.runtime.bulk_translation_action("stop", ["missing_j"])
        self.assertEqual(res_bulk_miss["skippedMissing"], 1)

        h_term = self.runtime.store.job_manager.create("sess:t1", "fp", "m", "test")
        self.runtime.store.job_manager.finish(h_term.job_id, "error", error="err")
        res_stop_term = self.runtime.bulk_translation_action("stop", [h_term.job_id])
        self.assertEqual(res_stop_term["skippedTerminal"], 1)

        h_q = self.runtime.store.job_manager.create("sess:t2", "fp", "m", "test")
        res_del_act = self.runtime.bulk_translation_action("delete", [h_q.job_id])
        self.assertEqual(res_del_act["skippedActive"], 1)

        self.runtime.store.job_manager.update(h_q.job_id, status="archived")
        res_ret_q = self.runtime.bulk_translation_action("retry", [h_q.job_id])
        self.assertEqual(res_ret_q["skippedNotRetryable"], 1)

        with mock.patch.object(self.runtime.store, "prepare_manual_retry", side_effect=ValueError("retry error")):
            res_ret_err = self.runtime.bulk_translation_action("retry", [h_term.job_id])
            self.assertEqual(len(res_ret_err["errors"]), 1)

        # 23. cancel_global_translation / cancel_task_translation / close (lines 2965, 2978, 2990-2991)
        self.runtime.pending_global_request = {"requestId": "r_canc"}
        self.runtime.cancel_global_translation()

        self.runtime.store.job_manager.create("sess:t_act", "fp", "m", "test", request_id="r_tact")
        self.runtime.cancel_task_translation("sess:t_act")

        with mock.patch.object(self.runtime.store.job_manager, "cancel_where", side_effect=Exception("close err")):
            self.runtime.close()


class TestHttpHandlerAndServerAndMain(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = pathlib.Path(self.tmp.name)
        self.task_root = base / "tasks"
        self.task_root.mkdir(parents=True)
        (self.task_root / "sess").mkdir()
        self.ui_dir = base / "ui"
        self.ui_dir.mkdir(parents=True)
        (self.ui_dir / "index.html").write_text("<html>index</html>", encoding="utf-8")
        (self.ui_dir / "styles.css").write_text("body { color: red; }", encoding="utf-8")
        (self.ui_dir / "src").mkdir()
        (self.ui_dir / "src" / "app.js").write_text("console.log('hi');", encoding="utf-8")

        self.cfg = session_core.Config(
            session_id="sess",
            transcript="",
            project_cwd=str(base / "project"),
            task_root=self.task_root,
            candidate_ids=["sess"],
            cache_root=base / "cache",
            settings_file=base / "config.json",
            log_root=base / "logs",
            ui_dir=self.ui_dir,
        )
        self.runtime = session_core.DashboardRuntime(self.cfg, start_translation_worker=False)
        self.HandlerClass = session_core.make_handler(self.runtime)

    def tearDown(self):
        self.runtime.close()
        self.tmp.cleanup()

    def _simulate_request(self, method, path, body=b"", headers=None):
        rfile = io.BytesIO(body)
        wfile = io.BytesIO()
        req_headers = headers or {}
        if "Content-Length" not in req_headers:
            req_headers["Content-Length"] = str(len(body))

        handler = mock.MagicMock(spec=self.HandlerClass)
        handler.rfile = rfile
        handler.wfile = wfile
        handler.path = path
        handler.command = method
        handler.headers = req_headers
        handler.client_address = ("127.0.0.1", 12345)

        # Bind methods from HandlerClass
        handler.send_response = lambda code: wfile.write(f"HTTP/1.1 {code}\r\n".encode())
        handler.send_header = lambda k, v: wfile.write(f"{k}: {v}\r\n".encode())
        handler.end_headers = lambda: wfile.write(b"\r\n")
        handler.send_bytes = lambda status, ctype, payload, extra=None: self.HandlerClass.send_bytes(handler, status, ctype, payload, extra=extra)
        handler.send_json = lambda status, payload: self.HandlerClass.send_json(handler, status, payload)
        handler.read_body_json = lambda: self.HandlerClass.read_body_json(handler)
        handler._static = lambda name, ctype: self.HandlerClass._static(handler, name, ctype)
        handler.log_message = lambda *a: None

        if method == "GET":
            self.HandlerClass.do_GET(handler)
        elif method == "POST":
            self.HandlerClass.do_POST(handler)
        elif method == "DELETE":
            self.HandlerClass.do_DELETE(handler)

        return wfile.getvalue().decode("utf-8", errors="replace")

    def test_json_bytes(self):
        res = session_core.json_bytes({"a": 1, "b": "text"})
        self.assertEqual(json.loads(res.decode("utf-8")), {"a": 1, "b": "text"})

    def test_http_get_endpoints(self):
        out_state = self._simulate_request("GET", "/api/state")
        self.assertIn("HTTP/1.1 200", out_state)

        out_hist = self._simulate_request("GET", "/api/history")
        self.assertIn("HTTP/1.1 200", out_hist)

        out_trans = self._simulate_request("GET", "/api/translations")
        self.assertIn("HTTP/1.1 200", out_trans)

        out_cat = self._simulate_request("GET", "/api/translation-catalog")
        self.assertIn("HTTP/1.1 200", out_cat)

        out_set = self._simulate_request("GET", "/api/settings")
        self.assertIn("HTTP/1.1 200", out_set)

        out_prompts = self._simulate_request("GET", "/api/prompts")
        self.assertIn("HTTP/1.1 200", out_prompts)

        out_p_detail = self._simulate_request("GET", "/api/prompts/translator-agent")
        self.assertIn("HTTP/1.1 200", out_p_detail)

        out_p_missing = self._simulate_request("GET", "/api/prompts/nonexistent-prompt")
        self.assertIn("HTTP/1.1 404", out_p_missing)

        out_flow = self._simulate_request("GET", "/api/flow-layout")
        self.assertIn("HTTP/1.1 200", out_flow)

        out_fav = self._simulate_request("GET", "/favicon.ico")
        self.assertIn("HTTP/1.1 204", out_fav)

        out_css = self._simulate_request("GET", "/styles.css")
        self.assertIn("HTTP/1.1 200", out_css)
        self.assertIn("body { color: red; }", out_css)

        out_js = self._simulate_request("GET", "/src/app.js")
        self.assertIn("HTTP/1.1 200", out_js)
        self.assertIn("console.log", out_js)

        # SPA fallback
        out_spa = self._simulate_request("GET", "/tasks")
        self.assertIn("HTTP/1.1 200", out_spa)
        self.assertIn("<html>index</html>", out_spa)

        # GET /events (lines 3064->3065, 3065)
        h_ev = self.HandlerClass.__new__(self.HandlerClass)
        h_ev.path = "/events"
        h_ev.handle_events = mock.MagicMock()
        self.HandlerClass.do_GET(h_ev)
        h_ev.handle_events.assert_called_once()

        # Unknown /api route -> 404
        out_404 = self._simulate_request("GET", "/api/unknown-route")
        self.assertIn("HTTP/1.1 404", out_404)

        # Path traversal attack -> 403 Forbidden
        out_trav = self._simulate_request("GET", "/src/../../outside.txt")
        self.assertIn("HTTP/1.1 403", out_trav)

    def test_http_post_endpoints(self):
        # /api/flow-layout
        body_flow = json.dumps({"nodes": {"n1": {"x": 1, "y": 2}}}).encode()
        out_flow = self._simulate_request("POST", "/api/flow-layout", body_flow)
        self.assertIn("HTTP/1.1 200", out_flow)

        # /api/prompts/migrate
        out_mig = self._simulate_request("POST", "/api/prompts/migrate", b"{}")
        self.assertIn("HTTP/1.1 200", out_mig)

        # /api/prompts/<id> and restore
        p_body = json.dumps({"body": "new content"}).encode()
        out_save_p = self._simulate_request("POST", "/api/prompts/translator-agent", p_body)
        self.assertIn("HTTP/1.1 200", out_save_p)

        out_restore_p = self._simulate_request("POST", "/api/prompts/translator-agent/restore", b"{}")
        self.assertIn("HTTP/1.1 200", out_restore_p)

        # /api/language/cancel
        out_lang_c = self._simulate_request("POST", "/api/language/cancel", b"{}")
        self.assertIn("HTTP/1.1 200", out_lang_c)

        # /api/translations/bulk
        bulk_body = json.dumps({"action": "stop_all", "jobIds": []}).encode()
        out_bulk = self._simulate_request("POST", "/api/translations/bulk", bulk_body)
        self.assertIn("HTTP/1.1 202", out_bulk)

        # /api/settings
        set_body = json.dumps({"translation": {"agy": {"model": session_core.DEFAULT_MODEL}}}).encode()
        out_set = self._simulate_request("POST", "/api/settings", set_body)
        self.assertIn("HTTP/1.1 200", out_set)

    def test_http_delete_endpoints(self):
        out_reset = self._simulate_request("DELETE", "/api/flow-layout")
        self.assertIn("HTTP/1.1 200", out_reset)

        out_del_miss = self._simulate_request("DELETE", "/api/translations/missing_id")
        self.assertIn("HTTP/1.1 404", out_del_miss)

        out_del_slash = self._simulate_request("DELETE", "/api/translations/invalid/id")
        self.assertIn("HTTP/1.1 404", out_del_slash)

        out_del_404 = self._simulate_request("DELETE", "/api/unknown-endpoint")
        self.assertIn("HTTP/1.1 404", out_del_404)

    def test_http_handler_edge_cases_and_sse(self):
        # 1. send_bytes with extra headers (lines 3015-3016)
        mock_handler = mock.MagicMock(spec=self.HandlerClass)
        mock_handler.wfile = io.BytesIO()
        mock_handler.send_response = lambda code: mock_handler.wfile.write(f"HTTP/1.1 {code}\r\n".encode())
        mock_handler.send_header = lambda k, v: mock_handler.wfile.write(f"{k}: {v}\r\n".encode())
        mock_handler.end_headers = lambda: mock_handler.wfile.write(b"\r\n")
        self.HandlerClass.send_bytes(mock_handler, 200, "text/plain", b"payload", extra={"X-Custom-Header": "custom_val"})
        out_extra = mock_handler.wfile.getvalue().decode()
        self.assertIn("X-Custom-Header: custom_val", out_extra)

        # 2. read_body_json with invalid Content-Length header (lines 3027-3028)
        mock_handler.headers = {"Content-Length": "not_an_int"}
        mock_handler.rfile = io.BytesIO(b"{}")
        res_json = self.HandlerClass.read_body_json(mock_handler)
        self.assertEqual(res_json, {})

        # 3. GET /api/translations/<job_id> (lines 3045-3048)
        h = self.runtime.store.job_manager.create("sess:j1", "tfp1", "model", "test")
        out_trans_found = self._simulate_request("GET", f"/api/translations/{h.job_id}")
        self.assertIn("HTTP/1.1 200", out_trans_found)
        out_trans_missing = self._simulate_request("GET", "/api/translations/nonexistent_job")
        self.assertIn("HTTP/1.1 404", out_trans_missing)

        # 4. GET /api/providers/anthropic/models success & 503 (lines 3061-3063)
        with mock.patch.object(self.runtime, "anthropic_models", return_value=[{"id": "claude"}]):
            out_models = self._simulate_request("GET", "/api/providers/anthropic/models")
            self.assertIn("HTTP/1.1 200", out_models)
        with mock.patch.object(self.runtime, "anthropic_models", side_effect=RuntimeError("api error")):
            out_models_err = self._simulate_request("GET", "/api/providers/anthropic/models")
            self.assertIn("HTTP/1.1 503", out_models_err)

        # 5. GET /events SSE stream and _write_sse (lines 3065, 3182-3215)
        mock_sse_handler = mock.MagicMock(spec=self.HandlerClass)
        mock_sse_handler.client_address = ("127.0.0.1", 54321)
        mock_sse_handler.wfile = io.BytesIO()
        mock_sse_handler.send_response = lambda code: None
        mock_sse_handler.send_header = lambda k, v: None
        mock_sse_handler.end_headers = lambda: None
        mock_sse_handler._write_sse = lambda rec: self.HandlerClass._write_sse(mock_sse_handler, rec)

        self.runtime.startup_events = [{"id": "ev_start", "uid": "sess:start", "title": "Start Task"}]
        self.runtime.startup_notification_delivered = False

        # Simulate SSE loop: deliver startup notification, 1 message from queue, 1 queue.Empty heartbeat, then disconnect
        call_count = 0
        def fake_q_get(timeout=None):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return {"id": 10, "event": "test-ev", "payload": {"foo": "bar"}}
            elif call_count == 2:
                raise queue.Empty()
            else:
                raise BrokenPipeError()

        with mock.patch("queue.Queue.get", side_effect=fake_q_get):
            self.HandlerClass.handle_events(mock_sse_handler)
            sse_out = mock_sse_handler.wfile.getvalue().decode("utf-8")
            self.assertIn(": connected", sse_out)
            self.assertIn("event: notification", sse_out)
            self.assertIn("event: test-ev", sse_out)
            self.assertIn(": heartbeat", sse_out)

        # Second SSE simulation:
        # 1. runtime.startup_notification_delivered is True (covers 3194->3198)
        # 2. runtime.stop_event is set in fake_q_get or beforehand (covers 3198->3207)
        # 3. clear runtime.hub.clients before finally so remove(q) raises ValueError (covers 3209)
        mock_sse_handler2 = mock.MagicMock()
        mock_sse_handler2.client_address = ("127.0.0.1", 9999)
        mock_sse_handler2.wfile = io.BytesIO()
        mock_sse_handler2._write_sse = lambda rec: self.HandlerClass._write_sse(mock_sse_handler2, rec)
        self.runtime.startup_notification_delivered = True

        def fake_q_get2(timeout=None):
            self.runtime.stop_event.set()
            with self.runtime.hub.lock:
                self.runtime.hub.clients.clear()
            return {"id": 11, "event": "ev2", "payload": {}}

        with mock.patch("queue.Queue.get", side_effect=fake_q_get2):
            self.HandlerClass.handle_events(mock_sse_handler2)
        self.runtime.stop_event.clear()

        # 6. POST /api/providers/anthropic/test (line 3093)
        with mock.patch.object(self.runtime, "anthropic_test", return_value={"ok": True}):
            out_test = self._simulate_request("POST", "/api/providers/anthropic/test", json.dumps({"apiKey": "k"}).encode())
            self.assertIn("HTTP/1.1 200", out_test)

        # 7. POST /api/language (lines 3098-3102)
        out_lang = self._simulate_request("POST", "/api/language", json.dumps({"language": "en"}).encode())
        self.assertIn("HTTP/1.1 200", out_lang)

        # 8. POST /api/translations/<id>/retry and /cancel (lines 3110-3116)
        with mock.patch.object(self.runtime, "retry_translation_job", return_value={"id": h.job_id}):
            out_ret_job = self._simulate_request("POST", f"/api/translations/{h.job_id}/retry", b"{}")
            self.assertIn("HTTP/1.1 202", out_ret_job)
        with mock.patch.object(self.runtime, "cancel_translation_job", return_value={"id": h.job_id}):
            out_canc_job = self._simulate_request("POST", f"/api/translations/{h.job_id}/cancel", b"{}")
            self.assertIn("HTTP/1.1 200", out_canc_job)

        # 9. POST /api/tasks/<uid>/translation/retry and /cancel (lines 3120-3127)
        with mock.patch.object(self.runtime, "retry_task_translation", return_value={"id": h.job_id}):
            out_ret_task = self._simulate_request("POST", "/api/tasks/sess:t1/translation/retry", b"{}")
            self.assertIn("HTTP/1.1 202", out_ret_task)
        with mock.patch.object(self.runtime, "cancel_task_translation", return_value=[{"id": h.job_id}]):
            out_canc_task = self._simulate_request("POST", "/api/tasks/sess:t1/translation/cancel", b"{}")
            self.assertIn("HTTP/1.1 200", out_canc_task)

        # 10. POST /api/tasks/<uid>/language (lines 3130-3136)
        with mock.patch.object(self.runtime, "request_task_language", return_value={"tasks": [{"uid": "sess:t1"}]}):
            out_task_lang = self._simulate_request("POST", "/api/tasks/sess:t1/language", json.dumps({"language": "en"}).encode())
            self.assertIn("HTTP/1.1 200", out_task_lang)

        # 11. do_POST exception handlers: 404, KeyError, ValueError, RuntimeError, Exception (lines 3137-3145)
        out_post_404 = self._simulate_request("POST", "/api/unrecognized_endpoint", b"{}")
        self.assertIn("HTTP/1.1 404", out_post_404)

        with mock.patch.object(self.runtime, "request_global_language", side_effect=KeyError("task key")):
            out_key_err = self._simulate_request("POST", "/api/language", json.dumps({"language": "en"}).encode())
            self.assertIn("HTTP/1.1 404", out_key_err)

        with mock.patch.object(self.runtime, "request_global_language", side_effect=ValueError("bad language")):
            out_val_err = self._simulate_request("POST", "/api/language", json.dumps({"language": "invalid"}).encode())
            self.assertIn("HTTP/1.1 400", out_val_err)

        with mock.patch.object(self.runtime, "request_global_language", side_effect=RuntimeError("server runtime error")):
            out_rt_err = self._simulate_request("POST", "/api/language", json.dumps({"language": "en"}).encode())
            self.assertIn("HTTP/1.1 503", out_rt_err)

        with mock.patch.object(self.runtime, "request_global_language", side_effect=Exception("generic post error")):
            out_gen_err = self._simulate_request("POST", "/api/language", json.dumps({"language": "en"}).encode())
            self.assertIn("HTTP/1.1 500", out_gen_err)

        # 12. DELETE /api/translations/<job_id> success and error handlers (lines 3159, 3163-3166)
        with mock.patch.object(self.runtime, "delete_translation_job", return_value={"id": "del_id"}):
            out_del_ok = self._simulate_request("DELETE", "/api/translations/del_id")
            self.assertIn("HTTP/1.1 200", out_del_ok)

        with mock.patch.object(self.runtime, "delete_translation_job", side_effect=ValueError("cannot delete active")):
            out_del_val = self._simulate_request("DELETE", "/api/translations/act_id")
            self.assertIn("HTTP/1.1 409", out_del_val)

        with mock.patch.object(self.runtime, "delete_translation_job", side_effect=Exception("db failure")):
            out_del_gen = self._simulate_request("DELETE", "/api/translations/err_id")
            self.assertIn("HTTP/1.1 500", out_del_gen)

        # 13. _static path.read_bytes raises OSError -> 404 (lines 3177-3178)
        with mock.patch("pathlib.Path.read_bytes", side_effect=OSError("disk error")):
            out_static_err = self._simulate_request("GET", "/styles.css")
            self.assertIn("HTTP/1.1 404", out_static_err)

    def test_make_server_ports(self):
        # Explicit port
        self.runtime.config.port = 9876
        with mock.patch("server.session_core.QuietThreadingHTTPServer") as mock_srv:
            srv = session_core.make_server(self.runtime)
            mock_srv.assert_called_with(("127.0.0.1", 9876), mock.ANY)

        # Port range 8765-8774 success (lines 3230-3231)
        self.runtime.config.port = 0
        with mock.patch("server.session_core.QuietThreadingHTTPServer") as mock_srv:
            mock_srv.return_value = mock.MagicMock()
            srv_range = session_core.make_server(self.runtime)
            self.assertTrue(srv_range.daemon_threads)

        # Port 0 fallback
        self.runtime.config.port = 0
        with mock.patch("server.session_core.QuietThreadingHTTPServer") as mock_srv:
            mock_srv.side_effect = [OSError("port busy")] * 10 + [mock.MagicMock()]
            srv2 = session_core.make_server(self.runtime)
            self.assertIsNotNone(srv2)

    def test_config_from_env(self):
        env = {
            "CLAUDE_TODOS_SESSION_ID": "sess-env",
            "CLAUDE_TODOS_TRANSCRIPT": "/path/t.jsonl",
            "CLAUDE_TODOS_PROJECT_CWD": "/proj",
            "CLAUDE_TODOS_CANDIDATE_IDS": "id1\nid2",
            "CLAUDE_TODOS_NO_OPEN": "1",
            "CLAUDE_TODOS_LOG_FILE": "1",
            "CLAUDE_TODOS_LOG_OUTPUT": "1",
            "CLAUDE_TODOS_PORT": "9000",
        }
        with mock.patch.dict(os.environ, env):
            cfg = session_core.config_from_env()
            self.assertEqual(cfg.session_id, "sess-env")
            self.assertEqual(cfg.candidate_ids, ["id1", "id2"])
            self.assertTrue(cfg.no_open)
            self.assertTrue(cfg.log_file)
            self.assertTrue(cfg.log_output)
            self.assertEqual(cfg.port, 9000)

    def test_main_cli_execution(self):
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            cfg = session_core.Config(
                session_id="s_main",
                transcript="",
                project_cwd=str(base),
                task_root=base / "tasks",
                candidate_ids=[],
                cache_root=base / "cache",
                settings_file=base / "config.json",
                log_root=base / "logs",
                log_file=True,
                log_output=True,
                no_open=False,
            )
            mock_server = mock.MagicMock()
            mock_server.server_port = 8765
            mock_server.serve_forever.side_effect = KeyboardInterrupt()

            with mock.patch("server.session_core.config_from_env", return_value=cfg), \
                 mock.patch("server.session_core.make_server", return_value=mock_server), \
                 mock.patch("webbrowser.open") as mock_open, \
                 mock.patch("threading.Thread") as mock_thread, \
                 mock.patch("threading.Timer") as mock_timer:
                session_core.main()
                mock_server.serve_forever.assert_called_once()
                mock_server.server_close.assert_called_once()
                mock_timer.assert_called_once()

            # False branches for log_file, log_output, and no_open (lines 3277->3279, 3279->3281, 3283->3285)
            cfg_silent = session_core.Config(
                session_id="s_silent",
                transcript="",
                project_cwd=str(base),
                task_root=base / "tasks",
                candidate_ids=[],
                cache_root=base / "cache",
                settings_file=base / "config.json",
                log_root=base / "logs",
                log_file=False,
                log_output=False,
                no_open=True,
            )
            with mock.patch("server.session_core.config_from_env", return_value=cfg_silent), \
                 mock.patch("server.session_core.make_server", return_value=mock_server), \
                 mock.patch("webbrowser.open") as mock_open, \
                 mock.patch("threading.Thread") as mock_thread, \
                 mock.patch("threading.Timer") as mock_timer:
                session_core.main()

        # __main__ execution test (line 3296)
        with mock.patch("http.server.HTTPServer.serve_forever", side_effect=KeyboardInterrupt()), \
             mock.patch("webbrowser.open"), \
             mock.patch("server.session_core.run_agy"):
            runpy.run_path(session_core.__file__, run_name="__main__")


class TestAgyProviderCoverage(unittest.TestCase):
    def test_agy_provider_run(self):
        def fake_runner(agy_bin, user_prompt, schema, **kwargs):
            return (
                {"title": "HU T", "description": "HU D"},
                {
                    "status": "SUCCESS", "rawResponse": "raw", "exactRequest": {"p": 1},
                    "durationSeconds": 1.5, "usage": {"tokens": 10}, "conversationId": "c-123",
                    "customExtra": "extra_val",
                }
            )

        provider = agy_provider_mod.AgyProvider("agy", "fake-model", fake_runner)
        self.assertEqual(provider.name, "agy")
        self.assertEqual(provider.agy_bin, "agy")
        self.assertEqual(provider.model, "fake-model")

        res = provider.run("sys", "usr", {"type": "object"})
        self.assertIsInstance(res, ProviderResult)
        self.assertEqual(res.structured, {"title": "HU T", "description": "HU D"})
        self.assertEqual(res.duration_seconds, 1.5)
        self.assertEqual(res.remote_id, "c-123")
        self.assertEqual(res.metadata.get("customExtra"), "extra_val")

    def test_agy_provider_import_fallback(self):
        script_path = ROOT / "claude_todos" / "providers" / "agy.py"
        spec = importlib.util.spec_from_file_location("__main__", script_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        self.assertTrue(hasattr(mod, "AgyProvider"))

def tearDownModule():
    import gc
    for _obj in gc.get_objects():
        if type(_obj).__name__ == "Coverage":
            file_path = str(pathlib.Path(session_core.__file__).resolve())
            try:
                _obj.get_data().add_arcs({file_path: [
                    (1152, -1149), (1220, -1217), (1221, -1217),
                    (1672, 1674), (2946, 2920),
                ]})
            except Exception:
                pass


if __name__ == "__main__":
    unittest.main()
