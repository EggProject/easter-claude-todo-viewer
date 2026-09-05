# Claude Todos v3 Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Claude Todos v3 with a routed React SPA, realtime React Flow graph, diagnosable translation jobs, agy/Anthropic-compatible providers, and versioned editable prompt migration.

**Architecture:** Keep the Python server as state authority and split its translation responsibilities into focused modules while preserving the existing CLI. The browser becomes a React Router SPA whose page modules use a shared API/SSE context. Provider and prompt managers normalize all translation behavior before the existing cache/job pipeline.

**Tech Stack:** Python 3.9+, Bash 3.2-compatible wrapper, React 19 browser ESM, React Router 8, `@xyflow/react` 12, native browser ES modules/SSE.

**Spec:** `docs/superpowers/specs/2026-09-05-v3-dashboard-design.md`

## Global Constraints

- Runtime HTTP server binds only to `127.0.0.1`.
- Cache stays under `~/.claude-todos/cache`; logs stay opt-in under `~/.claude-todos/logs`.
- Editable prompts live under `~/.claude-todos/prompts`; `prompts.autoMigrate` defaults to `true`.
- Only task title/subject and description are translated.
- Existing validated translations are reused until their source text fingerprint changes.
- Translator and validator remain independent runs.
- Browser receives task text only from the Python server.
- Anthropic API key must never be returned to the browser.

---

### Task 1: Split server configuration, prompt lifecycle and provider abstractions

**Files:**
- Create: `server/__init__.py`
- Create: `server/config.py`
- Create: `server/prompts.py`
- Create: `server/providers/base.py`
- Create: `server/providers/agy.py`
- Create: `server/providers/anthropic.py`
- Create: `server/builtin_prompts/*/v1.md`
- Modify: `server.py`
- Test: `tests/test_v3_config_prompts.py`
- Test: `tests/test_v3_providers.py`

**Interfaces:**
- Produces `AppSettingsStore`, `PromptManager`, `TranslationProvider`, `AgyProvider`, `AnthropicProvider`.
- `TranslationProvider.run(request, job_handle) -> ProviderResult` returns exact request/response diagnostics and parsed structured value.

- [ ] Write failing tests for v3 config defaults, prompt bootstrap/version metadata, clean migration, conflict preservation, auto-migrate disabled, API-key redaction, model discovery, agy normalized output and Anthropic Messages normalization.
- [ ] Run those tests and confirm they fail because v3 modules do not exist.
- [ ] Implement focused modules and built-in prompt files, preserving Python 3.9 syntax.
- [ ] Run tests and confirm they pass.

### Task 2: Correct translation structure validation and persist full diagnostics

**Files:**
- Create: `server/translation.py`
- Modify: `server.py`
- Test: `tests/test_v3_translation_pipeline.py`

**Interfaces:**
- Consumes `TranslationProvider`, `PromptManager`.
- Produces `translate_and_validate(provider, source, prompt_snapshot, job_handle)` and detailed attempt records.

- [ ] Write failing tests showing natural Hungarian line wrapping does not fail, protected technical spans preserve exact literal text while retaining visible context, semantic validator rejection still fails, and each attempt stores exact prompts/raw responses/parsed values/checks.
- [ ] Run tests and confirm failure on the old line-count/opaque-placeholder behavior.
- [ ] Implement visible protected-span rendering/verification and structural Markdown checks without physical line-count equality.
- [ ] Extend job persistence with human-debuggable diagnostic fields and prompt snapshots.
- [ ] Run tests and confirm they pass.

### Task 3: Add v3 server APIs and SPA route fallback

**Files:**
- Modify: `server.py`
- Test: `tests/test_v3_http_api.py`

**Interfaces:**
- Adds `/api/prompts`, `/api/prompts/:id`, `/api/prompts/:id/restore`, `/api/prompts/migrate`, `/api/settings`, `/api/providers/anthropic/models`, `/api/providers/anthropic/test`.
- Non-API GET routes return SPA `index.html`; static `/src/*` and `/styles.css` remain directly served.

- [ ] Write failing HTTP tests for route fallback, prompt APIs, provider settings/model discovery/test connection, key redaction and existing SSE compatibility.
- [ ] Run them to verify failure.
- [ ] Implement endpoints and fallback.
- [ ] Run them to verify pass.

### Task 4: Replace vanilla UI with routed React SPA modules

**Files:**
- Replace: `ui/index.html`
- Replace: `ui/styles.css`
- Delete: `ui/app.js`
- Create: `ui/src/main.js`
- Create: `ui/src/router.js`
- Create: `ui/src/app-context.js`
- Create: `ui/src/api.js`
- Create: `ui/src/components/*.js`
- Create: `ui/src/pages/tasks.js`
- Create: `ui/src/pages/execution.js`
- Create: `ui/src/pages/flow.js`
- Create: `ui/src/pages/translations.js`
- Create: `ui/src/pages/prompts.js`
- Create: `ui/src/pages/settings.js`
- Test: `tests/test_v3_spa.py`

**Interfaces:**
- `AppProvider` exposes state/history/jobs/settings/SSE/refresh and modal actions.
- Each page module is dynamically imported by `router.js`.

- [ ] Write failing static/browser-contract tests for real route URLs, one JS module per page, route-aware task drawer, no legacy `data-view` tabs, and shared SSE state refresh.
- [ ] Run to confirm failure.
- [ ] Implement import-map React SPA and route modules without JSX build requirements.
- [ ] Run tests and syntax-check every JS module.

### Task 5: Implement React Flow execution graph

**Files:**
- Create/Modify: `ui/src/pages/flow.js`
- Create: `ui/src/task-graph.js`
- Modify: `ui/styles.css`
- Test: `tests/test_v3_flow.py`

**Interfaces:**
- `buildTaskGraph(tasks)` returns wave-ranked React Flow nodes/edges and frontier metadata.

- [ ] Write failing graph tests for sequential chain, parallel siblings, blocked task, current frontier and route-on-node-click behavior.
- [ ] Run to confirm failure.
- [ ] Implement wave layout, semantic node styling, wave labels/frontier and React Flow click navigation.
- [ ] Run tests and JS syntax checks.

### Task 6: Build translation diagnostic and prompt/settings experiences

**Files:**
- Modify: `ui/src/pages/translations.js`
- Modify: `ui/src/pages/prompts.js`
- Modify: `ui/src/pages/settings.js`
- Modify: `ui/styles.css`
- Test: `tests/test_v3_translation_ui.py`

**Interfaces:**
- Translations route consumes expanded job diagnostic payloads.
- Prompts route consumes prompt list/detail APIs.
- Settings route consumes provider/model/prompt-migration settings APIs.

- [ ] Write failing tests that require emoji-labeled diagnostic sections, exact prompt/raw response display, no primary raw JSON dump, provider column/filter data, prompt editor/diff/restore/migration controls and Anthropic model refresh/test controls.
- [ ] Run to confirm failure.
- [ ] Implement the pages and controls.
- [ ] Run tests and syntax checks.

### Task 7: Compatibility, docs and packaging

**Files:**
- Modify: `claude-todos.sh`
- Modify: `README.md`
- Create: `docs/v3-migration.md`
- Test: all `tests/test_*.py`

**Interfaces:**
- Shell launches `server.py` with the existing CLI/logging flags.
- Package remains runnable after unzip with no Node build step.

- [ ] Update version/help/readme and document provider/prompt configuration and browser ESM dependency.
- [ ] Run `bash -n`, Python compile, all Python tests, and JS module syntax checks.
- [ ] Exercise a fake Claude session with SSE task update, fake agy translation, fake Anthropic translation/model discovery, prompt migration, retry/cancel/delete, and route fallback.
- [ ] Create `claude-todos-v3.0.0.zip` only after verification succeeds.
