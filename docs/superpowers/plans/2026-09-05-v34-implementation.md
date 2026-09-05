# Claude Todos v3.4.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement explicit per-task display language, truthful diff history, task-grouped translation lifecycles, and deterministic spacious Flow layout without regressing the v3.3 queue/bulk/fullscreen behavior.

**Architecture:** Keep the Python StateStore as the persistent source of task/text-version/translation state, but separate desired display language from translation availability. Frontend consumes explicit state and renders task-grouped translation data and history. Existing React SPA, SSE and provider queue remain intact.

**Tech Stack:** Python 3.9+, React 19 browser ESM, React Router, React Flow 12, ELK 0.12, TanStack Table 8.21.3, react-diff-viewer-continued 4.4.0.

**Spec:** `docs/superpowers/specs/2026-09-05-v34-language-history-translations-flow.md`

## Global Constraints

- Do not modify Claude source task JSON.
- Translation cache remains fingerprint-based and provider-independent.
- Retry stays inside the same `(uid, textFingerprint)` lifecycle.
- Global language is a bulk setter + default for new tasks; per-task language is explicit and may differ afterward.
- Existing v3.3 provider concurrency/bulk actions/fullscreen/persistence remain functional.
- Python must remain compatible with 3.9 syntax.

---

### Task 1: Explicit task language state and migration

**Files:**
- Modify: `server.py`
- Test: `tests/test_v34.py`

**Interfaces:**
- `StateStore.task_view_language(rec) -> str`
- `StateStore.set_task_language(uid, language)` persists `viewLanguage`
- `StateStore.set_global_language(language, apply_to_tasks=True)` bulk-applies current tasks when requested
- `StateStore.api_state()` exposes `viewLanguage`, `translationState`, `effectiveLanguage`

- [x] Write failing tests for v3.3 migration, global bulk setter, task override, cached toggle, HU missing queue and text-change semantics.
- [x] Run only v3.4 language tests and confirm RED.
- [x] Implement migration + explicit state + current-fingerprint translation scheduling.
- [x] Run v3.4 language tests and confirm GREEN.

### Task 2: Truthful history + translation completion events

**Files:**
- Modify: `server.py`
- Modify: `ui/src/components/task-drawer.js`
- Modify: `ui/index.html`
- Modify: `ui/package.json`
- Modify: `ui/styles.css`
- Test: `tests/test_v34.py`
- Test: `tests/test_v3_spa.py`

**Interfaces:**
- `StateStore.record_translation_history(uid, tfp, result, job_state)`
- `StateStore.history()` returns raw source events plus later translation events, with no retroactive source localization.

- [x] Write failing backend tests proving source history stays EN and translation success appends one deduplicated later translation event.
- [x] Write failing frontend contract tests for collapsed history, filters/sort and react-diff-viewer usage.
- [x] Implement backend event persistence.
- [x] Implement drawer History component and diff import.
- [x] Run history tests and JS syntax checks.

### Task 3: Task-grouped Translations tree table

**Files:**
- Modify: `server.py`
- Replace: `ui/src/pages/translations.js`
- Modify: `ui/index.html`
- Modify: `ui/package.json`
- Modify: `ui/styles.css`
- Test: `tests/test_v34.py`
- Test: `tests/test_v3_translation_ui.py`

**Interfaces:**
- `StateStore.translation_catalog()` returns task parent metadata + child lifecycle metadata while existing `/api/translations` continues returning flat `jobs` for compatibility.
- Add `GET /api/translation-catalog` returning `{tasks:[...]}`.

- [x] Write failing catalog grouping tests: parent per task, child per text fingerprint, runs remain inside child.
- [x] Write failing frontend contract tests for TanStack expanding/selection/sorting/filtering and bulk eligibility.
- [x] Implement catalog API.
- [x] Implement TanStack tree table while retaining inline JobDetail debugging.
- [x] Run translation tests and JS syntax checks.

### Task 4: Flow deterministic disconnected layout and spacing

**Files:**
- Modify: `ui/src/pages/flow.js`
- Modify: `ui/src/task-graph.js`
- Test: `tests/test_v34.py`
- Test: `tests/test_v3_flow.py`

**Interfaces:**
- Export pure `splitConnectedTasks(tasks, graph)` / `placeDisconnected(...)` helpers where practical for Node-based tests.

- [x] Write failing tests for 3 active in-progress nodes, disconnected numeric order after connected graph, and ELK spacing constants.
- [x] Run tests to prove RED.
- [x] Implement connected ELK + explicit disconnected lane and increased spacing.
- [x] Run Flow tests and JS syntax checks.

### Task 5: Compatibility, docs, package verification

**Files:**
- Modify: `README.md`
- Modify: `claude-todos.sh`
- Modify: `ui/package.json`
- Modify: `server.py` version strings
- Test: all tests

- [x] Update v3.4 docs/config/state semantics.
- [x] Run `python3 -m unittest discover -s tests -p 'test_*.py' -v`.
- [x] Run `bash -n`, Python `py_compile`, and `node --check` on every UI module.
- [x] Run fake-session HTTP smoke tests for global/task language and translation catalog/history endpoints.
- [x] Package `claude-todos-v3.4.0.zip`, compute SHA-256, unpack it fresh, and repeat complete verification on the ZIP artifact.
