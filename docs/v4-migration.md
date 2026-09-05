# Migrating Claude Todos v3.4 → v4.0

## Breaking process change

v4 no longer starts with a session id:

```text
OLD
./claude-todos.sh <SESSION_ID> --ui

NEW
./start-server.sh
./start-client.sh
```

The backend is one persistent multi-session daemon and the React client is served separately.

## Existing data is retained

v4 reuses the existing per-session cache tree under `~/.claude-todos/cache`. Task history, translation versions/jobs, per-session language state and Flow layout are not relocated.

Global `~/.claude-todos/config.json` and `~/.claude-todos/prompts/` remain global and unchanged in purpose.

## New app-state

v4 introduces:

```text
~/.claude-todos/app-state.json
```

It stores only:

```json
{
  "schemaVersion": 1,
  "currentSessionId": "...",
  "watchedSessionIds": ["..."]
}
```

This is navigation/watch state, not Settings.

When the file does not exist, the newest discovered session becomes current and watched.

## Session discovery

No Claude Agent SDK is used. v4 scans local Claude transcript JSONL files under `${CLAUDE_CONFIG_DIR:-~/.claude}/projects/*/*.jsonl` and combines those with existing Claude Todos cached sessions.

## Language behavior

Session global language and task `viewLanguage` remain stored per session. Switching the current session only changes which session's global language is exposed in the topbar; it does not copy language state between sessions.

## Translation scheduler

v4 has one global queue and one global provider concurrency budget across sessions. The job/cache files remain session-local.
