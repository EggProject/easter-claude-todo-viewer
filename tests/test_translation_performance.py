import json
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

import server.session_core as core
from server.multi_runtime import DaemonConfig, MultiSessionRuntime


class TranslationPerformanceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.base = pathlib.Path(self.tmp.name)
        self.ch = self.base / "claude"
        self.projects = self.ch / "projects"
        self.tasks = self.ch / "tasks"
        self.tasks.mkdir(parents=True)
        self.cache = self.base / "cache"
        self.cache.mkdir(parents=True)
        self.logs = self.base / "logs"
        self.logs.mkdir(parents=True)
        self.settings_file = self.base / "config.json"
        self.app_state_file = self.base / "app-state.json"

        self.project_a = self.projects / "-a"
        self.project_a.mkdir(parents=True)
        self.write_session_file(self.project_a, "sess-a", "/work/a", "2026-09-05T10:00:00+00:00")

        self.cfg = DaemonConfig(
            claude_home=self.ch,
            cache_root=self.cache,
            settings_file=self.settings_file,
            app_state_file=self.app_state_file,
            log_root=self.logs,
            client_origins=["http://127.0.0.1:8766"],
            version="4.1.2",
            port=8765,
        )
        self.rt = None

    def tearDown(self):
        if self.rt:
            self.rt.close()
        self.tmp.cleanup()

    def write_session_file(self, pdir, sid, cwd, ts):
        payload = {
            "timestamp": ts,
            "sessionId": sid,
            "cwd": cwd,
            "type": "user",
            "message": {"content": "Initial prompt"},
        }
        (pdir / f"{sid}.jsonl").write_text(json.dumps(payload) + "\n", encoding="utf-8")

    def _setup_session_data(self):
        # Live task directory for sess-a
        task_dir = self.tasks / "sess-a"
        task_dir.mkdir(parents=True, exist_ok=True)
        task_data = {
            "id": "1",
            "subject": "Translate heading",
            "description": "Detailed description of task",
            "status": "pending",
            "blockedBy": [],
            "blocks": [],
        }
        (task_dir / "1.json").write_text(json.dumps(task_data), encoding="utf-8")

        # Cache session directory
        pkey = core.project_key("/work/a")
        sess_dir = self.cache / "projects" / pkey / "sessions" / "sess-a"
        sess_dir.mkdir(parents=True, exist_ok=True)

        cached_task_dir = sess_dir / "tasks" / "sess-a" / "1"
        cached_task_dir.mkdir(parents=True, exist_ok=True)
        cached_task_payload = {
            "uid": "sess-a:1",
            "storeId": "sess-a",
            "taskId": "1",
            "viewLanguage": "hu",
            "languagePreference": "hu",
            "current": {
                "textFingerprint": "fp1",
                "task": task_data,
            },
            "sourceVersions": {
                "fp1": {
                    "firstObservedAt": "2026-09-05T10:00:00+00:00",
                    "subject": "Translate heading",
                    "description": "Detailed description of task",
                }
            },
            "translations": {
                "hu": {
                    "fp1": {
                        "validated": True,
                        "title": "Cimforditas",
                        "description": "Reszletes leiras",
                    }
                }
            },
            "present": True,
        }
        (cached_task_dir / "task.json").write_text(json.dumps(cached_task_payload), encoding="utf-8")

        self.large_raw = "RAW RESPONSE DEBUG PAYLOAD " * 500
        self.large_prompt = "EXACT PROMPT SENT TO LLM " * 500

        jobs_dir = sess_dir / "translation-jobs"
        jobs_dir.mkdir(parents=True, exist_ok=True)
        job_payload = {
            "id": "job-101",
            "sessionId": "sess-a",
            "uid": "sess-a:1",
            "taskId": "1",
            "textFingerprint": "fp1",
            "status": "success",
            "phase": "success",
            "versionNumber": 1,
            "current": True,
            "provider": "agy",
            "model": "omlx-medium",
            "trigger": "manual",
            "attempt": 1,
            "maxAttempts": 2,
            "queuedAt": "2026-09-05T10:00:00+00:00",
            "startedAt": "2026-09-05T10:00:01+00:00",
            "finishedAt": "2026-09-05T10:00:05+00:00",
            "durationSeconds": 4.0,
            "totalTokens": 350,
            "error": None,
            "rawResponse": self.large_raw,
            "exactPrompt": self.large_prompt,
            "rawStream": "chunk-1\nchunk-2",
            "attempts": [
                {
                    "attempt": 1,
                    "translator": {
                        "status": "SUCCESS",
                        "conversationId": "conv-1",
                        "durationSeconds": 2.5,
                        "usage": {"total_tokens": 200},
                        "model": "omlx-medium",
                        "agent": "translator",
                        "provider": "agy",
                        "exactPrompt": self.large_prompt,
                        "rawResponse": self.large_raw,
                    },
                    "validator": {
                        "status": "SUCCESS",
                        "conversationId": "conv-2",
                        "durationSeconds": 1.5,
                        "usage": {"total_tokens": 150},
                        "model": "omlx-medium",
                        "agent": "validator",
                        "provider": "agy",
                        "exactPrompt": self.large_prompt,
                        "rawResponse": self.large_raw,
                    },
                    "issues": [],
                }
            ],
            "runs": [
                {
                    "run": 1,
                    "status": "success",
                    "rawResponse": self.large_raw,
                    "exactPrompt": self.large_prompt,
                }
            ],
        }
        (jobs_dir / "job-101.json").write_text(json.dumps(job_payload), encoding="utf-8")

        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        return sess_dir

    def test_translation_catalog_produces_lightweight_records(self):
        self._setup_session_data()

        catalog = self.rt.translation_catalog()
        self.assertIn("tasks", catalog)
        tasks = catalog["tasks"]
        self.assertTrue(len(tasks) >= 1)

        parent = next((t for t in tasks if t.get("uid") == "sess-a:1"), None)
        self.assertIsNotNone(parent)
        self.assertEqual(parent.get("kind"), "task")
        self.assertEqual(parent.get("taskId"), "1")
        self.assertEqual(parent.get("versionCount"), 1)

        children = parent.get("children") or []
        self.assertEqual(len(children), 1)
        version_row = children[0]

        # Large debug payloads must be omitted from catalog version rows
        self.assertNotIn("rawResponse", version_row)
        self.assertNotIn("exactPrompt", version_row)

        if "attempts" in version_row:
            for att in version_row.get("attempts") or []:
                for phase in ("translator", "validator"):
                    sub = att.get(phase)
                    if isinstance(sub, dict):
                        self.assertNotIn("rawResponse", sub)
                        self.assertNotIn("exactPrompt", sub)

        if "runs" in version_row:
            for run in version_row.get("runs") or []:
                if isinstance(run, dict):
                    self.assertNotIn("rawResponse", run)
                    self.assertNotIn("exactPrompt", run)

        # Required metadata must be retained
        required_fields = (
            "id",
            "sessionId",
            "uid",
            "taskId",
            "status",
            "versionNumber",
            "current",
            "provider",
            "model",
            "trigger",
            "attempt",
            "maxAttempts",
            "queuedAt",
            "startedAt",
            "finishedAt",
            "durationSeconds",
            "totalTokens",
            "error",
        )
        for field in required_fields:
            self.assertIn(field, version_row, f"Field '{field}' should be present in catalog version row")

        self.assertEqual(version_row["id"], "job-101")
        self.assertEqual(version_row["sessionId"], "sess-a")
        self.assertEqual(version_row["uid"], "sess-a:1")
        self.assertEqual(version_row["taskId"], "1")
        self.assertEqual(version_row["status"], "success")
        self.assertEqual(version_row["versionNumber"], 1)
        self.assertTrue(version_row["current"])
        self.assertEqual(version_row["provider"], "agy")
        self.assertEqual(version_row["model"], "omlx-medium")
        self.assertEqual(version_row["trigger"], "manual")
        self.assertEqual(version_row["attempt"], 1)
        self.assertEqual(version_row["maxAttempts"], 2)
        self.assertEqual(version_row["queuedAt"], "2026-09-05T10:00:00+00:00")
        self.assertEqual(version_row["startedAt"], "2026-09-05T10:00:01+00:00")
        self.assertEqual(version_row["finishedAt"], "2026-09-05T10:00:05+00:00")
        self.assertEqual(version_row["durationSeconds"], 4.0)
        self.assertEqual(version_row["totalTokens"], 350)
        self.assertIsNone(version_row["error"])

    def test_translation_catalog_uses_caching_unless_invalidated(self):
        sess_dir = self._setup_session_data()
        self.rt.children.pop("sess-a", None)

        # Initial call populates the catalog cache
        first_call = self.rt.translation_catalog()
        self.assertIn("tasks", first_call)
        self.assertTrue(len(first_call["tasks"]) >= 1)
        task_in_first = next(t for t in first_call["tasks"] if t.get("uid") == "sess-a:1")
        initial_title = task_in_first.get("title")

        # Modify disk json directly behind the scenes without invalidating cache
        task_file = next(sess_dir.glob("tasks/*/*/task.json"))
        modified_payload = json.loads(task_file.read_text(encoding="utf-8"))
        modified_payload["current"]["task"]["subject"] = "DIRECT DISK MODIFICATION WITHOUT INVALIDATION"
        task_file.write_text(json.dumps(modified_payload), encoding="utf-8")

        # Subsequent call must use cache so it does not rescan or reload disk json
        second_call = self.rt.translation_catalog()
        self.assertEqual(first_call, second_call)
        task_in_second = next(t for t in second_call["tasks"] if t.get("uid") == "sess-a:1")
        self.assertEqual(task_in_second.get("title"), initial_title)

        # Invalidation must cause subsequent call to reload disk json
        if hasattr(self.rt, "invalidate_translation_catalog"):
            self.rt.invalidate_translation_catalog("sess-a")
        elif hasattr(self.rt, "invalidate_session_stats"):
            self.rt.invalidate_session_stats("sess-a")

        third_call = self.rt.translation_catalog()
        self.assertIn("tasks", third_call)
        task_in_third = next(t for t in third_call["tasks"] if t.get("uid") == "sess-a:1")
        self.assertEqual(task_in_third.get("title"), "DIRECT DISK MODIFICATION WITHOUT INVALIDATION")

    def test_translation_job_returns_complete_payload_for_deep_inspection(self):
        self._setup_session_data()

        job = self.rt.translation_job("sess-a", "job-101")
        self.assertIsNotNone(job)
        self.assertEqual(job.get("id"), "job-101")
        self.assertEqual(job.get("sessionId"), "sess-a")

        # Complete debug payloads must be retained for deep inspection
        self.assertIn("rawResponse", job)
        self.assertEqual(job["rawResponse"], self.large_raw)

        self.assertIn("exactPrompt", job)
        self.assertEqual(job["exactPrompt"], self.large_prompt)

        self.assertIn("attempts", job)
        attempts = job["attempts"]
        self.assertEqual(len(attempts), 1)
        translator = attempts[0].get("translator") or {}
        self.assertEqual(translator.get("rawResponse"), self.large_raw)
        self.assertEqual(translator.get("exactPrompt"), self.large_prompt)

        self.assertIn("runs", job)
        runs = job["runs"]
        self.assertEqual(len(runs), 1)
        self.assertEqual(runs[0].get("rawResponse"), self.large_raw)
        self.assertEqual(runs[0].get("exactPrompt"), self.large_prompt)

    def test_translations_returns_lightweight_records(self):
        self._setup_session_data()

        jobs = self.rt.translations()
        self.assertTrue(len(jobs) >= 1)
        job = next((j for j in jobs if j.get("id") == "job-101"), None)
        self.assertIsNotNone(job)
        self.assertEqual(job.get("sessionId"), "sess-a")

        # Each job record must omit raw debug payloads
        self.assertNotIn("rawResponse", job)
        self.assertNotIn("exactPrompt", job)
        self.assertNotIn("rawStream", job)

        # Attempts and runs must not serialize raw LLM traces
        if "attempts" in job:
            for att in job.get("attempts") or []:
                for phase in ("translator", "validator"):
                    sub = att.get(phase)
                    if isinstance(sub, dict):
                        self.assertNotIn("rawResponse", sub)
                        self.assertNotIn("exactPrompt", sub)
                        self.assertNotIn("rawStream", sub)

        if "runs" in job:
            for run in job.get("runs") or []:
                if isinstance(run, dict):
                    self.assertNotIn("rawResponse", run)
                    self.assertNotIn("exactPrompt", run)
                    self.assertNotIn("rawStream", run)

        # The payload size must be compact and not serialize raw LLM traces
        serialized = json.dumps(jobs)
        self.assertNotIn(self.large_raw, serialized)
        self.assertNotIn(self.large_prompt, serialized)
        self.assertLess(len(serialized), len(self.large_raw))

    def test_compute_job_total_tokens(self):
        # 1. Top-level totalTokens as number
        job_top_tokens = {"totalTokens": 150}
        self.assertEqual(core.compute_job_total_tokens(job_top_tokens), 150)

        # 2. total_tokens as number
        job_snake_tokens = {"total_tokens": 250}
        self.assertEqual(core.compute_job_total_tokens(job_snake_tokens), 250)

        # 3. Attempt usage with total_tokens and attempt usage with totalTokens
        job_attempts = {
            "attempts": [
                {
                    "translator": {"usage": {"total_tokens": 80}},
                    "validator": {"usage": {"totalTokens": 45}},
                }
            ]
        }
        self.assertEqual(core.compute_job_total_tokens(job_attempts), 125)

        # 4. Historical run attempt usage with tokens
        job_runs = {
            "attempts": [
                {"translator": {"usage": {"total_tokens": 50}}}
            ],
            "runs": [
                {
                    "attempts": [
                        {
                            "translator": {"usage": {"totalTokens": 70}},
                            "validator": {"usage": {"total_tokens": 30}},
                        }
                    ]
                }
            ],
        }
        self.assertEqual(core.compute_job_total_tokens(job_runs), 150)

        # Edge cases: None or empty dictionary
        self.assertEqual(core.compute_job_total_tokens(None), 0)
        self.assertEqual(core.compute_job_total_tokens({}), 0)

    def test_clean_run_snapshots(self):
        # Runs containing attempts with translator and validator having debug fields
        runs = [
            {
                "run": 1,
                "status": "success",
                "rawResponse": "run-raw",
                "exactPrompt": "run-prompt",
                "agentInstructions": "run-instruct",
                "rawStream": "run-stream",
                "keepMe": 42,
                "attempts": [
                    {
                        "attempt": 1,
                        "translator": {
                            "rawResponse": "trans-raw",
                            "exactPrompt": "trans-prompt",
                            "agentInstructions": "trans-instruct",
                            "rawStream": "trans-stream",
                            "model": "omlx",
                        },
                        "validator": {
                            "rawResponse": "val-raw",
                            "exactPrompt": "val-prompt",
                            "agentInstructions": "val-instruct",
                            "rawStream": "val-stream",
                            "valid": True,
                        },
                        "otherField": "kept",
                    }
                ],
            },
            {
                "run": 2,
                "status": "failed",
                "rawResponse": "strip-this",
                "agentInstructions": "strip-this-too",
                "keepRun": True,
            },
        ]
        cleaned = core.clean_run_snapshots(runs)
        self.assertEqual(len(cleaned), 2)
        # Run 1 checks
        self.assertEqual(cleaned[0]["keepMe"], 42)
        for field in ("rawResponse", "exactPrompt", "agentInstructions", "rawStream"):
            self.assertNotIn(field, cleaned[0])
            self.assertNotIn(field, cleaned[0]["attempts"][0]["translator"])
            self.assertNotIn(field, cleaned[0]["attempts"][0]["validator"])
        self.assertEqual(cleaned[0]["attempts"][0]["translator"]["model"], "omlx")
        self.assertEqual(cleaned[0]["attempts"][0]["validator"]["valid"], True)
        self.assertEqual(cleaned[0]["attempts"][0]["otherField"], "kept")

        # Run 2 checks (without attempts)
        self.assertTrue(cleaned[1]["keepRun"])
        self.assertEqual(cleaned[1]["status"], "failed")
        for field in ("rawResponse", "exactPrompt", "agentInstructions", "rawStream"):
            self.assertNotIn(field, cleaned[1])

        # None / empty checks
        self.assertEqual(core.clean_run_snapshots(None), [])
        self.assertEqual(core.clean_run_snapshots([]), [])

    def test_dashboard_runtime_translation_catalog(self):
        self._setup_session_data()
        dash_rt = self.rt.get_runtime("sess-a")

        # Task 1: current.textFingerprint matching job, with valid translations
        rec1 = {
            "uid": "sess-a:1",
            "storeId": "sess-a",
            "taskId": "1",
            "present": True,
            "current": {
                "textFingerprint": "fp1",
                "task": {"subject": "Task One", "status": "pending"},
            },
            "sourceVersions": {
                "fp1": {
                    "firstObservedAt": "2026-09-05T10:00:00+00:00",
                    "subject": "Task One",
                    "description": "Desc 1",
                }
            },
            "translations": {
                "hu": {
                    "fp1": {
                        "validated": True,
                        "translationPromptVersion": core.TRANSLATION_PROMPT_VERSION,
                        "validationPromptVersion": core.VALIDATION_PROMPT_VERSION,
                        "title": "Feladat Egy",
                        "description": "Leiras 1",
                    }
                }
            },
        }

        # Task 2: current.textFingerprint not matching job, without translations
        rec2 = {
            "uid": "sess-a:2",
            "storeId": "sess-a",
            "taskId": "2",
            "present": True,
            "current": {
                "textFingerprint": "fp-new",
                "task": {"subject": "Task Two", "status": "in_progress"},
            },
            "sourceVersions": {
                "fp-old": {
                    "firstObservedAt": "2026-09-05T09:00:00+00:00",
                    "subject": "Task Two (Old)",
                    "description": "Desc 2 old",
                },
                "fp-new": {
                    "firstObservedAt": "2026-09-05T10:00:00+00:00",
                    "subject": "Task Two",
                    "description": "Desc 2",
                },
            },
            "translations": {},
        }

        dash_rt.store.records = {"sess-a:1": rec1, "sess-a:2": rec2}

        dash_rt.store.job_manager.jobs = {
            "job-101": {
                "id": "job-101",
                "uid": "sess-a:1",
                "textFingerprint": "fp1",
                "status": "success",
                "totalTokens": 100,
                "durationSeconds": 2.0,
            },
            "job-102": {
                "id": "job-102",
                "uid": "sess-a:2",
                "textFingerprint": "fp-old",
                "status": "success",
                "startedAt": "2026-09-05T10:00:00+00:00",
                "finishedAt": "2026-09-05T10:00:03+00:00",
            },
        }

        catalog = dash_rt.translation_catalog()
        self.assertIn("tasks", catalog)
        tasks = {t["taskId"]: t for t in catalog["tasks"]}

        # Task 1: matching textFingerprint and with valid translation
        t1 = tasks["1"]
        self.assertEqual(t1["title"], "Task One")
        self.assertEqual(t1["translationState"], "ready")
        self.assertEqual(len(t1["children"]), 1)
        self.assertTrue(t1["children"][0]["current"])
        self.assertEqual(t1["children"][0]["durationSeconds"], 2.0)

        # Task 2: not matching textFingerprint and without translation
        t2 = tasks["2"]
        self.assertEqual(t2["title"], "Task Two")
        self.assertEqual(t2["translationState"], "missing")
        self.assertEqual(len(t2["children"]), 1)
        self.assertFalse(t2["children"][0]["current"])
        self.assertEqual(3.0, t2["children"][0]["durationSeconds"])

    def test_multi_runtime_catalog_cache_invalidation_and_job_cancel(self):
        self._setup_session_data()

        # Initial call populates _catalog_cache
        self.rt.translation_catalog()
        self.assertIn("sess-a", self.rt._catalog_cache)

        # Invalidate session stats for specific session
        self.rt.invalidate_session_stats("sess-a")
        self.assertNotIn("sess-a", self.rt._catalog_cache)

        # Re-populate and invalidate all stats (session_id=None)
        self.rt.translation_catalog()
        self.assertIn("sess-a", self.rt._catalog_cache)
        self.rt.invalidate_session_stats(None)
        self.assertEqual(len(self.rt._catalog_cache), 0)

        # Re-populate and test cancel_translation_job invalidates cache
        self.rt.translation_catalog()
        self.assertIn("sess-a", self.rt._catalog_cache)

        child = self.rt.get_runtime("sess-a")
        with mock.patch.object(child, "cancel_translation_job", return_value={"status": "canceled"}):
            result = self.rt.cancel_translation_job("sess-a", "job-101")
            self.assertEqual(result, {"status": "canceled"})
            self.assertNotIn("sess-a", self.rt._catalog_cache)

    def test_multi_runtime_get_runtime_branches(self):
        self._setup_session_data()

        # Branch 1: child runtime already exists in self.children
        first = self.rt.get_runtime("sess-a")
        self.assertIn("sess-a", self.rt.children)
        second = self.rt.get_runtime("sess-a")
        self.assertIs(first, second)

        # Branch 2: create=False and runtime does not exist
        del self.rt.children["sess-a"]
        not_created = self.rt.get_runtime("sess-a", create=False)
        self.assertIsNone(not_created)

        # Branch 3: create=True and runtime needs creation
        created = self.rt.get_runtime("sess-a", create=True)
        self.assertIsNotNone(created)
        self.assertIn("sess-a", self.rt.children)

        # Branch 4: unknown session raises KeyError
        with self.assertRaises(KeyError):
            self.rt.get_runtime("unknown-session-id")

    def test_job_manager_update_cancel_and_bulk_delete_branches(self):
        self._setup_session_data()
        dash_rt = self.rt.get_runtime("sess-a")
        job_manager = dash_rt.store.job_manager

        # job_manager.update('non-existent-id', status='success') -> asserts None (covers line 1189)
        self.assertIsNone(job_manager.update("non-existent-id", status="success"))

        # job_manager.cancel('non-existent-id') -> asserts raises KeyError (covers line 1257)
        with self.assertRaises(KeyError):
            job_manager.cancel("non-existent-id")

        # Create a job, finish it with status 'success' (terminal), call job_manager.cancel(job_id) -> asserts returns terminal copy (covers line 1258)
        handle = job_manager.create("sess-a:1", "fp1", "omlx-medium", "manual")
        finished = job_manager.finish(handle.job_id, "success")
        self.assertEqual(finished["status"], "success")
        cancelled_copy = job_manager.cancel(handle.job_id)
        self.assertEqual(cancelled_copy["id"], handle.job_id)
        self.assertEqual(cancelled_copy["status"], "success")

        # Call bulk_translation_action('delete', ...) with an active job -> asserts summary['skippedActive'] == 1 (covers line 3012-3014)
        active_handle = job_manager.create("sess-a:1", "fp1", "omlx-medium", "manual")
        summary = dash_rt.bulk_translation_action("delete", [active_handle.job_id])
        self.assertEqual(summary["skippedActive"], 1)

        multi_summary = self.rt.bulk_translation_action(
            "delete", [{"jobId": active_handle.job_id, "sessionId": "sess-a"}]
        )
        self.assertEqual(multi_summary["skippedActive"], 1)

    def test_multi_runtime_translation_loop_empty_session_id(self):
        self._setup_session_data()
        rt = self.rt
        while not rt.translation_requests.empty():
            try:
                rt.translation_requests.get_nowait()
                rt.translation_requests.task_done()
            except queue.Empty:
                break

        rt.translation_requests.put({"kind": "test", "sessionId": ""})
        rt.translation_requests.put({"kind": "test"})

        with mock.patch.object(rt, "get_runtime") as mock_get_runtime:
            worker = threading.Thread(target=rt.translation_loop, daemon=True)
            worker.start()
            try:
                rt.translation_requests.join()
                rt.stop_event.set()
                worker.join(timeout=2.0)
                mock_get_runtime.assert_not_called()
            finally:
                rt.stop_event.set()
                if worker.is_alive():
                    worker.join(timeout=2.0)

        self.assertEqual(rt.translation_requests.qsize(), 0)

    def test_translation_catalog_iso_fallback_duration(self):
        self._setup_session_data()
        dash_rt = self.rt.get_runtime("sess-a")

        rec = {
            "uid": "sess-a:1",
            "storeId": "sess-a",
            "taskId": "1",
            "present": True,
            "current": {
                "textFingerprint": "fp1",
                "task": {"subject": "Task 1", "status": "pending"},
            },
            "sourceVersions": {
                "fp1": {
                    "firstObservedAt": "2026-09-01T10:00:00+00:00",
                    "subject": "Task 1",
                    "description": "Desc 1",
                }
            },
            "translations": {},
        }
        dash_rt.store.records = {"sess-a:1": rec}

        dash_rt.store.job_manager.jobs = {
            "job-iso": {
                "id": "job-iso",
                "uid": "sess-a:1",
                "textFingerprint": "fp1",
                "status": "success",
                "durationSeconds": None,
                "startedAt": "2026-09-01T10:00:00+00:00",
                "finishedAt": "2026-09-01T10:00:15+00:00",
            },
            "job-iso-invalid": {
                "id": "job-iso-invalid",
                "uid": "sess-a:1",
                "textFingerprint": "fp1",
                "status": "error",
                "durationSeconds": None,
                "startedAt": "invalid-timestamp",
                "finishedAt": "2026-09-01T10:00:15+00:00",
            },
        }

        catalog = dash_rt.translation_catalog()
        self.assertIn("tasks", catalog)
        tasks = catalog["tasks"]
        self.assertEqual(len(tasks), 1)

        children_by_id = {c["id"]: c for c in tasks[0]["children"]}
        child = children_by_id["job-iso"]
        self.assertEqual(child.get("durationSeconds"), 15.0)

        invalid_child = children_by_id["job-iso-invalid"]
        self.assertIsNone(invalid_child.get("durationSeconds"))


if __name__ == "__main__":
    unittest.main()
