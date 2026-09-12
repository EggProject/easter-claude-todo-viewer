# Product

## Register

brand

## Users

**Primary: AI coding agents (LLMs).** The design system is loaded mid-task by an
agent building an EggProject surface. Its job: work from the system's tokens,
components and brand rules instead of inventing colors, type, or spacing. Success
for this user is on-brand, contrast-correct, light/dark-consistent UI that reads
as hand-built.

**Secondary: human developers at EggProject** who build, extend, or maintain
surfaces — components, app shells, example pages, trading UIs.

The system is **bilingual (English + Hungarian)**; the self-hosted type stack
carries the full Hungarian diacritics (latin-ext). Either way the context is the
same: someone is mid-build and needs the one source of truth, not a second
opinion.

## Product Purpose

The **single source-of-truth design system for EggProject** — an independent
software-development studio in Budapest, HU. It exists so that 90+ surfaces never
drift: there is exactly one token file (`colors_and_type.css`), one set of
self-hosted fonts, one light/dark theme runtime, and one component framework. The
deliverable is the design itself — the look, voice, and discipline of the
EggProject brand made reusable.

The family spans both faces of the brand: warm-paper **editorial/marketing**
surfaces and cool-slate **product/app** surfaces, plus shared app shells, full
example pages, and trading UIs. Success looks like: any agent or developer, on any
of these surfaces, reaches for a semantic role token and gets both themes and
AA/AAA contrast for free — with zero hand-picked hex values.

## Brand Personality

**calm · senior · precise · quietly elegant.** Plainspoken copy — no hype, no
emoji, no exclamation. The voice of a senior craftsperson who has nothing to
prove.

The two-color split *is* the personality, in both themes:

- **Gold marks where you can act** — „az arany a fényé". Every primary button,
  focus ring, selected state and progress fill is gold. Rare and deliberate.
- **Sapphire is the brand's voice** — „a kék a márkáé". Explanatory highlights,
  info chrome, brand links, and the bold headline flourish. Never the primary
  action.

Set on **warm paper** by day (light) or **warm graphite** by night (dark) —
„Éjszakai műszak". Warmth is carried by accent, typography and surface
temperature, never by shouting.

## Anti-references

What the EggProject design system must **not** look or feel like:

- **Cold "server-rack" dark.** Pure-black backgrounds and a cold-blue tone with no
  warmth. EggProject's dark theme is deliberately *warm graphite* with a gold
  tonal tint, not a black hole.
- **Hype / emoji / showiness.** Marketing-shout copy, emoji status indicators,
  oversized shouting clamp headlines. Status is a colored-dot pill, never an emoji.
- **Overdone motion.** Bounce, shake, spin, parallax, particle effects, or
  orchestrated page-level entrances. Motion is restrained and conveys state.
- **Geek SaaS clichés.** Purple-gradient dark mode, neon accents, glassmorphism as
  a default, the hero-metric template (big number + gradient), and identical
  icon-plus-heading card grids repeated down the page.

## Design Principles

1. **One source of truth.** Correctness — contrast, light/dark lockstep — comes
   from a single owned token file. Wherever the system lives there is exactly one
   place a token is defined; cherry-picking values or re-declaring an `--ep-`
   token elsewhere is the bug.
2. **Semantic over raw.** Author against role tokens (`--ep-bg`, `--ep-accent`),
   never raw scale stops. You inherit both themes and verified contrast for free;
   reaching for a raw hex is the usual cause of a surface that breaks in dark mode.
3. **Two-color discipline.** Gold acts, sapphire speaks, everything else is quiet.
   Restraint is not timidity here — it is the brand. The rarity of gold is the
   point.
4. **Quiet senior craft.** Plainspoken, no hype; the system disappears into the
   work. Calm and precise beats clever and loud, every time.
5. **Practice what you preach.** A design system must itself be exemplary — every
   token pair is contrast-checked, every surface is bilingual-ready, every ambient
   animation is reduced-motion-safe. The system teaches by example.

## Accessibility & Inclusion

- **WCAG 2.1 AA minimum, most pairs AAA.** Every foreground/background pairing is
  contrast-verified, with the ratio commented next to the token in the CSS. No
  ad-hoc text/surface colors — they will likely fall below threshold.
- **Reduced motion is honored.** Ambient/scroll-reveal effects are gated on
  `prefers-reduced-motion`; data-dense product chrome never animates ambiently.
- **Not color alone.** Status is communicated with the colored-dot pill pattern
  *plus text*, never color or emoji on its own.
- **Bilingual by default.** English + Hungarian, with self-hosted latin-ext fonts
  so every Hungarian diacritic renders correctly. No Google Fonts CDN.
- **Dedicated focus tokens.** Focus rings are first-class tokens (gold by default,
  sapphire for second-voice controls), never removed.
