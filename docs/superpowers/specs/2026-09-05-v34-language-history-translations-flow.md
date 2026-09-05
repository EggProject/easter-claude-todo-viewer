# Claude Todos v3.4.0 Design

## Goals

- Make task display language explicit per task and separate it from translation availability.
- Make global language a bulk setter plus default for future tasks, not an OR override.
- Rework Translations into one parent row per task with child rows per text-fingerprint translation lifecycle.
- Make task history truthful: source events remain in their original English; successful translations become later translation events.
- Render text history with a real unified word diff and simple field changes with iconized before/after rows.
- Make all history entries collapsed by default, filterable and sortable.
- Make Flow auto-layout keep disconnected tasks in stable numeric order after the connected dependency graph, increase spacing, and visually mark every in-progress task.
- Keep existing v3.3 bulk translation controls, concurrency limits, fullscreen Flow, retry lifecycle semantics, queue and SSE behavior.

## Language state

Each task record stores `viewLanguage: "en" | "hu"`. `viewLanguage` means what the user wants to see. It is independent of whether the current title/description fingerprint has a validated Hungarian translation.

Session metadata stores `globalLanguage`. In v3.4 it is the default for newly created tasks and a bulk setter when the global switch changes.

Rules:

1. New task -> `viewLanguage = session.globalLanguage`.
2. Global EN -> set session global to EN and set every existing task `viewLanguage = EN`.
3. Global HU -> set session global to HU, set every existing task `viewLanguage = HU`, then translate current fingerprints that are not valid and are not already queued/running.
4. Task EN -> task `viewLanguage = EN`; cached HU translation is retained and active translation is not automatically canceled.
5. Task HU -> task `viewLanguage = HU`; if current fingerprint has a valid HU translation, switch display immediately with no new job; otherwise queue current fingerprint translation.
6. A task text update does not change `viewLanguage`. If it is HU, show new source EN until its new current fingerprint is translated, then switch to HU automatically. If it is EN, do not auto-translate merely because the session global default is HU.
7. All user-visible task titles/descriptions use the same resolved display pair derived from `viewLanguage + current translation validity`, including Tasks, Flow, dependency labels, drawer, and Translations parent rows.

API state exposes:

- `viewLanguage`: desired per-task language.
- `translationState`: `missing | queued | translating | validating | retrying | ready | failed` for current fingerprint.
- `effectiveLanguage`: actual currently-renderable language (`hu` only when current fingerprint has valid HU translation and viewLanguage is HU; otherwise `en`).
- compatibility aliases `languagePreference` and `desiredLanguage` equal `viewLanguage` for existing frontend/tests.

### Migration from v3.3

For task records without `viewLanguage`:

- if session `globalLanguage == hu`, migrate all existing tasks to `viewLanguage = hu`, preserving the display behavior users were seeing under the old global-OR model;
- otherwise use the old `languagePreference` value, defaulting to EN.

## Translation version model

A translation lifecycle remains keyed by `(uid, textFingerprint)`. Retry is a new run inside the same lifecycle. A title/description change produces a new fingerprint and therefore a new child lifecycle.

The Translations page groups lifecycles by task:

- parent: task UID / number / current display title / wanted language / effective language / current translation state / version count;
- children: each fingerprint lifecycle, newest first, including current marker, provider, model, status, attempts, queued time, duration, tokens and actions;
- run/debug detail remains nested under the selected child lifecycle.

Use `@tanstack/react-table@8.21.3` with `getSubRows`, controlled expanded/sorting/rowSelection state, `getExpandedRowModel`, `getSortedRowModel`, and `filterFromLeafRows`-equivalent custom filtering semantics so a parent remains visible when a child matches the search.

Parent selection selects all visible/eligible child lifecycles for bulk actions. Existing Stop/Retry/Delete eligibility remains child-status based. Global Stop All and Retry All Failed remain unchanged.

## History

Raw task history events remain immutable English/source events. v3.4 stops retroactively localizing those old events.

When a translation successfully validates, append a separate deduplicated history event:

- `kind: translated`
- `source: translation`
- same task UID and text fingerprint
- title/description changes from exact source EN to validated HU
- `jobId`, provider/model and `translatedAt` metadata

This makes the chronology truthful: source update first, translation completion later.

Task drawer History:

- all entries collapsed by default;
- text search across type/title/change values;
- type/status multi-filter (`source`, `translation`, status/owner/dependency/text change categories);
- sort newest/oldest;
- iconized summary (e.g. `📌 Status`, `📝 Description`, `🌐 Translation`, `🔒 Dependency`);
- subject/description changes use `react-diff-viewer-continued@4.4.0`, unified view, `DiffMethod.WORDS`;
- simple fields use explicit BEFORE -> AFTER cards;
- translation event text diff naturally shows EN -> HU and is not retroactively applied to the older source event.

## Flow

All in-progress tasks independently receive the `active` style; no singleton current-task concept exists.

Auto arrange:

- ELK layered remains the layout engine for the connected dependency graph;
- increase spacing to node-node 180, between layers 320, edge-node between layers 120 and edge-edge between layers 80;
- connected components use ELK model-order options where useful;
- dependency-disconnected nodes are excluded from the ELK connected graph and positioned explicitly after its rightmost x coordinate, sorted by numeric task ID, in a stable horizontal historical lane;
- disconnected task spacing is 440px horizontally;
- manual drag + persisted positions and reset/fullscreen continue to work.

Flow node data derives state independently for every task, so N tasks with `status=in_progress` yield N `active` nodes.

## Dependencies

Browser import map adds:

- `@tanstack/react-table@8.21.3`
- `react-diff-viewer-continued@4.4.0`

Keep existing pinned React/React Router/React Flow/ELK dependencies.

## Testing

Add regression coverage for:

- global HU bulk sets all task viewLanguage HU;
- individual task EN overrides global HU everywhere;
- cached HU toggles without a new job;
- HU missing translation queues once;
- text change while HU queues new fingerprint; while EN does not;
- v3.3 -> v3.4 migration;
- translation success appends a later `translated` history event;
- source history remains English after translation;
- tree grouping: one task parent, one child per fingerprint lifecycle, retry remains a run not child;
- history UI diff/filter/sort/collapsed contract;
- disconnected Flow numeric ordering after connected graph;
- increased ELK spacing;
- every in-progress task is active;
- bulk action disabled state remains based on eligible child lifecycles;
- all existing v3.3 regression/integration tests updated only where semantics intentionally changed.
