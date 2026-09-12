---
name: eggproject-design-admin-app-examples
description: >-
  EggProject Design System — admin-app / dashboard / back-office example pages on
  the cool-slate product shell. Use when building or referencing full-page admin
  layouts: analytics dashboards, billing screens, inbox views, settings pages, or
  the multi-page client-portal dashboard.

  Triggers: admin app page, dashboard page, back-office page, internal tool UI,
  analytics dashboard, billing page, inbox screen, settings page, client portal,
  sidebar-shell ADMIN page, top-nav-shell ADMIN page.

  DISAMBIGUATE:
  - Public-facing pages (signin, pricing, docs, status): use
    eggproject-design-web-app-examples (skill C).
  - Individual UI components (buttons, cards, tables, charts): use
    eggproject-design-components (skill B).
  - Page-shell layer (_shell.css / _shell.js): use
    eggproject-design-app-common (skill E).
  - Design tokens, brand colors, typography: use eggproject-design (skill A).

metadata:
  tag: "[admin-example]"
  skill-family: eggproject-design
  imports-from: "A (tokens/fonts), B (components/vendor JS), E (shells)"
  exports: "admin example pages (single-page + multi-page client portal)"
---

# EggProject Design — Admin-App Examples (Skill D)

Skill D contains **full-page compositions for admin-app-style webapps** — dashboards,
billing, settings, inbox, and a multi-page client portal. Within this repo, all examples
compose components from skill B on top of shells from skill E by relative import, without
duplicating or re-defining CSS.

## Two modes — read this first

**Default — you are building in another project.** These pages are *sources you
work from*, not pages you link to. Copy the example into the target project, then
rewrite every cross-skill path it carries — the list under "Cross-skill import
paths" below is exactly that list, and a copied page breaks the moment one of
them is left unrewritten. Bring along what those paths point at: A's token layer
(`colors_and_type.css` + `tokens/` + `assets/fonts/`), `_theme.js` and the logo
SVG where used, E's `_shell.css` / `_shell.js`, each B component CSS the page
uses, and the vendor JS for any TanStack island.

**Exception — you are maintaining this skill family.** Only then does the
never-duplicate rule apply: skills reference each other's files by relative
cross-skill path, and no asset is duplicated between skills. The ownership rules
below are scoped to that second mode.

Everything lives under a single **`examples/`** directory: single-page examples are
`examples/<name>.html` (with their `.jsx` island beside them), and the one multi-page example is a
folder, `examples/client-portal/`. `examples/index.html` is a gallery linking every example.
The client portal is just a multi-page example in this same structure — there is no separate kit
directory.

## Example inventory

Everything sits under one `examples/` directory. `examples/index.html` is a gallery linking
every example below.

### Single-page examples (cool slate surface, [admin-example])

| File | Shell | Components used |
|---|---|---|
| `examples/analytics.html` | Sidebar `.app` | stat, charts (SVG), button, badge, input, tabs, avatar, kbd, divider, breadcrumb |
| `examples/inbox.html` | Sidebar `.app` | button, badge, avatar, input, tabs, kbd, divider, menu, tooltip, tag-input |
| `examples/billing.html` | Sidebar `.app` | stat, data-table (TanStack), badge, alert, button, avatar, input, select, menu, pagination, breadcrumb, kbd |
| `examples/settings.html` | Top-nav `.app-tn` | button, badge, input, select, menu, form-controls, tabs, avatar, alert, divider, kbd, breadcrumb, file-upload |

### JSX islands (TanStack-powered tables)

| File | Mounts on | Engine |
|---|---|---|
| `examples/billing-invoices.jsx` | `#inv-table-mount` | TanStack React Table |
| `examples/settings-members.jsx` | `#members-table-mount` | TanStack React Table |

### Multi-page example

| Example | Files | Surface |
|---|---|---|
| `examples/client-portal/` | `index.html`, `Portal.jsx`, `portal.css`, `README.md` | Cool slate-50 dashboard |

## Cross-skill import paths (repo-internal)

These resolve only in this repo's sibling layout — they are the paths to rewrite
when you copy a page out. Single-page examples sit at **depth 2** (skill root → `examples/` → file) and use a `../../`
prefix (shown below). The multi-page `examples/client-portal/` example sits one level deeper at
**depth 3** and uses a `../../../` prefix — add one `../` to each path below.

```
A tokens:     ../../eggproject-design/colors_and_type.css
A theme.js:   ../../eggproject-design/preview/_theme.js
A logo:       ../../eggproject-design/assets/logo-mark.svg
B styles.css: ../../eggproject-design-components/styles.css
B component:  ../../eggproject-design-components/components/<name>/<name>.css
B React:      ../../eggproject-design-components/assets/vendor/react.production.min.js
B ReactDOM:   ../../eggproject-design-components/assets/vendor/react-dom.production.min.js
B Babel:      ../../eggproject-design-components/assets/vendor/babel.min.js
B TanStack:   ../../eggproject-design-components/assets/vendor/react-table.production.min.js
E _shell.css: ../../eggproject-design-app-common/_shell.css
E _shell.js:  ../../eggproject-design-app-common/_shell.js
```

## CSS ownership (repo-internal)

Tokens: A only. Components: B only. Shell: E only.
Page-specific: thin composition CSS only (style blocks or portal.css).
portal.css has NO @import — tokens arrive via B's styles.css in index.html.

## Shell guide

1. Sidebar app (.app) — cool slate; for analytics, billing, inbox.
2. Top-nav app (.app-tn) — cool slate; for settings.

Both shells from skill E (_shell.css / _shell.js). The annotated shell
**skeletons** (sidebar, top-nav, plus the public ones) now live in skill E under
`eggproject-design-app-common/skeletons/`, linked from E's `shells.html` gallery.

## No-CDN rule

Zero CDN URLs in this skill. All JS/CSS from sibling skills via relative paths.
