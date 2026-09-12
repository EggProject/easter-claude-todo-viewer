---
name: eggproject-design-app-common
description: >-
  EggProject Design System — shared app shells. Provides the 5 canonical page
  shells (_shell.css / _shell.js) and a shell gallery (shells.html) consumed by
  BOTH the web-app examples (skill C) and admin-app examples (skill D).

  Use this skill when you need to: understand or extend the 5 page-shell layouts
  (Sidebar, Top-nav, Marketing, Docs, Focus) that all demo pages are built on;
  add or modify shell-level chrome (sidebar rail, topbar, marketing column, docs
  3-col layout, focus brand bar); browse the shell gallery or demo hub; wire
  _shell.js sidebar collapse behaviour into a new page.

  DO NOT use this skill for individual UI components (buttons, cards, badges) —
  use eggproject-design-components instead. DO NOT use for full example pages
  (analytics, billing, signin) — use eggproject-design-web-app-examples or
  eggproject-design-admin-app-examples. DO NOT use for design tokens, brand
  colours, typography — use eggproject-design.
metadata:
  tag: "[common]"
  skill-family: eggproject-design
  exports: "_shell.css, _shell.js"
  consumed-by: "eggproject-design-web-app-examples, eggproject-design-admin-app-examples"
---

# EggProject Design — App Common (Skill E)

Skill E owns the **shell layer** — the structural frames every demo page sits on.
It is a shared dependency of skills C (web-app examples) and D (admin-app examples).

## Two modes — read this first

**Default — you are building in another project.** This skill is a *source you
work from*, not a library you link to. Copy `_shell.css` (and `_shell.js` for the
sidebar shells) into the target project along with A's token layer and whichever
B component CSS the shell's chrome uses, then rewrite every `../eggproject-*/…`
path to that project's own layout — left as they are, they resolve to nothing
outside this repo. `_shell.css` `@import`s A's tokens, so that import is the one
you must repoint first.

**Exception — you are maintaining this skill family.** Only then do the
never-copy rules apply: skills reference each other's files by relative
cross-skill path, and no asset is duplicated between skills. The iron rules below
are scoped to that second mode.

## Shell inventory

| # | Shell | CSS selector | Surface | Used by |
|---|---|---|---|---|
| 1 | Sidebar app | `.app` | cool slate | analytics, billing, inbox (D) |
| 2 | Top-nav app | `.app-tn` | cool slate | settings, live-trading (D/F) |
| 3 | Marketing | `.mkt` | warm paper | pricing, status (C) |
| 4 | Docs | `.docs-top` | warm paper | docs (C) |
| 5 | Focus | `.focus` | neutral/ink | signin, onboarding, not-found (C) |

## File map

```
eggproject-design-app-common/
├── SKILL.md          <- this file
├── _shell.css        <- all 5 shell layouts; @import A's tokens (cross-skill)
├── _shell.js         <- sidebar collapse toggle (vanilla JS, no deps)
├── shells.html       <- shell gallery / visual index (links the 5 skeletons)
├── index.html        <- demo hub (links to pages in C, D, F)
└── skeletons/        <- the 5 annotated shell-skeleton demo pages
    ├── shell-sidebar.html    <- Sidebar app shell (.app)
    ├── shell-topnav.html     <- Top-nav app shell (.app-tn)
    ├── shell-marketing.html  <- Marketing shell (.mkt)
    ├── shell-docs.html       <- Docs shell (.docs-top)
    └── shell-focus.html      <- Focus shell (.focus)
```

E is the single home for ALL shell-related files: `_shell.css`, `_shell.js`,
the 5 shell-skeleton demo pages (`skeletons/`), the gallery (`shells.html`),
and the demo hub (`index.html`). The skeletons import `_shell.css`/`_shell.js`
locally (`../_shell.css`, `../_shell.js`) and reference A tokens + B components
cross-skill (`../../eggproject-design/...`, `../../eggproject-design-components/...`).

## Cross-skill imports (repo-internal)

Within this skill family, all cross-skill references use relative paths — no CDN,
and no duplicating a sibling skill's file into E. These are the paths to *rewrite*
when a shell is copied out into another project.

| What | From skill | Relative path (from skill root) |
|---|---|---|
| Token CSS | A (eggproject-design) | `../eggproject-design/colors_and_type.css` |
| Per-component CSS | B (eggproject-design-components) | `../eggproject-design-components/components/<name>/<name>.css` |
| Component bundle (optional) | B | `../eggproject-design-components/styles.css` |
| Theme toggle JS | A | `../eggproject-design/preview/_theme.js` |
| Logo mark SVG | A | `../eggproject-design/assets/logo-mark.svg` |

The skeletons pull only the per-component CSS they use (e.g. button, input,
nav, avatar, breadcrumb, kbd) by individual path — they do NOT load B's bundle.

When C or D pages import E's shells (depth-1 from their skill root):
- `_shell.css`: `../eggproject-design-app-common/_shell.css`
- `_shell.js`:  `../eggproject-design-app-common/_shell.js`

## Iron rules (inherited — inside this skill family)

These govern edits to E's own files in this repo, not what a consuming project does.

1. No CSS custom property definitions in E — ALL tokens live in A's colors_and_type.css.
2. No CDN links. Every external asset is either cross-skill-imported or vendored in B.
3. No component styles duplicated from B into E — reference B's CSS by path.
4. _shell.css imports A's tokens via @import url('../eggproject-design/colors_and_type.css').
5. Do not add component implementations — shells are structural chrome only.

## Shell modifier classes

**`.app` (Sidebar)**
- `.app--collapsed` — icon-only rail (toggled by _shell.js via [data-app-side-toggle])
- `.app-top--portal` — greeting-style topbar variant (client-portal kit)

**`.mkt` (Marketing)**
- `.mkt-section--hero` — hero band spacing/treatment
- `.mkt-section--ink` — dark ink section band

**`.focus` (Focus)**
- `.focus--split` — split-panel layout (editorial left + form right, e.g. signin)
- `.focus--ink` — dark ink surface (e.g. 404 page)

## Sidebar collapse

`_shell.js` (IIFE, no deps) wires [data-app-side-toggle] -> toggles .app--collapsed
on .app, persists state to localStorage['ep-sidebar-collapsed'].
Load it as `<script src="_shell.js" defer></script>` on any Sidebar-shell page.
