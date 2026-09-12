---
name: eggproject-design-components
description: >
  The EggProject UI component framework — 52 ready-to-use components (full
  shadcn/ui parity plus EP extras), each with per-component CSS that imports
  tokens from eggproject-design. Also home to all vendored JS (React, Babel,
  lucide, TanStack react-table). Use this skill to BUILD or USE any EggProject
  UI component, wire up a data table with TanStack, render live-data atoms (dot,
  feed-indicator), or copy a component HTML/JSX into a page. Triggers: add a
  button, show me a modal, data table with sort/filter, TanStack table, chart
  component, toast notification, tabs component, component library, UI
  components. Disambiguation — NOT for design principles, color/type tokens, or
  brand assets (those are in eggproject-design, skill A). NOT for the shared page
  shells (skill E). NOT for full-page web-app or admin-app examples (skills C/D).
  NOT for trading UIs or lightweight-charts (skill F).
---

# EggProject — Components (skill B)

The UI framework: 52 building blocks, each with its own CSS that imports the
token file from **skill A** (`eggproject-design`). No component defines its own
CSS custom properties — all visual tokens come from A.

## Two modes — read this first

**Default — you are building in another project.** This skill is a *source you
work from*, not a library you link to. Copy the component into the target project
and own it (or re-implement it if your stack differs), then rewrite the
`../eggproject-*/…` paths to that project's own layout — left as they are, they
resolve to nothing outside this repo.

**A component never travels alone.** Take its whole dependency closure:

- always — `<name>.css` + `<Name>.jsx`, plus A's token layer
  (`colors_and_type.css` + `tokens/` + `assets/fonts/`)
- if it composes another component — that component's CSS too
  (`feed-indicator` pulls in `dot`, for example)
- if it is React — `react`, `react-dom` and `babel` from `assets/vendor/`
- if it is a data table — `react-table.production.min.js` as well

The component's own CSS `@import` list is the authoritative closure: read it
before copying, then repoint every `@import` / `<link>` / `<script src>` at your
copies.

**Exception — you are maintaining this skill family** (the `eggproject-design-*`
repo). Only then do the never-copy rules apply: skills reference each other's
files by relative cross-skill path, and no asset is duplicated between skills.
Every "never copy" rule below is scoped to that second mode.

> **Dependency root (within this repo):** every component CSS imports
> `../../../eggproject-design/colors_and_type.css` — never duplicate the token
> file into another skill folder. If a new global token is needed, it goes into
> **A's** `colors_and_type.css`; component-local values stay in the component's
> own CSS.

## Quick start

```html
<!-- Tokens + all components -->
<link rel="stylesheet" href="path/to/eggproject-design-components/styles.css" />

<!-- Or just one component -->
<link rel="stylesheet" href="path/to/eggproject-design-components/components/button/button.css" />

<!-- React/Babel (vendored, no CDN) -->
<script src="path/to/eggproject-design-components/assets/vendor/react.production.min.js"></script>
<script src="path/to/eggproject-design-components/assets/vendor/react-dom.production.min.js"></script>
<script src="path/to/eggproject-design-components/assets/vendor/babel.min.js"></script>
```

`path/to/` assumes the skill folder sits alongside your page — true inside this
repo. In a separate project, copy the referenced files in (see the closure list
above) and point these tags at your copies.

## File layout

```
eggproject-design-components/
  SKILL.md
  styles.css                   ← aggregator: A tokens + all 52 component CSS
  assets/vendor/               ← ALL vendored JS (no CDN ever)
    react.production.min.js          18.3.1
    react-dom.production.min.js      18.3.1
    babel.min.js                     @babel/standalone 7.29.0
    lucide.min.js                    lucide 0.525.0 (pinned)
    react-table.production.min.js    @tanstack/react-table 8.21.3
  components/<name>/
    <Name>.jsx     ← React component, where interactive (Babel in-browser; ~48 of 52)
    <name>.css     ← component CSS; @imports A's tokens (3 hops up)
    <name>.html    ← THE single canonical demo for the component
  demos/
    index.html     ← the single component gallery (links to each canonical demo)
  references/
    component-catalog.md
```

> **One demo per component.** Each component ships exactly one canonical
> `components/<name>/<name>.html` plus one shared gallery `demos/index.html`.
> There are no separate `preview/` or `components-*.html` duplicate demos.

## Component catalog (52 total)

Full shadcn/ui parity is complete — the final batch of **15 shadcn primitives**
(alert-dialog, aspect-ratio, button-group, calendar, carousel, collapsible,
context-menu, hover-card, input-group, input-otp, menubar, resizable,
scroll-area, textarea, toggle) is built, each with a canonical demo and
descriptive (un-abbreviated) class/JS names. See `references/component-catalog.md`.

### shadcn/ui parity (42)
| Component | Folder | shadcn equiv |
|---|---|---|
| Accordion | `accordion` | Accordion |
| Alert | `alert` | Alert |
| Avatar | `avatar` | Avatar |
| Badge + Chip | `badge` | Badge |
| Breadcrumb | `breadcrumb` | Breadcrumb |
| Button | `button` | Button |
| Card | `card` | Card |
| Charts (Bar+Line SVG) | `charts` | Chart |
| Command Palette | `command-palette` | Command |
| Data Table (TanStack) | `data-table` | Data Table + Table |
| Date Picker | `date-picker` | Date Picker |
| Divider | `divider` | Separator |
| Drawer | `drawer` | Drawer / Sheet |
| Form Controls (checkbox/radio/switch) | `form-controls` | Checkbox + Radio + Switch |
| Input | `input` | Input + Label |
| Loading (Progress + Spinner) | `loading` | Progress |
| Menu | `menu` | Dropdown Menu |
| Modal | `modal` | Dialog |
| Nav | `nav` | Navigation Menu |
| Pagination | `pagination` | Pagination |
| Popover | `popover` | Popover |
| Select / Combobox | `select` | Select + Combobox |
| Skeleton | `skeleton` | Skeleton |
| Slider | `slider` | Slider |
| Tabs (Underline/Segmented/Pills) | `tabs` | Tabs + Toggle Group |
| Toast | `toast` | Sonner |
| Tooltip | `tooltip` | Tooltip |
| Alert Dialog | `alert-dialog` | Alert Dialog |
| Aspect Ratio | `aspect-ratio` | Aspect Ratio |
| Calendar | `calendar` | Calendar |
| Carousel | `carousel` | Carousel |
| Collapsible | `collapsible` | Collapsible |
| Context Menu | `context-menu` | Context Menu |
| Hover Card | `hover-card` | Hover Card |
| Input OTP | `input-otp` | Input OTP |
| Menubar | `menubar` | Menubar |
| Resizable | `resizable` | Resizable |
| Scroll Area | `scroll-area` | Scroll Area |
| Textarea | `textarea` | Textarea |
| Toggle | `toggle` | Toggle |
| Button Group | `button-group` | Toggle Group (segmented) |
| Input Group | `input-group` | — (structural) |

### EP extras (no shadcn equiv, 8)
| Component | Folder |
|---|---|
| Code Block | `code-block` |
| Empty State | `empty` |
| File Upload | `file-upload` |
| Kbd | `kbd` |
| Splash | `splash` |
| Stat (KPI) | `stat` |
| Stepper | `stepper` |
| Tag Input | `tag-input` |

### Live-data atoms (trade-leaning, owned here, 2)
| Component | Folder | Notes |
|---|---|---|
| Dot | `dot` | 8 tones × 5 sizes; imported by skill F |
| Feed Indicator | `feed-indicator` | 5 states; imported by skill F |

## CSS import path rules (repo-internal)

These depths describe this repo's sibling layout; they are the paths to *rewrite*
when you copy a component out. Component CSS is at depth 3
(`components/<name>/<name>.css`):
```css
@import url('../../../eggproject-design/colors_and_type.css');
```

`styles.css` is at depth 1:
```css
@import url('../eggproject-design/colors_and_type.css');
```

Gallery HTML at depth 2 (`demos/index.html`):
```html
<link rel="stylesheet" href="../../eggproject-design/colors_and_type.css" />
```

Canonical component demos at depth 3 (`components/<name>/<name>.html`) import A's tokens and theme runtime by cross-skill path:
```html
<link rel="stylesheet" href="../../../eggproject-design/colors_and_type.css" />
<script src="../../../eggproject-design/preview/_theme.js" defer></script>
```

> **Theme runtime lives in A.** `_theme.js` is owned by `eggproject-design` (`preview/_theme.js`); inside this repo B references it cross-skill and keeps no local copy. Copying a demo out? Bring `_theme.js` with it.

> **Rule (repo-internal):** vendor once in B. Skills C/D/E/F reference B's `assets/vendor/` copies — never duplicate them inside this repo. A separate project copies the vendor files it needs in; there is nothing to import across repos.

## JS vendoring

All JS is served from `assets/vendor/`. Zero CDN references in any HTML file.

| File | Package | Version |
|---|---|---|
| `react.production.min.js` | react | 18.3.1 |
| `react-dom.production.min.js` | react-dom | 18.3.1 |
| `babel.min.js` | @babel/standalone | 7.29.0 |
| `lucide.min.js` | lucide | 0.525.0 |
| `react-table.production.min.js` | @tanstack/react-table | 8.21.3 |

## TanStack table rule

`data-table` is the canonical table. Every data table across the system uses
TanStack (`@tanstack/react-table`). The `window.ReactTable` global is provided
by `react-table.production.min.js`.

## For detailed component reference

See `references/component-catalog.md` for per-component props, variants, and usage examples.
