# Claude Todos v4.0.0 Multi-Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Convert Claude Todos from a single-session process into one multi-session backend daemon plus a separately launched React SPA, while keeping Settings global, translation scheduling globally shared, and all prior per-session cache/history data.

**Architecture:** Preserve the proven v3.4 StateStore/translation logic as per-session core, then add a registry/orchestrator that discovers Claude JSONL transcripts directly and routes all session operations through one daemon. Child session runtimes share one translation queue, one SSE hub and one provider-concurrency state; the client uses explicit session-scoped APIs.

**Tech Stack:** Python 3.9+, Bash 3.2-compatible launchers, React 19 browser ESM, React Router 8, TanStack Table 8, React Flow 12, ELK 0.12, SSE.

**Spec:** `docs/superpowers/specs/2026-09-05-v4-multi-session-design.md`

## Global Constraints

- Do not use or import Claude Agent SDK.
- Discover sessions only from local Claude JSONL/application files.
- Settings/prompt/provider configuration is global, never session-specific.
- Current session is exactly one and must always be watched.
- One global translation request queue and provider concurrency budget across every session.
- Existing v3.4 cache paths and files remain readable in place.
- Backend binds `127.0.0.1`; default port 8765. Client default port 8766.
- CORS allowlist defaults to client localhost/127.0.0.1 origins; never `*`.
- Browser has no API keys.

---

### Task 1: Session discovery and app-state

**Files:**
- Create: `server/session_registry.py`
- Create: `server/app_state.py`
- Test: `tests/test_v4_sessions.py`

**Interfaces:**
- Produces `SessionInfo`, `SessionRegistry.discover() -> list[dict]`, `SessionRegistry.get(session_id) -> dict|None`.
- Produces `AppStateStore.load(session_infos)`, `switch(session_id)`, `set_watched(session_id, bool)`.

- [x] Write tests using fake `~/.claude/projects/<project>/*.jsonl` for metadata extraction, malformed-line tolerance, sorting by activity and exclusion of nested subagent transcripts.
- [x] Verify tests fail before modules exist.
- [x] Implement JSONL scanner and metadata derivation without SDK imports.
- [x] Write tests for first-run newest session selection, current-always-watched invariant and persistent app-state.
- [x] Implement app-state atomically with temp file + `os.replace`.
- [x] Run Task 1 tests.

### Task 2: Extract v3.4 per-session core and prepare externally scheduled child runtimes

**Files:**
- Create: `server/__init__.py`
- Create: `server/session_core.py` (move/refactor root `server.py`)
- Modify: imports/tests referring to `server`
- Test: existing suite + `tests/test_v4_core.py`

**Interfaces:**
- `DashboardRuntime(config, shared_queue=None, start_translation_worker=True, shared_hub=None)`.
- `process_translation_item(item)` routes one queue item.
- Every enqueued translation item carries `sessionId`.

- [x] Add failing tests for external queue mode and no child worker thread.
- [x] Move v3.4 core to package without behavior regressions.
- [x] Add optional shared queue/hub and `process_translation_item` extraction.
- [x] Run all v3/v4 core tests.

### Task 3: Multi-session orchestrator, shared queue, shared provider limits and watched polling

**Files:**
- Create: `server/multi_runtime.py`
- Test: `tests/test_v4_multi_runtime.py`

**Interfaces:**
- `MultiSessionRuntime(config)` owns registry/app-state/hub/global queue/provider gate.
- `get_runtime(session_id, create=True)` returns child runtime.
- `api_state(session_ids)`, `history(session_ids)`, `translations()`, `translation_catalog()` aggregate results with session envelopes.

- [x] Write failing tests for lazy child creation, per-session language isolation, shared queue and shared provider maxConcurrency.
- [x] Implement global service ownership and inject shared provider gate/count/limits into StateStores.
- [x] Write failing watcher tests: only watched sessions are polled; common notification contains session metadata.
- [x] Implement central watcher loop with per-session debounce state.
- [x] Implement global translation worker routing queue items by `sessionId`.
- [x] Run Task 3 tests.

### Task 4: Multi-session HTTP API and CORS

**Files:**
- Create: `server/main.py`
- Create/Modify: `server/http_api.py`
- Test: `tests/test_v4_http.py`

**Interfaces:**
- Implements spec API routes and legacy-current-session aliases where practical.
- Uses strict allowlist CORS and handles `OPTIONS`.

- [x] Write failing API tests for sessions/app-state/switch/watch/task/history/translation/flow routes and CORS allow/deny behavior.
- [x] Implement handler and daemon `main()`.
- [x] Verify SSE payloads include session envelope.
- [x] Run HTTP tests.

### Task 5: Separate launchers and client SPA server

**Files:**
- Create: `start-server.sh`
- Create: `start-client.sh`
- Create: `client/serve.py`
- Move: `ui/*` -> `client/*`
- Remove supported use of root `claude-todos.sh` session argument.
- Test: `tests/test_v4_launchers.py`

**Interfaces:**
- `start-server.sh [--log-output] [--log-file] [--port N]`
- `start-client.sh [--port N] [--server-url URL] [--no-open]`

- [x] Write failing launcher/static fallback tests.
- [x] Implement Bash 3.2-compatible argument parsing with no session-id positional argument.
- [x] Implement static SPA server injecting API base URL before serving index.
- [x] Verify client routes fallback to index and backend remains independent.

### Task 6: Sessions page, topbar session button and common app context

**Files:**
- Create: `client/src/pages/sessions.js`
- Create: `client/src/components/session-select.js`
- Modify: `client/src/router.js`
- Modify: `client/src/components/topbar.js`
- Modify: `client/src/app-context.js`
- Modify: `client/styles.css`
- Test: `tests/test_v4_client_sessions.py`

**Interfaces:**
- AppProvider exposes sessions, appState, currentSession, watchedSessions, switch/watch actions.

- [x] Write static/browser-contract tests for `/sessions`, sortable/searchable session table, watch/current/action columns and topbar session button/tooltip.
- [x] Implement session API state in context and route/navigation.
- [x] Implement Sessions page with clickable sortable headers and `Switch`.
- [x] Update topbar global language to act on current session only.
- [x] Run client tests + JS syntax.

### Task 7: Tasks and Flow page-local multi-session scopes

**Files:**
- Modify: `client/src/pages/tasks.js`
- Modify: `client/src/pages/flow.js`
- Modify: `client/src/components/task-drawer.js`
- Modify: `client/src/components/task-history.js`
- Modify: `client/src/task-graph.js`
- Test: `tests/test_v4_scopes.py`

**Interfaces:**
- Session scope stored in `?sessions=` and defaults to current session.
- Node/task identity includes session id; no cross-session edges.

- [x] Write tests for selector visibility only with multiple watched sessions and URL persistence.
- [x] Implement page-local selector with Current/All watched shortcuts.
- [x] Add session badges to Tasks and task drawer.
- [x] Render Flow per-session lanes/subgraphs and session-specific layout APIs.
- [x] Verify dependencies never cross sessions.

### Task 8: All-session Translations aggregation and header sorting

**Files:**
- Modify: `client/src/pages/translations.js`
- Modify: `client/src/translation-tree.js`
- Test: `tests/test_v4_translations.py`

**Interfaces:**
- Task parent identity is `(sessionId, uid)`.
- Child jobs include `{sessionId, id}`.

- [x] Write failing tests for duplicate task ids in different sessions staying separate, Session column/filter and header click sorting.
- [x] Use TanStack controlled `sorting` + `getSortedRowModel` and `column.getToggleSortingHandler()`; keep expanding subRows.
- [x] Adapt bulk selection/actions to session-qualified job refs.
- [x] Verify all known cached sessions appear even when unwatched.

### Task 9: Global history/notification panel

**Files:**
- Modify: `client/src/components/overlays.js`
- Modify: `client/src/components/task-history.js`
- Test: `tests/test_v4_history.py`

**Interfaces:**
- Canonical task source events remain EN.
- Translation completion remains a distinct `translated` event.

- [x] Write failing tests for session badge, search/session/type/sort controls, semantic icons and collapsed default.
- [x] Implement filters and collapsed event cards.
- [x] Ensure notification modal shows originating session.
- [x] Run history tests.

### Task 10: Migration, documentation and final artifact verification

**Files:**
- Modify: `README.md`
- Modify: `docs/v3-migration.md`
- Create: `docs/v4-migration.md`
- Test: all tests

- [x] Document process split, no-session-id launch, app-state vs global Settings, session discovery fallback and v3 cache reuse.
- [x] Run full Python suite, Bash syntax, Python compile and every JS `node --check`.
- [x] Run fake multi-session HTTP smoke: two transcripts, switch/watch, task update from both, per-session language isolation, common translation aggregation.
- [x] Package `claude-todos-v4.0.0.zip`, compute SHA-256, re-extract and repeat full verification against the artifact.
