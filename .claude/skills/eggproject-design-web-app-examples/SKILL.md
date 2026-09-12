---
name: eggproject-design-web-app-examples
description: >
  Use this skill when building website-style, marketing, or public-facing frontend webapp PAGES
  with the EggProject design system. Triggers include: sign-in / auth pages, pricing pages,
  marketing site / brochure site, onboarding wizards, documentation pages, status / uptime pages,
  404 / not-found pages, pages built ON the public shells (marketing, docs, focus), editorial
  brochure surfaces, and the multi-page marketing-site example.

  DISAMBIGUATE FROM:
  - eggproject-design-admin-app-examples → for dashboard, billing, settings, client portal,
    sidebar-shell or topnav-shell admin pages (use D, not C).
  - eggproject-design-components → for individual UI components (button, card, modal, etc.).
  - eggproject-design-app-common → for the shared shell CSS/_shell.js primitives themselves.

---

# eggproject-design-web-app-examples

Full-page compositions for **website-style / marketing / public-facing** frontends built on the
EggProject design system. Within this repo, every example imports CSS/JS from sibling skills by
relative path — nothing is duplicated between skills.

## Two modes — read this first

**Default — you are building in another project.** These pages are *sources you
work from*, not pages you link to. Copy the example into the target project, then
rewrite every cross-skill path it carries — the list under "Cross-skill import
paths" below is exactly that list, and a copied page breaks the moment one of
them is left unrewritten. Bring along what those paths point at: A's token layer
(`colors_and_type.css` + `tokens/` + `assets/fonts/`), `_theme.js` and the logo
SVG where used, E's `_shell.css` / `_shell.js`, each B component CSS the page
uses, and the vendor JS for any JSX island.

**Exception — you are maintaining this skill family.** Only then do the
never-copy rules apply: skills reference each other's files by relative
cross-skill path, and no asset is duplicated between skills. The iron rules below
are scoped to that second mode.

All examples live under a single **`examples/`** directory: single-page examples are
`examples/<name>.html` (with their `.jsx` island beside them), and the one multi-page example is a
folder, `examples/marketing-site/`. `examples/index.html` is a gallery linking every example.
The marketing site is simply a multi-page example in this same structure — there is no separate kit directory.

## What lives here

Everything sits under one `examples/` directory.

| Path | What it is |
|---|---|
| `examples/index.html` | Gallery — links every example below |
| `examples/signin.html` | Focus·split auth — editorial left panel + form right |
| `examples/pricing.html` | Marketing shell — 3-tier pricing + compare table + FAQ |
| `examples/onboarding.html` | Focus shell — 4-step new-project wizard with stepper |
| `examples/docs.html` | Docs shell — API docs, code blocks, TanStack event table |
| `examples/docs-events.jsx` | React island for docs.html (sortable events table) |
| `examples/status.html` | Marketing shell — public uptime page with services + incidents |
| `examples/not-found.html` | Focus·ink shell — dark editorial 404 page |
| `examples/marketing-site/` | Multi-page example — full brochure site (index.html, MarketingSite.jsx, site.css, README.md) |

## Shell reference (owned by E — eggproject-design-app-common)

| Shell class | Surface | Used by |
|---|---|---|
| `.focus` / `.focus--split` / `.focus--ink` | Neutral / ink, centered body | signin, onboarding, not-found |
| `.mkt` | Warm paper, editorial | pricing, status |
| `.docs-*` | Paper, three-column | docs |

All shell CSS is in `eggproject-design-app-common/_shell.css`. Within this repo, C pages only
import it and never duplicate it; a page copied into another project brings `_shell.css` with it.
The annotated shell **skeletons** (`shell-marketing.html`, `shell-docs.html`, `shell-focus.html`,
plus `shell-sidebar.html` / `shell-topnav.html`) live in skill E under
`eggproject-design-app-common/skeletons/` and are linked from E's `shells.html` gallery — **not** in C.

## Cross-skill import paths (repo-internal)

These resolve only in this repo's sibling layout — they are the paths to rewrite
when you copy a page out. Single-page examples sit at **depth 2** (skill root → `examples/` → file) and use a `../../` prefix.
The multi-page `examples/marketing-site/` example sits one level deeper at **depth 3**
(skill root → `examples/` → `marketing-site/` → file) and uses a `../../../` prefix.

From depth 2, the cross-skill paths are (add one `../` for the marketing-site files):

```
../../eggproject-design/colors_and_type.css          (A — tokens)
../../eggproject-design/preview/_theme.js             (A — theme toggle runtime)
../../eggproject-design/assets/logo-mark.svg          (A — brand assets)
../../eggproject-design-app-common/_shell.css         (E — shells)
../../eggproject-design-app-common/_shell.js          (E — sidebar collapse JS)
../../eggproject-design-components/styles.css         (B — all component CSS via aggregator)
../../eggproject-design-components/components/<name>/<name>.css   (B — individual component CSS)
../../eggproject-design-components/assets/vendor/react.production.min.js   (B — React)
../../eggproject-design-components/assets/vendor/react-dom.production.min.js
../../eggproject-design-components/assets/vendor/babel.min.js
../../eggproject-design-components/assets/vendor/react-table.production.min.js   (TanStack)
```

**Iron rules (for editing the examples in this repo):**
1. NEVER duplicate `colors_and_type.css` or any component CSS into this skill — import from A/B/E.
2. NEVER use CDN URLs (`unpkg`, `jsdelivr`, `googleapis`, `gstatic`, `cdnjs`).
3. NEVER vendor JS here — use B's `assets/vendor/`.
4. Only minimal page-composition CSS belongs in `<style>` blocks or a per-example `site.css`.
5. If a genuinely new component is needed, stop and flag to the user (AskUserQuestion).
6. No new CSS custom properties — if a global token is missing, flag it (belongs in A).

Rules 1, 3 and 5 govern this repo only. In another project you copy the CSS/JS in
and build whatever component that project needs.

## Serving and testing (repo-internal)

For previewing the examples in place; a copied page is served by its own project.

```bash
cd /tmp/build && python3 -m http.server 8185
# Then open: http://localhost:8185/skills/eggproject-design-web-app-examples/examples/index.html
```

Screenshot harness:
```bash
node /tmp/shot.js "http://localhost:8185/skills/eggproject-design-web-app-examples/examples/signin.html" \
  "/path/to/output.png" 1280 900
```
