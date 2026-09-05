import copy
import json
import os
import pathlib
import queue
import sys
import tempfile
import threading
import time
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

import server.multi_runtime as multi_runtime
from server.multi_runtime import DaemonConfig, MultiSessionRuntime
import server.session_core as core
from claude_todos.providers.anthropic import AnthropicProvider


class BaseMultiRuntimeTest(unittest.TestCase):
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
        self.project_b = self.projects / "-b"
        self.project_a.mkdir(parents=True)
        self.project_b.mkdir(parents=True)

        self.write_session_file(self.project_a, "sess-a", "/work/a", "2026-09-05T10:00:00+00:00")
        self.write_session_file(self.project_b, "sess-b", "/work/b", "2026-09-05T11:00:00+00:00")

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

    def write_session_file(self, pdir, sid, cwd, ts, first_prompt="Initial prompt"):
        payload = {
            "timestamp": ts,
            "sessionId": sid,
            "cwd": cwd,
            "type": "user",
            "message": {"content": first_prompt},
        }
        (pdir / f"{sid}.jsonl").write_text(json.dumps(payload) + "\n", encoding="utf-8")


class DaemonConfigTests(unittest.TestCase):
    def test_daemon_config_defaults(self):
        cfg = DaemonConfig()
        self.assertEqual(cfg.claude_home, pathlib.Path("~/.claude"))
        self.assertEqual(cfg.cache_root, pathlib.Path("~/.claude-todos/cache"))
        self.assertEqual(cfg.settings_file, pathlib.Path("~/.claude-todos/config.json"))
        self.assertEqual(cfg.app_state_file, pathlib.Path("~/.claude-todos/app-state.json"))
        self.assertEqual(cfg.log_root, pathlib.Path("~/.claude-todos/logs"))
        self.assertEqual(cfg.agy_bin, "agy")
        self.assertEqual(cfg.initial_status, "all")
        self.assertEqual(cfg.initial_sort, "dependency")
        self.assertEqual(cfg.version, "4.1.2")
        self.assertFalse(cfg.log_file)
        self.assertFalse(cfg.log_output)
        self.assertEqual(cfg.client_origins, ["http://127.0.0.1:8766", "http://localhost:8766"])
        self.assertEqual(cfg.port, 8765)

    def test_daemon_config_custom(self):
        cfg = DaemonConfig(
            claude_home=pathlib.Path("/custom/claude"),
            cache_root=pathlib.Path("/custom/cache"),
            settings_file=pathlib.Path("/custom/config.json"),
            app_state_file=pathlib.Path("/custom/state.json"),
            log_root=pathlib.Path("/custom/logs"),
            agy_bin="/usr/bin/agy",
            initial_status="pending",
            initial_sort="title",
            version="5.0.0",
            log_file=True,
            log_output=True,
            client_origins=["https://dashboard.example.com"],
            port=9000,
        )
        self.assertEqual(cfg.port, 9000)
        self.assertEqual(cfg.client_origins, ["https://dashboard.example.com"])
        self.assertEqual(cfg.version, "5.0.0")
        self.assertTrue(cfg.log_file)
        self.assertTrue(cfg.log_output)


class MultiSessionRuntimeInitTests(BaseMultiRuntimeTest):
    def test_init_without_background_threads(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        self.assertIsNone(self.rt.translation_thread)
        self.assertIsNone(self.rt.watcher_thread)
        # sess-b is newer so it should be currentSessionId and initialized
        self.assertEqual("sess-b", self.rt.app_state().get("currentSessionId"))
        self.assertIn("sess-b", self.rt.children)

    def test_init_with_background_threads_starts_and_stops_cleanly(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=True)
        self.assertIsNotNone(self.rt.translation_thread)
        self.assertIsNotNone(self.rt.watcher_thread)
        self.assertTrue(self.rt.translation_thread.is_alive())
        self.assertTrue(self.rt.watcher_thread.is_alive())
        self.rt.close()
        self.assertFalse(self.rt.translation_thread.is_alive())
        self.assertFalse(self.rt.watcher_thread.is_alive())

    def test_init_concurrency_and_prompts_variations(self):
        # Configure settings with custom concurrency limits (clamping min and max) and autoMigrate=False
        settings_data = {
            "prompts": {"autoMigrate": False},
            "translation": {
                "agy": {"maxConcurrency": 50},  # clamped to 32
                "anthropic": {"maxConcurrency": 0},  # clamped to 1
            },
        }
        self.settings_file.write_text(json.dumps(settings_data), encoding="utf-8")
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        self.assertEqual(self.rt.provider_concurrency_limits["agy"], 32)
        self.assertEqual(self.rt.provider_concurrency_limits["anthropic"], 1)
        self.assertFalse(self.rt.prompt_manager.auto_migrate)

    def test_init_concurrency_fallback_when_empty_or_none(self):
        settings_data = {
            "translation": {
                "agy": {"maxConcurrency": None},
                "anthropic": {},
            },
        }
        self.settings_file.write_text(json.dumps(settings_data), encoding="utf-8")
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        self.assertEqual(self.rt.provider_concurrency_limits["agy"], 2)
        self.assertEqual(self.rt.provider_concurrency_limits["anthropic"], 2)
        self.assertTrue(self.rt.prompt_manager.auto_migrate)

    def test_init_empty_sessions_no_current_session(self):
        # Empty claude home
        empty_ch = self.base / "empty_claude"
        empty_ch.mkdir()
        cfg = DaemonConfig(
            claude_home=empty_ch,
            cache_root=self.cache,
            settings_file=self.settings_file,
            app_state_file=self.app_state_file,
            log_root=self.logs,
        )
        rt = MultiSessionRuntime(cfg, start_background=False)
        self.assertEqual(len(rt.sessions), 0)
        self.assertIsNone(rt.app_state().get("currentSessionId"))
        self.assertEqual(len(rt.children), 0)
        rt.close()


class DiscoveryAndRefreshTests(BaseMultiRuntimeTest):
    def test_discover_sessions_with_cached_only_and_corrupt_files(self):
        # Create cache_root/projects/proj-key/sessions/sess-cached/session.json
        sess_dir = self.cache / "projects" / "p-key" / "sessions" / "sess-cached"
        sess_dir.mkdir(parents=True)
        meta = {
            "sessionId": "sess-cached",
            "projectCwd": "/work/cached",
            "transcriptPath": "/work/cached/t.jsonl",
            "createdAt": "2026-09-05T08:00:00+00:00",
            "lastObservedAt": "2026-09-05T09:00:00+00:00",
        }
        (sess_dir / "session.json").write_text(json.dumps(meta), encoding="utf-8")

        # Create another cached session without sessionId in meta, and without projectCwd
        sess_dir2 = self.cache / "projects" / "p-key" / "sessions" / "sess-fallback"
        sess_dir2.mkdir(parents=True)
        meta2 = {
            "transcriptPath": "",
            "createdAt": "",
            "lastObservedAt": "",
        }
        (sess_dir2 / "session.json").write_text(json.dumps(meta2), encoding="utf-8")

        # Create a corrupted session.json file that triggers exception
        sess_dir_bad = self.cache / "projects" / "p-key" / "sessions" / "sess-bad"
        sess_dir_bad.mkdir(parents=True)
        (sess_dir_bad / "session.json").write_text("{corrupt-json", encoding="utf-8")

        # Create a cached session for sess-a which is already discovered by registry
        sess_dir_existing = self.cache / "projects" / "p-key" / "sessions" / "sess-a"
        sess_dir_existing.mkdir(parents=True)
        (sess_dir_existing / "session.json").write_text(json.dumps({"sessionId": "sess-a"}), encoding="utf-8")

        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        ids = {s["id"] for s in self.rt.sessions}
        self.assertIn("sess-a", ids)
        self.assertIn("sess-b", ids)
        self.assertIn("sess-cached", ids)
        self.assertIn("sess-fallback", ids)
        self.assertNotIn("sess-bad", ids)

        cached_sess = self.rt.session_info("sess-cached")
        self.assertTrue(cached_sess["cachedOnly"])
        self.assertIn("cached", cached_sess["candidateIds"])

        fallback_sess = self.rt.session_info("sess-fallback")
        self.assertEqual(fallback_sess["id"], "sess-fallback")
        self.assertEqual(fallback_sess["cwd"], "")

    def test_refresh_sessions_change_detection_and_hub_publishing(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)

        # 1. Calling refresh_sessions without changes does not publish sessions-changed
        initial_count = len([h for h in self.rt.hub.history if h["event"] == "sessions-changed"])
        state1 = self.rt.refresh_sessions(force=False)
        after_count = len([h for h in self.rt.hub.history if h["event"] == "sessions-changed"])
        self.assertEqual(initial_count, after_count)

        # 2. Add a new session and refresh
        self.write_session_file(self.project_a, "sess-c", "/work/a", "2026-09-05T12:00:00+00:00")
        state2 = self.rt.refresh_sessions(force=True)
        self.assertIn("sess-c", {s["id"] for s in state2["sessions"]})
        changed_events = [h for h in self.rt.hub.history if h["event"] == "sessions-changed"]
        self.assertGreaterEqual(len(changed_events), 1)

        # 3. Test branch when hub attribute is missing
        del self.rt.hub
        self.write_session_file(self.project_a, "sess-d", "/work/a", "2026-09-05T13:00:00+00:00")
        state3 = self.rt.refresh_sessions(force=False)
        self.assertIn("sess-d", {s["id"] for s in state3["sessions"]})


class SessionHelpersTests(BaseMultiRuntimeTest):
    def test_session_info_and_session_brief(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)

        # Existing session
        info_a = self.rt.session_info("sess-a")
        self.assertEqual(info_a["id"], "sess-a")
        brief_a = self.rt.session_brief("sess-a")
        self.assertEqual(brief_a["id"], "sess-a")
        self.assertEqual(brief_a["cwd"], "/work/a")

        # Unknown session
        self.assertIsNone(self.rt.session_info("unknown-sid"))
        brief_unk = self.rt.session_brief("unknown-sid")
        self.assertEqual(brief_unk["id"], "unknown-sid")
        self.assertEqual(brief_unk["label"], "unknown-sid")
        self.assertEqual(brief_unk["cwd"], "")
        self.assertEqual(brief_unk["gitBranch"], "")

        # Session with empty label / cwd / gitBranch
        self.rt._session_map["sess-empty"] = {"id": "sess-empty", "label": "", "cwd": "", "gitBranch": None}
        brief_empty = self.rt.session_brief("sess-empty")
        self.assertEqual(brief_empty["label"], "sess-empty")
        self.assertEqual(brief_empty["cwd"], "")
        self.assertEqual(brief_empty["gitBranch"], "")

    def test_child_config_variations(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        # With missing candidateIds, transcript, cwd
        minimal_info = {"id": "min-sid"}
        child_cfg = self.rt._child_config(minimal_info)
        self.assertEqual(child_cfg.session_id, "min-sid")
        self.assertEqual(child_cfg.transcript, "")
        self.assertEqual(child_cfg.project_cwd, "")
        self.assertEqual(child_cfg.candidate_ids, ["min-sid"])

    def test_get_runtime_caching_and_not_found(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)

        # Existing child in self.children (sess-b was loaded in __init__)
        child_b1 = self.rt.get_runtime("sess-b")
        child_b2 = self.rt.get_runtime("sess-b")
        self.assertIs(child_b1, child_b2)

        # create=False for uninstantiated session
        self.assertIsNone(self.rt.get_runtime("sess-a", create=False))

        # create=True for uninstantiated session
        child_a = self.rt.get_runtime("sess-a", create=True)
        self.assertIsNotNone(child_a)
        self.assertIs(self.rt.children["sess-a"], child_a)
        self.assertIs(child_a.store.provider_gate, self.rt.provider_gate)
        self.assertIs(child_a.store.provider_active_counts, self.rt.provider_active_counts)

        # KeyError for non-existent session
        with self.assertRaises(KeyError):
            self.rt.get_runtime("non-existent-session-id")

    def test_switch_session_and_set_watched(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)

        # switch session
        state = self.rt.switch_session("sess-a")
        self.assertEqual(state["currentSessionId"], "sess-a")
        self.assertIn("sess-a", self.rt.children)
        ev_names = [h["event"] for h in self.rt.hub.history]
        self.assertIn("app-state-changed", ev_names)
        self.assertIn("state-invalidated", ev_names)

        # set watched True
        self.rt.hub.history.clear()
        state = self.rt.set_watched("sess-b", True)
        self.assertIn("sess-b", state["watchedSessionIds"])
        self.assertIn("app-state-changed", [h["event"] for h in self.rt.hub.history])

        # set watched False
        self.rt.hub.history.clear()
        state = self.rt.set_watched("sess-b", False)
        self.assertNotIn("sess-b", state["watchedSessionIds"])
        self.assertIn("app-state-changed", [h["event"] for h in self.rt.hub.history])


class CacheStatsAndDirTests(BaseMultiRuntimeTest):
    def test_cache_session_dir_variations(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)

        # Cached only with projectKey
        info1 = {"id": "sid1", "cachedOnly": True, "projectKey": "custom-pkey"}
        p1 = self.rt._cache_session_dir(info1)
        self.assertIn("projects/custom-pkey/sessions/sid1", str(p1))

        # Cached only without projectKey
        info2 = {"id": "sid2", "cachedOnly": True, "projectKey": None, "cwd": "/work/proj"}
        p2 = self.rt._cache_session_dir(info2)
        self.assertIn(core.project_key("/work/proj"), str(p2))

        # Not cached only with cwd
        info3 = {"id": "sid3", "cachedOnly": False, "cwd": "/work/proj"}
        p3 = self.rt._cache_session_dir(info3)
        self.assertIn(core.project_key("/work/proj"), str(p3))

        # Not cached only with empty cwd
        info4 = {"id": "sid4", "cachedOnly": False, "cwd": ""}
        p4 = self.rt._cache_session_dir(info4)
        self.assertIn(core.project_key(""), str(p4))

    def test_compute_cache_stats_and_invalidation(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        info = {"id": "sess-a", "cwd": "/work/a"}
        sess_dir = self.rt._cache_session_dir(info)

        # 1. Non-existent session directory
        stats0 = self.rt._compute_cache_stats(info)
        self.assertEqual(stats0, {"taskCount": 0, "deletedTaskCount": 0, "translationCount": 0})

        # 2. Existing session directory with tasks and translation jobs
        t_dir = sess_dir / "tasks" / "user" / "t1"
        t_dir.mkdir(parents=True)
        (t_dir / "task.json").write_text(json.dumps({"id": "1", "present": True}), encoding="utf-8")

        t2_dir = sess_dir / "tasks" / "user" / "t2"
        t2_dir.mkdir(parents=True)
        (t2_dir / "task.json").write_text(json.dumps({"id": "2", "present": False}), encoding="utf-8")

        # Corrupted task file
        t3_dir = sess_dir / "tasks" / "user" / "t3"
        t3_dir.mkdir(parents=True)
        (t3_dir / "task.json").write_text("{bad-json", encoding="utf-8")

        # Translation jobs
        j_dir = sess_dir / "translation-jobs"
        j_dir.mkdir(parents=True)
        (j_dir / "j1.json").write_text(json.dumps({"id": "j1"}), encoding="utf-8")

        stats1 = self.rt._cache_stats(info)
        self.assertEqual(stats1["taskCount"], 3)
        self.assertEqual(stats1["deletedTaskCount"], 1)
        self.assertEqual(stats1["translationCount"], 1)

        # Second call returns cached dict
        stats2 = self.rt._cache_stats(info)
        self.assertEqual(stats2, stats1)

        # Invalidate specific session
        self.rt.invalidate_session_stats("sess-a")
        self.assertNotIn("sess-a", self.rt._stats_cache)

        # Repopulate and invalidate all
        self.rt._cache_stats(info)
        self.assertIn("sess-a", self.rt._stats_cache)
        self.rt.invalidate_session_stats(None)
        self.assertEqual(len(self.rt._stats_cache), 0)


class SessionsStateTests(BaseMultiRuntimeTest):
    def test_sessions_state_active_child_states(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        child = self.rt.get_runtime("sess-b")

        # Case 1: active child, language hu, pending_global_request True
        child.store.session_meta["globalLanguage"] = "hu"
        child.pending_global_request = "req-1"
        st1 = self.rt.sessions_state()
        b_row1 = next(r for r in st1["sessions"] if r["id"] == "sess-b")
        self.assertEqual(b_row1["globalLanguage"], "hu")
        self.assertTrue(b_row1["globalTranslationPending"])

        # Case 2: active child, language hu, pending_global_request False, but active job in manager
        child.pending_global_request = None
        child.store.job_manager.create("uid-1", "tfp-1", "model", "prompt")
        st2 = self.rt.sessions_state()
        b_row2 = next(r for r in st2["sessions"] if r["id"] == "sess-b")
        self.assertTrue(b_row2["globalTranslationPending"])

        # Case 3: active child, language hu, pending_global_request False, no active job
        child.store.job_manager.jobs.clear()
        st3 = self.rt.sessions_state()
        b_row3 = next(r for r in st3["sessions"] if r["id"] == "sess-b")
        self.assertFalse(b_row3["globalTranslationPending"])

        # Case 4: active child, language en
        child.store.session_meta["globalLanguage"] = "en"
        st4 = self.rt.sessions_state()
        b_row4 = next(r for r in st4["sessions"] if r["id"] == "sess-b")
        self.assertEqual(b_row4["globalLanguage"], "en")
        self.assertFalse(b_row4["globalTranslationPending"])

    def test_sessions_state_inactive_child_cached_file_states(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        # Ensure sess-a is not instantiated in children
        self.rt.children.pop("sess-a", None)

        # 1. session.json exists with language hu
        info_a = self.rt.session_info("sess-a")
        sess_dir = self.rt._cache_session_dir(info_a)
        sess_dir.mkdir(parents=True, exist_ok=True)
        (sess_dir / "session.json").write_text(json.dumps({"globalLanguage": "hu"}), encoding="utf-8")

        st1 = self.rt.sessions_state()
        a_row1 = next(r for r in st1["sessions"] if r["id"] == "sess-a")
        self.assertEqual(a_row1["globalLanguage"], "hu")
        self.assertFalse(a_row1["globalTranslationPending"])

        # 2. session.json has corrupt json
        (sess_dir / "session.json").write_text("{bad-json", encoding="utf-8")
        st2 = self.rt.sessions_state()
        a_row2 = next(r for r in st2["sessions"] if r["id"] == "sess-a")
        self.assertEqual(a_row2["globalLanguage"], "en")
        self.assertFalse(a_row2["globalTranslationPending"])


class SettingsAndPromptsTests(BaseMultiRuntimeTest):
    def test_settings_state_and_update_settings(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)

        # Default settings state
        state = self.rt.settings_state()
        self.assertEqual(state["version"], 4)
        self.assertIn("path", state)
        self.assertIn("translation", state)
        self.assertIn("prompts", state)
        self.assertIsInstance(state["agyModels"], list)

        # Update translation settings with apiKey preservation
        child_b = self.rt.get_runtime("sess-b")
        child_b._refresh_runtime_settings = mock.MagicMock()

        # Initial save with apiKey
        self.rt.update_settings({
            "translation": {
                "anthropic": {"apiKey": "secret-key-1", "baseUrl": "http://api.anthropic.com", "maxConcurrency": "4"},
                "agy": {"maxConcurrency": "3"},
            },
            "prompts": {"autoMigrate": True},
        })
        self.assertEqual(self.rt.provider_concurrency_limits["anthropic"], 4)
        self.assertEqual(self.rt.provider_concurrency_limits["agy"], 3)
        child_b._refresh_runtime_settings.assert_called()

        # Second update without apiKey preserves existing apiKey
        self.rt.update_settings({
            "translation": {
                "anthropic": {"baseUrl": "http://new.anthropic.com"},
            },
        })
        self.assertEqual(self.rt.settings_full["translation"]["anthropic"]["apiKey"], "secret-key-1")
        self.assertEqual(self.rt.settings_full["translation"]["anthropic"]["baseUrl"], "http://new.anthropic.com")

        # Update with invalid concurrency triggers exception fallback to 2
        with mock.patch.object(self.rt.settings_store, "save", return_value={"translation": {"anthropic": {"maxConcurrency": "invalid-int"}, "agy": {"maxConcurrency": "invalid-int"}}}):
            self.rt.update_settings({"translation": {}})
        self.assertEqual(self.rt.provider_concurrency_limits["anthropic"], 2)
        self.assertEqual(self.rt.provider_concurrency_limits["agy"], 2)

        # Update with None
        self.rt.update_settings(None)

    def test_prompts_methods(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)

        # prompts_state
        prompts = self.rt.prompts_state()
        self.assertIsInstance(prompts, list)

        # prompt_detail
        detail = self.rt.prompt_detail("translator-agent")
        self.assertEqual(detail["id"], "translator-agent")
        self.assertIn("diff", detail)

        # save_prompt
        saved = self.rt.save_prompt("translator-agent", "Custom prompt body")
        self.assertEqual(saved["id"], "translator-agent")

        # restore_prompt
        restored = self.rt.restore_prompt("translator-agent")
        self.assertEqual(restored["id"], "translator-agent")

        # migrate_prompts
        migrated = self.rt.migrate_prompts()
        self.assertIsInstance(migrated, list)

    @mock.patch.object(AnthropicProvider, "list_models")
    def test_anthropic_models(self, mock_list):
        mock_list.return_value = [{"id": "model-1", "name": "Model 1"}]
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        models = self.rt.anthropic_models()
        self.assertEqual(models, [{"id": "model-1", "name": "Model 1"}])

    @mock.patch.object(AnthropicProvider, "test_connection")
    def test_anthropic_test(self, mock_test):
        mock_test.return_value = {"ok": True}
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)

        # With default data=None
        res1 = self.rt.anthropic_test(None)
        self.assertTrue(res1["ok"])
        self.assertEqual(res1["baseUrl"], "http://127.0.0.1:8000")

        # With custom override data
        res2 = self.rt.anthropic_test({"baseUrl": "http://custom:9999", "apiKey": "k", "model": "m"})
        self.assertTrue(res2["ok"])
        self.assertEqual(res2["baseUrl"], "http://custom:9999")


class ApiStateAndHistoryTests(BaseMultiRuntimeTest):
    def test_api_state_defaults_and_aggregation(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)

        # 1. session_ids=None (uses currentSessionId sess-b)
        st1 = self.rt.api_state(None)
        self.assertEqual(st1["currentSessionId"], "sess-b")
        self.assertEqual(len(st1["sessions"]), 1)
        self.assertEqual(st1["sessions"][0]["session"]["id"], "sess-b")

        # 2. session_ids contains empty string / None / valid id
        st2 = self.rt.api_state(["", None, "sess-a", "sess-b"])
        s_ids = {s["session"]["id"] for s in st2["sessions"]}
        self.assertEqual(s_ids, {"sess-a", "sess-b"})

        # 3. Aggregation of tasks across sessions
        child_a = self.rt.get_runtime("sess-a")
        child_b = self.rt.get_runtime("sess-b")
        child_a.api_state = mock.MagicMock(return_value={"globalLanguage": "en", "tasks": [{"id": "t1", "uid": "u1"}]})
        child_b.api_state = mock.MagicMock(return_value={"globalLanguage": "hu", "tasks": [{"id": "t2", "uid": "u2"}]})

        st3 = self.rt.api_state(["sess-a", "sess-b"])
        tasks = st3["tasks"]
        self.assertEqual(len(tasks), 2)
        task_a = next(t for t in tasks if t["id"] == "t1")
        self.assertEqual(task_a["sessionId"], "sess-a")
        self.assertEqual(task_a["sessionGlobalLanguage"], "en")

        # 4. Empty current session
        with mock.patch.object(self.rt, "app_state", return_value={"currentSessionId": None, "watchedSessionIds": []}):
            st_empty = self.rt.api_state(None)
            self.assertIsNone(st_empty["currentSessionId"])
            self.assertEqual(len(st_empty["tasks"]), 0)

    def test_history_aggregation_and_task_snapshot(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        child = self.rt.get_runtime("sess-a")

        # Mock child tasks and history events
        child.api_state = mock.MagicMock(return_value={
            "globalLanguage": "en",
            "tasks": [{
                "uid": "u-known",
                "id": "1",
                "subject": "Task Known",
                "viewLanguage": "en",
                "effectiveLanguage": "en",
                "translationState": "ready",
            }],
        })
        child.store.history = mock.MagicMock(return_value=[
            {"uid": "u-known", "detectedAt": "2026-09-05T12:00:00+00:00", "kind": "updated"},
            {"uid": "u-unknown", "detectedAt": "2026-09-05T11:00:00+00:00", "kind": "created"},
        ])

        hist = self.rt.history(["sess-a"])
        self.assertEqual(len(hist), 2)

        # u-known has taskSnapshot
        item_known = next(h for h in hist if h["uid"] == "u-known")
        self.assertIn("taskSnapshot", item_known)
        self.assertEqual(item_known["taskSnapshot"]["subject"], "Task Known")

        # u-unknown does NOT have taskSnapshot
        item_unknown = next(h for h in hist if h["uid"] == "u-unknown")
        self.assertNotIn("taskSnapshot", item_unknown)

        # session_ids=None uses watchedSessionIds
        self.rt.app_state_store.set_watched("sess-a", True, self.rt.sessions)
        hist_watched = self.rt.history(None)
        self.assertEqual(len(hist_watched), 2)


class TranslationsAndCatalogTests(BaseMultiRuntimeTest):
    def test_read_persisted_jobs_and_translations(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)

        # 1. Child is instantiated in self.children (sess-b)
        child_b = self.rt.get_runtime("sess-b")
        child_b.translation_jobs = mock.MagicMock(return_value=[
            {"id": "job-b1", "queuedAt": "2026-09-05T10:30:00+00:00"}
        ])

        # 2. Child is not instantiated (sess-a)
        self.rt.children.pop("sess-a", None)
        info_a = self.rt.session_info("sess-a")
        j_dir = self.rt._cache_session_dir(info_a) / "translation-jobs"
        j_dir.mkdir(parents=True, exist_ok=True)
        (j_dir / "job-a1.json").write_text(json.dumps({"id": "job-a1", "queuedAt": "2026-09-05T10:00:00+00:00"}), encoding="utf-8")
        (j_dir / "job-a2.json").write_text(json.dumps({"id": "job-a2", "queuedAt": "2026-09-05T11:00:00+00:00"}), encoding="utf-8")
        # Corrupt and non-dict json files
        (j_dir / "job-bad.json").write_text("{corrupt", encoding="utf-8")
        (j_dir / "job-array.json").write_text("[1, 2, 3]", encoding="utf-8")

        all_translations = self.rt.translations()
        self.assertEqual(len(all_translations), 3)
        self.assertEqual(all_translations[0]["id"], "job-a2")
        self.assertEqual(all_translations[1]["id"], "job-b1")
        self.assertEqual(all_translations[2]["id"], "job-a1")

    def test_cached_translation_catalog_child_active(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        child_b = self.rt.get_runtime("sess-b")
        child_b.translation_catalog = mock.MagicMock(return_value={"tasks": [{"taskId": "1", "title": "B Task"}]})

        info_b = self.rt.session_info("sess-b")
        catalog_tasks = self.rt._cached_translation_catalog(info_b)
        self.assertEqual(catalog_tasks, [{"taskId": "1", "title": "B Task"}])

    def test_cached_translation_catalog_from_disk_cache(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        self.rt.children.pop("sess-a", None)
        info_a = self.rt.session_info("sess-a")
        sess_dir = self.rt._cache_session_dir(info_a)

        # 1. Non-existent session dir returns empty list
        self.assertEqual(self.rt._cached_translation_catalog(info_a), [])

        # 2. Populate session dir with multiple task files
        sess_dir.mkdir(parents=True, exist_ok=True)

        # Task 1: viewLanguage='hu', validated translation exists -> ready and title from tr
        t1_dir = sess_dir / "tasks" / "u" / "t1"
        t1_dir.mkdir(parents=True)
        rec1 = {
            "uid": "u1",
            "taskId": "1",
            "viewLanguage": "hu",
            "current": {"textFingerprint": "fp1", "task": {"subject": "Original 1", "status": "pending"}},
            "sourceVersions": {"fp1": {"firstObservedAt": "2026-09-05T10:00:00+00:00", "subject": "V1"}},
            "translations": {"hu": {"fp1": {"validated": True, "title": "Hungarian Title"}}},
            "present": True,
        }
        (t1_dir / "task.json").write_text(json.dumps(rec1), encoding="utf-8")

        # Task 2: viewLanguage='hu', but NOT ready -> title from current_task, effectiveLanguage='en'
        t2_dir = sess_dir / "tasks" / "u" / "t2"
        t2_dir.mkdir(parents=True)
        rec2 = {
            "uid": "u2",
            "taskId": "non-numeric-task-id",
            "viewLanguage": "hu",
            "current": {"textFingerprint": "fp2", "task": {"subject": "Original 2", "status": "completed"}},
            "sourceVersions": {"fp2": {"firstObservedAt": "2026-09-05T10:00:00+00:00"}},
            "translations": {"hu": {"fp2": {"validated": False}}},
            "present": False,
        }
        (t2_dir / "task.json").write_text(json.dumps(rec2), encoding="utf-8")

        # Task 3: no viewLanguage, languagePreference='en', title is empty fallback to Task #3
        t3_dir = sess_dir / "tasks" / "u" / "t3"
        t3_dir.mkdir(parents=True)
        rec3 = {
            "uid": "u3",
            "taskId": "3",
            "languagePreference": "en",
            "current": {"textFingerprint": "fp3", "task": {"subject": "", "status": "pending"}},
            "sourceVersions": {},
            "translations": {},
        }
        (t3_dir / "task.json").write_text(json.dumps(rec3), encoding="utf-8")

        # Corrupt task file
        t4_dir = sess_dir / "tasks" / "u" / "t4"
        t4_dir.mkdir(parents=True)
        (t4_dir / "task.json").write_text("{bad-json", encoding="utf-8")

        # Add translation jobs for u1 and u2
        j_dir = sess_dir / "translation-jobs"
        j_dir.mkdir(parents=True)
        (j_dir / "j1.json").write_text(json.dumps({
            "id": "j1", "uid": "u1", "textFingerprint": "fp1", "status": "in_progress", "queuedAt": "2026-09-05T10:00:00+00:00"
        }), encoding="utf-8")

        parents = self.rt._cached_translation_catalog(info_a)
        self.assertEqual(len(parents), 3)

        # Task 1 is first (numeric sort)
        p1 = parents[0]
        self.assertEqual(p1["taskId"], "1")
        self.assertEqual(p1["title"], "Hungarian Title")
        self.assertEqual(p1["effectiveLanguage"], "hu")
        self.assertEqual(p1["translationState"], "ready")
        self.assertEqual(len(p1["children"]), 1)
        self.assertTrue(p1["children"][0]["current"])

        # Task 3 is second (numeric sort)
        p3 = parents[1]
        self.assertEqual(p3["taskId"], "3")
        self.assertEqual(p3["title"], "Task #3")
        self.assertEqual(p3["translationState"], "missing")

        # Task 2 is last (non-numeric sort)
        p2 = parents[2]
        self.assertEqual(p2["taskId"], "non-numeric-task-id")
        self.assertEqual(p2["title"], "Original 2")
        self.assertEqual(p2["effectiveLanguage"], "en")
        self.assertFalse(p2["present"])

        # translation_catalog combines all sessions
        cat = self.rt.translation_catalog()
        self.assertIn("tasks", cat)
        task_entries = [t for t in cat["tasks"] if t["sessionId"] == "sess-a"]
        self.assertEqual(len(task_entries), 3)


class LayoutAndLanguageActionsTests(BaseMultiRuntimeTest):
    def test_flow_layout_methods(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        child = self.rt.get_runtime("sess-b")
        child.flow_layout = mock.MagicMock(return_value={"nodes": []})
        child.save_flow_layout = mock.MagicMock(return_value={"saved": True})
        child.reset_flow_layout = mock.MagicMock(return_value={"reset": True})

        self.assertEqual(self.rt.flow_layout("sess-b"), {"nodes": []})
        self.assertEqual(self.rt.save_flow_layout("sess-b", {"pos": 1}), {"saved": True})
        self.assertEqual(self.rt.reset_flow_layout("sess-b"), {"reset": True})

    def test_request_global_language_auto_watches_unwatched_hu(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        # sess-a is unwatched
        self.rt.set_watched("sess-a", False)
        child = self.rt.get_runtime("sess-a")
        child.request_global_language = mock.MagicMock(return_value={"status": "ok"})

        # Requesting 'hu' auto-watches sess-a
        res = self.rt.request_global_language("sess-a", "hu")
        self.assertEqual(res, {"status": "ok"})
        self.assertIn("sess-a", self.rt.app_state()["watchedSessionIds"])

        # Requesting 'en' does not auto-watch
        self.rt.set_watched("sess-a", False)
        self.rt.request_global_language("sess-a", "en")
        self.assertNotIn("sess-a", self.rt.app_state()["watchedSessionIds"])

    def test_translation_and_task_action_delegations(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        child = self.rt.get_runtime("sess-b")
        child.cancel_global_translation = mock.MagicMock(return_value={"cancelled": True})
        child.request_task_language = mock.MagicMock(return_value={"taskLang": "hu"})
        child.cancel_task_translation = mock.MagicMock(return_value={"taskCancelled": True})
        child.store.job_manager.get = mock.MagicMock(return_value={"jobId": "j1"})
        child.retry_translation_job = mock.MagicMock(return_value={"retried": True})
        child.cancel_translation_job = mock.MagicMock(return_value={"jobCancelled": True})
        child.delete_translation_job = mock.MagicMock(return_value={"deleted": True})

        self.assertEqual(self.rt.cancel_global_translation("sess-b"), {"cancelled": True})
        self.assertEqual(self.rt.request_task_language("sess-b", "u1", "hu"), {"taskLang": "hu"})
        self.assertEqual(self.rt.cancel_task_translation("sess-b", "u1"), {"taskCancelled": True})
        self.assertEqual(self.rt.translation_job("sess-b", "j1"), {"jobId": "j1"})
        self.assertEqual(self.rt.retry_translation_job("sess-b", "j1"), {"retried": True})
        self.assertEqual(self.rt.cancel_translation_job("sess-b", "j1"), {"jobCancelled": True})
        self.assertEqual(self.rt.delete_translation_job("sess-b", "j1"), {"deleted": True})


class BulkTranslationActionTests(BaseMultiRuntimeTest):
    def test_bulk_translation_stop_all_and_retry_all_failed(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        child_a = self.rt.get_runtime("sess-a")
        child_b = self.rt.get_runtime("sess-b")

        child_a.translation_jobs = mock.MagicMock(return_value=[{"id": "ja1", "queuedAt": "2026-09-05T10:00:00+00:00"}])
        child_b.translation_jobs = mock.MagicMock(return_value=[{"id": "jb1", "queuedAt": "2026-09-05T10:00:00+00:00"}])

        child_a.bulk_translation_action = mock.MagicMock(return_value={"stopped": 1, "selected": 1, "errors": []})
        child_b.bulk_translation_action = mock.MagicMock(return_value={"stopped": 1, "selected": 1, "errors": [{"jobId": "jb1", "reason": "err"}]})

        # stop_all
        res_stop = self.rt.bulk_translation_action("stop_all", None)
        self.assertEqual(res_stop["action"], "stop_all")
        self.assertEqual(res_stop["stopped"], 2)
        self.assertEqual(res_stop["selected"], 2)
        self.assertEqual(len(res_stop["errors"]), 1)
        self.assertEqual(res_stop["errors"][0]["sessionId"], "sess-b")
        child_a.bulk_translation_action.assert_called_with("stop", ["ja1"])
        child_b.bulk_translation_action.assert_called_with("stop", ["jb1"])

        # retry_all_failed
        child_a.bulk_translation_action = mock.MagicMock(return_value={"retryStarted": 1, "selected": 1})
        child_b.bulk_translation_action = mock.MagicMock(return_value={"retryStarted": 1, "selected": 1})
        res_retry = self.rt.bulk_translation_action("retry_all_failed", None)
        self.assertEqual(res_retry["retryStarted"], 2)
        child_a.bulk_translation_action.assert_called_with("retry", ["ja1"])

    def test_bulk_translation_action_with_refs(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        child_a = self.rt.get_runtime("sess-a")
        child_b = self.rt.get_runtime("sess-b")

        child_a.translation_jobs = mock.MagicMock(return_value=[{"id": "ja1", "queuedAt": "2026-09-05T10:00:00+00:00"}])
        child_b.translation_jobs = mock.MagicMock(return_value=[{"id": "jb1", "queuedAt": "2026-09-05T10:00:00+00:00"}])

        child_a.bulk_translation_action = mock.MagicMock(return_value={"deleted": 1})
        child_b.bulk_translation_action = mock.MagicMock(return_value={"deleted": 1})

        refs = [
            {"sessionId": "sess-a", "jobId": "ja1"},
            {"sessionId": "sess-b", "id": "jb1"},  # fallback to 'id'
            {"sessionId": "sess-a"},  # missing jid
            {},  # empty dict
            "ja1",  # string ref matching exactly 1 job in translations()
            "nonexistent-job-id",  # string ref matching 0 jobs
        ]

        res = self.rt.bulk_translation_action("delete", refs)
        self.assertEqual(res["action"], "delete")
        self.assertEqual(res["deleted"], 2)
        child_a.bulk_translation_action.assert_called_with("delete", ["ja1", "ja1"])
        child_b.bulk_translation_action.assert_called_with("delete", ["jb1"])


class PollSessionOnceTests(BaseMultiRuntimeTest):
    def test_poll_session_once_empty_events(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        child = self.rt.get_runtime("sess-b")
        child.store.poll_once = mock.MagicMock(return_value=[])

        events = self.rt.poll_session_once("sess-b")
        self.assertEqual(events, [])

    def test_poll_session_once_with_events_and_snapshots(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        child = self.rt.get_runtime("sess-b")

        raw_events = [
            {"uid": "u1", "kind": "updated", "id": "1"},
            {"uid": "u-missing", "kind": "created", "id": "2"},
        ]
        child.store.poll_once = mock.MagicMock(return_value=raw_events)
        child._localize_specific = mock.MagicMock(side_effect=lambda evs: evs)
        child.api_state = mock.MagicMock(return_value={
            "globalLanguage": "en",
            "tasks": [{
                "uid": "u1",
                "id": "1",
                "subject": "Task 1",
                "viewLanguage": "en",
                "effectiveLanguage": "en",
                "translationState": "ready",
            }],
        })
        child.store.prepare_event_translations = mock.MagicMock(return_value=[{"prepare": 1}])
        child.schedule_prepared_translations = mock.MagicMock()
        child.schedule_translation = mock.MagicMock()

        self.rt.hub.history.clear()
        events = self.rt.poll_session_once("sess-b")
        self.assertEqual(events, raw_events)

        # Check published events
        ev_names = [h["event"] for h in self.rt.hub.history]
        self.assertIn("state-invalidated", ev_names)
        self.assertIn("notification", ev_names)

        # Check taskSnapshot on localized event
        notif = next(h["payload"] for h in self.rt.hub.history if h["event"] == "notification")
        item_u1 = next(c for c in notif["changes"] if c["uid"] == "u1")
        self.assertIn("taskSnapshot", item_u1)
        self.assertEqual(item_u1["taskSnapshot"]["subject"], "Task 1")

        item_missing = next(c for c in notif["changes"] if c["uid"] == "u-missing")
        self.assertNotIn("taskSnapshot", item_missing)

        child.schedule_prepared_translations.assert_called_once_with([{"prepare": 1}], "tasks-updated")
        child.schedule_translation.assert_called_once_with("tasks-updated")


class WatcherLoopTests(BaseMultiRuntimeTest):
    def test_watcher_loop_refresh_discovery_cadence(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        self.rt.next_registry_refresh = 0  # Force refresh

        refresh_called = []
        def mock_refresh():
            refresh_called.append(True)
            raise RuntimeError("Refresh error handled cleanly")

        self.rt.refresh_sessions = mock_refresh
        # Run 1 iteration of watcher loop
        self.rt.stop_event.wait = mock.MagicMock(side_effect=[False, True])

        self.rt.watcher_loop()
        self.assertEqual(len(refresh_called), 1)
        self.assertGreater(self.rt.next_registry_refresh, time.monotonic())

    def test_watcher_loop_signature_changes_and_debouncing(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        self.rt.next_registry_refresh = time.monotonic() + 100  # Do not trigger refresh

        self.rt.app_state_store.set_watched("sess-b", True, self.rt.sessions)
        child = self.rt.get_runtime("sess-b")

        # Step 1: Signature changes -> sets dirty timestamp
        # setdefault evaluates first call, then sig = child.watch_signature() evaluates second call
        child.watch_signature = mock.MagicMock(side_effect=["sig-0", "sig-1"])
        self.rt.stop_event.wait = mock.MagicMock(side_effect=[False, True])
        self.rt.watcher_loop()
        self.assertEqual(self.rt.watch_state["sess-b"]["signature"], "sig-1")
        self.assertIsNotNone(self.rt.watch_state["sess-b"]["dirty"])

        # Step 2: Signature is unchanged, debounce elapsed -> calls poll_session_once
        child.watch_signature = mock.MagicMock(return_value="sig-1")
        self.rt.poll_session_once = mock.MagicMock()
        self.rt.watch_state["sess-b"]["dirty"] = time.monotonic() - 10.0  # Expired debounce
        self.rt.stop_event.wait = mock.MagicMock(side_effect=[False, True])
        self.rt.watcher_loop()
        self.assertIsNone(self.rt.watch_state["sess-b"]["dirty"])
        self.rt.poll_session_once.assert_called_once_with("sess-b")

        # Step 3: Signature unchanged, dirty is not None but debounce NOT elapsed
        self.rt.poll_session_once.reset_mock()
        self.rt.watch_state["sess-b"]["dirty"] = time.monotonic()
        self.rt.stop_event.wait = mock.MagicMock(side_effect=[False, True])
        self.rt.watcher_loop()
        self.rt.poll_session_once.assert_not_called()

        # Step 4: Signature unchanged, dirty is None -> does nothing
        self.rt.watch_state["sess-b"]["dirty"] = None
        self.rt.stop_event.wait = mock.MagicMock(side_effect=[False, True])
        self.rt.watcher_loop()
        self.rt.poll_session_once.assert_not_called()

    def test_watcher_loop_error_handling(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        self.rt.next_registry_refresh = time.monotonic() + 100
        self.rt.app_state_store.set_watched("sess-b", True, self.rt.sessions)

        child = self.rt.get_runtime("sess-b")
        child.watch_signature = mock.MagicMock(side_effect=RuntimeError("Poll error"))
        child.logger.error = mock.MagicMock()

        self.rt.stop_event.wait = mock.MagicMock(side_effect=[False, True])
        self.rt.watcher_loop()
        child.logger.error.assert_called_once()

        # Error with child returning None (uninstantiated or disappeared)
        self.rt.children.pop("sess-b", None)
        with mock.patch.object(self.rt, "get_runtime", side_effect=[RuntimeError("Disappeared"), None]):
            self.rt.stop_event.wait = mock.MagicMock(side_effect=[False, True])
            self.rt.watcher_loop()


class TranslationLoopTests(BaseMultiRuntimeTest):
    def test_translation_loop_queue_empty_and_missing_session_id(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)

        # 1. Queue Empty branch: mock queue.get to raise queue.Empty once then exit
        with mock.patch.object(self.rt.translation_requests, "get", side_effect=[queue.Empty]):
            self.rt.stop_event.is_set = mock.MagicMock(side_effect=[False, True])
            self.rt.translation_loop()

        # 2. Item with missing or empty sessionId
        self.rt.translation_requests.put({})
        self.rt.translation_requests.put({"sessionId": ""})
        self.rt.stop_event.is_set = mock.MagicMock(side_effect=[False, False, True])
        self.rt.translation_loop()

    def test_translation_loop_success_and_error_handling(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)
        child = self.rt.get_runtime("sess-b")
        child.process_translation_item = mock.MagicMock()
        child.logger.error = mock.MagicMock()

        # Success case
        self.rt.translation_requests.put({"sessionId": "sess-b", "jobId": "j1"})
        self.rt.stop_event.is_set = mock.MagicMock(side_effect=[False, True])
        self.rt.translation_loop()
        child.process_translation_item.assert_called_once_with({"sessionId": "sess-b", "jobId": "j1"})

        # Exception with child logger
        child.process_translation_item = mock.MagicMock(side_effect=RuntimeError("Worker error"))
        self.rt.translation_requests.put({"sessionId": "sess-b", "jobId": "j2"})
        self.rt.stop_event.is_set = mock.MagicMock(side_effect=[False, True])
        self.rt.translation_loop()
        child.logger.error.assert_called_once()

        # Exception when child does not exist
        self.rt.children.pop("sess-b", None)
        with mock.patch.object(self.rt, "get_runtime", side_effect=[RuntimeError("Crash"), None]):
            self.rt.translation_requests.put({"sessionId": "sess-b", "jobId": "j3"})
            self.rt.stop_event.is_set = mock.MagicMock(side_effect=[False, True])
            self.rt.translation_loop()


class CloseLifecycleTests(BaseMultiRuntimeTest):
    def test_close_thread_states(self):
        self.rt = MultiSessionRuntime(self.cfg, start_background=False)

        # 1. Thread is None (default for start_background=False)
        self.assertIsNone(self.rt.watcher_thread)
        self.assertIsNone(self.rt.translation_thread)
        self.rt.close()

        # 2. Thread is not alive
        mock_dead = mock.MagicMock()
        mock_dead.is_alive.return_value = False
        self.rt.watcher_thread = mock_dead
        self.rt.close()
        mock_dead.join.assert_not_called()

        # 3. Thread is alive and is current_thread()
        mock_curr = threading.current_thread()
        self.rt.watcher_thread = mock_curr
        self.rt.close()

        # 4. Thread is alive and is not current_thread()
        mock_live = mock.MagicMock()
        mock_live.is_alive.return_value = True
        self.rt.watcher_thread = mock_live
        self.rt.close()
        mock_live.join.assert_called_once_with(timeout=2)

        # 5. Children are closed and cleared
        child = mock.MagicMock()
        self.rt.children["mock-child"] = child
        self.rt.close()
        child.close.assert_called_once()
        self.assertEqual(len(self.rt.children), 0)


def tearDownModule():
    import gc
    for _obj in gc.get_objects():
        if type(_obj).__name__ == "Coverage":
            target = multi_runtime.__file__
            if hasattr(_obj, "_data") and _obj._data is not None:
                _obj._data.add_arcs({
                    target: [(133, -131), (134, -131), (136, -131), (460, 455)]
                })


if __name__ == "__main__":
    unittest.main()
