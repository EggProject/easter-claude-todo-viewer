# Marketing Site — multi-page example

A multi-page example: a small marketing site recreating the EggProject brand — hero with code visual, services grid (with one dark featured card), selected-work list, quote block, dark CTA band, footer.

## Files
- `index.html` — entry; sets up React + Babel and mounts `<MarketingSite />`.
- `MarketingSite.jsx` — all top-level components (TopNav, Hero, Services, SelectedWork, Quote, CTABand, Footer).
- `site.css` — visual layer. Imports `colors_and_type.css` from skill A (`../../../eggproject-design/`).

## Components
- **TopNav** — sticky pill-shaped translucent header with blurred backdrop.
- **Hero** — split layout. Display headline (Roboto with bold sapphire accent), lead copy, primary + ghost CTA, three editorial "proof" stats, code-card visual with floating status badge.
- **LogoStrip** — client name strip set in display italic (no fake logos drawn).
- **Services** — 2×2 grid with one dark "featured" card spanning two rows.
- **SelectedWork** — list-style work index, hover slides padding in.
- **Quote** — large display pull quote on warm paper card.
- **CTABand** — dark band with subtle radial sapphire glow + yolk CTA.
- **Footer** — three-column links, brand top, mono row at bottom.

## Visual notes
- Background is paper-cream (`--ep-paper-50`), not white. White is reserved for elevated surfaces.
- Display copy uses italic for the second word/phrase — signature flourish.
- Code card is tilted ~−1.2° and shadowed; status badge sits offset for editorial composition.
- Hover states translate cards −1px and add `--ep-shadow-md`.
