---
name: eggproject-design-skills-develop
description: Developer guide for building and maintaining the eggproject design skill family in THIS repo. Use when developing, modifying, or debugging the structure and authoring of skills A-H (frontmatter, file layout, build conventions); for broken file/import references use eggproject-design-skills-integrity-checker. Do NOT use for consuming or applying the design system — this skill is for contributors who maintain the skill codebase itself.
---

# eggproject-design-skills-develop

Developer guide for THIS repo. Encodes the working rules, infra learnings, and skill family map every contributor must know before touching the codebase.

---

## 1. Mission Development Rules

These rules are mandatory. No exceptions.

### Rule 1 — Todo List Discipline

Maintain a detailed Markdown todo list for every development session.

- Format: checked/unchecked checkboxes with sub-tasks when needed.
- Keep the list current — update it after every completed step, not just at the end.
- **Hard cap: never let completed items exceed 5 visible entries.** When you accumulate a 6th completed item, immediately prune the oldest completed ones. Pruned items are gone — do not archive them inline.
- Rationale: a bloated done list obscures what is still open and slows orientation after context switches.

### Rule 2 — Browser Screenshot Testing (Mandatory for All Local HTML)

"No errors in the console" and "code looks right" are NOT sufficient verification.
Every local HTML file MUST be tested by:
1. Starting an HTTP server (e.g., `python3 -m http.server 8080` or `npx serve`) with docroot = the `.claude/skills/` parent directory so all cross-skill relative paths resolve correctly.
2. Loading the page in Chromium/headless-shell.
3. Taking a SCREENSHOT and READING it via the Read tool to visually verify the layout renders.

See `references/infra-learnings.md` §2 for the exact Playwright + headless-shell recipe that works in this sandbox environment.

### Rule 3 — Mandatory Skills

Every development session that creates or modifies skills MUST invoke:
- `sequential-thinking` — for multi-step planning; scope adjustments inline.
- `skill-creator` — the ONLY tool for creating or modifying skills (see Rule 4).
- `/plan` — invoke the Plan agent to design the build strategy before writing code.

Do not skip any of these even for "small" changes. They exist because skipping them caused real regressions in prior sessions.

### Rule 4 — Skills Created/Modified Only via skill-creator

The `skill-creator` skill is the sole sanctioned mechanism for:
- Creating a new skill directory and SKILL.md.
- Modifying an existing skill's SKILL.md.
- Validating a skill (quick_validate + eval).

Never manually rename, restructure, or overwrite a skill's SKILL.md outside of `skill-creator`. Validation (quick_validate.py) is mandatory after every create/modify cycle — a skill that fails quick_validate is not done.

### Rule 5 — Continuous Git Commits + Worktree-Based Work

- Every logical unit of work gets its own git commit. Do not batch unrelated changes.
- All development work MUST happen in a git worktree (not directly on the main branch checkout).
- See `references/infra-learnings.md` §1 for the git lock-file workaround that is mandatory in this environment.

### Rule 6 — No Abbreviations (CSS Classes AND JS Identifiers)

HARD RULE: use full, descriptive names everywhere. No abbreviations in CSS class names OR in
JavaScript/JSX identifiers.

- CSS: `data-table` not `dt`, `line-chart` not `lc`, `command-palette` not `cmdk`,
  `accordion` not `acc`, `date-picker` not `dp`, `__description` not `__desc`.
- JS/JSX: `position` not `pos`, `index` not `idx`, `element` not `el`, `Token` not `Tok`.
- Applies to new code and to any code you touch. This was enforced repo-wide in tasks T8a (CSS)
  and T8b (JS/JSX) — do not reintroduce abbreviations.

### Rule 7 — Build in /tmp, Publish by Directory-Rename, Refresh the Report

- Build and iterate in a sandbox-native `/tmp/work` copy — the mount forbids file deletion, so
  never scaffold/`npm install`/overwrite inside the repo.
- Publish a validated skill by RENAMING the old dir into `.removed-trash/` and copying the fresh
  `/tmp/work` dir into place (publish-by-dir-rename) — see `references/infra-learnings.md` §3a.
- After EVERY task, regenerate the data-driven report:
  `python3 docs/report/scripts/gen_catalog.py` — see §6. A stale report is a defect.
  The report now offers Skill + Kategória (category) filter chips alongside the search box,
  and its `⚠ csonk` (stub) heuristic is corrected: a component counts as a stub ONLY when it
  has a `.css` but NO `.jsx` AND NO `.html` demo — CSS-only components that ship a `.html`
  demo are complete, not stubs.

---

## 2. Infrastructure Learnings

**Read `references/infra-learnings.md` for the full technical procedures.**
Below is the summary of what was discovered during initial development.

### 2a — Git: Stale Lock Files

The repo mount FORBIDS `unlink` (cannot delete files). Git's post-op cleanup leaves `.lock` files it cannot remove. Each stale lock blocks the NEXT git call with "Unable to create lock file."

Solution: a thin wrapper that RENAMES stale `*.lock` files into a trash directory before every git operation. The locks and trash dir accumulate harmlessly; the user clears them on their OS.

### 2b — Screenshot Harness

This sandboxed Ubuntu is minimal. Playwright headless-shell requires `libXdamage.so.1` which is not pre-installed.

Fix: `apt-get update`, `apt-get download libxdamage1`, `dpkg -x` into a local dir, then set `LD_LIBRARY_PATH` to that dir when launching chromium. A reusable Node + Playwright script takes a URL, screenshots it to PNG, prints console/page/request errors, and saves the PNG to the session outputs dir so the agent can READ it.

### 2c — Build in /tmp, Not the Mount

Because the mount cannot delete files, never run `npm install`, scaffold throwaway work, or iterate inside the repo. Build and iterate in a sandbox-native `/tmp/work` directory. Publish ONLY the final, gated, validated skill into the repo via the publish-by-directory-rename trick (rename the old dir into `.removed-trash/`, then copy the fresh dir in) — see `references/infra-learnings.md` §3a.

### 2d — Cross-Skill Asset Paths (Never Copy)

**Scope: this repo only.** This doctrine governs how the eight skills reference each other on disk. It is NOT advice for a project consuming the design system — there the agent copies the files it needs into the target project and repoints the paths (see `README.md`). Do not restate these rules unscoped in a consumer-facing skill.

**`DESIGN.md` + `PRODUCT.md` live in the skill, not at the repo root.** The real files are `eggproject-design/DESIGN.md` and `eggproject-design/PRODUCT.md`, so a consumer who installed only the skill still has the brand ground truth and the format templates — a skill cannot reference a file outside itself. The repo root carries **relative symlinks** pointing at them, which is where `/impeccable`'s `context.mjs` looks; its `firstExisting()` uses `fs.existsSync`, which follows symlinks, so resolution works and `/impeccable document` writes straight through into the skill. There is no second copy and nothing to keep in sync.

**One failure mode to watch:** a tool that saves by writing a temp file and renaming it over the target will replace the root symlink with a regular file, after which the two silently diverge. After anything regenerates these files, check with `ls -l DESIGN.md PRODUCT.md` — both must still show `->`.

Import CSS/JS between skills via relative filesystem paths — there is no formal `depends_on` API.

Depth rule: a file N levels below its skill root reaches a sibling skill via N `../` hops then `<sibling-skill>/...`.

| Consumer file depth below skill root | Path prefix to reach sibling |
|--------------------------------------|------------------------------|
| 1 (e.g., `skill/styles.css`) | `../sibling-skill/` |
| 2 (e.g., `skill/demos/page.html`) | `../../sibling-skill/` |
| 3 (e.g., `skill/components/btn/btn.css`) | `../../../sibling-skill/` |

**Never copy CSS or JS between skills.** B vendors React/Babel/lucide/TanStack; C/D/E/F reference B's copy at the appropriate relative depth. lightweight-charts is vendored in F (not B); the preview `_theme.js`/`_base.css` live ONLY in A. Fonts live in `eggproject-design/assets/fonts/`. The cross-skill token entry point is still `eggproject-design/colors_and_type.css` — but that file is now a thin `@import` barrel that pulls in the modular `tokens/*.css`; always import the barrel, never a single `tokens/` module or a copy.

---

## 3. Skill Family Map

See `references/skill-family-map.md` for the full dependency diagram and per-file mapping.

| Skill | Tag | One-liner | When to invoke |
|-------|-----|-----------|----------------|
| A — `eggproject-design` | `[design][common]` | Design principles + the token CSS + vendored fonts + the 17 design showcase preview cards + the ONLY copy of `preview/_theme.js` / `preview/_base.css`. `colors_and_type.css` is now a THIN `@import` barrel; the actual tokens live in modular files under `tokens/` (colors, typography, spacing, breakpoints, radius, elevation, motion, theme-light/dark/auto, theme-toggle). `tokens/breakpoints.css` adds the 2026 layout layer: viewport breakpoints sm–2xl plus additive 3xl (FHD/large monitor) and 4xl (QHD/ultrawide, 2560px); true 4K (3840px) is not a breakpoint — handled by the max-width cap and full-bleed sentinel (`--ep-layout-max-full: none`). Also includes large-display container caps, a full-bleed sentinel, and fluid `clamp()` / `dvh` units. The dependency root — everything imports A. | When working on brand, color tokens, typography, spacing, motion, layout/breakpoint tokens, or the 17 showcase preview cards. |
| B — `eggproject-design-components` | `[component]` | All 52 UI components (full shadcn parity) + ONE canonical demo each + a SINGLE gallery (`demos/index.html`) + TanStack data-table + general vendors (React/Babel/lucide/TanStack). lc-wrap and lightweight-charts are NOT here — they live in F. | When adding, modifying, or demoing any reusable UI primitive. |
| C — `eggproject-design-web-app-examples` | `[web-example]` | Multi-page web-app examples under `examples/` (auth, marketing-site, docs, status). No ui_kits, no shell skeletons (references E's shells). Imports A+B+E. | When building or reviewing web-app page compositions. |
| D — `eggproject-design-admin-app-examples` | `[admin-example]` | Multi-page admin examples under `examples/` (dashboards, billing, settings, client-portal). No ui_kits, no shell skeletons (references E's shells). Imports A+B+E. | When building or reviewing admin/dashboard page compositions. |
| E — `eggproject-design-app-common` | `[common]` | ALL shells: the 5 canonical page shells (`_shell.css`/`_shell.js`) + shell gallery + the 5 shell skeletons in `skeletons/` (moved out of C/D). Shared by C and D. | When changing shell layout, navigation, sidebar collapse, or the shell skeletons. |
| F — `eggproject-design-trade-components` | `[trade]` | Trade/live-data domain: OWNS lc-wrap + trade-table and VENDORS lightweight-charts itself. Uses dot + feed-indicator from B. | When building or modifying trade/live-data UI. |
| G — `eggproject-design-skills-integrity-checker` | `[infra]` | Report-only checker: verifies every local import path resolves to an existing file across A–F. | When validating the skill family after structural changes (path audits, post-split verification). |
| H — `eggproject-design-skills-develop` (THIS skill) | `[infra]` | Dev guide for THIS repo: todo discipline, screenshot testing, mandatory skills, lint config. | When onboarding to the repo or needing the dev rules and infra recipes. |

---

## 4. Lint Config — `_adherence.oxlintrc.json`

This file (included in this skill directory) is the repo-wide adherence baseline for oxlint.

What it enforces:
- **No raw hex colors** — any string literal matching `#[0-9a-fA-F]{3,8}` triggers a warning. Use `var(--ep-*)` tokens only.
- **No raw `px` values** — string literals with `NNpx` pattern warn. Use `var(--ep-space-*)` or `var(--ep-radius-*)` tokens.
- **Font allowlist** — only `Roboto` and `JetBrains Mono` are permitted font families. Any other `font-family` value warns.
- **Import-from-index rule** — importing from `components/<name>/internals` (any sub-path other than `index.js`) is forbidden for all component folders (B's 52 plus F's lc-wrap/trade-table) and the `demos/`/`examples/` dirs. Error message: "Import design-system components from 'index.js', not component internals."

The `x-omelette` block in the JSON mirrors the full token list (137 tokens), their `kind` classifications (color/font/spacing/radius/shadow/other), and the allowed font families. This block is machine-readable context for tooling and AI agents.

Run lint:
```sh
npx oxlint --config _adherence.oxlintrc.json <target-dir>
```

See `references/infra-learnings.md` §5 for integration notes.

---

## 5. Bundle and Manifest (Generated Artifacts)

`_ds_bundle.js` and `_ds_manifest.json` were generated SPA artifacts in the legacy monolith. They are tied to a fixed namespace hash (`EggProjectDesignSystem_019e1d`) and become stale when the repo is split.

**Do not copy these into the new skills.** Each skill that needs a bundle should regenerate it for its own namespace, or omit it entirely if the SPA preview is not required. See `docs/skill-breakdown.md` §4.5 for full rationale.

---

## Quick Reference: Prohibited Patterns

```
CDN imports: NONE allowed.
   Bad:  <script src="https://unpkg.com/react@18.3.1/...">
   Good: <script src="../../eggproject-design-components/assets/vendor/react.production.min.js">

Hex colors in CSS/JSX: NONE allowed.
   Bad:  color: #3B82F6;
   Good: color: var(--ep-second);

Raw px in CSS/JSX: NONE allowed.
   Bad:  padding: 16px;
   Good: padding: var(--ep-space-4);

CSS token copying: NEVER copy colors_and_type.css into another skill.
   Bad:  (pasting token vars into component CSS)
   Good: @import '../../../eggproject-design/colors_and_type.css';

Abbreviations in CSS classes / JS identifiers: NONE allowed (Rule 6).
   Bad:  .dt__desc { ... }   const idx = 0;   let el = ...;
   Good: .data-table__description { ... }   const index = 0;   let element = ...;
```
