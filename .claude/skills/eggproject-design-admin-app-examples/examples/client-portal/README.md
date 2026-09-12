# Client Portal — multi-page example

A multi-page example: a web dashboard where EggProject's clients track project progress, hours, invoices, and activity. Cool slate-50 surface (not paper-cream like the marketing site) — this is a working tool, not a brochure.

## Files
- `index.html` — entry; React + Babel + `<Portal />`.
- `Portal.jsx` — portal-specific composition: Sidebar, TopBar, StatCard, ProjectRow, StatusBadge, Avatar, ActivityItem, UpcomingCard. All `pt-*` namespaced.
- `portal.css` — bespoke composition layer (no `@import`; tokens + components arrive via `styles.css` in `index.html`).

Generic primitives (Tooltip, Charts, DataTable, Loading, Splash) live in skill B under `eggproject-design-components/components/<name>/`. The portal mostly defines its own product-specific composition and doesn't import them, but you can drop them into portal pages whenever needed.

## Components
- **Sidebar** — brand, org switcher, primary nav (with badges for counts), settings + user at bottom.
- **TopBar** — display greeting, global search with ⌘K hint, new-brief CTA.
- **StatCard** — 4-up KPIs. One uses the bold display flourish for the value (yolk accent — sparing flourish). One has an inline meter bar.
- **ProjectRow** — list-style; status pill, progress bar, overlapping avatars, last-update mono timestamp.
- **StatusBadge** — pill with dot. Four kinds: progress / review / hold / shipped.
- **UpcomingCard** — dark feature card with sapphire radial glow; floating date tile in cream.
- **ActivityItem** — colored dot + name/action/target inline.

## Visual notes
- App surface = `--ep-slate-50` (cool); cards = white. Marketing site uses paper-cream — keep them distinct.
- Sidebar active item uses solid `--ep-ink-900` (not blue) — blue reserved for accents.
- The bold display flourish appears only in: greeting H1, stat values (when feature/yolk), project names within Upcoming card, and date tile.
- Mono is used for meta data (timestamps, counts, hex values) — never body copy.
