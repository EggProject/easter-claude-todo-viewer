# Migrating from v2.7.x to v3.0.0

## What stays compatible

- Existing `~/.claude-todos/cache` task/session data remains the cache root.
- Existing translation job history remains readable by the v3 server.
- EN/HU task preferences and validated cached translations remain usable.
- Existing CLI status/sort/logging flags remain unchanged.

## Configuration

v3 upgrades `~/.claude-todos/config.json` to schema version 3. A legacy `translation.model` is retained as the initial `translation.agy.model`. Select `translation.provider` in Settings to choose `agy` or an Anthropic-compatible API.

## Prompts

On first v3 start, missing files are created under `~/.claude-todos/prompts/`. Subsequent app versions can migrate them using their embedded `builtinVersion` and `baseBuiltinSha256`. Customized prompts are never blindly overwritten: automatic migration makes a backup and attempts a three-way merge; conflicts leave the active file unchanged.

## Browser UI

The v3 dashboard is a React Router SPA. Bookmarks can use `/tasks`, `/execution`, `/flow`, `/translations`, `/prompts` and `/settings`. The server returns `index.html` for those routes on reload.

The UI runtime imports pinned React ecosystem modules from CDN URLs, so the browser needs network access the first time those modules are loaded.

## v4 process migration

v4 replaces the single-session launcher with a multi-session backend daemon plus a separately served React client. See `docs/v4-migration.md` for the new `start-server.sh` / `start-client.sh` workflow, current-vs-watched session state, and cache compatibility details.
