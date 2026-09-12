---
name: eggproject-design-trade-components
description: >-
  Trade and live-data UI for the EggProject design system. Use for trading
  interfaces, live market displays, order blotters, price charts, position
  tables, and real-time financial UIs. Components: TradeTable (dark TanStack
  blotter, sort + multi-select), live-trading demo (Top-nav page: candlestick
  chart, watchlist sparklines, stats strip, recent trades), chart-focus demo.
  Charts use lightweight-charts only, vendored in this skill (F owns the
  lc-wrap component + lightweight-charts). Tokens from eggproject-design; dot,
  feed-indicator, TanStack, React, Babel from eggproject-design-components.
  Triggers: trading, markets, blotter, live price, candlestick, order book,
  positions, P&L, portfolio, watchlist, OHLC, lightweight-charts, financial UI.
  Disambiguation: generic components use eggproject-design-components; tokens
  use eggproject-design; page shells use eggproject-design-app-common.
---

# eggproject-design-trade-components

Trade / live-data domain components and demos for the EggProject design system.

## Two modes — read this first

**Default — you are building in another project.** This skill is a *source you
work from*, not a library you link to. Copy the component into the target project
and own it, then rewrite every `../eggproject-*/…` path — left as they are, they
resolve to nothing outside this repo. These components carry the heaviest closure
in the family, so take all of it:

- `lc-wrap` — `lc-wrap.css`, `LcWrap.jsx`, `lc-charts.js`, this skill's vendored
  `lightweight-charts.standalone.production.js`, plus B's `feed-indicator` **and**
  `dot` CSS (feed-indicator composes dot), plus A's token layer
- `TradeTable` — `tradetable.css`, `TradeTable.jsx`, plus B's `react`,
  `react-dom`, `babel` and `react-table` vendor files, plus A's token layer
- either one, if you also take its demo — A's `preview/_theme.js` and logo SVG,
  and for the full pages E's `_shell.css`

**Exception — you are maintaining this skill family.** Only then do the
never-copy rules apply: skills reference each other's files by relative
cross-skill path, and no asset is duplicated between skills. The iron rules
below are scoped to that second mode.

## Skill overview

**Scope:** Everything for trading / live-data UIs:
- `lc-wrap` — lightweight-charts wrapper, OWNED + vendored here (F)
- `TradeTable` — dark TanStack blotter (sort + multi-select + live stats toolbar)

Demos:
- `demos/live-trading.html` + `demos/live-trading-trades.jsx` — full Top-nav page
- `demos/chart-focus.html` — focused lightweight-charts showcase
- `demos/lc-wrap.html` — lc-wrap component chrome showcase

**Strictly lightweight-charts** for all charts — via this skill's own
`lc-wrap` component, with `lightweight-charts` (v5.2.0) vendored locally here.

## Cross-skill dependency paths (repo-internal)

This skill (F) imports from A and B. Files live at depth indicated below; paths
are relative from that file's location to the sibling skill root. They resolve
only in this repo's sibling layout — treat the tables as the checklist of paths
to rewrite when you copy a component out.

### From components/trade-table/ (depth 3 below skill root)
TradeTable needs only A tokens + B vendors (no charts/dot/feed-indicator).
| Asset | Relative path |
|---|---|
| A tokens CSS | `../../../eggproject-design/colors_and_type.css` |
| B React | `../../../eggproject-design-components/assets/vendor/react.production.min.js` |
| B ReactDOM | `../../../eggproject-design-components/assets/vendor/react-dom.production.min.js` |
| B Babel | `../../../eggproject-design-components/assets/vendor/babel.min.js` |
| B TanStack | `../../../eggproject-design-components/assets/vendor/react-table.production.min.js` |
| A _theme.js | `../../../eggproject-design/preview/_theme.js` |
| A logo | `../../../eggproject-design/assets/logo-mark.svg` |

### From components/lc-wrap/ (depth 3 below skill root)
| Asset | Relative path |
|---|---|
| A tokens CSS | `../../../eggproject-design/colors_and_type.css` |
| B feed-indicator CSS | `../../../eggproject-design-components/components/feed-indicator/feed-indicator.css` |
| F lightweight-charts (local, vendored here) | `../../assets/vendor/lightweight-charts.standalone.production.js` |
| F lc-charts.js (local sibling) | `./lc-charts.js` |
| A _theme.js | `../../../eggproject-design/preview/_theme.js` |
| A logo | `../../../eggproject-design/assets/logo-mark.svg` |

### From demos/ (depth 2 below skill root)
| Asset | Relative path |
|---|---|
| A tokens CSS | `../../eggproject-design/colors_and_type.css` |
| A _shell.css (via E) | `../../eggproject-design-app-common/_shell.css` |
| F lc-wrap CSS (local) | `../components/lc-wrap/lc-wrap.css` |
| B dot CSS | `../../eggproject-design-components/components/dot/dot.css` |
| B feed-indicator CSS | `../../eggproject-design-components/components/feed-indicator/feed-indicator.css` |
| B button CSS | `../../eggproject-design-components/components/button/button.css` |
| B badge CSS | `../../eggproject-design-components/components/badge/badge.css` |
| B avatar CSS | `../../eggproject-design-components/components/avatar/avatar.css` |
| F lightweight-charts (local, vendored here) | `../assets/vendor/lightweight-charts.standalone.production.js` |
| F lc-charts.js (local) | `../components/lc-wrap/lc-charts.js` |
| B React | `../../eggproject-design-components/assets/vendor/react.production.min.js` |
| B ReactDOM | `../../eggproject-design-components/assets/vendor/react-dom.production.min.js` |
| B Babel | `../../eggproject-design-components/assets/vendor/babel.min.js` |
| B TanStack | `../../eggproject-design-components/assets/vendor/react-table.production.min.js` |
| A _theme.js | `../../eggproject-design/preview/_theme.js` |
| A logo | `../../eggproject-design/assets/logo-mark.svg` |

## Files in this skill

```
eggproject-design-trade-components/
├── SKILL.md
├── assets/
│   └── vendor/
│       └── lightweight-charts.standalone.production.js  # vendored HERE (F owns it)
├── components/
│   ├── lc-wrap/                  # lightweight-charts wrapper (owned by F)
│   │   ├── LcWrap.jsx            # React wrapper component
│   │   ├── lc-charts.js          # declarative [data-lc] renderer
│   │   ├── lc-wrap.css           # chrome CSS (imports A tokens + B feed-indicator)
│   │   └── lc-wrap.html          # standalone demo
│   └── trade-table/
│       ├── tradetable.css        # component CSS (imports A tokens)
│       ├── TradeTable.jsx        # React component (TanStack)
│       └── trade-table.html     # standalone demo page
└── demos/
    ├── live-trading.html         # full Top-nav live-markets demo
    ├── live-trading-trades.jsx   # TanStack trades table island
    ├── chart-focus.html          # focused lc-wrap chart demo
    └── lc-wrap.html              # lc-wrap component showcase
```

## Component: lc-wrap (owned + vendored by F)

The lightweight-charts integration. Two ways to use it:
- **Declarative (static)** — `lc-charts.js` auto-inits `[data-lc]` mount nodes
  (it scans `[data-lc]:not([data-lc-ready])`), typically `.line-chart-plot` elements
  inside `.line-chart-wrapper__body`, with a chart kind (`candles | area | line |
  sparkline`) plus `data-lc-*` options (seed, base, vol, drift, count, color, markers).
  Static range wiring is done by `LcCharts.bindRanges(root)` over `.line-chart-wrapper`
  wrappers and their `.line-chart-wrapper__range-button` buttons; the ink theme is read
  from the closest `.line-chart-wrapper--ink` ancestor. (The old `.lc-wrap*` class scheme
  is retired — the canonical class is `.line-chart-wrapper`.)
- **React (consumer-owned)** — `LcWrap.jsx` exposes browser-only `window.LcWrap` +
  `window.LcWrapIconButton`. `LcWrap` is layout/wrapper only and mounts no chart itself;
  the consumer mounts one imperatively via `LcCharts.mount(ref, options)` and drives it
  with the returned `handle.setRange(id)`. For a React-controlled range, do **not** call
  `LcCharts.init()` or `LcCharts.bindRanges()` on those controls (they would add a
  second, DOM-owned selection source that competes with React state). Canonical React
  demo `components/lc-wrap/lc-wrap-react.html`; canonical static demo
  `components/lc-wrap/lc-wrap.html`.

`lc-wrap.css` imports A tokens + B feed-indicator. Both renderers require the
vendored `lightweight-charts.standalone.production.js` to be loaded first (it
sets `window.LightweightCharts`); a missing lib sets `data-lc-error="lib-missing"`.

## Component: TradeTable

Dark-theme TanStack blotter. Sort + multi-row select. Reads `window.ReactTable`.

**Load order in HTML:**
1. `tradetable.css` (pulls A tokens via @import)
2. `react.production.min.js` + `react-dom.production.min.js` (from B vendor)
3. `babel.min.js` (from B vendor)
4. `react-table.production.min.js` (from B vendor — sets `window.ReactTable`)
5. `<script type="text/babel" src="TradeTable.jsx">`
6. Inline `<script type="text/babel">` to mount: `ReactDOM.createRoot(…).render(<TradeTable/>)`

## Demo: live-trading.html

Full Top-nav app shell page. Components used:
- `lc-wrap` + `lc-charts.js` + `lightweight-charts` → candlestick main chart + sparklines
- `dot` → live-status dots in watchlist + topbar
- `feed-indicator` → streaming feed badge in topbar
- TanStack via `live-trading-trades.jsx` → recent trades table
- `button`, `badge`, `avatar` CSS from B

Load order: lightweight-charts → lc-charts.js → React → ReactDOM → Babel →
TanStack → live-trading-trades.jsx (text/babel).

## Vendors

This skill vendors **only** `lightweight-charts` (it owns the `lc-wrap`
integration). Everything else comes from B:
- `assets/vendor/lightweight-charts.standalone.production.js` — vendored HERE (5.2.0)
- `eggproject-design-components/assets/vendor/react-table.production.min.js` — from B
- `eggproject-design-components/assets/vendor/react.production.min.js` — from B
- `eggproject-design-components/assets/vendor/react-dom.production.min.js` — from B
- `eggproject-design-components/assets/vendor/babel.min.js` — from B

## Iron rules (inside this skill family)

These govern edits to F's own files in this repo. A consuming project copies the
files in and repoints the paths — that is not a violation of any of them.

1. NO CDN links — lightweight-charts from this skill's vendor dir, all other JS from B's vendor dir, fonts from A's assets/fonts/.
2. NO token redefinition — all CSS vars from A's `colors_and_type.css`.
3. ONLY lightweight-charts for charts — no other chart library. (This one holds everywhere.)
4. lightweight-charts is vendored ONCE, HERE (F owns lc-wrap) — never re-vendor it in another skill.
5. NEVER duplicate dot/feed-indicator/other component CSS/JSX into this skill — import/link cross-skill.
