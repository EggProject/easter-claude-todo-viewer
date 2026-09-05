# Claude Todos v3 Dashboard Design

## Goals

- Replace the monolithic vanilla browser UI with a React SPA using React Router and real browser-history routes.
- Split each main page into its own JavaScript module.
- Replace the old dependency tree page with a realtime React Flow execution graph.
- Make translation runs fully diagnosable in the UI: exact instructions, exact rendered prompt, exact raw response, parsed result, deterministic checks, validator request/response, usage and timing.
- Support two translation providers: Antigravity CLI (`agy`) and an Anthropic-compatible HTTP API, defaulting to oMLX at `http://127.0.0.1:8000`.
- Discover Anthropic-compatible models dynamically from `GET /v1/models`.
- Move all translation prompts into versioned editable files under `~/.claude-todos/prompts/` and expose a prompt editor UI.
- Safely migrate built-in prompt updates with backups and three-way merging. `prompts.autoMigrate` defaults to `true`.
- Preserve existing task watching, SSE notifications, translation cache/history, job retry/stop/delete semantics, EN/HU behavior, logging, and CLI rendering.

## Runtime architecture

The Python server remains the source of truth. It watches Claude task/session files, owns translation/cache/history state, serves the SPA and API, and emits SSE invalidation/notification events.

The frontend is a React SPA. Browser routes are handled by React Router; the Python HTTP server falls back to `index.html` for non-API route requests. Page modules are loaded through native ES module dynamic imports. To keep the downloadable tool build-free at runtime, React, ReactDOM, React Router, and React Flow are pinned through an import map to browser ESM packages. No Node process is required to run the dashboard.

Routes:

- `/tasks` and `/tasks/:uid`
- `/execution` and `/execution/:uid`
- `/flow` and `/flow/:uid`
- `/translations` and `/translations/:jobId`
- `/prompts` and `/prompts/:promptId`
- `/settings`

## Frontend state

`AppProvider` owns server state, history, translation jobs, settings, SSE connection and modal queues. Pages consume that shared state. SSE `state-invalidated` causes fresh server reads; the Flow page derives nodes/edges from the refreshed task state, so it updates without browser reload.

Task drawers are route-aware. Clicking a task on Tasks, Execution or Flow navigates to the nested `:uid` route and opens the shared right-hand drawer. Closing the drawer navigates back to the page route.

## Flow page

Use `@xyflow/react`. The server/frontend computes dependency rank (`wave`) from `blockedBy`/`blocks` relationships. Same-wave nodes are parallel-capable; higher waves depend on lower waves.

Visual semantics:

- completed: green, reduced emphasis
- in progress: peach accent and glow
- ready/unblocked pending: lavender/blue emphasis
- blocked pending: muted with lock marker
- a visible execution-frontier band indicates the current wave
- each wave has a label (`Wave 1`, `Wave 2`, ...)
- edges point from prerequisite to dependent task
- task click opens the task drawer
- graph re-renders on SSE state refresh

## Translation provider abstraction

Define a provider interface returning a normalized run result containing provider/model, exact request, exact raw response, parsed structured value, timing, usage, remote/conversation ID and cancellation handle metadata.

### Agy provider

- Uses `agy --output-format stream-json --json-schema ... --model ... --agent ...`.
- Uses the existing custom translator/validator workspace agents.
- Captures exact rendered prompt and complete streamed textual response plus the terminal structured result.
- Process-group cancellation stays supported.

### Anthropic-compatible provider

- Configurable base URL, default `http://127.0.0.1:8000`.
- Optional API key.
- Models fetched server-side from `GET /v1/models`.
- Translation/validation sent server-side to `POST /v1/messages` using top-level `system`, one user message, `model`, and `max_tokens`.
- Browser never receives the configured API key.
- The parser extracts text from Anthropic content blocks and applies the same local structured-result parser, deterministic validation and independent validator workflow.
- HTTP requests are cancellable by the job manager through a per-job cancellation flag/connection close path.

## Translation pipeline correction

Replace opaque placeholders with visible protected spans in the model input. The model sees the literal and its type/context instead of losing grammatical context. The server validates exact preservation of each protected span after parsing.

Markdown validation checks structural constructs rather than physical line count: heading/list/task-list/blockquote/fence hierarchy, inline-code and links. It does not reject harmless natural-language line wrapping.

The validator remains strict about meaning, negation, completeness and technical literals.

## Translation diagnostics

Every job run/attempt persists:

- provider/model
- translator agent/system instructions
- exact rendered translator prompt
- source title/description
- protected-span mapping
- exact raw provider response
- parsed candidate before/after protected-span restoration
- deterministic checks and detailed issues
- validator instructions
- exact validator prompt
- exact raw validator response
- parsed validator verdict/issues
- timing/usage/remote IDs

The Translations UI renders these as labeled emoji sections, not raw JSON dumps. A collapsible raw JSON developer view may exist only as a secondary optional diagnostic.

## Prompt files

User-editable files live under `~/.claude-todos/prompts/`:

- `translator-agent.md`
- `translator-request.md`
- `validator-agent.md`
- `validator-request.md`

Each file has YAML-style metadata with `promptId`, `schemaVersion`, `builtinVersion`, and `baseBuiltinSha256`, followed by the editable body.

Built-in historical versions ship under `server/builtin_prompts/<promptId>/vN.md` so a three-way merge has a real base.

Startup behavior:

1. Ensure prompt directory exists.
2. Missing prompt file: copy the current built-in version.
3. Same version and content: leave unchanged.
4. Older unmodified prompt and `autoMigrate=true`: replace with current built-in.
5. Older customized prompt and `autoMigrate=true`: backup all active prompt files, then 3-way merge base/current/incoming.
6. Clean merge: write migrated version and updated metadata.
7. Conflict: keep active user prompt unchanged, write conflict artifact and expose status in UI.
8. `autoMigrate=false`: do not migrate; report update available.

Config:

```json
{
  "version": 3,
  "prompts": { "autoMigrate": true },
  "translation": {
    "provider": "agy",
    "agy": { "model": "gemini-3.8-flash-high" },
    "anthropic": {
      "baseUrl": "http://127.0.0.1:8000",
      "apiKey": "",
      "model": ""
    }
  }
}
```

## Prompt UI

`/prompts` lists prompt ID, installed version, built-in version and status (`current`, `modified`, `update available`, `conflict`). `/prompts/:promptId` shows the editable body plus read-only metadata and actions: Save, Diff vs built-in, Restore built-in, Migrate/Review conflict.

Required template variables are validated before save. Translator request requires `{{source_title}}` and `{{source_description}}`; validator request requires source and translated values. Protected technical spans are embedded visibly inside those source fields instead of duplicating the task as a second JSON payload. Prompt snapshots are copied into each job so historical debugging is reproducible after later prompt edits.

## Settings UI

Settings includes provider choice, provider-specific model/config fields, prompt auto-migration toggle, model refresh/test connection for Anthropic-compatible provider, and existing translation settings.

## Security and persistence

- Server binds only to `127.0.0.1`.
- Anthropic API key is never returned by API responses; settings returns only `apiKeyConfigured`.
- File writes use temporary files + `os.replace()`.
- Existing cache root remains `~/.claude-todos/cache`.
- Prompt backups/conflicts remain under `~/.claude-todos/prompts`.
- Logs remain opt-in under `~/.claude-todos/logs`.

## Testing

- Existing v2 tests remain as compatibility regression tests where behavior is unchanged.
- Provider tests use protocol-faithful fake agy and fake Anthropic HTTP servers.
- Prompt lifecycle tests cover bootstrap, unchanged upgrade, custom clean merge, conflict, auto-migrate disabled, save validation and restore.
- SPA tests validate server route fallback, page module separation, URL navigation state and SSE-driven refresh.
- Flow tests validate wave assignment, parallel tasks, blocked/ready/current styling and task click route.
- Translation debug tests validate exact prompt/raw-response persistence and human-readable UI sections.
