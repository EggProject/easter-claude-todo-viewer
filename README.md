# Claude Todos v4.1.0

Multi-session Claude Code Task/Todo inspector with a persistent Python backend daemon and a separate React SPA client.

v4 removes the old `session-id` positional argument. The backend discovers Claude Code sessions directly from local transcript JSONL files and can watch several sessions at once while keeping one session as the current UI context.

## Start

Open two terminals.

### 1. Backend daemon

```bash
chmod +x start-server.sh start-client.sh
./start-server.sh
```

Default backend:

```text
http://127.0.0.1:8765
```

Useful options:

```bash
./start-server.sh --port 8765
./start-server.sh --log-output
./start-server.sh --log-file --log-output
./start-server.sh --client-origin http://127.0.0.1:8766
```

### 2. React client

```bash
./start-client.sh
```

Default client:

```text
http://127.0.0.1:8766
```

Options:

```bash
./start-client.sh --port 8766
./start-client.sh --server-url http://127.0.0.1:8765
./start-client.sh --no-open
```

There is **no session-id argument** anymore. `claude-todos.sh` is only a migration hint and is no longer the supported launcher.

## Architecture

```text
 ~/.claude/projects/*/*.jsonl
          │
          ▼
 ┌───────────────────────────────┐
 │ Claude Todos backend :8765    │
 │                               │
 │ SessionRegistry               │
 │ AppStateStore                 │
 │ Multi-session Watch Manager   │
 │ Common SSE Event Hub          │
 │ One Global Translation Queue  │
 │ Global Settings / Prompts     │
 └───────────────┬───────────────┘
                 │ HTTP + SSE
                 ▼
 ┌───────────────────────────────┐
 │ React SPA client :8766        │
 │ Sessions / Tasks / Flow / ... │
 └───────────────────────────────┘
```

The backend binds only to `127.0.0.1`. The client and backend are separate origins; the backend sends CORS headers only for configured client origins and never uses wildcard CORS.

## No Claude Agent SDK

v4 deliberately has **no dependency on `claude_agent_sdk`**.

Session discovery scans the local Claude Code data directory directly:

```text
${CLAUDE_CONFIG_DIR:-~/.claude}/projects/*/*.jsonl
```

Nested subagent transcripts are ignored. Discovery tolerates malformed/truncated JSONL lines and uses whatever metadata is available from the transcript and filesystem.

Discovered session metadata can include:

- session id;
- custom title / summary / first prompt;
- project cwd;
- git branch;
- created timestamp;
- last activity timestamp;
- transcript row/message count;
- file size;
- task/deleted-task counts from Claude Todos cache;
- translation lifecycle count.

## Current vs watched sessions

v4 uses two independent concepts.

### Current session

Exactly one session is current. It controls:

- the topbar session button;
- the default Tasks/Flow page scope.

Session language is **not** controlled in the header anymore; every session row on `/sessions` owns its EN/HU control.

The current session is always watched. Switching to an unwatched session automatically adds it to the watched set.

### Watched sessions

One or more sessions can be watched simultaneously. Watched sessions are polled for Task/Todo changes and send events into the common notification/history stream.

The application navigation state lives in:

```text
~/.claude-todos/app-state.json
```

Example:

```json
{
  "schemaVersion": 1,
  "currentSessionId": "session-a",
  "watchedSessionIds": ["session-a", "session-b"]
}
```

This is **not Settings**. It only stores navigation/watch state.

On the first v4 run, the most recently active discovered session becomes current and watched automatically.

## Settings are fully global

Settings remain in:

```text
~/.claude-todos/config.json
```

They are shared by every session. This includes:

- translation provider;
- provider model;
- oMLX / Anthropic-compatible base URL;
- API key;
- provider `maxConcurrency`;
- prompt migration behavior.

Prompt files are also global:

```text
~/.claude-todos/prompts/
```

No provider/model/prompt setting is session-specific.

## Sessions page

Route:

```text
/sessions
```

The Sessions table supports search and clickable column sorting. It shows available metadata such as:

```text
Watch | Current | Action | Language | Name / Summary | Session ID | Project | Branch
Created | Last activity | Messages | File size | Tasks | Deleted | Translations
```

`⇄ Switch` changes the current session with one click. The Action column is sticky next to Watch/Current so it remains visible without scrolling to the far-right edge. Switching is optimistic in the client and rolls back only if the backend rejects the change. The current session's watch checkbox is disabled because current always implies watched.

Each row also owns the session EN/HU control. Setting an unwatched session to HU automatically makes it watched first so future task changes can continue to auto-translate.

The topbar session label is a wider responsive button that opens `/sessions`. Its tooltip includes the session id, project, branch, created/last activity timestamps, session language and watched state. Navigation is right-aligned and there is no header-level language switch.

## Session language isolation

Every session keeps its own language state in its own cache.

Example:

```text
Session A globalLanguage = HU
Session B globalLanguage = EN
```

A never-used session starts EN. Switching current A → B changes the session context, while language remains controlled from the corresponding Sessions table row.

Task `viewLanguage`, translation cache, history and Flow layout also stay session-specific.

## Tasks and Flow with multiple watched sessions

When only one session is watched, no extra selector is shown.

When multiple sessions are watched, Tasks and Flow each get their own page-local session selector:

```text
Sessions · 2 selected ▾
☑ Session A
☐ Session B
☑ Session C

[ ★ Current ] [ ☑ All watched ]
```

The selection is stored in the URL:

```text
/tasks?sessions=A,C
/flow?sessions=C
```

Tasks and Flow can therefore show different session scopes without changing the current session.

Tasks are marked with a session badge. Flow renders each selected session as a separate lane/subgraph and never creates dependency edges across sessions. Flow positions remain persisted per owning session.

## One global translation queue

All sessions share one backend translation scheduler:

```text
Session A ─┐
Session B ─┼──▶ Global translation queue
Session C ─┘
```

Provider concurrency is also global. For example:

```json
{
  "translation": {
    "anthropic": {
      "maxConcurrency": 2
    }
  }
}
```

means **two Anthropic-compatible task translation lifecycles total across the whole application**, not two per session.

Translation cache/job files remain physically stored per session.

## Translations page

`/translations` aggregates translation history from **all known sessions**, including sessions that are not currently watched.

The hierarchy remains:

```text
Task parent
  └─ text-fingerprint lifecycle
       └─ Run history
```

There is no additional Session-parent level. Instead, every task/version carries its session identity and the table has a Session column/filter.

All sortable column headers are clickable again. TanStack Table controls the sorting state, including Shift-click multi-sort.

Bulk operations use session-qualified job references, so identical task/job ids in different sessions cannot collide.

## Common notifications and History

There is one browser SSE connection:

```text
GET /events
```

Notifications from every watched session enter the same modal queue and bell sidebar, and every event is labeled with its originating session.

History panel controls include:

- search;
- session filter;
- event-type filter;
- newest/oldest sorting.

History cards are collapsed by default and use semantic icons.

### Source events remain English

Canonical Task events are stored/displayed as the original source event received from Claude. They are **not retroactively translated** when a Hungarian translation becomes available later.

Translation completion is a separate history event, e.g.:

```text
🌍 Translation completed — EN → HU
```

Task drawer history remains restricted to that exact `(sessionId, task uid)`.

## v4.1 stability and loading behavior

### Flow render-loop fix

React Flow keeps a single mutable node state. Backend semantic updates reconcile into that state only when task/edge semantics change; saved positions live in a stable ref rather than a layout object that re-triggers node reconciliation. Programmatic `fitView` / viewport restore is guarded so `onMoveEnd` cannot feed a restore/persist loop. This removes the v4.0 maximum-update-depth feedback path while preserving drag persistence.

### Fast session snapshots

Session JSONL discovery is cached by transcript path plus `(mtime_ns, size)`. Unchanged transcripts are not reparsed. Normal `GET /api/sessions` is snapshot-only; `↻ Refresh discovery` explicitly calls `POST /api/sessions/refresh`. Session task/deleted/translation counters are cached and invalidated only by relevant session mutations or explicit refresh, avoiding repeated filesystem walks while navigating the Sessions table.

Inactive sessions are not instantiated as child runtimes merely to render the Sessions/Translations pages. Their translation/catalog data is read from persisted cache files when needed.

### Startup splash

The client HTML contains a branded splash immediately, before React modules finish loading. App bootstrap keeps the splash visible while the session snapshot, current-session state, global Settings and prompts are loaded; React `Suspense` keeps the same experience while the requested route module loads. History and all-session translation catalogs continue in the background after the shell is usable. Bootstrap failures show the concrete error and a Retry action.

### Task language badges

Session EN/HU control lives on `/sessions`. Task references use a shared badge on Tasks, Flow, drawer/dependencies, notifications/history and Translation task rows:

- `🌐 HU` — HU requested and shown;
- `⏳ HU` — HU requested but current translation is not ready;
- `⚠ HU` — current HU translation failed;
- `✓ HU cached` — task currently shows EN but current HU is cached;
- `EN override` — task explicitly shows EN while its session is HU.

## Per-session cache reuse

Existing v3.4 cache remains in place:

```text
~/.claude-todos/cache/projects/<project>/sessions/<session>/
```

v4 does not move historical Task records, translations, history or Flow layouts merely because the process model changed.

The new `app-state.json` is independent from these caches.

## API overview

```text
GET    /api/sessions
POST   /api/sessions/refresh
GET    /api/app-state
PATCH  /api/app-state

POST   /api/sessions/:id/switch
POST   /api/sessions/:id/watch
DELETE /api/sessions/:id/watch

GET    /api/state?sessionIds=A,B
GET    /api/history?sessionIds=A,B

POST   /api/sessions/:id/language
POST   /api/sessions/:id/language/cancel
POST   /api/sessions/:id/tasks/:uid/language
POST   /api/sessions/:id/tasks/:uid/translation/cancel

GET    /api/translations
GET    /api/translation-catalog
POST   /api/translations/bulk

GET    /api/sessions/:id/flow-layout
POST   /api/sessions/:id/flow-layout
DELETE /api/sessions/:id/flow-layout

GET/POST /api/settings
GET/POST /api/prompts/...
GET       /events
```

## Translation providers

### Antigravity CLI (`agy`)

Configured globally in Settings. Translator and validator remain separate calls.

### Anthropic-compatible API / local oMLX

Default endpoint remains:

```text
http://127.0.0.1:8000
```

The backend, never the browser, talks to the provider. API keys are not returned to the client.

## Logging

```bash
./start-server.sh --log-output
./start-server.sh --log-file --log-output
```

Persistent logs remain under:

```text
~/.claude-todos/logs/
```

## Runtime requirements

- Python 3.9+;
- Bash-compatible shell;
- browser able to load the pinned React/React Router/React Flow/TanStack/diff-viewer ESM dependencies;
- `agy` only when the Antigravity provider is selected;
- reachable Anthropic-compatible server when that provider is selected.

No Claude Agent SDK is required or used.
