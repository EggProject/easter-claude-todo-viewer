# Claude Todos v4.0.0 Multi-Session Design

## Scope

v4 replaces the v3 single-session process model with one long-running multi-session backend daemon and one separately served React SPA. The backend discovers Claude Code CLI sessions directly from local JSONL transcripts under `CLAUDE_CONFIG_DIR/projects`; it must not import or depend on the Claude Agent SDK.

## Process model

Two launchers are shipped:

- `./start-server.sh` starts the backend on `127.0.0.1:8765` by default.
- `./start-client.sh` starts the SPA server on `127.0.0.1:8766` by default and opens the browser unless disabled.

No session id is accepted by either launcher.

The client and backend are different origins. The backend allows only configured local client origins (default `http://127.0.0.1:8766` and `http://localhost:8766`) for CORS/API/SSE. Never emit wildcard CORS.

## Global vs session state

`~/.claude-todos/config.json` remains fully global. Provider/model/base URL/API key/provider concurrency/prompt migration/logging are never session-specific.

`~/.claude-todos/app-state.json` contains only application navigation/watch state:

```json
{
  "schemaVersion": 1,
  "currentSessionId": "...",
  "watchedSessionIds": ["...", "..."]
}
```

Every current session must also be watched. Switching to an unwatched session automatically watches it. On first v4 startup with no app state, select the most recently modified discovered session as current and watched.

Per-session cache remains under the existing v3 cache structure and retains session global language, task `viewLanguage`, translations, history and Flow layout. A newly discovered session with no prior cache starts global EN.

## Session discovery without Claude SDK

Scan `CLAUDE_CONFIG_DIR/projects/*/*.jsonl`, excluding nested subagent JSONL files. Session id is the transcript filename stem. `stat()` provides file size and last modification time. Read JSONL best-effort to derive:

- cwd / project path;
- created timestamp (earliest transcript timestamp, fallback file ctime/mtime);
- last activity timestamp (latest transcript timestamp, fallback mtime);
- first user prompt;
- custom title/session name when metadata contains one;
- summary when compact/summary metadata exists;
- git branch when present in transcript records;
- message count;
- task count/deleted task count/translation count from Claude Todos cache when loaded.

Discovery must tolerate malformed/truncated JSONL lines and sessions whose project no longer exists.

Candidate task-list ids for a session are derived without SDK: full session id, `session-<first8>`, project basename, `CLAUDE_CODE_TASK_LIST_ID`, and project `.claude/settings*.json` task-list identifiers when present.

## Session runtime and watching

`MultiSessionRuntime` owns:

- `SessionRegistry`;
- `AppStateStore`;
- one global `Hub` / SSE connection;
- one global translation request queue/thread;
- one shared provider concurrency gate/count;
- global settings/prompt/provider services;
- a lazily-created `DashboardRuntime`-compatible session runtime per known cached/watched/current session, with child translation worker and child watcher disabled.

Watched sessions are polled by one manager watcher loop. Each watched session's task changes are processed by its own StateStore but published to the common event hub with session metadata envelope.

## Shared translation scheduler

There is exactly one translation request queue for all sessions. Every queue item includes `sessionId`. The global worker routes the item to the correct session runtime's translation handler. All StateStores share the same provider concurrency condition/count/limit objects, so e.g. `anthropic.maxConcurrency=2` means two task translation lifecycles total across all sessions.

Translation jobs remain stored per session and always include `sessionId` in aggregated API responses. The Translations page aggregates every discoverable cached session, not merely current/watched sessions.

## API

Backend API is session-explicit:

- `GET /api/sessions`
- `GET /api/app-state`
- `PATCH /api/app-state`
- `POST /api/sessions/:id/switch`
- `POST /api/sessions/:id/watch`
- `DELETE /api/sessions/:id/watch`
- `GET /api/state?sessionIds=A,B`
- `GET /api/history?sessionIds=A,B`
- `GET /api/translations`
- `GET /api/translation-catalog`
- `POST /api/translations/bulk`
- `POST /api/sessions/:id/language`
- `POST /api/sessions/:id/language/cancel`
- `POST /api/sessions/:id/tasks/:uid/language`
- `POST /api/sessions/:id/tasks/:uid/translation/cancel`
- `GET|POST|DELETE /api/sessions/:id/flow-layout`
- existing global Settings/Prompts/provider APIs
- `GET /events`

For compatibility during migration, old current-session `/api/language`, `/api/tasks/...` and `/api/flow-layout` endpoints may delegate to current session, but the new client uses explicit session routes.

## SSE and notifications

One browser EventSource connects to `/events`. Every session-related event payload includes:

```json
{
  "session": {
    "id": "...",
    "label": "...",
    "cwd": "..."
  }
}
```

Notifications from all watched sessions share one modal queue/history panel. Canonical task history source events remain English. Translation completion is a separate history event rather than retroactively translating old task-source events.

## Sessions UI

New `/sessions` route and topbar `🧵 Sessions` nav item. Table fields include watch/current, display name/summary, session id, project cwd, git branch, created, last activity, message count, file size, task count, deleted task count and translation count. Search and clickable sortable headers are required. Action column has `Switch`; watch checkbox supports multi-watch. Current session is visually marked and cannot be unwatched directly.

Topbar session metadata becomes a button linking to `/sessions`. It displays a concise session label + shortened id. Tooltip contains id, cwd, branch, created, last activity, global language and watched state.

## Tasks / Flow session scopes

When only one watched session exists, Tasks and Flow use it/current with no extra selector. When 2+ watched sessions exist, both pages show their own independent page-local session multi-select. URL search param persists scope: `?sessions=A,C`. Controls include `Current` and `All watched` shortcuts. Changing a page scope does not change current session.

Tasks merge records from selected sessions and show a session badge/column. Task uid sent to API is always paired with its owning session id.

Flow renders each selected session as a separate lane/subgraph. No dependency edge may cross sessions. Persist Flow layout per session; multi-session Flow combines session-specific layouts into separated lanes. Node click opens a drawer bound to that node's owning session.

## Translations UI

Translations remains Task -> text fingerprint tree. Parent rows remain one task, not an additional Session parent. Add a sortable/filterable Session column. All known cached sessions are aggregated. Column headers again toggle sorting (`asc -> desc -> none`) using TanStack sorting state; Shift-click multi-sort is supported.

Bulk selection/action works across sessions. Backend bulk action accepts aggregated job references `{sessionId, jobId}` and routes each operation to its owning session runtime.

## History UI

Common notification/history sidebar is global across watched sessions. Source task history remains canonical English. Translation-ready events are separate. Add search, session filter, event-type filter and sort (newest/oldest). Every history item is collapsed by default and expandable. Use semantic icons for event/field type.

Task drawer history remains per-task and source-truthful; translated lifecycle events appear as their own entries.

## Client/server split

Move browser assets to `client/`. `client/serve.py` is a static SPA server with BrowserRouter fallback. It does not proxy API; `client/src/api.js` reads backend base URL from `window.CLAUDE_TODOS_API_BASE` injected by `client/index.html` or defaults to `http://127.0.0.1:8765`.

Move backend entrypoint to `server/main.py`; reusable single-session core may live in `server/session_core.py`. Root `server.py`/`claude-todos.sh` are removed from the supported launch path. Migration documentation explains the new launchers.

## Migration and compatibility

Existing v3.4 per-session cache is reused in place. Do not move or rewrite translation job/history files solely for v4. Create app-state independently. Global Settings and Prompt files remain at existing locations.

## Testing

Tests cover JSONL session discovery, first-run current/watch selection, global Settings behavior, current/watched invariants, multi-session watching/notification envelope, one shared queue/provider limit, per-session language isolation, all-session translation aggregation/bulk actions, session-specific Flow layouts, client/server CORS, Sessions table, page-local Tasks/Flow selectors, sortable Translation headers, and global History filters/collapse behavior.
