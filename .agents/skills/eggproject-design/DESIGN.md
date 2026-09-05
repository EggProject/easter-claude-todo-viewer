---
name: EggProject Design System
description: Calm, senior, precise — gold marks where you act, sapphire is the voice, on warm paper or warm graphite.
colors:
  gold: "#E3B563"
  gold-hover: "#EFCB85"
  gold-press: "#D9A845"
  gold-deep: "#9A6F26"
  gold-ink: "#16130C"
  sapphire: "#2E5BE0"
  sapphire-bright: "#4F7BEE"
  ink: "#0A1230"
  cream: "#ECE7DA"
  paper-bg: "#FBF9F4"
  paper-elevated: "#FFFFFF"
  paper-sunken: "#F6F3EB"
  paper-border: "#DCD5C3"
  slate-bg: "#F5F7FB"
  graphite-bg: "#0C0D11"
  graphite-sunken: "#080A10"
  graphite-elevated: "#131720"
  graphite-raised: "#181D29"
  success: "#2F9C6A"
  warning: "#D4831A"
  danger: "#C7384E"
  info: "#2E5BE0"
typography:
  display-lg:
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "clamp(56px, 8vw, 96px)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  display:
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "clamp(44px, 6vw, 72px)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  h1:
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  h2:
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  h3:
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  small:
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  overline:
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.14em"
  code:
    fontFamily: "JetBrains Mono, SF Mono, Menlo, monospace"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "12px"
  lg: "18px"
  xl: "26px"
  2xl: "36px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.gold-ink}"
    rounded: "{rounded.md}"
    padding: "11px 18px"
  button-primary-hover:
    backgroundColor: "{colors.gold-hover}"
  button-secondary:
    backgroundColor: "{colors.paper-elevated}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "11px 18px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "var(--ep-accent-fg)"   # AA-tuned gold text — #8A6220 light / #EFCB85 dark; NOT the raw gold action color
    rounded: "{rounded.md}"
    padding: "11px 18px"
  input:
    backgroundColor: "{colors.paper-elevated}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "11px 14px"
  card:
    backgroundColor: "{colors.paper-elevated}"
    rounded: "{rounded.lg}"
    padding: "18px"
  badge:
    rounded: "{rounded.pill}"
    padding: "4px 10px"
---

# Design System: EggProject

## 1. Overview

**Creative North Star: "The Quiet Workshop" — „A csendes műhely"**

EggProject is a senior craftsperson's workshop made into a UI. By day the bench is
**warm paper** (`#FBF9F4`); by night it is **warm graphite** (`#0C0D11`) —
„Éjszakai műszak". In both shifts, **gold is the tool-mark left where you can
act** (`#E3B563`) and **sapphire is the maker's signature** (`#2E5BE0`) — the
headline flourish, the brand links, the explanatory voice. Everything else is
quiet ink on paper or cream on graphite. The personality is **calm · senior ·
precise · quietly elegant**: plainspoken, unhurried, nothing to prove. The tool
disappears into the work.

This system is **token-first and bi-thematic by construction**. Every visual
decision is a `--ep-` custom property owned by a single source file
(`colors_and_type.css`), and the same semantic role names are remapped across
three theme scopes (`:root` light, `[data-theme="dark"]`, `[data-theme="auto"]`),
so light and dark stay in contrast-verified lockstep. Surface *temperature* is a
deliberate brand cue: warm **paper** for editorial/marketing surfaces, cool
**slate** (`#F5F7FB`) for product/app surfaces — warm-vs-cool tells the reader
"brochure vs. tool" before they read a word. The system is bilingual (English +
Hungarian) with self-hosted fonts carrying the full latin-ext diacritics.

It explicitly **rejects** the saturated defaults of its category: no cold
"server-rack" black dark mode, no hype or emoji, no bouncing/parallax/particle
motion, and none of the geek-SaaS clichés (purple-gradient dark themes, neon
accents, glassmorphism-by-default, the hero-metric template, identical
icon-plus-heading card grids). Warmth comes from accent, type and surface
temperature — never from shouting.

**Key Characteristics:**
- **Two-color discipline** — gold acts, sapphire speaks, the rest is quiet.
- **Token-first** — author against semantic roles, get both themes + AA/AAA free.
- **Warm in both lights** — paper by day, graphite by night, never cold black.
- **Restraint as voice** — the rarity of gold is the point.
- **Bilingual & accessible** — EN/HU, WCAG AA minimum (most AAA), reduced-motion safe.

## 2. Colors

A two-voice brand palette set on warm neutrals: a light-valued gold for action, a
saturated sapphire for brand voice, on warm-paper or warm-graphite surfaces.

> **Provenance & naming.** Each entry lists its **creative label** → the real
> **CSS token** → the **exact value** → the **source file** → the **kind**
> (*direct value*, *alias*, or *color-mix base*). The creative labels (Workshop
> Gold, Signature Sapphire, …) are descriptive names **for this document only —
> they are not tokens in the source**. All values live under
> `tokens/` (cited below as `colors.css`,
> `theme-light.css`, `theme-dark.css`).

### Primary
- **Workshop Gold** — `--ep-yolk-500` (alias `--ep-accent`) · `#E3B563` ·
  colors.css:52 (alias theme-light.css:54) · *direct value*. The system-wide
  primary action — „az arany a fényé": every primary button, focus ring, selected
  state, progress fill, active toggle.
- **Gold-Bright** — `--ep-yolk-400` (alias `--ep-accent-hover`) · `#EFCB85` ·
  colors.css:53 (alias theme-light.css:55) · *direct value*. Primary hover.
- **Gold-Press** — `--ep-accent-press` · `#D9A845` · theme-light.css:56 ·
  *direct value* (a literal interaction state, not a yolk-scale stop). Primary press.
- **Gold-Deep** — `--ep-yolk-700` (alias `--ep-accent-fg`) · `#9A6F26` ·
  colors.css:50 (alias theme-light.css:49) · *direct value*. Gold *text* on warm
  light backgrounds, where a solid gold fill would fail contrast.

### Secondary
- **Signature Sapphire** — light `--ep-blue-600` · `#2E5BE0` · colors.css:22 ;
  dark `--ep-blue-500` · `#4F7BEE` · colors.css:23 · *direct values*, aliased by
  `--ep-second` / `--ep-flourish` / `--ep-info`. The brand's second voice — „a kék
  a márkáé": explanatory highlights, info chrome, brand links, the `<em>` flourish.
  It is **never** the primary button.

### Tertiary (status)
- **Success Green** — `--ep-success` · `#2F9C6A` · theme-light.css:11 · *direct
  value* (dark `#7DD3A8`, theme-dark.css:91).
- **Warning Amber** — `--ep-warning` · `#D4831A` · theme-light.css:13 · *direct
  value* (in dark, warning **unifies with the gold** `#E3B563`, theme-dark.css:93).
- **Danger Rose** — `--ep-danger` · `#C7384E` · theme-light.css:15 · *direct
  value* (dark `#F09CA8`, theme-dark.css:95).
- **Info** — `--ep-info` · `#2E5BE0` · theme-light.css:17 · *alias* of
  `--ep-blue-600`. Each status also ships a paired soft `*-bg` tint.

### Neutral
- **Midnight Ink** — `--ep-ink-900` (alias `--ep-fg` light) · `#0A1230` ·
  colors.css:14 (alias theme-light.css:27) · *direct value*. Primary text on light.
- **Workshop Cream** — `--ep-fg` (dark) · `#ECE7DA` · theme-dark.css:45 · *direct
  value* (coincides with `--ep-paper-200`, colors.css:33). Primary text on graphite.
- **Warm Paper** — page `--ep-paper-50` (alias `--ep-bg` light) · `#FBF9F4` ·
  colors.css:31 (alias theme-light.css:21) ; elevated `--ep-bg-elevated` ·
  `#FFFFFF` · theme-light.css:22 ; sunken `--ep-paper-100` · `#F6F3EB` ·
  colors.css:32 ; border `--ep-paper-300` · `#DCD5C3` · colors.css:34 · *direct
  values / aliases*. Warm cream surfaces for editorial/marketing.
- **Cool Slate** — `--ep-slate-50` (alias `--ep-bg` app) · `#F5F7FB` ·
  colors.css:38 · *direct value*; full cool ramp `--ep-slate-50…800`
  (colors.css:38–46). Product/app surfaces.
- **Warm Graphite** — dark surfaces are produced by `color-mix()`, **not** final
  hexes (never hand-pick a dark hex). Tint seed `--ep-tint` = `#E3B563`
  (theme-dark.css:34); each surface = `color-mix(in oklab, <base> <%>, var(--ep-tint))`,
  with gold mixed in at a rising % as elevation rises (Material 3 tonal overlay).
  The listed hexes are the *color-mix bases*, not the rendered colors:
    - `--ep-bg-sunken` = `color-mix(in oklab, #080A10 98%, var(--ep-tint))` ·
      theme-dark.css:39 · *color-mix base `#080A10`*
    - `--ep-bg` = `color-mix(in oklab, #0C0D11 97%, var(--ep-tint))` ·
      theme-dark.css:38 · *color-mix base `#0C0D11`*
    - `--ep-bg-elevated` = `color-mix(in oklab, #131720 95%, var(--ep-tint))` ·
      theme-dark.css:40 · *color-mix base `#131720`*
    - `--ep-bg-raised` = `color-mix(in oklab, #181D29 93%, var(--ep-tint))` ·
      theme-dark.css:41 · *color-mix base `#181D29`*
- **Gold-Ink** — `--ep-accent-on` · `#16130C` · theme-light.css:57
  (theme-dark.css:65) · *direct value*. The dark ink that always sits on a solid
  gold fill.

### Accessibility foreground tokens (2026 WCAG 2.2 pass)
Dedicated *foreground* tokens so a status/brand hue can stay vivid as a fill or
large mark while a darker sibling carries small-text/icon contrast. The raw hues
(`--ep-warning` `#D4831A`, `--ep-success` `#2F9C6A`, `--ep-yolk-500` `#E3B563`)
are **unchanged**.

- **`--ep-fg-placeholder`** — input placeholder text. Light `#5C6981`
  (= `--ep-slate-500`) · dark `#938C7C` · *direct/alias*. AA: 5.54:1 (white) /
  5.00:1 (dark elevated). `--ep-fg-faint` stays decorative-only.
- **`--ep-warning-fg`** — warning text + meaningful icons. Light `#9E5C16`
  (oklch 53.9% 0.116 60.9) · dark `#E3B563` (= existing good value). AA: 5.25:1
  (white) / 4.99:1 (paper) / 4.57:1 (warning-bg).
- **`--ep-success-fg`** — success **text** (icons keep `--ep-success`, which
  passes 3:1). Light `#1F6849` · dark `#7DD3A8`. AA: 6.70:1 (white) / 5.85:1
  (success-bg).
- **`--ep-accent-fg`** — gold text on `--ep-accent-bg`. Light retuned to `#8A6220`
  (oklch 52.6% 0.096 75.9; was `--ep-yolk-700` `#9A6F26`, 4.08) → AA 4.95:1. Dark
  `#EFCB85` unchanged.
- **`--ep-control-border`** (light) — interactive control edge, now
  `--ep-slate-400` `#8390A8` (AA 3.22:1; was `--ep-border`, 1.46). Decorative
  panel borders / dividers are unchanged.
- **`--ep-badge-yolk-fg` / `--ep-badge-yolk-bg`** — theme-**independent** yolk-badge
  pair (`#8A6220` on `#FAF1DC`, AA 4.85:1 in both themes). Defined once in `:root`,
  never overridden per theme — the badge stays a fixed light chip like its siblings.
  Do **not** wire the badge to the theme-dependent `--ep-accent-fg` (it flips light
  in dark mode → fails on the fixed light bg).

> Focus rings were also hardened (light two-layer gold `--ep-shadow-focus`, dark
> sapphire `--ep-shadow-focus-second`); their values live in §4 Elevation /
> `tokens/elevation.css` + `theme-dark.css`, mirrored in `.impeccable/design.json`.

### Named Rules
**The Two-Color Rule.** Gold is for action, sapphire is for voice. A control is
gold or it is not interactive; a flourish is sapphire or it is not the brand.
Never swap them.

**The Ink-On-Gold Rule.** A solid gold fill **always** carries dark ink text
(`#16130C`), **never white** — gold is light-valued and white-on-gold fails
contrast. Soft gold uses are tint-bg (`rgba(227,181,99,0.16)`) + gold text.

**The Semantic-Role Rule.** Build on role tokens (`--ep-bg`, `--ep-accent`,
`--ep-fg`), never raw scale stops. Reaching for a raw hex in a component is the
single most common cause of a surface that breaks in dark mode.

## 3. Typography

**Display Font:** Roboto (with `-apple-system, BlinkMacSystemFont, system-ui, sans-serif`)
**Body Font:** Roboto (same family — one sans carries the whole hierarchy)
**Mono Font:** JetBrains Mono (with `SF Mono, Menlo, monospace`)

**Character:** One humanist-geometric sans does all the work; hierarchy comes from
**size, weight and tracking**, not from a serif/sans pairing. Headlines run large
and tight (weights to 900, tracking to `-0.02em`); body and UI sit at 300–500.
JetBrains Mono is reserved for code, tokens, timestamps and numeric meta — never
body copy. Both families are self-hosted (latin + latin-ext) for full Hungarian
support; no Google Fonts CDN exists anywhere in the system.

### Hierarchy
- **Display-LG** (700, `clamp(56px, 8vw, 96px)`, lh 0.95, `-0.02em`): The single
  loudest moment — hero headlines only.
- **Display** (400, `clamp(44px, 6vw, 72px)`, lh 1.02, `-0.02em`): Section heroes,
  editorial openers.
- **H1** (400, 48px, lh 1.05) · **H2** (400, 36px, lh 1.1) · **H3** (600, 24px, lh
  1.25) · **H4** (600, 18px, lh 1.3): Page and section headings.
- **Lead** (400, 20px, lh 1.5): Intro paragraphs, muted.
- **Body** (400, 16px, lh 1.55): Default reading text. Cap prose at 65–75ch.
- **Small** (400, 14px) · **Meta** (500, 12px): Secondary and tertiary chrome.
- **Overline** (500, 12px, `0.14em`, UPPERCASE): The *only* place ALL CAPS is
  allowed — short labels.
- **Code** (500, 14px, JetBrains Mono): Inline code, tokens, timestamps.

### Named Rules
**The Flourish Rule.** Wrap the second word/phrase of a display headline in `<em>`
— `<h1>Crafted code, <em>shipped on time.</em></h1>` — and it recolors to bold
**sapphire** automatically. The `<em>` is a brand hook, not semantic emphasis. The
flourish is always sapphire, never the gold action color.

**The Sentence-Case Rule.** Headings, buttons and labels are sentence case.
TitleCase is for proper nouns only. ALL CAPS is reserved for `.ep-overline`.

## 4. Elevation

A **hybrid, theme-aware** model. In **light**, depth is a subtle, layered warm
shadow stack — five steps (`xs`→`xl`) plus an inset, never pure black, never an
offset past 32px. In **dark**, deep shadows barely register on graphite, so depth
is carried by **borders + Material-3 tonal elevation**: a single gold tint
(`#E3B563`) is mixed into the graphite base at rising percentages
(0% → 5% → 8% → 11%) as a surface lifts (sunken → page → elevated → raised).
Shadows in dark are deeper and more transparent, reserved for genuinely floating
chrome (popovers, dialogs, toasts).

### Shadow Vocabulary
- **shadow-xs** (`0 1px 2px rgba(10,18,48,0.05)`): Hairline lift — chips, inputs.
- **shadow-sm** (`0 1px 2px / 0 2px 4px`): Resting cards, buttons.
- **shadow-md** (`0 2px 4px / 0 8px 16px`): Menus, hover-raised cards.
- **shadow-lg** (`0 4px 8px / 0 16px 32px`): Popovers, drawers.
- **shadow-xl** (`0 8px 16px / 0 32px 64px`): Modals, the top floating layer.
- **shadow-inset**: Wells and pressed surfaces.
- **Focus rings** are their own tokens, and the primary ring **differs by theme**.
  **shadow-focus (light)** = `0 0 0 2px #E3B563, 0 0 0 4px rgba(10,18,48,0.9)` —
  two layers: 2px brand gold + a 2px ink contrast band (the ink band carries the
  ≥3:1, since raw gold alone can't reach it on light). **shadow-focus (dark)** =
  `0 0 0 2px rgba(10,18,48,0.9), 0 0 0 4px #E3B563` — two layers (mirror of light): inner 2px ink band (≥3:1 vs gold-filled controls, 8.2:1) + outer 2px gold (≥3:1 vs all graphite surfaces, 7.9–10.2:1). Replaces the old single 3px gold@0.40 (only 2.54:1). The light and dark
  values are intentionally different. **shadow-focus-second** is the sapphire ring
  for second-voice controls.

### Named Rules
**The Warm-Shadow Rule.** Shadows are tinted with the ink hue
(`rgba(10,18,48,…)`), never pure black, and never offset more than 32px. A
2014-era dark, hard shadow is forbidden.

**The Tonal-Tint Rule.** In dark mode, separate surfaces with **borders and the
gold tonal tint**, not with heavy shadows. Pick the semantic surface token
(`--ep-bg-sunken/bg/elevated/raised`) and the tint + contrast come for free.

## 5. Components

The framework ships 52 components, each built only on the shared role tokens. The
canonical primitives:

### Buttons
- **Shape:** Rounded (`12px`, radius-md); large size steps up to `18px`
  (radius-lg). Font 500/14px, sentence case, no tracking.
- **Primary:** Gold fill (`#E3B563`) with dark ink text (`#16130C`), `shadow-sm` +
  a subtle inner top highlight, padding `11px 18px`. **Hover** → Gold-Bright
  (`#EFCB85`).
- **Secondary:** Elevated surface with a `1px` border; hover darkens the border to
  the foreground color.
- **Ghost:** Transparent with AA-tuned gold text (`--ep-accent-fg` → #8A6220 light /
  #EFCB85 dark); hover fills with the soft gold tint (`--ep-accent-bg`).
- **Ink:** High-contrast dark action — `--ep-ink-900` fill with cream text
  (`--ep-paper-100`); hover deepens to `--ep-ink-950`. Border is transparent in
  light; in dark / auto it gains `--ep-control-border`, so the near-black fill keeps
  a visible edge on graphite.
- **Danger:** Destructive action — outlined: transparent fill with danger-rose text
  and border (`--ep-danger`). Hover fills with the soft danger tint
  (`--ep-danger-bg`) and flips the text to `--ep-fg` — rose text would reach only
  ~4.05:1 on that tint in light, below the WCAG 1.4.3 4.5:1 threshold.
- **Sizes:** sm `7px 12px` / 12px · md (default) `11px 18px` / 14px · lg `14px
  22px` / 16px.
- **Element & `type`:** a control that performs an action on the current page is a
  `<button class="btn …">`; true navigation is an `<a href class="btn …">`. Every
  `<button>` carries an explicit `type` — `type="button"` (default for action
  buttons), `type="submit"` (submit a form), `type="reset"` (clear a form, only when
  deliberate). Never put `role="button"` on a navigation link, and never use
  `href="#"` for a real action.
- **Keyboard:** a `<button>` activates with **Enter and Space**; a real link
  activates with **Enter only** (not Space). That difference is why actions must be
  buttons and navigation must be anchors.
- **Disabled vs `aria-disabled`:** native `disabled` blocks activation **and** drops
  the control from the tab order; `aria-disabled="true"` may stay focusable and does
  **not** by itself block activation, so it needs a JavaScript guard.
- **Class API:** the canonical project API is `.btn` + a `.btn--*` modifier (the
  `ds-btn-*` names in `.impeccable/design.json` are self-contained doc examples only):

  | Layer | Class | Role |
  |---|---|---|
  | Base | `.btn` | required on every button / anchor-button |
  | Variant | `.btn--primary` · `.btn--secondary` · `.btn--ghost` · `.btn--ink` · `.btn--danger` | colour / emphasis role |
  | Size | `.btn--sm` · *(md = base, no class)* · `.btn--lg` | size step |
  | Geometry | `.btn--icon` | square icon-only geometry |
- **States (all variants).** Shared by every `.btn--*`:
  - **Hover** — runs only on an *enabled* button (guarded against `:disabled`,
    `[disabled]`, `[aria-disabled="true"]`), is variant-specific, and is never the
    only accessible signal of a state. Per variant: primary → `--ep-accent-hover`
    bg · secondary → stronger foreground (`--ep-fg`) border · ghost →
    `--ep-accent-bg` bg · ink → `--ep-ink-950` bg · danger → `--ep-danger-bg` bg +
    `--ep-fg` text.
  - **Focus** — `.btn:focus-visible` paints `box-shadow: var(--ep-shadow-focus)`; the
    native `outline` is **kept on purpose** as the forced-colors fallback. Never
    `outline: none`. Focus can stay visible on a `disabled` / `aria-disabled`
    control as long as it remains focusable.
  - **Active** — `:active` adds a momentary `transform: translateY(1px)` press cue
    only. It is **not** the persistent toggle/pressed state, and does not run on
    `disabled` / `aria-disabled`. Under reduced motion the shift is instant, not
    animated.
  - **Reduced motion** — at `prefers-reduced-motion: reduce` the button `transition`
    is switched off; no continuous or gratuitous state animation. The momentary
    active shift may remain instant.

  Disabled is **two distinct mechanisms** — never conflate them:

  | | Native `disabled` | `aria-disabled="true"` |
  |---|---|---|
  | Activation (click / Enter / Space) | browser **blocks** it | **not** blocked on its own |
  | Form submit | does not fire | not blocked on its own |
  | Tab order | removed | may stay focusable |
  | Guard needed | none (native) | **JavaScript guard required** |
  | Visual | `opacity: 0.5` · `cursor: not-allowed` | `opacity: 0.5` · `cursor: not-allowed` |
  | `pointer-events: none` | — | **forbidden** (would kill focus + hit-testing) |

  CSS alone does **not** block `aria-disabled` activation — pair it with a JavaScript
  guard (or the loading helper, documented separately).
- **Toggle (`aria-pressed`).** A standalone two-state button latches with
  `aria-pressed`: `<button type="button" aria-pressed="false|true">`. `false` is the
  default (off) state, `true` the persistent on state. Keep the accessible name
  **static** when the action name doesn't change (Mute, Pin, Bookmark, Bold) —
  `aria-pressed` already conveys on/off, so don't swap the `aria-label` per state.

  Pick the ARIA by control type — never mix them:

  | Pattern | Use | ARIA |
  |---|---|---|
  | Standalone two-state toggle | Mute · Pin · Bookmark · Bold | `aria-pressed="true\|false"` on a `<button>` |
  | Mutually-exclusive choice | segmented control, date range | `role="radiogroup"` › `role="radio"` + `aria-checked` |
  | Switches content panels | tabbed views | `role="tablist"` › `role="tab"` + `aria-selected` |

  Never put `aria-pressed` on a `role="radio"` or `role="tab"` element. `.is-active`
  is a **visual** class only — it does not replace the ARIA state.

  **Pressed visual — `aria-pressed="true"`, per variant** (recessed fill + a top inset
  depth cue; text stays the variant's on-colour):

  | Variant | background | text / border | inset shadow |
  |---|---|---|---|
  | primary | `--ep-accent-press` | text `--ep-accent-on` · border `--ep-accent` | `inset 0 2px 4px rgba(10,18,48,.30)` |
  | secondary | `--ep-bg-pressed` | text `--ep-fg` · border `--ep-control-border` | `inset 0 2px 4px rgba(10,18,48,.28)` |
  | ghost | `--ep-accent-bg` | text + border `--ep-accent-fg` | `inset 0 2px 4px rgba(10,18,48,.28)` |
  | ink | `--ep-ink-950` | text + border `--ep-paper-100` | `inset 0 2px 4px rgba(0,0,0,.45)` |
  | danger | `--ep-danger-bg` | text `--ep-fg` · border `--ep-danger` | `inset 0 0 0 1px var(--ep-danger)` , `inset 0 2px 4px rgba(10,18,48,.28)` |

  **Common pressed behaviour:** the latched state uses **no** translate offset (the
  momentary `:active translateY(1px)` is a separate state). `pressed + hover` holds the
  pressed visual; `pressed + focus-visible` keeps `var(--ep-shadow-focus)` **and** the
  variant's pressed inset layers in one `box-shadow` list, with the native `outline`
  retained. `pressed + disabled` / `aria-disabled` keeps the pressed visual under
  `opacity: 0.5`; `pressed + loading` keeps the pressed surface.

  **Icon-only toggle:** `.btn--icon` composes with `aria-pressed`. The control then
  **requires** an `aria-label` (or `aria-labelledby`); the `<svg>` is decorative
  (`aria-hidden="true"` + `focusable="false"`). The static accessible name and
  `aria-pressed` together announce the control's name and its on/off state.
- **Loading.** A busy button keeps its size and accessible name while a three-dot
  loader replaces the visible label. Required markup:

  ```html
  <button type="button" class="btn btn--primary is-loading" aria-busy="true" aria-disabled="true">
    <span class="btn__content">Save changes</span>
    <span class="btn__loader" aria-hidden="true"><span></span><span></span><span></span></span>
  </button>
  ```

  - `.btn__content` holds the label; at `opacity: 0` it stays in the layout **and**
    the accessibility tree, so the visible + accessible name is preserved.
  - `.btn__loader` is `aria-hidden="true"` and absolutely centred (`inset: 0`), so the
    swap causes **no layout shift**. No `aria-live` and no separate hidden "Loading"
    text are required — `aria-busy` carries the busy state.
  - **Distinct from disabled:** `.is-loading` sets `opacity: 1` (vs disabled
    `opacity: 0.5`) and `cursor: progress`. Works on `sm` / `md` / `lg` and all five
    variants; the dots use `currentColor`. At `prefers-reduced-motion: reduce` the dot
    animation stops and all three dots stay statically visible. Hover and active do
    not run (guarded by `aria-disabled`); `focus-visible` still paints.

  **JS helper — `setButtonLoading(button, loading)`** (global, in `button.js`):
  - *On:* adds `.is-loading`, sets `aria-busy="true"` + `aria-disabled="true"`,
    remembers the prior `aria-disabled`, and does **not** move focus.
  - *Off:* removes the loading state, drops `aria-busy`, restores the original
    `aria-disabled` **1:1** (re-applied if present, removed if absent), and changes
    neither the label nor focus.
  - **Idempotent:** on→on and off→off are no-ops.
  - **Activation block:** while loading, click / Enter / Space are intercepted in the
    capture phase with `preventDefault` + `stopImmediatePropagation`. `aria-disabled`
    alone would not block activation — that is why the helper exists. No
    `pointer-events: none`; no native `disabled` (so focus is kept).
  - **Submit guard:** the form `submit` listener attaches **only** for a real
    `type="submit"` button bound to a form. It blocks that button's own submit
    (including an argument-less `requestSubmit()`); a different submitter in the same
    form passes through, and a `type="button"` loader never blocks the form's submit.
    A stale / detached button self-heals (the listener unbinds itself) and does not
    block the submit — note a detached submit button's reference may persist until the
    next submit (not immediately leak-free).

  **With toggle / icon-only:** `pressed + loading` keeps the pressed surface;
  icon-only loading wraps the icon in `.btn__content` (loader as its sibling), and the
  `aria-label` / `aria-labelledby` does not change during loading.
- **Icon-only (`.btn--icon`).** Compose `.btn` + a variant + `.btn--icon` (+ optional
  size): `.btn.btn--<variant>.btn--icon`. It works with every variant (primary,
  secondary, ghost, ink, danger) and size (`.btn--sm`, base md, `.btn--lg`).
  `.btn--icon` changes **only** the geometry and icon size; colour and every state
  behaviour are inherited from the chosen variant. There is no separate `.btn--square`
  API.

  | Size | Button box | SVG |
  |---|---|---|
  | sm | 28 × 28px | 14 × 14px |
  | md (base) | 38 × 38px | 16 × 16px |
  | lg | 46 × 46px | 18 × 18px |

  The box is `border-box` with equal `inline-size` / `block-size`, `padding: 0`,
  `flex-shrink: 0`, and the icon centred. The smallest box (28×28) clears the **WCAG
  2.2 §2.5.8** 24×24 minimum; only **lg** reaches the 44×44 AAA target size.

  - **Accessible name (required):** every icon-only button must carry `aria-label` or
    `aria-labelledby`. A tooltip or `title` attribute does **not** substitute for the
    accessible name. If a visible text label is present, use a normal `.btn` — not
    `.btn--icon`. The static accessible name persists across toggle states.
  - **SVG:** the icon is decorative — `aria-hidden="true"`, `focusable="false"`, and
    `stroke` / `fill` use `currentColor`; the SVG does not shrink (`flex-shrink: 0`).
    The SVG size of a normal text `.btn` is independent of this.
  - **State compatibility:** hover, focus-visible, active, disabled and aria-disabled
    inherit from the base `.btn`; `aria-pressed` works for a standalone icon toggle.
    During loading the SVG goes inside `.btn__content` while `.btn__loader` stays
    centred, the `aria-label` / `aria-labelledby` does not change, and the fixed square
    geometry means **no layout shift**.
  - **Tooltip:** a tooltip is supplementary visual help only — not required for the
    button to work, and never a replacement for the accessible name. If used it must be
    reachable by keyboard and hover, and dismiss on Escape and on focus loss. (The
    Tooltip component API is documented separately.)

### Button group
Fuses adjacent `.btn` children into one segmented control. Wrapper `.button-group`
(horizontal, `inline-flex`) or `.button-group.button-group--vertical` (column); the
children are `.btn` of any variant placed as **direct** children. It introduces no new
state, loading or icon-only API — those inherit from the Buttons section above.

- **Geometry.** Adjacent borders collapse with a `-1px` margin (`margin-left` when
  horizontal, `margin-top` when vertical) so neighbours share one edge; every child is
  `border-radius: 0` and only the group's outer corners are re-rounded to `--ep-radius-md`
  (12px). The hovered, focused (`:focus`) or `.is-active` child gets `z-index: 1` so its
  full border stays visible over the fused seam. The focus ring itself is inherited from
  `.btn:focus-visible` (native outline kept); disabled / aria-disabled behaviour inherits
  from the shared button state rules — no new state API is introduced here.
- **`.is-active` is a visual class only.** It paints the selected segment with the accent
  (gold) fill — `background` / `border-color` `var(--ep-accent)`, `color`
  `var(--ep-accent-on)`. It does **not** replace `aria-pressed`, `aria-checked` or
  `aria-selected`: the ARIA attribute is the semantic source of truth and `.is-active`
  must be kept in sync with it.

**Semantic pattern — pick by intent:**

| Use case | Wrapper | Children | State attribute |
|---|---|---|---|
| Mutually-exclusive value / view choice | `role="radiogroup"` | `<button type="button" role="radio">` | `aria-checked` (exactly one `true`) |
| Independent action buttons | `role="group"` + `aria-label` / `aria-labelledby` | normal action `.btn` | none |
| Split button | `role="group"` + accessible group name | main action `.btn` + `.btn--icon` overflow | none |
| Switching content panels | `role="tablist"` → use **Tabs**, not a button group | `role="tab"` | `aria-selected` + `aria-controls` |

- **A · Radiogroup (segmented control).** `role="radiogroup"` wrapper; each child is a
  `<button type="button" role="radio" aria-checked>`; exactly one child has
  `aria-checked="true"` **and** `tabindex="0"`, every other child `tabindex="-1"` (roving
  tabindex); `.is-active` sits on the `aria-checked="true"` child. Examples:
  Day / Week / Month / Quarter, List / Grid / Board.
- **B · Action group.** `role="group"` wrapper with a required accessible name
  (`aria-label` or `aria-labelledby`, e.g. `aria-label="Project actions"`); the children
  are ordinary action buttons — no `aria-pressed` / `aria-checked` / `aria-selected`.
  Example: New project / Import / Template.
- **C · Split button.** `role="group"` wrapper with an accessible group name
  (`aria-label="Publish actions"`); a primary action button (Publish) fused with an
  icon-only overflow button — `.btn.btn--primary.btn--icon`, base **md** geometry
  (38×38px, `padding: 0`), `type="button"`, `aria-label="More options"`, decorative SVG
  (`aria-hidden="true"`, `focusable="false"`, kebab-case `stroke-width` / `stroke-linecap`,
  `currentColor`). Both buttons share the `primary` variant so the pair reads as one
  control. Do **not** add `aria-haspopup` / `aria-expanded` until a real menu is wired up.

**Radiogroup keyboard map** (the implemented behaviour; one `tabindex="0"` entry per group):

| Key | Action |
|---|---|
| `Tab` | enters the group on its single `tabindex="0"` radio |
| `→` / `↓` | next radio (wraps to first) |
| `←` / `↑` | previous radio (wraps to last) |
| `Home` | first radio |
| `End` | last radio |
| `Enter` / `Space` | native button activation |

Moving focus **also selects** (focus = select): the script updates `aria-checked`,
`tabindex`, `.is-active` and focus together, and navigation is circular. Each
`[role="radiogroup"]` is wired independently (`querySelectorAll`, scoped per group), so one
group's selection never changes another's. **The full interactive behaviour requires the
bundled JavaScript** — the CSS alone only fuses and paints.

**Radiogroup vs Tabs.** Use a **radiogroup** to pick a value or display mode that does not
swap a content region. Use the **Tabs** pattern (`role="tablist"` / `tab` / `tabpanel`,
`aria-selected`, `aria-controls` + matching `id`) when the control switches associated
content panels. Never put `aria-pressed` on a `role="radio"` or `role="tab"` element, and
only reach for the tab pattern when a real linked panel exists.

### Cards / Containers
- **Corner Style:** `18px` (radius-lg).
- **Background:** Elevated surface (`#FFFFFF` light / graphite-elevated dark).
- **Shadow Strategy:** `shadow-sm` at rest (see Elevation).
- **Border:** `1px solid` subtle border.
- **Internal Padding:** `18px`.
- **Feature variant:** Inverted dark (`ink-900`) surface for heroes / testimonials
  / CTAs, with the sapphire flourish on its heading `<em>`.

The **card** family (`components/card/`) is a single **React** component `Card` — a
**passive surface / content container**, not an interactive control. It is distinct from
the closed **EmptyState** `.empty--card` zero-state surface, the **DataTable**/**TradeTable**
table wrappers, the **Dialog**/**Drawer** modal surfaces, the **hover-card** family (name
collision only — a separate closed component) and the `.card-select` CSS primitive (a
choice-control affordance, not `Card`).

- **Identity & export.** Source `components/card/Card.jsx`, CSS `components/card/card.css`, canonical **static HTML** demo `components/card/card.html`. One **React** component `Card`, exported browser-global via `Object.assign(window, { Card })` → `window.Card`. **No** ESM/CJS, **no** IIFE, **no** auto-init, **no** TypeScript type, **no** `CardHeader`/`CardBody`/`CardFooter`/`CardActions`/`StatCard`/`MetricCard` helper or subcomponent.
- **API.** `Card({ feature, title, icon, meta, children, className = '', ...rest })` — `feature` is a boolean dark/featured visual modifier (`.card--feature`); `title` is a string rendered as a **real `<h3>`** inside `.card__header`; `icon` is a string or ReactNode rendered into the **decorative** `.card__icn` mark (single initial or SVG); `meta` is a `[left, right]` tuple rendered as **two real `<span>`s** in `.card__meta`; `children` is body copy rendered as a **real `<p>`**; `className` passes through to the root; `...rest` is a root-`<div>` escape hatch. No internal state; controlled/uncontrolled is not a relevant concept — `Card` is a passive container. **No** `heading`/`headingLevel`/`as`, `description`/`eyebrow`, `media`/`image`/`illustration`, `footer`, `actions`, `href`, `onClick`, `role`, `variant`, `tone`, `size`, `elevated`, `interactive`, `selected`, `disabled`, `ariaLabel`/`ariaLabelledby`/`ariaDescribedby` prop, and no TypeScript type.
- **Text-first accessibility.** The meaning is carried by **real, unhidden DOM text**: `title` is a real `<h3>`, `children` a real `<p>`, and `meta` two real `<span>`s — none `aria-hidden`. The root is a **passive `<div>`**: no false `role="button"`/`role="link"`/`role="region"`/`role="article"`/`role="group"`/`role="img"`, no `aria-live`/live region. `Card` is **not** a whole-card link and **not** an interactive root.
- **Decorative icon contract.** When `icon` is truthy the `.card__icn` mark always carries **`aria-hidden="true"`** — it is **decorative** (a single initial or SVG), skipped by assistive tech, and never carries an exclusive meaning; the meaning lives in the `<h3>` + `<p>` + meta. There is deliberately **no informative-icon/media API** (`role="img"`/`aria-label`), because that would be a new public contract.
- **Heading / media / action / interactive contract.** The heading is a **fixed `<h3>`** — there is no heading-level selector API (fixed-`<h3>` outline rigidity is a **P3**). Media exists only as the decorative `icon` mark; there is no separate `media`/`image`/`illustration` API, no `footer`/`actions` API, no built-in CTA, no whole-card link, and no interactive-card API. For an interactive card or CTA the **consumer** supplies native `<button>`/`<a>` markup inside `children` (the closed **Buttons** family owns button/CTA behaviour when embedded); the whole-card-link + nested-interactive combination must be avoided. The card hardening introduced no button/link/focus contract.
- **Non-interactive / focus.** `Card` is display, not a control: no `tabindex`, no keyboard handler, no pointer handler in the component contract, no button/link API on the root, no focus-visible contract; a focus P-level is not relevant to the root. The `...rest` escape hatch does **not** make `Card` an interactive component, and `Card` creates no nested-interactive conflict — an interactive target is only a consumer-supplied native `<button>`/`<a>`.
- **Forced colors.** A local `@media (forced-colors: active)` block in `card.css` uses **system colours only** (no token/hex/rgb/rgba/hsl/hsla, no `forced-color-adjust: none`): `.card` and `.card--feature` → `Canvas` bg + `CanvasText` text + `1px solid CanvasText` border + `box-shadow: none` (this replaces the feature card's normal-CSS `border: none`, closing its HCM contour loss so it stays a distinct surface); `.card h3`/`.card p` (and under `.card--feature`) → `CanvasText`; `.card__meta` → `GrayText`; `.card__icn` (and `.card--feature .card__icn`) → `ButtonFace` bg + `CanvasText` icon + `1px solid CanvasText` border. `.card__header` is a pure layout flex wrapper — it needs no colour rule; its children carry visibility. The block adds no hover/focus/interactive appearance. **Live emulation not run — CSSOM/source-verified (P2).**
- **No motion.** No `transition`, no `animation`, no `@keyframes`; **`transition: all` = 0**; no hover-lift, no press, no shadow motion; a reduced-motion guard is not needed and the hardening introduced no motion.
- **Visual mapping & class contract.** Classes: `.card`, `.card--feature`, `.card__header`, `.card__icn`, `.card h3`, `.card p`, `.card__meta`. Normal theme is token-driven (radius-lg, `shadow-sm` at rest, subtle token border, `18px` padding, flex-column + gap; `.card__meta` a two-sided mono row); **all 22 resolved tokens resolve cleanly**, the one exception being the `.card--feature .card__icn` hardcoded `rgba(255,255,255,0.08)` in normal CSS (**P3**). Every active class has CSS, the forced-colors selectors cover real elements, no dead selector, no source↔CSS↔demo drift; an invalid `feature`/`meta` does not crash, and a non-tuple `meta` does not crash (the fixed `[left, right]` tuple is an API limitation, not a defect). Dark/light works via the theme tokens. `.card-select` is a separate CSS primitive and **hover-card** a separate closed family — neither is `Card`.
- **Canonical static demo.** `components/card/card.html` is a **static HTML mock** (not a React demo; `_theme.js` is the shared preview loader; links `card.css`): renders, no 404, no JS fatal, with a default card and a `.card--feature` card, each showing header/icon/title/body/meta. There is **no** interactive-card, CTA, or stat/metric example. The React `<Card>` is **not** demoed; for copy-paste the React component and this documented class contract are the recommended source (demo-only two static examples = **P3**).
- **Consumers & blast radius.** **No active React consumer** — `<Card>`/`window.Card` are unused. The `.card`/`.card__*` classes are consumed as **static markup** across app-common shells, web-examples index / not-found, admin-examples index / settings, the components demos index and the design-preview pages; `styles.css` aggregation only; the `SKILL.md` registry lists `Card | card | Card`. The `components/README.md` `card | Card | CSS` row is a **documented P3 classification drift** (the family is React with a browser-global export), not fixed here. The closed **EmptyState** `.empty--card`, **DataTable**/**TradeTable** wrappers and **Dialog**/**Drawer** surfaces are separate — **not** `Card` consumers. **Blast radius low for the React component, high for the `.card`/`.card__*` CSS/class contract.**
- **Known limitations.** **P2**: browser-only export; no active React consumer; API limitation (no footer/actions/media/interactive/href/onClick contract; `meta` is a fixed `[left, right]` tuple); live forced-colors emulation not run. **P3**: `.card--feature .card__icn` hardcoded rgba in normal CSS; `components/README.md` classification drift; fixed `<h3>` heading level (no `headingLevel`/`as` API); demo-only two static examples (no interactive/stat/metric demo). Status: **P0/P1 closed; P2/P3 documented.**

### Inputs / Fields
- **Style:** Elevated background, `1px` border, `12px` radius (radius-md), padding
  `11px 14px`, body type. Labels are uppercase overline.
- **Focus:** Border shifts to gold + the **gold focus ring** (`shadow-focus`).
- **Error:** Border shifts to danger rose; error message in danger, meta size.
- **Compact:** `--sm` variant (`7px 11px`) for dense rows like data-table filters.

### Choice controls — Checkbox · Radio · Switch
Closed, native-input choice controls. `Checkbox`, `Radio`, `RadioGroup` and
`Switch` are the public JSX components (globals in `FormControls.jsx`); `card-select`
is a CSS primitive only (see below). Each control is a `<label class="ctrl">` that
wraps a visually-hidden native `<input>` plus a decorative visual span and an optional
text block. Class API: `.ctrl` (wrapper) · `.ctrl__input` (the real input) ·
`.ctrl__box` / `.ctrl__radio` / `.ctrl__switch` (+ `.ctrl__switch--sm`) (decorative
visual) · `.ctrl__text` › `.ctrl__label` + `.ctrl__hint` · `.radio-group`
(+ `.radio-group--row`) · `.is-disabled`.

- **Shared semantic model.** Every control uses a **real native input**
  (`type="checkbox"` / `type="radio"`), so native keyboard, form participation and
  screen-reader semantics come for free. The wrapping `<label>` makes the **whole row
  clickable** via implicit association. The input is visually hidden but **stays
  focusable and in the accessibility tree** (`opacity: 0; 1px` square; not
  `display: none`). The decorative `.ctrl__box` / `.ctrl__radio` / `.ctrl__switch` span
  carries no interactive role — the input is the control. Do not substitute a
  `div`-based or hand-managed widget.
- **Accessible name & description.** The **accessible name is the main
  `.ctrl__label` span**; the **accessible description is the `.ctrl__hint` span**. The
  hint is *not* part of the name. The link is made with `aria-labelledby` (→ label
  span) and `aria-describedby` (→ hint span); pointing the name at the label span keeps
  the hint out of the computed name. In the JSX components the resolution order is:
  - consumer **`aria-labelledby`** wins;
  - otherwise the component's generated label id (when a `label` is rendered);
  - the consumer's **`aria-describedby` is preserved** and the hint id is appended to it;
  - id tokens are de-duplicated;
  - **`aria-label` is never auto-generated** from visible text.

  ```jsx
  // label + hint; an external description id is kept and the hint id is appended
  <Checkbox
    label="Send weekly digest"
    hint="Friday morning summary of project activity."
    aria-describedby="billing-note"
    checked={on}
    onChange={(e) => setOn(e.target.checked)}
  />
  ```
- **RadioGroup naming is the consumer's responsibility.** `RadioGroup` renders a
  `role="radiogroup"` wrapper; the radios share one `name`, which is what drives native
  arrow-key navigation and single-selection. The component **does not invent a group
  name** — supply at least `aria-label` or `aria-labelledby`, or the group has no
  programmatic name. There is no `legend` or group-`label` prop.

  ```jsx
  // a) aria-label
  <RadioGroup
    name="plan" value={plan} onChange={setPlan}
    aria-label="Billing plan"
    options={[
      { value: 'retainer', label: 'Retainer · monthly', hint: 'Billed at month end.' },
      { value: 'fixed', label: 'Fixed-scope project' },
      { value: 'hourly', label: 'Hourly · ad-hoc', disabled: true },
    ]}
  />

  // b) aria-labelledby referencing a visible group title
  <span id="surface-title">Surface</span>
  <RadioGroup
    name="surface" value={surface} onChange={setSurface}
    aria-labelledby="surface-title"
    options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
  />
  ```
- **Switch.** A switch is a **real `<input type="checkbox">`** with `role="switch"` on
  the **input only** (never the wrapper or a decorative span). No manual `aria-checked`
  is needed — native `checked` + `role="switch"` exposes on/off. `checked`, `disabled`,
  Space activation and form submission are all native. `size="sm"` selects the compact
  track; there is no separate switch-value API.
- **Checkbox indeterminate.** `indeterminate` is a **visual / DOM state**, not a
  replacement for `checked`: the component sets the native `input.indeterminate`
  property through a ref effect. Form submission still depends solely on `checked` —
  there is **no tri-state submission**. (The static HTML demo has no indeterminate
  example.)
- **Form behaviour.** Checkbox / Switch are successful controls **only when checked**;
  `name` / `value` come from the native input attributes (`...rest`), and with no
  explicit `value` the native default applies. For radios, the **checked** radio's
  `name`/`value` pair submits, radios sharing a `name` form one group, and a disabled
  input is omitted. For the controlled JSX components, resetting `checked` is the parent
  state's responsibility — a **native form reset does not by itself reset React state**.
- **Forced colors** (`forced-colors: active`). The custom visuals switch to system
  colors: idle = `Canvas` fill / `CanvasText` border + glyph; checked / indeterminate =
  `Highlight` surface / `HighlightText` glyph; disabled = `GrayText`; focus = a
  `Highlight` outline. The switch thumb stays visible in both off and on. (`card-select`
  gets a whole-card focus outline.)
- **Reduced motion.** In normal use only explicit property lists transition
  (background-color / border-color / box-shadow on the boxes and card; transform on the
  radio-dot and switch-thumb, using `ease-out` — no overshoot); there is no
  `transition: all`. At `prefers-reduced-motion: reduce` every perceptible
  choice-control transition is turned off, while all final states and state indicators
  remain visible. There is no global motion reset.
- **Contrast (factual, not a blanket claim).** The checkmark, radio-dot and
  indeterminate mark use a strong fill/foreground contrast (gold-ink on gold, ~9.8:1 in
  light); the idle control border (~3.2:1 in light) and the two-layer focus ring (ink
  band ≥3:1) meet the control-recognizability target. The switch **thumb-to-track**
  direct contrast is intentionally low in some themes (~1.5–1.9:1 light; ~1.3:1 dark
  off — estimated); the on/off state is conveyed **jointly** by thumb position, track
  colour and the thumb shadow, and by system colours under forced-colors. Dark / auto
  values derive from `color-mix()` / alpha compositing and are **computed estimates**;
  no screenshot-based visual verification was performed. This is not a claim of full
  WCAG conformance across the family.

### Card-select (CSS primitive)
A **CSS-only** primitive: there is **no public JSX component and no static demo**, and
it is supported **only** through the documented markup contract below. It reuses the
choice-control inner visuals inside a clickable card.

```html
<label class="ctrl-card">
  <input type="radio" class="ctrl__input" name="tier" value="pro">
  <span class="ctrl__radio"></span>
  <span class="ctrl__text">
    <span class="ctrl__label">Pro</span>
    <span class="ctrl__hint">Everything in Starter, plus priority review.</span>
  </span>
</label>
```

- The native `.ctrl__input` must be the **first child** so it is the direct sibling of
  its visual (`.ctrl__box` for a checkbox or `.ctrl__radio` for a radio); use
  `.ctrl__box` + `type="checkbox"` for a multi-select card.
- The **whole card is clickable** (implicit label). The checked state is driven by
  `:has(.ctrl__input:checked)` (accent border + soft accent tint).
- The **whole card carries the focus indication** via
  `:has(.ctrl__input:focus-visible)`; the inner control's small ring is suppressed
  inside the card, so there is **no double focus ring**.
- There is **no dedicated disabled-card recipe**: a native `disabled` on the inner
  `.ctrl__input` still blocks the input's use and submission, but the `.ctrl-card` has
  no whole-card disabled visual, so a disabled card *appearance* is **not** part of the
  supported visual contract.

### Slider
A single-thumb numeric **range** input. Browser-global React component exported via
`Object.assign(window, { Slider })` (`window.Slider`) — **no** ESM/CJS export, **no**
auto-init. It is a **controlled** component built on the native `input[type="range"]`; it
is **not** a custom `role="slider"` re-implementation, **not** a multi-thumb range,
**not** the DataTable dual-thumb range filter, and **not** a Progress bar. The React
component and the canonical static demo share the **same CSS/DOM contract**; the demo is a
static contract demo (plain HTML + a vanilla `input` listener), **not** a React
consumer — it does **not** load React, Babel, or `Slider.jsx`.

- **Public API.** `function Slider({ label, value = 0, min = 0, max = 100, step = 1, format = (value) => value, ticks, onChange, dark, disabled, className = '', ...rest })`.
  - `label` — visible label **and** the programmatic accessible-name source.
  - `value` — the controlled value; `min` / `max` / `step` — native range attributes.
  - `format` — maps the value to the visible readout and to the automatic `aria-valuetext` **when it differs** from the raw value.
  - `ticks` — optional `string[]` of tick labels under the track; `onChange` — receives `Number(event.target.value)`.
  - `dark` — visual variant for ink surfaces; `disabled` — native disabled; `className` — root class extension; `...rest` spreads onto the `<input>`.
  - **No** `defaultValue`, **no** uncontrolled model, **no** multi-thumb, **no** `marks`, **no** `showValue`, **no** `onInput` (the prop is `format`, not `formatValue`), **no** render slot, **no** TypeScript type, **no** custom `role="slider"`.
- **Controlled model.** `value` drives the input and the consumer owns updates — there is **no** internal value state and **no** uncontrolled fallback. `onChange` returns a `Number`. An `inputRef` + `useEffect` keep the `--val` CSS custom property (percent 0–100) in sync; `--val` drives only the visual fill. The native keyboard and pointer model is preserved.
- **Accessible name.** Every range input is programmatically named. When `label` is set, the `.slider__label` gets a stable, per-instance `id` and the input points at it via `aria-labelledby` — **unless** the consumer supplied a name. When there is no `label` **and** no consumer name, the input falls back to `aria-label="Slider"`. Auto ids are unique across instances (an IIFE-private counter + a `useRef` seed; `useId` is **not** used). A consumer-supplied `aria-label`, `aria-labelledby`, or `id` (via `...rest`, which spreads last) always wins. All four canonical-demo inputs are named via `aria-labelledby`, the disabled one included. The visible-value readout does **not** substitute for the name. *(Closes the former nameless-range-input P1.)*
- **Value & `aria-valuetext`.** The native range conveys the raw value through `min` / `max` / `step` / `value` (implicit `aria-valuenow` / `valuemin` / `valuemax`). When `format(value)` differs from the raw value, the input receives an automatic **`aria-valuetext`** (the formatted value as a string) so currency / percent / units reach assistive tech; when they match, no redundant `aria-valuetext` is set. A consumer-supplied `aria-valuetext` (via `...rest`) is respected. There is **no** live region. The demo's vanilla listener updates the visible readout and `aria-valuetext` together.
- **Keyboard & pointer.** All interaction is the native `input[type="range"]` contract — Tab focus, Arrow Left/Right/Up/Down, Home / End, PageUp / PageDown (where the UA supports it), pointer drag, and track click. There is **no** custom keyboard handler and **no** pointer-only path; the native range is the source of truth, and `disabled` blocks interaction natively.
- **Focus (`:focus-visible`).** Keyboard focus draws a thumb ring via `box-shadow: var(--ep-shadow-focus)` on **both** engines as **separate** rules: `.slider__track:focus-visible::-webkit-slider-thumb` (WebKit/Blink) and `.slider__track:focus-visible::-moz-range-thumb` (Gecko/Firefox). This closes the former WebKit `:focus`-only drift (a pointer drag no longer leaves a persistent ring) **and** the former Gecko invisible-keyboard-focus P1. There is **no** bare `:focus`, **no** global input/button focus selector, and **no** `!important`. The base `.slider__track { outline: none }` remains acceptable **only because** the `:focus-visible` thumb ring covers both engines. A disabled input gets no active focus style.
- **Forced colors.** A local `@media (forced-colors: active)` block keeps the control perceivable via system colors: the fill is re-expressed as a `Highlight` (filled) / `GrayText` (remainder) gradient for **both** the light and `--dark` variants (gradient background-images are not auto-neutralised), `disabled` resolves to a flat `GrayText` (never a false-active look), the thumb uses `Canvas` background + `Highlight` border, and keyboard focus switches to an `outline: 2px solid Highlight`. There is **no** token / hex / rgb / hsl inside the block and **no** `forced-color-adjust: none`. *Live `forced-colors` emulation was not run — this is CSSOM/source-verified only (documented P2).*
- **Reduced motion.** `@media (prefers-reduced-motion: reduce)` sets `transition: none` on the track, the WebKit thumb, and the Gecko thumb, so the thumb hover/focus/active micro-transitions do not run. There is **no** `transition: all` and the focus ring is not animated. *Live `prefers-reduced-motion` emulation was not run — CSSOM/source-verified only (documented P2).*
- **CSS vendor rule split.** WebKit and Gecko vendor pseudo-elements are **never** combined in one selector list: an engine that doesn't recognise one pseudo drops the **entire** combined rule, so the focus, forced-colors, and reduced-motion vendor rules are each kept in separate per-engine rules. This is part of the cross-engine focus and high-contrast contract.
- **Class contract.** `.slider` (root; `.slider--dark` variant) › `.slider__header` (label + value row) › `.slider__label` · `.slider__value` › `.slider__track` › `.slider__ticks` › `.slider__tick`. Note that **`.slider__track` is the `<input type="range">` itself**, not a separate track div. Every active class has CSS; there is no split contract, no demo-only override, and no dead selector. *(The `.slider__track`-on-the-input naming is a known P3.)*
- **Canonical demo.** `components/slider/slider.html` — four static examples (**Team density**, **Retainer · monthly budget** with ticks, a **Disabled** percent slider, and a dark **Deploy concurrency**), each with a visible readout and a vanilla `input` listener. All four inputs are programmatically named; the formatted examples update `aria-valuetext`; the disabled example is named. The demo does **not** load React or `Slider.jsx` and is visually regression-free. Its narrow-viewport overflow comes from the fixed `width=720` demo viewport, not the component.
- **Consumers.** There is currently **no** active React consumer and no external `.slider__` class usage. The **DataTable dual-thumb range filter** is a *separate* implementation inside the CLOSED DataTable family — it does **not** use the `Slider` component and must not reopen it; `Slider` itself is single-thumb.
- **Known limitations.** **P2:** browser-only `window.Slider` export; no active React consumer; the canonical demo is static (it does not exercise the React component); `forced-colors` and `prefers-reduced-motion` were CSSOM/source-verified only (no live media emulation). **P3:** `.slider__track` is the input element (naming); the header can render a readout without a `label` (the fallback name applies); the demo overflows a very narrow viewport due to the fixed `width=720`; pre-existing `2px` hairline-radius and single-font hook findings on the demo. There is **no** open P0 or P1.

### Badges & Chips

Small pill labels — a status/tag **Badge** and an identity **Chip** — that convey meaning through their
**real DOM text**, not through colour. Source of truth:
`components/badge/Badge.jsx`,
`badge.css`, canonical demo `badge.html` — all under `components/badge/`. Distinct from the closed
**tag-input** multi-value chips (removable, interactive), the **avatar** identity chip, the navigation
**Tabs / Pills**, and the stateful **loading / progressbar** family.

- **Component identity & export.** **React** components `Badge` **and** the sibling `Chip`, both living in the
  same `Badge.jsx`, exported browser-global via `Object.assign(window, { Badge, Chip })` → `window.Badge` /
  `window.Chip`. **No** ESM/CJS export, **no** IIFE, **no** auto-init, **no** helper export; **no** `BadgeGroup`,
  `StatusBadge`, or `CounterBadge`. Dual model: a React component **and** a static CSS-only markup pattern — the
  canonical `badge.html` is a **static HTML mock** (plain `<span class="badge …">` / `<div class="chip">`, not a
  React demo); its `_theme.js` is the shared preview theme loader, not component JS. There is **no** active
  `window.Badge` / `window.Chip` React consumer; the **`.badge` CSS class contract is widely consumed** as static
  markup (app-common, admin-app-examples, web-app-examples, trade-components) and `.chip` in one static consumer
  (`billing.html`). **Blast radius: low for the React components, medium–high for the `.badge` CSS class contract,
  low–medium for `.chip`.**
- **Badge API.** `Badge({ variant = 'info', dot, children, className = '', ...rest })`. `variant` ∈
  `info`(default)/`success`/`warning`/`danger`/`yolk`/`ink`/`outline`; `dot` is an optional boolean whose default
  is computed — `dot ?? ['info','success','warning','danger'].includes(variant)` — so the leading dot renders by
  default for the first four variants and **not** for `yolk`/`ink`/`outline`; `children` = real DOM text/content;
  `className` = root-class passthrough; `...rest` = root-`span` escape hatch. No internal state
  (controlled/uncontrolled is not a relevant concept); a **non-interactive presentational** component. **No**
  `size`, `shape`, `count`, `max`, `icon`, `leadingIcon`, `trailingIcon`, `status`, `severity`, `tone`, `ariaLabel`,
  `ariaHidden`, `decorative`, `onClick`, `href`, or `as` prop, **no** TypeScript type, **no** public subcomponent,
  **no** button/link/interactive API.
- **Chip API.** `Chip({ avatarStyle, children, className = '', ...rest })`. `avatarStyle` = inline style applied to
  the leading `.chip__avatar` swatch; `children` = real DOM text/content; `className` = root-class passthrough;
  `...rest` = root-`span` escape hatch. No internal state; a **non-interactive presentational** sibling component
  in the same `Badge.jsx`. This `Chip` is **not** the interactive tag-input chip and **not** the theme-swatch
  `.chip` naming usage. **No** avatar-component API, removable-chip API, close button, selected/pressed state,
  checkbox/tag-input behaviour, or keyboard/pointer interaction in the component contract.
- **Text-first accessibility.** The badge's meaning is carried by its **real DOM text**; the `variant` background
  tint is a secondary visual affordance. The `.badge__dot` is a **decorative `currentColor` marker** — it takes the
  text colour, so it is never an independent information source. There is **no** dot-only informative badge and
  **no** icon-only badge; a count badge (e.g. a static consumer's `2`) renders the count as **real text** (there is
  no overflow-count API). **No** `role="status"`, `role="alert"`, `role="img"`, or `role="button"`; **no**
  `aria-live`; **no** superfluous `aria-label` contract; **no** essential text hidden under `aria-hidden`. Because
  the meaning is text-conveyed, there is **no colour-only status P1** — an app that needs to convey essential status
  must keep it in the text too.
- **Non-interactive / non-focusable.** Both `Badge` and `Chip` are display, not interactive controls: **no**
  `tabindex`, keyboard handler, or pointer handler in the component contract, **no** button/link API, and **no**
  focus-visible contract (focus P is not relevant). The `...rest` escape hatch remains but does **not** make either
  component interactive; an interactive badge-like target needs an external native `<button>`/`<a>` wrapper.
- **Forced colors.** A local `@media (forced-colors: active)` block is present and **system-colors-only** (no
  token/hex/rgb/hsl, no `forced-color-adjust: none`), covering `.badge`, `.badge--outline`, `.badge__dot`, `.chip`,
  `.chip__avatar`. `.badge` = `ButtonFace` surface + `CanvasText` text + `1px CanvasText` border; `.badge--outline`
  = `Canvas` background + `CanvasText` text/border + `box-shadow: none` (the stripped inset shadow is no longer the
  only edge); `.badge__dot` = `CanvasText` (stays a decorative marker); `.chip` = `ButtonFace` + `CanvasText` +
  `CanvasText` border; `.chip__avatar` = `Highlight` + `CanvasText` border. The variants deliberately do **not**
  fake per-tone status colours in high contrast — meaning stays in the DOM text. **Live emulation not run
  (CSSOM/source-verified, documented P2 caveat).**
- **No motion.** No `transition`, `animation`, or `@keyframes`; **`transition: all` = 0**; no pulse, status
  animation, or shimmer; a reduced-motion guard is not required, and the forced-colors hardening introduced no
  motion.
- **Visual mapping & theming.** Pill (`--ep-radius-pill`), padding `4px 10px`, 500/12px. Variant map
  info/success/warning/danger/yolk/ink/outline; the dot is a `currentColor` decorative marker. `Chip` = `.chip` +
  leading 22px `.chip__avatar` swatch (inline `avatarStyle`), elevated bg + `1px` border. `yolk`/`ink`/`outline`
  are tokenised; the `info`/`success`/`warning`/`danger` backgrounds+text and the `.chip__avatar` gradient are
  **hardcoded hex in normal CSS** (documented **P3**). An invalid `variant` does not crash (it simply yields no
  `--variant` class); the normal-theme token/hex contract was left untouched by the forced-colors hardening.
- **DOM & class contract.** `.badge`, `.badge--info/--success/--warning/--danger/--yolk/--ink/--outline`,
  `.badge__dot`, `.chip`, `.chip__avatar` — every active class has CSS, every CSS class is renderable, and the
  forced-colors selectors cover real elements with **no** dead selector and **no** source ↔ CSS drift. The `Badge`
  JSX root is a `span` and the `Chip` JSX root is a `span`; the canonical Chip demo uses `<div>` elements — a
  documented **P3 element drift** (not a class drift: the class contract matches).
- **Canonical static demo.** `components/badge/badge.html` is a **static HTML mock** (not a React demo; `_theme.js`
  shared loader): it renders, with no 404 and no JS fatal, 7 badge samples + 3 chip samples with tone/dot/version
  examples. Every informative badge is understandable from its text; nothing is focusable and there is no
  stateful role/aria markup. The Chip demo's `<div>` vs JSX `<span>` is a documented **P3** drift; the static HTML
  is **not** a full React-API contract source — for copy-paste, the React component and the documented class
  contract are the recommended source. A later HTML polish is possible but non-blocking.
- **Consumers & blast radius.** **No** active `window.Badge` / `window.Chip` React consumer. The `.badge` CSS class
  is consumed as **static markup** (app-common, admin-app-examples, web-app-examples, trade-components, unchanged),
  and `.chip` in `billing.html`. A theme-swatch `.chip` naming ambiguity exists in the theme demos, but those do
  **not** load `badge.css`, so there is **no** style bleed; `.chip-filter` is a separate class, not this `Chip`.
  `styles.css` aggregation is present (not a React consumer); the `SKILL.md` registry (`Badge + Chip | badge |
  Badge`) is roughly correct; `components/README.md`'s `badge | Badge | CSS` row is a **mislabel** ("CSS" and Chip
  omitted) tracked as documented drift. The closed **tag-input** / **avatar** / **Tabs / Pills** / **loading**
  families are separate contracts, and `feed-indicator` / `dot` docs may reference `.badge` for paired-with-text
  usage. **Blast radius: low for the React components, medium–high for `.badge`, low–medium for `.chip`.**
- **Known limitations (P2 / P3).** *(P2)* `components/README.md`'s badge = "CSS" mislabel + Chip omission;
  browser-only `window` export; no active React consumer; live forced-colors emulation not run (CSSOM-verified).
  *(P3)* `info`/`success`/`warning`/`danger` hardcoded hex and the `.chip__avatar` hardcoded gradient in normal
  CSS; the `.badge__dot` is not `aria-hidden` (a harmless empty span); the Chip demo `<div>` vs JSX `<span>` drift;
  the `.chip` naming ambiguity with the theme swatches; demo-only copy/layout drift; cosmetic spacing; minor visual
  polish. Accepted, non-blocking limits — there is **no** open P0 or P1.

### Navigation
- Built on the 5 shared app shells (sidebar, top-nav, marketing, docs, focus).
  Nav items use muted foreground at rest, gold for the active/selected item, and
  the soft gold tint on hover. The same vocabulary holds across every screen.

### Signature Component — The Status Dot
- Status is communicated by a **colored dot** (standalone, or a leading dot +
  label), 8 tones × 5 sizes, plus a live feed-indicator molecule. **Never an
  emoji.** This is the canonical "live / online / degraded / error" affordance
  system-wide.

The family is two React components — the **`Dot`** atom and the **`FeedIndicator`**
molecule that composes it. Source of truth:
`Dot.jsx` +
`dot.css` under `components/dot/`, and
`FeedIndicator.jsx`
+ `feed-indicator.css` under `components/feed-indicator/`. There is **no**
`components/status-dot/` and **no** `components/indicator/` directory. Distinct from
the closed **badge** dot (a decorative `.badge__dot` paired with text), the **avatar**
presence dot, and the stateful **loading / progressbar** family.

- **Component identity & export.** Both are **React** components, exported
  browser-global: `Object.assign(window, { Dot })` → `window.Dot`, and
  `Object.assign(window, { FeedIndicator })` → `window.FeedIndicator` (plus the static
  taxonomy `FeedIndicator.STATES`). **No** ESM/CJS, **no** IIFE, **no** auto-init, no
  helper export. `Dot` is the **atom**; `FeedIndicator` is the **molecule** that
  composes `Dot` (its `feed-indicator.css` `@import`s `../dot/dot.css`, and it renders
  a `<Dot>` internally). `dot.html` is a **static HTML mock**; `feed-indicator.html` is
  a **React demo**; both load the shared `_theme.js` preview loader.
- **Dot API.** `Dot({ tone = 'info', size = 'md', halo = false, ring = false, pulse = false, blink = false, hollow = false, title, className = '', ...rest })`.
  `tone` ∈ `neutral/info/success/warning/danger/yolk/ink/muted`; `size` ∈
  `xs/sm/md/lg/xl` (md = 8px); `halo` (soft ring), `ring` (hard outline), `pulse`
  (animated ripple), `blink` (slow opacity), `hollow` (outline-only) are visual
  boolean modifiers; `title` is the accessible-name source; `className`/`...rest`
  passthrough. No internal state, no TypeScript type.
- **FeedIndicator API.** `FeedIndicator({ state = 'idle', label, meta, variant = 'plain', size = 'md', surface = 'paper', compact = false, stack = false, dotProps = {}, className = '', ...rest })`.
  The **real** `state` values are `connecting`/`streaming`/`stale`/`disconnected`/`idle`
  (default `idle`); an unknown state falls back via `FEED_STATES[state] || FEED_STATES.idle`.
  There is **no** `live`, `delayed`, `paused`, `error`, or `offline` state. `label`/`meta`
  override the state's default label / add a mono tail; `variant` ∈ `plain`/`soft`/`outline`;
  `size` ∈ `sm`/`md`/`lg`; `surface` ∈ `paper`/`ink`; `compact` = dot-only; `stack` =
  vertical; `dotProps` is forwarded to the inner `Dot`; `className`/`...rest` passthrough;
  `FeedIndicator.STATES` exposes the taxonomy. **No** `tone`, `severity`, `count`, `href`,
  or `as` prop, no interactive API, no TypeScript type. **State mapping:** `connecting`
  → Dot `info` + pulse + halo, label "Connecting"; `streaming` → `success` + pulse + halo,
  "Live"; `stale` → `warning` + blink + halo, "Stale"; `disconnected` → `danger` + hollow,
  "Offline"; `idle` → `muted` + hollow, "Idle".
- **Accessible name.** **Dot:** with `title` it is informative — `role="img"` +
  `aria-label={title}`; without `title` it is decorative — `aria-hidden="true"` (no
  title-only pattern, since the `title` prop generates the `aria-label`; dot-only
  informative usage **requires** `title`). **FeedIndicator (non-compact):** the root is
  `role="status"` + `aria-label="{label} feed"`, the visible `.ep-feed__label` (and
  `.ep-feed__meta` when present) renders, and the inner Dot stays decorative (title-less
  → `aria-hidden`), so status is conveyed by both text and programmatic name.
  **FeedIndicator (compact):** the visible label is not rendered, so the reliable name
  now lives on the inner Dot — compact passes `title={shownLabel}`, making the Dot
  `role="img"` + `aria-label={shownLabel}`; the root keeps only a hover `title`, and a
  role-less root-span `aria-label` is **no longer** the sole contract. **Compact
  accessible-name P1 closed** — the compact status is no longer colour-only.
- **Non-interactive / non-focusable.** Both are display, not interactive controls: no
  `tabindex`, keyboard handler, or pointer handler in the contract, no button/link API,
  no focus-visible contract (focus P is not relevant). `...rest` is an escape hatch, not
  interactivity; an interactive feed-status target needs an external native
  `<button>`/`<a>` wrapper.
- **Forced colors.** Both CSS files carry a local `@media (forced-colors: active)` block,
  **system-colors-only** (no token/hex/rgb/hsl, no `forced-color-adjust: none`). **Dot:**
  `.ep-dot` = `CanvasText` fill + `CanvasText` border; `.ep-dot--neutral`/`--muted` =
  `GrayText`; `.ep-dot--hollow` = `Canvas` fill + `CanvasText` border (previously it could
  vanish, since its inset shadow is stripped); `.ep-dot--ring`/`--halo`/`--pulse::before`
  are rebuilt from system-coloured shadows/fills. Tones do **not** fake a per-tone meaning
  in high contrast — an informative dot's meaning lives in its `role="img"` name or
  adjacent text. **FeedIndicator:** `.ep-feed`/`.ep-feed__label` = `CanvasText`,
  `.ep-feed__meta` = `GrayText`, `.ep-feed--soft` = `ButtonFace` + `CanvasText` border,
  `.ep-feed--outline` = `Canvas` + `CanvasText` border + `box-shadow: none`, `.ep-feed--ink`
  = `CanvasText`; a **plain** inline feed intentionally gets **no** box (its dot + label are
  already system-coloured and legible, and a border would read as a control). **Live
  emulation not run (CSSOM/source-verified, documented P2 caveat).**
- **Reduced motion & animation.** `dot.css` defines `pulse` (`ep-dot-pulse` ripple) and
  `blink` (`ep-dot-blink`) continuous animations, both disabled under `@media
  (prefers-reduced-motion: reduce)` (`animation: none`); `feed-indicator.css` introduces
  no motion of its own. There is **no** `transition` at all, **`transition: all` = 0**, no
  shimmer, and the forced-colors hardening added no motion.
- **Visual mapping & theming.** **Dot:** circular; 8 token-driven tones, 5 sizes
  (xs 4px → xl 12px, md 8px default), plus halo/ring/pulse/blink/hollow modifiers; the
  `--halo` box-shadow uses hardcoded `rgba()` in normal CSS (documented **P3**).
  **FeedIndicator:** 5 states, `plain`/`soft`/`outline` variants, `paper`/`ink` surfaces,
  `compact`/`stack` layouts, `.ep-feed__label` + `.ep-feed__meta` spacing; an invalid
  state falls back to idle; `streaming`/`stale`/`disconnected` label colours plus the
  `soft`/`ink` backgrounds use hardcoded hex/rgba in normal CSS (documented **P3**).
- **DOM & class contract.** Dot classes: `.ep-dot`
  (`--neutral/--info/--success/--warning/--danger/--yolk/--ink/--muted`,
  `--xs/--sm/--md/--lg/--xl`, `--halo/--ring/--pulse/--blink/--hollow`). FeedIndicator
  classes: `.ep-feed` (`--connecting/--streaming/--stale/--disconnected/--idle`,
  `--sm/--md/--lg`, `--soft/--outline/--compact/--ink/--stack`), `.ep-feed__label`,
  `.ep-feed__meta`. The base is **`.ep-dot`** / **`.ep-feed`** — there is **no** `.dot`
  base class, **no** `.dot--live`, and **no** `state="error"`. Every active class has CSS,
  the forced-colors selectors cover real elements, and there is no dead selector and no
  source ↔ CSS ↔ demo drift.
- **Canonical demos.** `components/dot/dot.html` is a **static HTML mock** (`_theme.js`
  loader) rendering 64 `.ep-dot` spans with the real classes (no fictional `.dot--live`);
  `components/feed-indicator/feed-indicator.html` is a **React demo** exercising the real
  `connecting/streaming/stale/disconnected/idle` states (no fictional
  `live/delayed/paused/error/offline`), and the compact accessible-name fix applies to any
  compact example. Both render with no 404 and no JS fatal.
- **Consumers & blast radius.** Unlike most closed atoms, this family has an **active
  consumer chain**: `LcWrap` (trade-components) composes `FeedIndicator`, which composes
  `Dot`, and both are used across the marketing-site and live-trading demos; `styles.css`
  aggregates both CSS files. **Blast radius is medium–high** for both the React components
  and the `.ep-dot` / `.ep-feed` class contracts — the hardening preserved the full API,
  state names, class names, `FEED_STATES`, and all consumer files bit-for-bit, so the
  closed **LcWrap** / **TradeTable** consumers do not reopen.
- **Known limitations (P2 / P3).** *(P2)* catalog/DESIGN documentation only now corrected
  and deepened; the non-compact `role="status"` is an always-on live region (defensible and
  named, not false); browser-only `window` export; medium–high blast radius from the active
  consumer chain; live forced-colors emulation not run (CSSOM-verified). *(P3)* the `--halo`
  hardcoded `rgba()` and the `streaming/stale/disconnected/soft/ink` hardcoded hex/rgba in
  normal CSS; the non-compact `aria-label` overrides the visible label; demo-only /
  cosmetic polish. Accepted, non-blocking limits — there is **no** open P0 or P1.

### Dialogs and modal overlays
`Modal`, `AlertDialog` and `Drawer` are the modal-overlay family. **Modal** is the
general-purpose modal dialog (`role="dialog"`); **AlertDialog** is a confirm/decide
dialog (`role="alertdialog"`) for irreversible or high-stakes actions; **Drawer** is an
edge-anchored modal panel (`role="dialog"`, on an `<aside>`). All three are
**controlled React components**: they render only while `open` is `true` and request
closing through an `onClose` callback. None ships a built-in trigger component, and none
is driven by `data-*` attributes — the consumer owns the trigger and the open state.

- **Public API — Modal.** `open`, `onClose`, `title`, `eyebrow`, `subtitle`, `footer`,
  `size` (`sm` · `md` · `lg` · `xl`), `closeOnOverlay` (default `true`), `aria-label`,
  `aria-labelledby`, `aria-describedby`, `initialFocusRef`, `returnFocusRef`. A companion
  **`ModalFooter`** export lays out footer actions; with `split` it pushes a `left` slot
  to one side and the action buttons to the other. Only these props are read — there is
  no generic prop pass-through.
- **Public API — AlertDialog.** `open`, `onClose`, `onConfirm`, `title`, `description`,
  `confirmLabel`, `cancelLabel`, `variant` (`default` · `danger` · `warning` ·
  `success` · `info`), `icon`, `aria-label`, `aria-labelledby`, `aria-describedby`,
  `initialFocusRef`, `returnFocusRef`. **`onClose` is a required callback** — the
  component calls it directly on Escape, cancel, backdrop and after confirm. On confirm
  the component runs `onConfirm` and then requests close via `onClose`. There is **no
  built-in loading prop**; async, error and loading handling is the consumer's
  responsibility.
- **Public API — Drawer.** `open`, `onClose`, `title`, `eyebrow`, `sub`, `footer`,
  `side` (`right` default · `left` · `top` · `bottom`), `size` (`sm` · `md` · `lg` ·
  `xl`, for left/right), `closeOnOverlay` (default `true`), `aria-label`,
  `aria-labelledby`, `aria-describedby`, `initialFocusRef`, `returnFocusRef`. Note the
  description prop differs by component: **Modal uses `subtitle`, Drawer uses `sub`**,
  AlertDialog uses `description`. No generic prop pass-through.
- **Trigger contract (consumer-owned).** The trigger is the consumer's `<button>`. The
  recommended attributes are `aria-haspopup="dialog"` and `aria-expanded={open}` bound to
  the same state that drives `open`. **Do not** add `aria-controls` — the components
  expose no public, stable panel-id. On open the component captures the
  previously-focused element automatically; an explicit `returnFocusRef` overrides that
  captured opener. When several triggers can open the same dialog, prefer the automatic
  opener capture over a single fixed `returnFocusRef`, so focus returns to whichever
  trigger was actually used.
- **Accessible name.** Resolution order: (1) explicit `aria-labelledby`; (2) otherwise
  the generated id of the rendered `title`; (3) otherwise an explicit `aria-label`; (4)
  if none of these exist, the component does **not** fabricate a name. The accessible
  **description** comes from `subtitle` (Modal) / `description` (AlertDialog) / `sub`
  (Drawer): the component's internal description id is **appended** to any consumer
  `aria-describedby`, the idref tokens are **de-duplicated**, and when no internal
  description renders there is **no dangling idref**. All ids come from `React.useId()`,
  so they are unique per instance and SSR/hydration-stable. Decorative icons are excluded
  from the accessibility tree (`aria-hidden`), and the close button has a programmatic
  name.

  ```jsx
  // Controlled Modal with a visible title + description and trigger ARIA
  <button aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
    Project details
  </button>
  <Modal
    open={open}
    onClose={() => setOpen(false)}
    title="Lumenwerk"
    subtitle="Shipped on March 14, two days ahead of schedule."
    size="md"
  >
    …
  </Modal>
  ```
- **Initial focus.** Order is **Modal / Drawer**: valid `initialFocusRef` → first
  tabbable element → the panel; **AlertDialog**: valid `initialFocusRef` → the cancel
  button → first tabbable → the panel. A **destructive confirm never receives automatic
  initial focus** — the safe default in an alert is cancel. The panel carries
  `tabIndex="-1"` as a focus fallback. `initialFocusRef` is a real React ref to an
  element inside the dialog; there is **no CSS-selector-based initial-focus API**.
- **Focus trap.** Tab and Shift+Tab stay within the topmost dialog and wrap at the first
  and last tabbable elements; with **zero tabbable elements the panel itself takes
  focus**. Radio groups keep their native single-Tab-stop behaviour inside the trap.
- **Focus return.** On close, focus moves to: (1) a valid `returnFocusRef`; (2) otherwise
  the opener captured at open time. The component **never forces focus onto `document.body`**.
  The target is skipped if it was removed, is disabled, is inert, sits in an
  `aria-hidden` branch, or is otherwise no longer focusable. With stacked dialogs, closing
  the top one returns focus to the active element of the dialog beneath it; closing the
  last dialog returns focus to the external trigger.
- **Shared modality (behavioural contract).** The three components share one runtime
  dialog stack (an internal singleton — not a public API). Only the **topmost** dialog
  closes on Escape, runs the Tab trap, and closes on its backdrop. Dialogs below the top
  are made `inert` and `aria-hidden`; their original `inert` / `aria-hidden` state is
  restored on close. Logical order and visual order stay synchronised **within the dialog
  family**, so the topmost dialog is always the one drawn on top.
- **Scroll lock.** Opening the first dialog locks body scroll; stacking further dialogs
  does **not** apply additional locks; closing the **last** dialog restores the original
  inline `overflow` and `padding-right`. A scrollbar-gap compensation reduces layout
  shift when the scrollbar disappears. There is **no separate iOS `position: fixed`
  body-lock strategy** — iOS Safari background-scroll edge cases should be verified in the
  consumer's environment; this is not a platform-independent scroll-lock guarantee.
- **Backdrop & close.** **Modal / Drawer:** Escape requests close, the close button
  requests close, a direct backdrop click can close, and `closeOnOverlay={false}` turns
  backdrop-close off. **AlertDialog:** Escape requests close, cancel closes, a backdrop
  click currently requests close, there is **no `closeOnOverlay` prop**, and confirm runs
  `onConfirm` then `onClose`. Every state change flows through the consumer's controlled
  state.

  ```jsx
  <AlertDialog
    open={open}
    onClose={() => setOpen(false)}
    onConfirm={() => deleteProject()}
    variant="danger"
    title="Delete project?"
    description="This permanently removes the project and its assets. This cannot be undone."
    confirmLabel="Delete project"
    cancelLabel="Keep it"
  />
  ```
- **Forced colors** (`forced-colors: active`). Panels use `Canvas` / `CanvasText` system
  colors with a real panel border for separation; the backdrop drops its rgba tint and
  blur; the Modal/Drawer close button gets a `Highlight`-based focus outline; AlertDialog
  action buttons inherit the **Button family's** forced-colors contract.
- **Reduced motion.** Normally Modal and AlertDialog use a backdrop fade plus a panel
  fade/scale entrance, and Drawer uses a per-side slide — with no spring/overshoot
  easing. At `prefers-reduced-motion: reduce` the dialog-specific animations and
  transitions are removed, the panel appears immediately in its final state, focus
  handling does not wait on animation, and there is no close-animation delay.
- **Drawer safe-area.** Each side adds only the inset for the edge it anchors to: right
  and left drawers add the side inset to their content rows; a top drawer adds the top
  inset to the header (or the body when no header renders); a bottom drawer adds the
  bottom inset to the footer (or the body when no footer renders). The inset lands on a
  given edge exactly once, and on non-notched desktop the `env()` value is `0`, so padding
  is unchanged. There is **no swipe/drag gesture API**.
- **System-level stacking (known limitation).** Ordering **among Modal, AlertDialog and
  Drawer** is guaranteed by the shared stack. **Tooltip, Toast, Popover, Menu and
  CommandPalette are not part of this stack**; there is not yet a full system-wide
  z-index token scale, and there is no React portal strategy. Because the overlays render
  inline, an ancestor that establishes a stacking context (`transform`, `filter`,
  `overflow`, etc.) can affect them. The dialog manager does not manage every overlay
  component.
- **Forms & async.** A dialog does **not** manage form state or validation; form submit
  and validation belong to the dialog's content / consumer. A native form reset does not
  by itself reset controlled React state. Before an AlertDialog confirm, the consumer
  handles loading, disabled and error states; the current AlertDialog requests close after
  the confirm callback. There is **no `loading`, `preventClose` or async-confirm prop**.

  ```jsx
  // Drawer with side/size and an explicit return-focus target
  const triggerRef = useRef(null);
  <button ref={triggerRef} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
    Filters
  </button>
  <Drawer
    open={open}
    onClose={() => setOpen(false)}
    side="left"
    size="sm"
    title="Filters"
    returnFocusRef={triggerRef}
  >
    …
  </Drawer>
  ```

### Keyboard shortcuts — Kbd + KbdCombo

The **kbd** family (`components/kbd/`) renders keyboard-shortcut chips. It is a
**presentational hint**, not a control — distinct from the shortcut renders baked
into the closed **Command palette**, **Menus** and **Tooltip** families (those keep
their own `.command-palette`/`.menu__shortcut`/`.tooltip__shortcut` markup and are
**not** consumers of this family).

- **Identity & export.** Source `components/kbd/Kbd.jsx`, CSS `components/kbd/kbd.css`, canonical **static HTML** demo `components/kbd/kbd.html`. Two **React** components — `Kbd` and the `KbdCombo` helper — exported browser-global via `Object.assign(window, { Kbd, KbdCombo })` → `window.Kbd`/`window.KbdCombo`. **No** ESM/CJS, **no** IIFE, **no** auto-init, **no** TypeScript type.
- **`Kbd` API.** `Kbd({ size = 'md', ink, children, className = '', ...rest })` — `size` `sm`/`md`(default)/`lg` (**`md` is the base `.kbd`**, there is no `.kbd--md` class); `ink` is a dark-surface visual modifier; `children` is **real DOM text** rendered inside a real `<kbd>` element; `className`/`...rest` pass through to the root `<kbd>`. No internal state; controlled/uncontrolled is not a relevant concept. **No** `label`/`ariaLabel`/`ariaHidden`/`title`/`tone`/`variant`/`compact`/`platform`/`onClick`/`href`/`as` prop, **no** button/link/interactive API.
- **`KbdCombo` API.** `KbdCombo({ keys = [], separator = '', size, ink, className = '' })` — `keys` is a string array, each rendered as its own `<Kbd>`; `separator` is optional text (e.g. `+`) with an **empty-string default** → when empty **no separator span renders**, when set the `.kbd-combo__sep` span renders as **real DOM text**; `size`/`ink` forward to each inner `Kbd`; `className` passes through to the `.kbd-combo` wrapper. **No** platform detection, **no** Cmd/Ctrl auto-mapping, **no** glyph accessible-label normalisation, no state, non-interactive. **No** `platform`/`ariaLabel`/`label`/`items`/`shortcut`-parser/`onClick`/`href`/`as`/focusable API.
- **Semantic `<kbd>` & accessibility.** `Kbd` renders a real `<kbd>` element and the key label is **real DOM text** — not `aria-hidden`, not title-only, no false `role="button"`/`role="link"`, no live region. It is a keyboard **hint**, not a control.
- **Glyph-only limitation (P2).** Glyph-only keys such as `⌘`, `⇧`, `↵` are real Unicode DOM text, so their announcement by assistive tech varies by platform/screen-reader. Because there is **no `label`/`ariaLabel` API**, there is no text-alternative path — a documented **P2**, **not** an open P1 (the label is never hidden and is real DOM text). Consuming apps should avoid standalone ambiguous glyph-only shortcuts, or disambiguate in adjacent text.
- **Shortcut / separator / platform contract.** Single-key = `<Kbd>K</Kbd>`; multi-key = `KbdCombo` (separate `<kbd>` elements inside the `.kbd-combo` wrapper); the separator `.kbd-combo__sep` (e.g. `+`) is real DOM text, not read-order-optimised. **No platform mapping** (no Cmd/Ctrl detection, no Mac/Windows/Linux label switch, no `platform` prop) → a fixed `⌘` can mislead on Windows; the correct copy or a future API belongs on the consuming-app side — a documented **P2**, non-blocking.
- **Non-interactive / non-focusable.** No `tabindex`, no keyboard handler, no pointer handler in the component contract, no button/link API, no focus-visible contract; a focus P-level is not relevant. The `...rest` escape hatch does **not** make `Kbd` interactive — an interactive shortcut target needs an external native `<button>`/`<a>` wrapper.
- **Forced colors.** A local `@media (forced-colors: active)` block in `kbd.css` uses **system colours only** (no token/hex/rgb/rgba/hsl/hsla, no `forced-color-adjust: none`), covering `.kbd` (`ButtonFace` bg + `CanvasText` text + `CanvasText` border + `box-shadow: none`), `.kbd--ink` (`Canvas` bg + `CanvasText` text + `CanvasText` border + `box-shadow: none`) and `.kbd-combo__sep` (`CanvasText`). The faux-3D bottom-edge `box-shadow` is no longer the only outline — the real 1px border carries the keycap contour. `.kbd-combo` gets no forced-colors rule (it is a pure layout wrapper; its children carry visibility). **Live emulation not run — CSSOM/source-verified (P2).**
- **No motion.** No `transition`, no `animation`, no `@keyframes`; **`transition: all` = 0**; no hover/press motion, no shimmer; a reduced-motion guard is not needed and the hardening introduced no motion.
- **Visual mapping & class contract.** Base `.kbd` is the default `md` keycap (border, radius, faux-3D shadow in normal CSS); size `.kbd--sm`/`.kbd--lg` (**no `.kbd--md`**); `.kbd--ink` dark-surface modifier; `.kbd-combo` flex/gap wrapper; `.kbd-combo__sep` separator. Background/border/text are mostly design-token driven; the `.kbd--ink` hardcoded `rgba(...)` in normal CSS is **P3**; an invalid `size` does not crash (unknown size → base `.kbd`). Every active class has CSS, the forced-colors selectors cover real elements, no dead selector, no source↔CSS↔demo drift; the normal-theme contract is untouched by the forced-colors hardening.
- **Canonical static demo.** `components/kbd/kbd.html` is a **static HTML mock** (not a React demo; `_theme.js` is the shared preview loader, not Kbd component-JS): renders, no 404, no JS fatal, with single-key, multi-key combo and separator examples and glyph-only keys as real DOM text; **no platform example** (P3), nothing focusable, no role/aria drift. The static HTML is not the full React-API contract source — for copy-paste the React component and this documented class contract are the recommended source.
- **Consumers & blast radius.** **No active React consumer** — `window.Kbd`/`<Kbd>`/`<KbdCombo>` are unused; the `.kbd`/`.kbd-combo` classes are consumed as **static markup** (shell-sidebar/shell-docs/shell-topnav, docs, not-found, onboarding, billing, analytics, inbox, settings — unchanged), `styles.css` aggregation only. The `components/README.md` `kbd | Keyboard | CSS` row is a **documented P3 classification drift** (the family is React with a browser-global export), not fixed here. **Blast radius low for the React components, medium–high for the `.kbd`/`.kbd-combo` CSS/static contract.**
- **Known limitations.** **P2**: glyph-only text-alternative API absent; platform-mapping / Cmd-Ctrl detection absent; browser-only export; no active React consumer; live forced-colors emulation not run. **P3**: `.kbd--ink` hardcoded rgba in normal CSS; `components/README.md` classification drift; `kbd.html` no platform example. Status: **P0/P1 closed; P2/P3 documented.**

### EmptyState

The **empty** family (`components/empty/`) renders zero-state / no-results / no-data
placeholders — an illustration-or-icon slot over a title, a message and optional CTAs.
It is a **presentational, non-interactive** pattern; it is **not** a live status region
and **not** a consumer of the closed **file-upload** dropzone, the **Combobox**/**Select**
"No matches" state, the **DataTable** filter-empty row, or the **Menu**/**Command palette**
`__empty` markup (those keep their own empty renders and are **not** part of this family).

- **Identity & export.** Source `components/empty/EmptyState.jsx`, CSS `components/empty/empty.css`, canonical **static HTML** demo `components/empty/empty.html`. One **React** component — `EmptyState` — exported browser-global via `Object.assign(window, { EmptyState })` → `window.EmptyState`. **No** ESM/CJS, **no** IIFE, **no** auto-init, **no** TypeScript type, **no** helper/subcomponent (there is no `EmptyView`/`BlankSlate`/`NoResults` export). The directory is named `empty`; the component is `EmptyState`.
- **API.** `EmptyState({ icon, artVariant = 'paper', eyebrow, title, message, actions, tone = 'plain', inline, className = '' })` — `icon` is a ReactNode rendered into the decorative art slot (`.empty__art`) **only when truthy**; `artVariant` `paper`(default)/`ink`/`blue`/`success`/`warning`/`square` → `.empty__art--{variant}` (**`paper` is the base `.empty__art`**, no `.empty__art--paper` class); `eyebrow` is a small overline label (`.empty__eyebrow`); `title` renders as a **real `<h3 class="empty__title">`**; `message` renders as a **real `<p class="empty__message">`**; `actions` is a ReactNode passthrough into the `.empty__actions` div (the consumer supplies native buttons/links); `tone` `plain`(default)/`card` → `.empty--card`; `inline` (boolean) → `.empty--inline` and wraps eyebrow/title/message in a `<div class="empty__body">`; `className` passes through to the root. No internal state; controlled/uncontrolled is not a relevant concept. **No** `heading`/`headingLevel`/`as` (the heading is a fixed `<h3>`), **no** `description` (the prop is named `message`), **no** `illustration`/`image` (the prop is named `icon`), **no** `secondaryAction`, **no** `size`/`variant`/`align`/`style`/`ariaLabel`/`ariaHidden`/`role`/`onClick`/`href` prop.
- **Text-first accessibility.** The meaning is carried by **real, unhidden DOM text**: `title` is a real `<h3>` and `message` a real `<p>` — not `aria-hidden`, not title-only. There is **no** false `role="button"`/`role="link"`/`role="img"`, **no** `role="status"`/`role="alert"`, and **no** `aria-live`/live region — correct, because an EmptyState is **static page content**, not a transient status announcement (a live region here would be wrong, not a gap). **No colour-only status P1** — meaning is text.
- **Decorative art contract.** When `icon` is truthy, the `.empty__art` wrapper always carries **`aria-hidden="true"`** — the art is **decorative**, skipped by assistive tech, and never pollutes the screen-reader output. There is deliberately **no informative-icon API** (`role="img"`/`aria-label`): the art is visual accompaniment, the meaning stays in the `<h3>` + `<p>`. A consumer needing an informative illustration must convey that meaning in the title/message text.
- **Actions slot / native CTA boundary.** `actions` is a plain ReactNode passthrough into `.empty__actions`; the consumer provides native `<button>`/`<a>` elements (the canonical demo uses `.btn` buttons from the closed **Buttons** family). The component adds **no** global button styling, **no** root focus style, and the `.jsx` has no `button.css` dependency — the native control keeps its own focus/button contract.
- **Forced colors.** A local `@media (forced-colors: active)` block in `empty.css` uses **system colours only** (no token/hex/rgb/rgba/hsl/hsla, no `forced-color-adjust: none`): `.empty` → `CanvasText`; `.empty--card` → `Canvas` bg + `CanvasText` border (no reliance on the tinted token border); `.empty__eyebrow` → `GrayText`; `.empty__title` → `CanvasText`; `.empty__message` → `CanvasText`; `.empty__art` → `ButtonFace` disc + `CanvasText` icon + `1px CanvasText` border; the `blue`/`success`/`warning` tones are normalised to that same system look (no fake per-tone meaning); `.empty__art--ink` → `Canvas` + `CanvasText`. Layout-only wrappers carry **no** rule (their children carry visibility): `.empty--inline`, `.empty__actions` (the native button keeps its own forced-colors/focus contract), `.empty__art--square` (radius/size only — inherits the base `.empty__art` system colours), `.empty__body`. **Live emulation not run — CSSOM/source-verified (P2).**
- **No motion.** No `transition`, no `animation`, no `@keyframes`; **`transition: all` = 0**; no illustration animation, no shimmer; a reduced-motion guard is not needed and the hardening introduced no motion.
- **Visual mapping & class contract.** Classes: `.empty`(`--card`/`--inline`), `.empty__art`(`--ink`/`--blue`/`--success`/`--warning`/`--square`), `.empty__body` (inline only), `.empty__eyebrow`, `.empty__title`, `.empty__message`, `.empty__actions`. Every active class has CSS, the forced-colors selectors cover real elements, **no dead selector**, no source↔CSS↔demo drift; `paper` artVariant is the base `.empty__art` (no `.empty__art--paper`); an invalid `artVariant`/`tone` does not crash (unknown value → base look). Background/border/text are design-token driven in the normal theme, untouched by the forced-colors hardening; the `max-width: 480px` centred column and the inline horizontal layout are preserved.
- **Canonical static demo.** `components/empty/empty.html` is a **static HTML mock** (not a React demo; `_theme.js` is the shared preview loader, `button.css` is linked for CTA styling): renders, no 404, no JS fatal, with no-data ("No projects yet"), no-results, inbox-zero (`--ink`) and inline (`--square`) examples, native `<button>` CTAs, and decorative nameless `<svg>` art that does not pollute the SR output. Some **demo-only inline style overrides** exist (P3). The React `<EmptyState>` is **not** demoed here; the React component and this documented class contract are the recommended copy-paste source.
- **Consumers & blast radius.** **No active React consumer** — `window.EmptyState`/`<EmptyState>` are unused. **No active static consumer** either — the `.empty`/`.empty__*` classes appear only in the canonical demo and the **non-authoritative** `legacy/preview` (not a source of truth); `styles.css` aggregation only. The `SKILL.md` registry lists `Empty State | empty`; the `components/README.md` `empty | Empty state | CSS` row is a **documented P3 classification drift** (the family is React with a browser-global export), not fixed here. **Blast radius low** (no React consumer; the `.empty` CSS is demo-only).
- **Known limitations.** **P2**: browser-only export; no active React consumer; no active static consumer; live forced-colors emulation not run (CSSOM-only). **P3**: `components/README.md` classification drift; fixed `<h3>` heading level (no `headingLevel`/`as` API); the `eyebrow` prop leans on the uppercase-overline voice (opt-in, not per-section scaffolding); demo-only inline style overrides. Status: **P0/P1 closed; P2/P3 documented.**

### Menus and application menus
`Menu`, `ContextMenu` and `Menubar` are three **distinct** menu patterns — not one shared
primitive. There is no common public menu API: each uses a different public data model,
each keeps its own independent per-instance state, and each manages its own open state
internally (**uncontrolled**). **Menu** is a popup action menu bound to a trigger, with a
children-based item model and an internal open flag. **ContextMenu** is a popup bound to
one focusable context target, opened by pointer or keyboard, driven by an `items` array,
with internal uncontrolled position/open state. **Menubar** is an application-style
horizontal bar of top-level menus with single-level popup panels, driven by a `menus`
array, with an internal uncontrolled open index.

- **Public API — Menu family.** **`Menu`**: `trigger`, `align` (`left` default · `right`),
  `wide`, `children`. **`MenuItem`**: `icon`, `shortcut`, `checked`, `danger`, `disabled`,
  `onSelect`, `children`. **`MenuLabel`**: `id`, `children`. **`MenuDivider`**: no
  meaningful public state API. **`MenuGroup`**: `aria-label`, `aria-labelledby`,
  `children`. Only these props are read — there is no generic prop pass-through, and no
  public active-index, `open`, `onOpenChange` or `textValue`.
- **Menu trigger contract.** `trigger` is a real React element — a native
  `<button type="button">` is recommended (never a clickable `span`/`div`). The component
  clones it and adds `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` and a stable
  id, while preserving the consumer's id, ref and event handlers. The consumer's `onClick`
  / `onKeyDown` run **first**; `event.preventDefault()` suppresses the component's own
  open/toggle. A `disabled` or `aria-disabled="true"` trigger does not open. A non-element
  `trigger` falls back to a native button wrapper. There is no controlled trigger/open API.
- **Menu closed state.** The popup panel may stay mounted; while closed it carries the
  `hidden` attribute and the CSS provides `[hidden] { display: none; }`, so the closed
  panel is out of the Tab order and the accessibility tree. Closing is immediate — there
  is no close-animation delay and no opacity-only hide.
- **Role + checked semantics (Menu).** Panel `role="menu"`, plain item `role="menuitem"`,
  separator `role="separator"`, group `role="group"`; the popup's accessible name comes
  from the trigger via `aria-labelledby`. For `checked`: `checked === undefined` →
  `menuitem` (no `aria-checked`); any **defined** `checked`, including `false`, →
  `role="menuitemcheckbox"` with a Boolean `aria-checked`. The check indicator is
  decorative. There is **no** `role="checkbox"` and **no** radio-menuitem API.
- **MenuGroup accessible name.** Precedence: (1) explicit `aria-labelledby`; (2) explicit
  `aria-label`; (3) the id of the first MenuLabel found directly under the group or under a
  Fragment; (4) otherwise the group is left unnamed (no fabricated name). The auto label id
  is `React.useId()`-based and SSR/hydration-stable; a consumer MenuLabel `id` is
  preserved. A nested MenuGroup names only its own label — an inner label never names the
  outer group. Items under a MenuGroup or Fragment close the popup on activation exactly
  like direct children.
- **Menu focus + keyboard.** Pointer click, Enter or Space opens onto the first usable
  item; trigger ArrowDown opens to the first usable item, ArrowUp to the last; with no
  usable item the panel itself (`tabIndex="-1"` fallback) takes programmatic focus. Focus
  enters after render and never waits on animation. In the popup: ArrowDown / ArrowUp move
  to the next / previous usable item, Home / End jump to first / last, navigation wraps,
  and disabled items are skipped. Enter / Space is native button activation. Escape closes
  and returns to the trigger. Tab / Shift+Tab close the menu and follow normal document
  focus — the menu is **not** a focus trap. There is no ArrowLeft/ArrowRight popup
  navigation and no submenu keyboard model.
- **Menu activation & close.** Action items are real buttons; pointer, Enter and Space
  activate (a disabled item does not). `onSelect` runs and then the Menu closes; from item
  focus, focus returns to the trigger. An outside-click does not steal focus back from
  another focusable element the click moved focus to; closing by toggling the trigger keeps
  focus on the trigger. There is no `preventDefault`-based keep-open contract and no
  loading/pending API.
- **Public API — ContextMenu.** `children` (the target content) and `items`. An **action
  item** is `{ label, icon, kbd, danger, disabled, onSelect }`; a **structural item** is
  `{ type: "label" }` or `{ type: "separator" }`. There is no checked item, radio item,
  submenu item, `textValue`, controlled open/position state, `placement`/`offset`/
  `collisionPadding` prop, or portal.
- **Context target contract.** The component renders its own focusable wrapper target
  (`tabIndex="0"`) whose accessible name comes from the rendered `children`, and adds a
  stable id, `aria-haspopup="menu"`, `aria-expanded` and `aria-controls`. The wrapper's
  stable internal class `context-menu__target` exists for the component's own focus-visible
  hook, **not** as a public styling API. Keep the children a short, meaningful text target
  with no nested interactive `button`/link/`input`. There is no separate trigger prop.
- **ContextMenu open model.** Pointer: the native `contextmenu` event, anchored at
  `clientX`/`clientY`. Keyboard: Shift+F10, the Context Menu key, and Apps-key
  compatibility, anchored at the physical bottom-left of the target's (or the focused
  descendant's) bounding rect. On open the first usable item takes focus (else the panel).
  Reopening uses a fresh anchor and a fresh measurement; there is no toggle-style
  contextmenu close.
- **ContextMenu focus & keyboard.** Action items use roving tabindex: ArrowDown / ArrowUp,
  Home / End, wrapping, disabled skipped, typeahead, and native Enter / Space activation.
  Escape closes and returns to the context target; Tab / Shift+Tab leave the menu without
  restore; an outside-click follows the shared outside-click focus rule; after item-select
  the target can regain focus. With several instances, one Escape closes only the
  focus-owning instance. The menu is not a focus trap.
- **ContextMenu viewport positioning.** The panel is `position: fixed`; the pointer anchor
  is a client coordinate and the keyboard anchor a target-rect coordinate. After render the
  component measures the panel's actual layout size and clamps it inside the viewport with
  a small inner viewport margin (8px). Resize remeasures and re-clamps **without** moving
  focus; any scroll closes the menu, and scroll-close does not override focus the user has
  already moved to an external element. *(Implementation note: it reads `offsetWidth`/
  `offsetHeight` so the scale entrance animation does not distort the clamp — not a public
  API.)*
- **ContextMenu positioning limitations.** No portal and no `placement`/flip API — the
  clamp adjusts a coordinate, it is not a full floating-positioning system. There is no
  built-in `max-height` / scrollable-panel handling, so a panel taller than the viewport
  can still overflow. The keyboard anchor is the physical `rect.left` / `rect.bottom`, not
  an RTL logical inline-start, and on scroll the menu closes rather than continuously
  tracking the target.
- **Public API — Menubar.** `menus`, `aria-label`, `aria-labelledby`. Each menu is
  `{ label, items }`. A panel **action item** is
  `{ label, icon, kbd, danger, disabled, checked, onSelect }`; **structural items** are
  label and separator per the data model. There is no controlled `openIndex`,
  `onOpenChange`, submenu/nested-menu data, public active index, or `textValue`.
- **Menubar accessible name.** Root precedence: (1) explicit `aria-labelledby`; (2)
  explicit `aria-label`; (3) the `"Application menu"` fallback. Prefer an explicit,
  meaningful `aria-label`/labelledby for the real context — the fallback is an ARIA name
  only, never a visible title. Each popup panel is named by its own top-level trigger, and
  the top-level triggers carry stable ids and `aria-controls`.
- **Menubar role structure.** Root `role="menubar"`, top-level button `role="menuitem"`,
  popup `role="menu"`, plain panel action `role="menuitem"`, a defined-`checked` panel
  action `role="menuitemcheckbox"` + `aria-checked`, separator `role="separator"`. Menubar
  supports **single-level** popups only — there is no nested submenu.
- **Menubar top-level roving & keyboard.** Exactly one top-level trigger is the Tab stop at
  a time (the first usable one initially; the rest `tabIndex="-1"`, disabled triggers
  skipped); Tab enters the menubar once and the next Tab leaves it. ArrowRight / ArrowLeft
  move to the next / previous top-level menu, Home / End to first / last, wrapping;
  Enter / Space open the panel at its first item, ArrowDown opens to the first item and
  ArrowUp to the last; top-level typeahead searches the top-level titles. Switching
  top-level menus while a panel is open opens the new panel and focuses its first usable
  item.
- **Menubar panel keyboard.** ArrowDown / ArrowUp, Home / End, wrapping, disabled skipped;
  ArrowRight / ArrowLeft switch to another top-level menu; panel typeahead searches only
  the current panel's items; Enter / Space is native activation; Escape closes and returns
  to the top-level trigger; Tab / Shift+Tab leave the whole menubar. The menubar is not a
  focus trap.
- **Menubar pointer & hover.** A trigger click opens; clicking the open trigger again
  closes; clicking another trigger switches panels. While a panel is open, hovering another
  trigger can switch panels; hover does not steal focus when focus is elsewhere, but if
  focus was inside the previous panel it moves into the new panel. There is no hover delay
  or pointer-aim algorithm.
- **Menubar dynamic data.** The `menus` and `items` arrays may re-render: if the active
  roving item disappears or becomes disabled the roving model settles on a safe usable
  target, and if the open top-level menu becomes invalid or is removed the component may
  close. Stable, unique React keys and the data order are the consumer's responsibility —
  arbitrary array reordering does not preserve state.
- **Typeahead (shared behaviour).** Available on Menu and ContextMenu panel items, and on
  the Menubar top level and current panel. It is prefix-based, case-insensitive and
  whitespace-normalized; repeating the same character cycles matches; disabled/hidden items
  are skipped; it moves focus but does not activate and does not close the menu. The buffer
  is isolated per component instance, resets on a panel/scope change, and does not run on
  editable targets or during IME composition; it clears after a short inactivity window.
- **Focus-visible.** Menu items, the ContextMenu target wrapper and its items, and the
  Menubar top-level triggers and panel items all show a focus-visible indication using the
  system focus token; after Escape the ContextMenu target-restore shows a visible focus
  again. Pointer focus does not necessarily show a ring — the components rely on the
  browser's `:focus-visible` modality and add no JS-based keyboard/pointer modality state.
- **Forced colors** (`forced-colors: active`). Popup panels use `Canvas` / `CanvasText`
  with a real border for separation; hover/focus use `Highlight` / `HighlightText`;
  keyboard focus uses a `Highlight` outline; disabled items are `GrayText`; separators are
  `GrayText`; labels and shortcuts use system colors; the Menu check and the Menubar
  checked indicator stay visible via `currentColor` / a system color. No
  `forced-color-adjust: none` is used.
- **Reduced motion.** Normally the popups use a short entrance animation — Menu a
  fade/translate, ContextMenu a scale/translate/fade, the Menubar panel a translate/fade
  per its CSS — with no spring/overshoot. At `prefers-reduced-motion: reduce` the
  component-specific entrance animation is removed and the popup appears immediately in its
  final state; focus handling does not wait on animation and closing is not tied to any
  animation delay.
- **Outside-click & Escape.** While open, the components add document listeners;
  outside-click is `mousedown`-based and the listeners are cleaned up on close/unmount.
  Escape uses a focus-owner guard, so one Escape closes only the focus-owning instance.
  There is no shared public menu-manager.
- **System-level overlay limitations (known).** There is no shared Menu/ContextMenu/Menubar
  overlay manager and no portal. There is not yet a full system-wide z-index token scale:
  the three use separate hard-coded layers — Menu sits at a lower layer than the modal
  family, while the Menubar panel and ContextMenu sit higher (ContextMenu highest). A
  Menu's lower layer can be problematic inside a dialog, and an inline-rendered popup can be
  affected by an ancestor `transform` / `filter` / `overflow` stacking context or clipping.
  The dialog manager does **not** coordinate these popups — verify dialog-nested and
  multi-overlay use in the consumer environment.
- **Known implementation constraints.** The system does not yet use a full overlay z-index
  token scale, and a few non-functional CSS literals are not yet tokenized. These are
  housekeeping items, not accessibility blockers.
- **Not provided.** There is currently no submenu / nested menu, radio menuitem, shared
  menu/overlay manager, portal, controlled open API, controlled ContextMenu position API,
  controlled Menubar `openIndex`, public `textValue`, floating-ui `placement` API,
  keep-open item-activation API, loading/pending item API, touch long-press ContextMenu
  contract, or auto-scrollable taller-than-viewport panel. (A leftover submenu selector in
  CSS is not a feature.)

  ```jsx
  // Menu — native button trigger, a named group, a checkbox item, a disabled item
  const [archived, setArchived] = useState(false);
  <Menu trigger={<button type="button">Document actions</button>}>
    <MenuItem shortcut="E" onSelect={editBrief}>Edit brief</MenuItem>
    <MenuDivider />
    <MenuGroup>
      <MenuLabel>View options</MenuLabel>
      <MenuItem checked={archived} onSelect={() => setArchived((v) => !v)}>Show archived</MenuItem>
    </MenuGroup>
    <MenuItem disabled>Audit log (admin only)</MenuItem>
    <MenuItem danger onSelect={deleteProject}>Delete project…</MenuItem>
  </Menu>
  ```

  ```jsx
  // ContextMenu — a text target with label/separator/action items (also opens on Shift+F10)
  <ContextMenu items={[
    { type: 'label', label: 'Quick actions' },
    { label: 'Rename', kbd: 'F2', onSelect: rename },
    { type: 'separator' },
    { label: 'Delete', danger: true, onSelect: remove },
  ]}>
    <div>Right-click this card</div>
  </ContextMenu>
  ```

  ```jsx
  // Menubar — explicit accessible name, three top-level menus, a checkbox panel item
  const [sidebar, setSidebar] = useState(true);
  <Menubar
    aria-label="Editor application menu"
    menus={[
      { label: 'File', items: [{ label: 'Save', kbd: '⌘S', onSelect: save }] },
      { label: 'Edit', items: [{ label: 'Undo', kbd: '⌘Z', onSelect: undo }] },
      { label: 'View', items: [
        { label: 'Sidebar', checked: sidebar, onSelect: () => setSidebar((v) => !v) },
      ] },
    ]}
  />
  ```

### Command palette
`CommandPalette` is a **controlled, modal command search** — a dialog that filters a flat
catalogue of commands as you type. It is **not** a `Menu` or `Menubar` (it has no trigger,
no roving tabindex, no menuitem model) and **not** a plain `Popover`: it renders as a real
modal dialog (`role="dialog"`, `aria-modal="true"`) that hosts a **combobox over a
listbox**. DOM focus stays in the search input the whole time; the active result is exposed
only through `aria-activedescendant`. Modality reuses the same shared dialog-stack /
modal-isolation infrastructure as `Modal` / `AlertDialog` / `Drawer` — it is **not** a
separate overlay manager.

- **Public API.** `open`, `onClose`, `groups`, `placeholder`. `open` is a **controlled
  Boolean** that decides whether the palette renders. `onClose` is a **close-intent
  callback** — it can fire on Escape, on a backdrop click, and after a command is
  activated. The component **never sets the consumer's `open` state itself**: the actual
  close happens only when the consumer renders `open={false}`, and if `onClose` does not
  flip the state to `false`, the modality and focus trap stay active. `placeholder` is the
  visible placeholder **only** — it does **not** replace the input's programmatic name.
  There is no built-in trigger and no `data-*` API; the consumer owns the trigger and the
  open state. There is **no** `defaultOpen`, `trigger`, `onOpenChange`, `initialFocus`,
  `returnFocus`, public `activeIndex`, `onActiveChange`, `inputLabel`, `listLabel`,
  `portal` or `placement` prop.
- **Command data model.** A **group** is `{ label, items }`. A **command item** is
  `{ id, label, icon?, meta?, shortcut?, keywords?, onSelect }`. `id` must be **stable and
  unique across groups**; the group and item order **is** the navigation order; `keywords`
  add search terms beyond the label; `shortcut` is **display data only**, not a global key
  binding; `icon`, `meta` and `shortcut` are **not** independent focus targets. There is
  **no** `disabled`, `checked`, radio or multi-select state, **no** submenu, **no** loading
  or async-result model, and **no** public `textValue` field.
- **Accessible name (known limitation).** The dialog carries `aria-label="Command
  palette"`, the input `role="combobox"` + `aria-label="Search commands"`, and the list
  `role="listbox"` + `aria-label="Commands"`. These names are currently **internal, fixed
  English strings**: there is no public localization or label prop, and changing
  `placeholder` does **not** change the input's programmatic name. The component does not
  fabricate a visible dialog title.
- **Shared modality.** An open palette registers in the shared dialog stack. Only the
  **topmost** dialog handles its own Tab and Escape; the background is made `inert` and
  `aria-hidden`; the body scroll lock is coordinated and stack-aware. The palette can sit
  as the topmost layer above a nested `Modal` / `Drawer` / `AlertDialog`; closing it leaves
  the modality of the dialog beneath intact; multiple instances do not release each other's
  lock. (The manager is an internal runtime singleton — not a public API.)
- **Initial focus.** On open the search input takes focus, in a post-render,
  cleanup-able frame — it does **not** wait on a CSS animation, and it may focus with
  scroll prevented. If the input is not usable, the fallback is the next tabbable element
  and then the dialog panel. There is **no** public initial-focus prop.
- **Focus trap.** Tab and Shift+Tab stay within the topmost palette; the tabbable list is
  rebuilt on every Tab event; `preventDefault` happens only at the wrap points; with a
  single tabbable, focus stays on it; with none, the panel (`tabIndex="-1"`) is the
  fallback. Options carry `tabIndex="-1"` and are **not** Tab stops — there is **no roving
  tabindex** on the options.
- **Focus return.** On the `false → true` open transition the component captures the
  current external focus target, and after a real `true → false` close it tries to return
  there. Escape, backdrop click and command selection all flow through the **same**
  controlled close lifecycle. A removed, disabled, hidden, `inert` or `aria-hidden` opener
  is **not** focused, and with an invalid opener there is **no** `document.body` or global
  button fallback. A return target is **not guaranteed** for an initially-open mount.
- **Combobox & listbox.** The input is `role="combobox"` with `aria-autocomplete="list"`,
  `aria-haspopup="listbox"`, `aria-expanded="true"` (it only renders while open),
  `aria-controls` pointing at its own listbox, and a **conditional**
  `aria-activedescendant`. The list root is `role="listbox"`; each visible group is
  `role="group"` labelled by its visible heading's stable id; each result is
  `role="option"`, the active one `aria-selected="true"` and the rest `aria-selected="false"`.
  Options are native `<button>`s that carry an explicit `option` role; they stay
  pointer-activatable and are **not** menuitems or checkbox/radio options. DOM focus stays
  in the input during navigation, options never receive programmatic DOM focus, there is
  **no** `aria-activedescendant` when there are no results, and multiple instances use
  stable, distinct ids.
- **Active option.** The active index is clamped each render to the current visible result
  range: there is no active index on an empty list, no dangling active-descendant when the
  list shrinks, and the active result is restored deterministically when the query changes.
  The visual `.is-active`, `aria-selected="true"` and `aria-activedescendant` always point
  at the **same** result. There is no public active-index state.
- **Search.** Filtering is **case-insensitive** over the label and `keywords`; a group
  renders only when it has at least one visible item; group and item order are preserved.
  When nothing matches, a distinct empty state appears — it is **not** an option and **not**
  focusable. There is no fuzzy matching, ranking or async search.
- **Keyboard & IME.** `ArrowDown` / `ArrowUp` move to the next / previous option and **wrap**
  at the ends; `Home` / `End` jump to the first / last; `Enter` activates the active
  command; `Escape` requests close; `Tab` / `Shift+Tab` drive the modal focus trap. During
  Arrow/Home/End the **input keeps DOM focus**, navigation never activates a command, and
  with no results the keys are safe no-ops. There is **no** `PageUp` / `PageDown` contract.
  While an **IME composition** is in flight, `Enter` does not activate a command and does
  not request close (the `isComposing` flag and the legacy `keyCode === 229` path are both
  honoured), and IME completion is not blocked unnecessarily. There is no separate typeahead
  buffer — search comes from the input value.
- **Pointer.** Hovering an option makes **that** option active, so the same active state
  drives both the visual and the ARIA state; a click activates. The option `mousedown`
  does **not** pull DOM focus off the input, and there is no manual `.click()`-based
  activation.
- **Activation order.** On selection: (1) the active item's `onSelect` runs; (2) then the
  palette's `onClose` runs; (3) the **actual** close depends on the consumer rendering
  `open={false}`; (4) focus return happens only on that real close. An item's `onSelect`
  should **not** separately call the same `onClose` — the component already runs
  `onSelect` then `onClose`. There is **no** keep-open command activation and **no**
  pending/loading activation state.
- **Backdrop & close.** Only a direct click on the overlay/backdrop itself requests close;
  a click inside the panel does **not** close on its own; backdrop handling is
  topmost-guarded. There is **no** document-level public outside-click API.
- **Global shortcut (consumer-owned).** The component itself installs **no** global
  Meta/Ctrl+K shortcut — creating the trigger button or a global shortcut is the consumer's
  responsibility. The demo wires a Meta+K / Control+K toggle that flips the controlled
  `open` state; cleaning up that listener is likewise the consumer's responsibility.
- **Forced colors** (`forced-colors: active`). The panel uses `Canvas` / `CanvasText` with
  a real `CanvasText` border; the combobox input is `Canvas` / `CanvasText`; the input and
  panel focus get a `Highlight` outline. The selected/active option uses a `Highlight`
  background, `HighlightText` text and an **inset `HighlightText` outline**; the group
  heading is `GrayText`; the empty state is system-coloured; the icon, meta and shortcut
  follow the option's state colour. There is no `forced-color-adjust: none`.
- **Focus-visible & reduced motion.** Normal input focus uses the system focus token and
  the panel fallback focus is also visible; the selected option draws its cue from
  `aria-selected` / `.is-active`, **not** from DOM focus, so pointer focus may show no ring.
  A targeted `prefers-reduced-motion: reduce` block covers the overlay and panel and
  switches off any component animation; initial focus does not wait on `animationend`, and
  the close and manager cleanup are not animation-dependent.
- **Overlay & stacking (known limitation).** The palette is part of the shared dialog
  stack and its modality is coordinated with `Modal` / `Drawer` / `AlertDialog`; it uses no
  separate public overlay manager and exposes no `portal` prop. The z-index and render
  location remain part of the current component implementation, so a consumer must still
  check transformed or special stacking contexts if the palette does not render in the
  normal document layer.
- **Not provided.** There is currently no uncontrolled / default-open API, no `trigger`
  prop, no public accessible-name / localization prop, no public active index, no
  `onActiveChange`, no disabled command, no checked/radio command, no multi-select, no
  submenu, no async/loading result model, no keep-open command activation, no
  `PageUp` / `PageDown`, and no public `portal` or `placement` API.

  ```jsx
  // Controlled, modal command palette. The consumer owns the open state, the trigger and
  // (optionally) the ⌘K / Ctrl+K shortcut. Each item's onSelect runs the action only — the
  // palette runs onSelect then its own onClose, so don't close again from onSelect.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  <button aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
    Search commands
  </button>
  <CommandPalette
    open={open}
    onClose={() => setOpen(false)}
    placeholder="Search commands…"
    groups={[
      { label: 'Navigation', items: [
        { id: 'go-inbox', label: 'Open Inbox', shortcut: ['G', 'I'],
          keywords: 'messages notifications', onSelect: () => goTo('/inbox') },
      ] },
      { label: 'Create', items: [
        { id: 'new-invoice', label: 'New invoice', keywords: 'bill payment',
          onSelect: () => createInvoice() },
      ] },
    ]}
  />
  ```

### Tooltip
`Tooltip` is a short, **non-interactive supplementary description** — not a `Popover`, a
`Dialog` or a `Menu`. It holds no focusable or activatable content, keeps DOM focus on the
trigger at all times, and links a `role="tooltip"` element to the trigger through
`aria-describedby`. It is **uncontrolled**: the component owns its own open state from hover
and focus. The primary trigger should be a natively keyboard-focusable control; for a static
inline trigger the consumer is responsible for focusability — the component **never** adds
`tabIndex` to an arbitrary child.

- **Public API.** `children`, `content`, `placement` (`top` default · `bottom` · `left` ·
  `right`), `variant` (`dark` default · `light` · `rich`), `shortcut`, `delay` (ms, default
  `200`). Only these props are read. There is **no** `open`, `defaultOpen`, `onOpenChange`,
  `interactive`, `disabled`, `id`, `trigger`, `closeDelay`, `portal` or `collisionPadding`
  prop, no public viewport-clamp API, and no controlled-open model.
- **Trigger & `aria-describedby`.** `children` is the trigger. When it is a valid React
  element, the component composes `aria-describedby` **onto that child**: each instance
  creates a stable, per-instance id; while open, the tooltip's id is appended to the
  trigger's `aria-describedby` id list; consumer-supplied ids are preserved, the list is
  whitespace-separated and de-duplicated, and on close **only the tooltip's own id** is
  removed — no dangling idref. The child's own ARIA and handlers are kept. The Tooltip does
  **not** set `aria-label` on the trigger.
- **Accessible name vs description.** The trigger needs its **own** accessible name;
  `content` is a **description, not a name**. An icon-only button must carry its own
  `aria-label` (or other real name) — the Tooltip only adds the supplementary
  `aria-describedby`. The tooltip text is never the trigger's name.
- **Open / closed state.** The panel carries `role="tooltip"` and a stable id and is reachable
  as the trigger's description while open. Closed, it gets the `hidden` attribute
  (`.tooltip[hidden] { display: none; }`): no accessibility-tree exposure, no pointer surface,
  no layout box. The panel is **not focusable**. Hiding is semantic `hidden` / `display: none`,
  not opacity-only.
- **Hover & focus model.** Pointer hover opens after `delay`; mouseleave cancels a pending
  hover-open; **keyboard focus opens immediately**; blur closes only if the pointer is not
  still hovering; mouseleave does not close while the trigger is still focused; the tooltip
  auto-closes only when **neither** hover nor focus holds it open. There is no click-to-open.
- **Escape.** While open, Escape dismisses the tooltip and **keeps DOM focus on the trigger** —
  it does not blur, activate, or move focus into the panel. It is handled on the trigger's
  local event path (no global Escape listener), and the panel has no focus trap. There is no
  close button.
- **Consumer handlers.** The child's own focus, blur, hover and keydown handlers are
  preserved; the component drives its hover / focus / Escape lifecycle from the wrapper's
  bubbled events, and the `aria-describedby` composition does not overwrite the child's other
  props. Normal Enter / Space / click stay the trigger's own contract. There is no public
  event-composition helper.
- **Timers.** A per-instance pending hover-open timer; a new hover attempt clears the stale
  one; mouseleave, blur and Escape clear it; unmount cleans it up; multiple instances keep
  isolated timer state. There is **no** module-global delay state and **no** shared Tooltip
  manager.
- **Non-focusable child (consumer responsibility).** A string, fragment or non-focusable
  static child does **not** become a keyboard trigger automatically. The consumer adds
  `tabIndex={0}` to a static inline element (without `role="button"` when there is no action)
  and prefers a native button / link when there is a real action or navigation — without
  creating a second Tab stop around an already-interactive child. The component deliberately
  does not rewrite the child's semantics.
- **Non-interactive content.** The tooltip content takes no DOM focus; do **not** put a link,
  button, input or other interactive control in `content`. For longer or interactive content,
  use a `Popover` or `Dialog`. `shortcut` and rich-content visuals stay non-interactive; there
  is no interactive variant.
- **Placement.** `top` · `bottom` · `left` · `right`, positioned with class-based CSS. There
  is **no** auto viewport-flip, collision detection, viewport-clamp or public portal API, and a
  transformed or `overflow: hidden` ancestor can clip the tooltip. This is a documented
  positioning limitation, **not** a modality bug.
- **Variants.** `dark` · `light` · `rich` are **purely visual**; all three share the same
  tooltip semantics and trigger lifecycle. In forced colors they converge on a common
  `Canvas` / `CanvasText` appearance. There is no interactive or status variant.
- **Shortcut.** `shortcut` renders an informational keyboard hint; it installs no keydown
  listener, does not activate the trigger, is not a separate focus target, and does not
  replace the trigger's real keyboard behaviour.
- **Rich content.** `content` may be structured but non-interactive React (a title, meta, a
  short body, a decorative swatch). Keep it short — the tooltip is not an info card or popover,
  and a colored swatch must not be the sole carrier of meaning. There is no focusable
  rich-content API.
- **Forced colors** (`forced-colors: active`). All variants converge on a `Canvas` /
  `CanvasText` surface with a real `CanvasText` border (the shadow is not the only separator);
  the arrow keeps a `Canvas` fill and a `CanvasText` border; the shortcut chip is `Canvas` /
  `CanvasText` with a real border; rich title and body are `CanvasText`, meta is `GrayText`,
  and the swatch stays perceivable through a `CanvasText` border. The demo's inline trigger
  focus is a `Highlight` outline. There is no `forced-color-adjust: none`.
- **Focus-visible & reduced motion.** The panel is not focusable, so it has no focus ring of
  its own; a native trigger's focus indicator is the trigger's / global system's job, and the
  demo's static inline triggers get a targeted `:focus-visible` recipe (a real `Highlight`
  outline in forced colors); pointer hover alone shows no ring. A targeted
  `prefers-reduced-motion: reduce` block turns off the tooltip's opacity / transform transition
  and any animation; open and close are not animation-dependent, the `hidden` state stays
  immediate and semantic, and `delay` remains a timing value, not motion.
- **Normal-motion limitation (known).** Because the closed state is `hidden` / `display: none`
  (accessibility-first), the declared normal-mode opacity / transform entrance transition may
  not reliably play; there is no separate exit-state machine and no `animationend` cleanup.
  This is a visual limitation, not an accessibility defect.
- **Multiple instances.** Each Tooltip uses its own stable id and timer; one instance never
  overwrites another's `aria-describedby`; Escape closes only the focused trigger's own open
  tooltip; there is no shared tooltip stack or manager; the Tooltip is **not** part of the
  dialog modal stack — it is not a modal overlay.

  ```jsx
  // Native button trigger (keyboard-reachable on its own). An icon-only button carries its
  // own aria-label (the NAME); the tooltip only adds the description.
  <Tooltip content="Save the current draft" shortcut="⌘ S" placement="top" delay={300}>
    <button type="button">Save</button>
  </Tooltip>
  <Tooltip content="Search" variant="light">
    <button type="button" aria-label="Search">{/* icon */}</button>
  </Tooltip>
  ```

  ```jsx
  // Static inline trigger: the consumer makes it focusable; the visible text is the name.
  <Tooltip content="Sapphire 600 — the brand primary" variant="rich">
    <span className="inline-anchor" tabIndex={0}>brand color</span>
  </Tooltip>

  // A consumer's existing description is preserved; the tooltip's id is appended only while open.
  <Tooltip content="Saved automatically every 30 seconds">
    <button type="button" aria-describedby="keyboard-note">Save</button>
  </Tooltip>
  ```

### Popover
`Popover` is a click-triggered, **non-modal** floating panel for rich, interactive content
(forms, lists, actions) — not a `Tooltip`, a `Menu`, a `Listbox`, a `Dialog` modal or an
`AlertDialog`. It is **not** a focus trap: it adds no backdrop, applies no body scroll lock and
does not `inert` the background, so the user can keep tabbing through the document. On open, focus
**stays on the trigger** — the panel carries `role="dialog"` but **no** `aria-modal`. It is
**uncontrolled**: `defaultOpen` seeds the initial state and the component owns openness thereafter.

- **Public exports.** Exactly three: `Popover` (the anchor + panel), `PopoverHeader` (title /
  subtitle / optional close) and `PopoverFooter` (action layout). There is **no** provider, global
  Popover manager, portal, controlled root, context API or stack manager.
- **Public API.** `trigger`, `placement` (`top` · `bottom` default · `left` · `right`), `align`
  (`start` · `center` default · `end`), `children`, `defaultOpen` (default `false`). Only these
  props are read. There is **no** `open`, `onOpenChange`, `modal`, `trapFocus`, `returnFocus`,
  `initialFocus`, `portal`, `collisionPadding`, `closeOnEscape`, `closeOnInteractOutside`,
  `onOpenAutoFocus` or `onCloseAutoFocus` prop.
- **Uncontrolled.** `defaultOpen` sets the initial open state **only**; the component owns
  openness from then on. There is no controlled `open` prop, no `onOpenChange`, and the consumer
  receives **no** public imperative close helper. Do not drive it as a controlled component.
- **Trigger child.** `trigger` is primarily a **real, focusable React element**; the component
  clones that actual child rather than wrapping it in a nested button or synthetic interactive
  wrapper, so the consumer's accessible name, `className`, `id` and other props survive and the
  consumer's `ref` is merged with the internal one. The consumer's own `onClick` runs **first**;
  if it calls `event.preventDefault()` the Popover does not toggle, and a `disabled` /
  `aria-disabled` trigger does not toggle. When `trigger` is **not** a valid element, the component
  renders its own native fallback `<button type="button">`. A non-focusable child is not turned
  into a trigger automatically.
- **Trigger ARIA.** The real trigger carries a stable `id`, `aria-haspopup="dialog"`,
  `aria-expanded` (which follows the open state) and `aria-controls` pointing at the stable panel
  id. The panel stays in the DOM while closed, so that idref never dangles. A consumer-supplied
  trigger `id` **wins**, and the panel's accessible name comes from an `aria-labelledby` pointing
  back at the trigger id.
- **Panel semantics.** The panel is a `role="dialog"` with **no** `aria-modal` and an
  `aria-labelledby` naming it by the trigger. It may hold general interactive content, gets **no**
  automatic `tabIndex` and receives **no** automatic focus on open. Because the trigger's text
  doubles as the panel's name, the trigger's accessible name should be meaningful and localized.
- **Closed state.** The panel is **always rendered**; closed, it carries the `hidden` attribute
  (`.popover[hidden] { display: none; }`), so it leaves the Tab order and the accessibility tree,
  has no pointer surface, and is not an opacity-only hide. There is no exit-state lifecycle and no
  conditional unmount.
- **Open & toggle.** Opening is **click-triggered**; on a native button Enter and Space activate
  through the native click (no separate, duplicated keydown activation). A closed trigger click
  opens, an open trigger click closes, the consumer's handler runs first, a `defaultPrevented`
  click does not toggle, and toggling causes no needless focus movement. There is **no** hover- or
  focus-trigger API.
- **Trigger focus model.** On open the focus **stays on the trigger**; the panel gets no automatic
  or programmatic focus. Tab enters the panel's first control in natural DOM order and Shift+Tab
  moves back out. There is no initial-focus prop.
- **Tab & Shift+Tab.** No focus trap, no Tab loop, no global Tab listener; the component does not
  block normal document order, and focus may leave the trigger + panel region freely. The Popover
  does **not** close on blur / focusout alone — its close paths are trigger toggle, Escape, the
  Header close button and an outside pointer interaction.
- **Escape.** While open, an Escape bubbling up the trigger's or panel's event path closes the
  Popover; a closed Popover does **not** consume Escape, and Enter / Space / arrow keys are not
  handled. A genuinely handled Escape calls `stopPropagation()` so a surrounding bubble-phase
  overlay does not also close on the same keypress, and the Popover's own Escape branch does not
  call a needless `preventDefault()`. There is no global Escape listener.
- **`defaultPrevented` Escape (event composition).** A trigger or panel descendant's own
  `onKeyDown` runs **first**. If an inner widget (combobox, select, date picker, nested control)
  handles Escape with `event.preventDefault()`, the Popover stays **open**, moves no focus, does
  **not** run its close path and does **not** call `stopPropagation()` — leaving the inner widget's
  Escape contract intact. There is no public Escape-configuration prop.
- **Escape focus.** Escape from **inside the panel** returns focus to the usable trigger after
  closing; Escape on the **trigger** leaves focus where it already is (no needless refocus). Focus
  may be moved with `preventScroll`, and an invalid or removed trigger yields no `<body>` focus and
  no global query fallback.
- **Outside pointer close.** While open, a document-level `mousedown` outside the anchor closes the
  Popover; the listener is active **only while open** and is removed on close and unmount. A
  pointer interaction on the trigger or inside the panel is never "outside", outside close calls no
  `preventDefault()` so the external target's click proceeds normally, and there is **no** backdrop.
  There is no `pointerdown` prop or configuration.
- **Outside focus retention.** The focus policy depends on the close cause. For an **interactive**
  external target (input, button, link or other focusable element) the target's focus or
  interaction wins and the Popover does **not** steal focus back to the trigger. For a
  **non-focusable** external target, if focus was inside the panel and the target will not take
  focus, the component may return focus to the usable trigger so it does not fall to `<body>`.
  Return focus is therefore **not** guaranteed on every outside close.
- **Usable trigger.** Programmatic trigger focus happens only when the trigger is connected, not
  `disabled`, not `aria-disabled="true"`, not under a `hidden` / `inert` / `aria-hidden` ancestor,
  and visible by display / visibility. For an invalid trigger there is no thrown error, no `<body>`
  focus and no global `querySelector` fallback.
- **Multiple instances.** Each Popover uses its own ids, refs and open state; one instance's
  trigger never drives another's panel and one instance's listener cleanup never removes another's.
  There is no module-global active Popover and no global Popover stack manager.
- **Nested Popover.** In an inline DOM structure the inner Popover's trigger and panel are
  descendants of the outer panel, so inner interaction is not an outside click for the outer
  instance; a handled inner Escape, via `stopPropagation()`, closes the **inner** first while the
  outer may stay open. There is no global stack API. **Limitation:** a surrounding overlay's
  capture-phase document Escape handler can run **before** the Popover's bubble-phase handler.
- **Placement & align.** `placement` is `top` · `bottom` (default) · `left` · `right`; `align` is
  `start` · `center` (default) · `end`. Both are class-based, and the component applies an existing
  viewport-nudge correction — this is **not** a full positioning engine, and changing placement or
  align is not a controlled-open API. There is no `auto`, logical-side, start/end *placement*,
  center *placement* or flip mode.
- **Positioning limitations (known).** No portal, no automatic flip, no full collision detection
  and no general viewport-clamp contract; a transformed or `overflow: hidden` ancestor can clip the
  panel, the nudge is not a full replacement for a placement engine, and the panel stays inline in
  the DOM. The positioning is not collision-safe.
- **Header API.** `<PopoverHeader title="…" sub="…" onClose={…} />` renders a title, an optional
  subtitle (`sub`) and an optional close button. The close control is a native `type="button"`,
  its accessible name is supplied by the component, it sits in the normal Tab order and is
  activated by Enter and Space; closing from it returns focus to the trigger. The close-wiring
  prop the panel passes down internally is **not** public — use `onClose`.
- **Footer API.** `<PopoverFooter>…</PopoverFooter>` is a layout / structural component that holds
  arbitrary consumer actions or links. A Footer child's click does **not** itself auto-close the
  Popover, and announcing the result of an inner action is the consumer's responsibility. There is
  no built-in primary / secondary action contract.
- **Focus-visible.** The Popover's own Header close button gets a targeted `:focus-visible` ring
  from the system `--ep-shadow-focus` token (not animated, no layout shift); a pointer click alone
  may not show the ring. When the trigger is a consumer child its focus-visible styling is the
  consumer Button / link's responsibility — the Popover applies no risky rule that would hit every
  panel button, and the wrapper takes no focus ring.
- **Forced colors** (`forced-colors: active`). The panel body is `Canvas` / `CanvasText` with a
  real `CanvasText` border and the shadow turned off; the arrow keeps a `Canvas` fill with a
  `CanvasText` border; title and message are `CanvasText`, the subtitle is `GrayText`; the close
  button is `Canvas` / `CanvasText` with a real border, `Highlight` / `HighlightText` on hover and
  a 2px `Highlight` focus-visible outline. There is no `forced-color-adjust: none`.
- **Reduced motion.** The current Popover ships **no** working entrance / exit animation — open and
  close are a `hidden` / `display` toggle. Under `prefers-reduced-motion: reduce` the panel, body
  and close button have their transition and animation switched off; the positioning transform (the
  viewport nudge) is not an animation and is left intact. Escape, outside close and focus return
  are not `animationend`-dependent.
- **Standalone demo.** The demo uses the three real exports, keeps **no** open state of its own,
  and shows an interactive placement / align selector, a rich-content example, a `defaultOpen`
  example, a form-embedded example, both normal and `preventDefault`'d trigger-handler composition,
  a `defaultPrevented` Escape example, outside input / button / link focus retention, a
  non-focusable outside target, and nested + multiple Popovers. It implements no listener, Escape,
  focus-return or positioning lifecycle of its own.

  ```jsx
  // Click-triggered, non-modal panel. The trigger keeps focus on open; Tab enters the panel.
  <Popover
    trigger={<button type="button">Edit filters</button>}
    placement="bottom"
    align="start"
  >
    <PopoverHeader
      title="Filters"
      sub="Refine the visible results"
    />
    <div className="popover__message">
      Choose which records stay visible.
    </div>
    <PopoverFooter>
      <button type="button">Apply</button>
    </PopoverFooter>
  </Popover>
  ```

  ```jsx
  // A Header close button: closing from inside the panel returns focus to the trigger.
  <Popover trigger={<button type="button">Account</button>} placement="bottom">
    <PopoverHeader title="Signed in as Ada" onClose={() => {/* consumer reaction */}} />
    <p className="popover__message">Manage your session from here.</p>
  </Popover>
  ```

### Toast
`Toast` is a short **transient or persistent notification** — not a `Dialog`, an `AlertDialog`
or a focus trap. Its appearance never moves DOM focus, it requires no focus on mount, and its
action and close controls sit in the normal Tab order. Automatic screen-reader announcement is
handled by a **single persistent live region** owned by the viewport; the visible toast is
**not** itself a live region. Because every announcement is **polite**, the current Toast API is
not necessarily appropriate for a critical, must-interrupt message.

- **Public exports.** Exactly three: `Toast` (the presentational card), `ToastViewport` (the
  fixed stacking container plus live region) and the `useToasts` store hook. There is **no**
  global toast singleton, promise API, controlled `ToastProvider`, public pause / resume control,
  `clearAll`, update API or swipe API.
- **`useToasts` store.** `const { toasts, push, dismiss } = useToasts();`. `push(toast)` appends
  the toast and returns a **stable id**; `dismiss(id)` removes it and is **idempotent** (a stale
  or unknown id is a safe no-op). The store owns identity and the list **only** — it starts no
  auto-dismiss timer. Toast order is creation order.
- **Toast data model.** `push({ title, message, variant, meta, duration, action })`. `title`,
  `message` and `meta` are text; `variant` selects the visual style; `duration` is the
  auto-dismiss timing; `action` is `{ label, onClick }`. No field is required, and a toast with
  no announceable text is shown but not announced.
- **`ToastViewport`.** `ToastViewport({ toasts, onDismiss, position })` — pass `toasts` from the
  store, `onDismiss={dismiss}` and an optional `position`. Mount it once near the app root; it
  renders the persistent live region plus the stacked toasts. The documented path is
  `useToasts` + `ToastViewport`.
- **Managed auto-dismiss.** The auto-dismiss clock runs **per visible toast** (inside the
  viewport), not in the store, so it can sense hover, focus and unmount. `duration`: `null` /
  omitted → the default delay; a finite value → that many milliseconds of **active, un-paused**
  time; `Infinity` → **never** auto-dismisses (close button or `dismiss(id)` only); a negative or
  non-finite value is treated as an immediate dismiss. There is exactly **one** auto-dismiss time
  source per toast.
- **Hover & focus pause.** While the pointer is over a toast **or** focus is within it, that
  toast's auto-dismiss is paused; on resume only the **remaining** time runs — it does not restart
  from the full duration. Hover and focus are tracked separately: leaving the pointer does not
  resume while focus is still inside, and blurring does not resume while still hovered. Moving
  focus between the action and close buttons is an internal switch that **does not** restart the
  timer. Each toast pauses independently.
- **Dismiss & focus lifecycle.** A single per-instance dismiss path serves both auto-dismiss and
  the close button, so the dismiss callback runs **exactly once** and the timer and a close click
  cannot double-fire; the action callback is never run as part of dismiss. When a toast that
  **held focus** is actually removed, focus returns to the external element that was focused
  before focus entered the toast — restored only after real removal, only when current focus is
  "loose" (on `body` / the document / a disconnected node), and only if that target is still
  usable (connected and not disabled / `aria-disabled` / `hidden` / `inert` / `display: none`).
  It never steals focus back from a live dialog, menu or consumer-focused element, never focuses
  `<body>`, and uses no global query fallback.
- **Persistent live region.** The viewport renders one stable, visually hidden `role="status"`
  region (`aria-live="polite"`, `aria-atomic="true"`, `aria-relevant="additions text"`) that
  exists even with no toasts. The visible toast carries **no** live-region role / `aria-live` /
  `aria-atomic` and is **not** turned into a dialog or alertdialog — it stays a normal,
  virtual-cursor-readable container. There is one announcer per viewport, isolated across
  multiple viewports.
- **Announcement.** Only **new** toasts are announced, in creation order; the spoken text is built
  from the toast's own data in **title → message → meta** order (empty fields skipped, text
  values only — never an action or close label). Two separate toasts with identical text are each
  announced; dismiss announces **nothing** (no "dismissed" text); a position change alone
  re-announces nothing.
- **Positions.** `position` is one of six physical corners: `br` (default, bottom-right) · `bl`
  (bottom-left) · `tr` (top-right) · `tl` (top-left) · `tc` (top-center) · `bc` (bottom-center);
  an unknown value falls back to bottom-right. Changing position moves existing toasts without
  changing their ids, durations or announcements. There is **no** logical `start` / `end` API,
  portal, collision detection or viewport-clamp.
- **Variants.** `variant` is one of `info` (default) · `success` · `warning` · `danger` · `ink`
  (dark surface), and is **purely visual** — a colored status dot plus surface styling. It does
  **not** change announcement urgency: `warning` and `danger` are announced as politely as the
  rest, and the variant name is never mapped to assertive ARIA.
- **Action & close.** `action` renders one `{ label, onClick }` button; `onClick` runs once and
  does **not** auto-dismiss the toast unless the consumer's own callback does. The close button is
  a `type="button"` control whose accessible name is supplied by the component; activating it
  stops the timer and dismisses once. Both controls are native, focusable and in normal Tab order;
  the component owns the close button's ARIA.
- **Forced colors** (`forced-colors: active`). Every variant converges on a `Canvas` / `CanvasText`
  surface with a real `CanvasText` border (the shadow is not the only separator); the action and
  close buttons get a `Canvas` surface, a `CanvasText` border and a real `Highlight` focus
  outline; the variant dot stays perceivable as `CanvasText` though its hue may be lost; title and
  message are `CanvasText`, meta is `GrayText`. There is no `forced-color-adjust: none`.
- **Focus-visible & reduced motion.** The action and close buttons get a targeted
  `:focus-visible` ring from the system focus token (instant, no layout shift), while the toast
  root and the live region take **no** focus ring. A targeted `prefers-reduced-motion: reduce`
  block turns off the toast's entrance animation; auto-dismiss timing, hover / focus pause and
  announcement are unaffected — the motion preference changes only visual motion.
- **Known limitations.** Positioning is class-based with no flip / collision / viewport-clamp /
  portal, and there are no safe-area insets or mobile breakpoint, so a corner toast can sit under
  a notch or gesture bar. A `Toast` rendered directly (outside `ToastViewport`) is a static visual
  card with **no** managed auto-dismiss, pause, focus return or announcement — the managed
  behaviour comes from the `useToasts` + `ToastViewport` path. The entrance animation is the only
  motion: there is no exit-state machine and no `animationend` cleanup. There is no urgency /
  assertive live region.

  ```jsx
  // Mount the viewport once; push from anywhere with the store.
  const { toasts, push, dismiss } = useToasts();
  <ToastViewport toasts={toasts} onDismiss={dismiss} position="br" />

  push({ variant: 'success', title: 'Project shipped', message: 'v1.0.0 is live.', meta: 'just now' });
  ```

  ```jsx
  // An action with a real callback; a persistent toast dismissed explicitly by id.
  push({ variant: 'info', title: 'Invitation sent', action: { label: 'Undo', onClick: undo } });

  const id = push({ variant: 'warning', title: 'Sticky', message: 'Stays until closed.', duration: Infinity });
  // later: dismiss(id);
  ```

### Alert

`Alert` is a **persistent, inline status block** (a "banner") — state that lives in the page
flow, such as "your invoice is overdue" or "draft saved on this device". It is **not** a
**Toast** (which is ephemeral, viewport-anchored, and announced by a shared polite live region)
and **not** an **AlertDialog** (which is a modal confirm / destructive-decision surface with a
focus trap). `Alert` is the inline surface; `AlertDialog` is the modal surface — two separate
families with separate directories and exports.

- **Identity & export.** Source `components/alert/Alert.jsx`, CSS `components/alert/alert.css`, canonical **static HTML** demo `components/alert/alert.html`. One **React** component — `Alert` — exported browser-global via `Object.assign(window, { Alert })` → `window.Alert`. **No** ESM/CJS, **no** IIFE, **no** auto-init, **no** TypeScript type, **no** helper/subcomponent (there is no `AlertTitle`/`AlertDescription`/`AlertActions` export). The canonical demo is a **static HTML mock**, not a React demo; `_theme.js` is the shared preview loader.
- **API.** `Alert({ variant = 'info', tone = 'soft', banner, title, icon, onClose, actions, children, className = '' })` — `variant` `info`(default)/`success`/`warning`/`danger`/`ink` → `.alert--{variant}` and selects the default SVG icon; `tone` `soft`(default, tinted fill)/`subtle` → `.alert--subtle` (border-only); `banner` (boolean) → `.alert--banner` (full-width, top-of-page); `title` renders as a **real `.alert__title` `<span>`** of DOM text; `children` render as a **real `.alert__message` `<span>`** of DOM text; `icon` is a ReactNode — omit for the per-variant default, pass `icon={null}` to render **no** `.alert__icon`; `onClose` (a callback) renders a native `.alert__close` dismiss `<button>`; `actions` is a ReactNode passthrough into the `.alert__actions` slot; `className` passes through to the root. No internal state; controlled/uncontrolled is not a relevant concept — an `Alert` is inline, persistent content. **No** `open`, `defaultOpen`, `severity`, `dismissible`, `role`, `ariaLabel`, `ariaLive`, `ariaAtomic`, `ariaHidden`, `href`, `trigger` or `modal` prop, **no** TypeScript type, **no** public subcomponent.
- **Live-region / role contract.** The root is a passive `<div>` whose role is **severity-aware**: `variant === 'danger'` → **`role="alert"`** (implicitly assertive), every other variant → **`role="status"`** (implicitly polite). There is deliberately **no** separate `aria-live` attribute — the implicit live-region semantics of `status`/`alert` carry it, and there is **no** prop to override the role. There is **no** `role="dialog"`/`role="alertdialog"` and **no** modal relationship. The essential meaning is carried by **real, unhidden DOM text** (`title` + `message`), never by colour alone; severity is conveyed by the text plus the role, not by the tint.
- **Decorative icon contract.** When an icon renders, the `.alert__icon` wrapper always carries **`aria-hidden="true"`** — the icon (per-variant default SVG or consumer-supplied) is **decorative**, skipped by assistive tech, and never the sole information source. There is deliberately **no informative-icon API** (`role="img"`/`aria-label`): the meaning stays in the title/message text and the live-region role. `icon={null}` renders no icon element at all.
- **Close / actions / focus contract.** The root is **not** focusable — no `tabindex`, no keyboard handler, no pointer handler on the root, no nested-interactive conflict. The dismiss control renders **only** when `onClose` is supplied; it is a native `.alert__close` `<button>` with the accessible name **`aria-label="Dismiss"`**. `actions` is a passthrough — the consumer supplies native `<button>`/`<a>` (the closed **Buttons** family owns CTA styling); the slot adds no button/link contract of its own. House-style focus rings live on the interactive controls only: `.alert__close:focus-visible` and `.alert__action:focus-visible` get a visible `outline` (there is **no** root focus-visible contract).
- **Forced colors.** A local `@media (forced-colors: active)` block in `alert.css` uses **system colours only** (no token/hex/rgb/rgba/hsl/hsla, no `forced-color-adjust: none`): `.alert` and each `--info`/`--success`/`--warning`/`--danger`/`--ink`/`--subtle` variant → `Canvas` bg + `CanvasText` text + **`1px solid CanvasText` border** (replacing the base `transparent` border and collapsing the tinted variant fills onto one neutral surface — severity stays in the text + role, never a fake colour code); `.alert--subtle.alert--{info,success,warning,danger}` → `1px solid CanvasText` **border-left** (closing the colour-coded 3px left-stripe degradation — it is no longer the sole HCM cue); `.alert__icon` → `CanvasText`; `.alert__title` / `.alert__message` → `CanvasText`; `.alert__close` / `.alert__action` → `ButtonFace` bg + `CanvasText` text + `1px solid CanvasText` border; `.alert__action--primary` → `Highlight` bg + `HighlightText` text + `Highlight` border; `.alert__close:focus-visible` / `.alert__action:focus-visible` → `2px solid Highlight` outline. Layout-only wrappers carry **no** rule (their children carry visibility): `.alert__body` and `.alert__actions` (flex containers), and `.alert--banner` inherits the base `.alert` system border. **Live emulation not run — CSSOM/source-verified (P2).**
- **No motion.** No `transition`, no `animation`, no `@keyframes`; **`transition: all` = 0**; no entrance/exit motion, no hover lift, no shimmer. A reduced-motion guard is not needed and the hardening introduced no motion.
- **Visual mapping & class contract.** Classes: `.alert`(`--info`/`--success`/`--warning`/`--danger`/`--ink`/`--subtle`/`--banner`), `.alert__icon`, `.alert__body`, `.alert__title`, `.alert__message`, `.alert__actions`, `.alert__action`(`--primary`), `.alert__close`. Every active class has CSS, the forced-colors selectors and the two focus-visible selectors cover real elements, **no dead selector**, no source↔CSS↔demo drift; **`.alert__content` is not a real class** (the content wrapper is `.alert__body`) and is not a documented API. The `soft`-tone tinted fills, the `.alert--subtle` left stripe and the `.alert--ink` inverted surface are design-token driven in the normal theme; an invalid `variant`/`tone` does not crash. **P3**: the `.alert--subtle` coloured `border-left` in the normal theme is a side-stripe (voice/polish, not the accessible severity cue); hardcoded `rgba(...)`/`#000` hover backgrounds in the normal CSS.
- **Canonical static demo.** `components/alert/alert.html` is a **static HTML mock** (not a React demo; `_theme.js` shared preview loader): renders, no 404, no JS fatal, with soft/subtle/ink/banner examples, a dismiss button, an actions row and title/message/icon — every message is real DOM text. The React `<Alert>` is **not** demoed here; the React component and this documented class contract are the recommended copy-paste source (the static HTML is not a complete API source of truth).
- **Consumers & blast radius.** **No active React consumer** — `window.Alert`/`<Alert>` are unused. There is **one static `.alert` consumer**: `web-app-examples/examples/docs.html` (a prose callout). `styles.css` aggregates `alert.css`; the `SKILL.md` registry lists `Alert | alert | Alert`; the `components/README.md` `alert | Alert | CSS` row is a **documented P3 classification drift** (the family is React with a browser-global export), not fixed here. **Blast radius low** for the React component, **low–medium** for the `.alert` CSS/docs consumer.
- **Known limitations.** **P2**: browser-only export; no active React consumer; the single static docs consumer keeps blast radius low–medium; live forced-colors emulation not run (CSSOM-only). **P3**: `.alert--subtle` side-stripe (voice/polish); hardcoded `rgba`/`#000` hover in the normal CSS; `components/README.md` classification drift; demo-only copy/layout. Status: **P0/P1 closed; P2/P3 documented.** The modal sibling **AlertDialog** is documented under [Dialogs and modal overlays](#dialogs-and-modal-overlays) and was **not** modified in this step.

### Accordion
`Accordion` is a **multi-item disclosure list** with a `single` or `multiple` open mode — not a
`Tabs`, a `Menu`, a `Listbox`, a `Tree` or a `Dialog`. It is **not** a focus trap, uses **no**
roving tabindex and handles **no** ArrowUp / ArrowDown / Home / End navigation; each trigger
activates through a native button click. It is **uncontrolled**: an internal `Set` of open item
indexes owns the state.

- **Public exports.** Exactly two: `Accordion` (the list) and `AccordionItem` (one row). There is
  **no** `AccordionRoot`, `AccordionTrigger`, `AccordionContent`, `AccordionHeader`, provider,
  context API, controlled root or global manager.
- **`Accordion` API.** `variant` (`plain` default · `bordered` · `separated`), `type` (`single`
  default · `multiple`), `defaultOpen` (default `[]`, a list of **indexes**), `children` and
  `className` (default `''`, appended to the root class). There is **no** `value`, `defaultValue`,
  `open`, `onOpenChange`, `onValueChange`, `collapsible`, `disabled`, `orientation`, `headingLevel`,
  `as`, `asChild`, `forceMount` or `unmountOnClose` prop.
- **`AccordionItem` API.** `title`, `meta`, `icon` and `children`. `_isOpen` and `_onToggle` are
  **internal** connecting props the root injects by cloning each item — they are not public.
- **Uncontrolled.** The root holds an internal `Set` of open indexes; `defaultOpen` seeds the
  **initial** open indexes only, and a later prop change is **not** a controlled update. There is no
  public `open`, `value`, `onOpenChange` or `onValueChange`, and item identity is currently
  child-index-based, not value-based.
- **Single mode.** `type="single"`: at most one item is open; opening one closes the previously
  open one, and re-activating the open item closes it — so **zero** open items is a valid state.
  There is **no** separate `collapsible` prop, and `defaultOpen` stays an index list.
- **Multiple mode.** `type="multiple"`: several items can be open at once; toggling one never closes
  the others, and each item carries its own index in the same internal `Set`. There is **no**
  `multiple={true}` boolean.
- **Variants.** `plain` (default, no modifier), `bordered` and `separated` are the official
  variants; the root class is `accordion` plus `accordion--bordered` / `accordion--separated`, the
  consumer `className` is appended, and the visual recipes come from the component CSS. The CSS also
  carries an **undocumented** `subtle` header recipe (`.accordion--subtle`); because `variant` is
  interpolated rather than whitelisted it resolves if used, but it is not part of the supported set.
- **Trigger.** Each item's trigger is a native `<button>` with an explicit `type="button"`, and is
  the **single interactive child** of a native `<h3 className="accordion__heading">`. It carries its
  own stable id, an `aria-controls` pointing at its own panel id, and an `aria-expanded` that
  follows the open state; Enter and Space activate through the native button (no separate, duplicated
  keydown). There is **no** `aria-selected`, `aria-haspopup`, tablist / tab or menu semantics.
- **Heading.** Every item uses a fixed native `<h3>` that holds **only** the trigger button; the
  heading itself is not interactive and there is no public heading-level configuration. **Known
  limitation:** the fixed `<h3>` does not auto-adapt to every document or nested hierarchy, and a
  configurable heading level may be a later API decision (there is no `headingLevel` or `as` prop).
- **Panel semantics.** The panel gets a stable id, `role="region"` and an `aria-labelledby` pointing
  at its own trigger id. It stays in the DOM while closed (so `aria-controls` never dangles), carries
  `hidden` when closed and is natural block content when open, and receives **no** automatic focus
  and **no** `tabIndex`. With many items the number of `region` landmarks can grow.
- **Hidden contract.** A closed panel carries `hidden`, so it leaves the Tab order and the
  accessibility tree, has no pointer surface and is not an opacity-only hide; there is no conditional
  unmount, so child state and uncontrolled input values survive reopen. There is no `aria-hidden`,
  `inert` or descendant-`tabIndex` manipulation.
- **Focus & keyboard.** Tab and Shift+Tab follow natural document order — no focus trap, no roving
  tabindex, no programmatic panel focus — and after activation focus stays on the trigger. Enter and
  Space toggle the focused trigger; ArrowUp / ArrowDown / Home / End are **not** handled (a plain
  disclosure set, not a roving widget).
- **Focus-visible.** Normal mode: `.accordion__header:focus-visible` is `outline: none` plus
  `box-shadow: var(--ep-shadow-focus)` (the accent color may persist); the ring is not animated,
  causes no layout shift, and a pointer click alone may not show it. Forced-colors mode replaces it
  with a real `outline: 2px solid Highlight`, `outline-offset: 2px`, `box-shadow: none` — focus is
  not signalled by a color change alone.
- **Panel height & motion.** There is **no** `max-height` cap and no layout-property transition: an
  open panel takes its natural, content-driven height, dynamic content is never clipped, and open /
  close is an **instant** `hidden` toggle with no exit-state. In normal mode the header color and the
  chevron `transform` rotation may transition; under `prefers-reduced-motion: reduce` both are turned
  off while the chevron's rotated end-state is preserved, with no `animationend` / `transitionend`
  dependency.
- **Forced colors** (`forced-colors: active`). The item / divider border, the `bordered` container
  border and the `separated` item borders become real `CanvasText`; header, title and body text are
  `CanvasText`, the meta is `GrayText`, and the icon and own chevron stay visible as `CanvasText` via
  `currentColor`; the trigger focus is a `Highlight` outline. There is no `forced-color-adjust: none`,
  and a consumer control placed inside a panel keeps its own forced-colors styling.
- **Chevron & icon.** The component's own chevron is decorative (`aria-hidden="true"`,
  `focusable="false"`) and rotates to signal the open state — but openness is **not** conveyed by the
  chevron alone, since the trigger's `aria-expanded` also updates. The consumer `icon` prop's
  semantics are the consumer's responsibility; the component does not force it decorative.
- **Nested & multiple instances.** Each item gets its own `React.useId()` id pair, so nested
  Accordion items do not collide with the outer ones; each Accordion owns its own state, an inner
  toggle never changes the outer state, a closed outer panel's `hidden` hides the inner subtree, and
  reopening preserves the inner state and ids. There is no module-global active Accordion.
- **Inside a form.** The trigger's `type="button"` means toggling never submits the surrounding form;
  a real `type="submit"` inside an open panel can submit normally, while a closed panel's submit
  control is `hidden` and unreachable. There is no trigger-level `preventDefault()`.
- **Standalone demo.** The demo uses the real exports and covers single, single `defaultOpen`,
  multiple, plain / bordered / separated, interactive panel content, the hidden closed panel,
  child-state preservation, long and dynamically growing content, a form, a nested Accordion,
  multiple sibling instances, keyboard, focus-visible, reduced-motion, forced-colors and the known
  limitations. It keeps **no** Accordion-open state and implements no DOM lifecycle of its own.
- **Known limitations.** No controlled API, no `disabled` API, no item-value API, no configurable
  heading level, no Arrow / Home / End roving navigation; item identity is index-based, the heading
  is a fixed `<h3>`, many panels raise `region` landmark density, the export attaches to the browser
  `window` (browser-only), and there is no panel enter / exit animation. These are documented design
  limits, not defects.

  ```jsx
  // Multi-item disclosure; bordered variant, second item not needed open at start.
  <Accordion type="single" variant="bordered" defaultOpen={[0]}>
    <AccordionItem title="Account" meta="Profile and security">
      <p>Manage your profile, password and sessions.</p>
    </AccordionItem>
    <AccordionItem title="Billing">
      <p>Invoices, payment method and plan.</p>
    </AccordionItem>
  </Accordion>
  ```

### Collapsible
`Collapsible` is a simple **single-trigger disclosure** that controls one content panel — it is
**not** an `Accordion`, a multiple-disclosure set, a `Menu` or a `Dialog`, is **not** a focus trap
and moves focus nowhere automatically. It is **uncontrolled**: an internal boolean owns the state.

- **Public export.** Exactly one: `Collapsible`. There is **no** Root / Trigger / Content split,
  provider or context API.
- **Public API.** `trigger`, `children`, `defaultOpen` (default `false`) and `onOpenChange`. There
  is **no** controlled `open`, `value`, `defaultValue`, `disabled`, `multiple`, `type`,
  `headingLevel`, `orientation`, `id`, `triggerId`, `panelId`, `unmountOnClose` or motion prop.
- **Uncontrolled.** The component holds an internal boolean; `defaultOpen` is the **initial** value
  only and a later prop change is not a controlled update. `onOpenChange(nextOpen)` is an optional
  notification that runs **once per toggle** with the next boolean value; it does not make the
  component controlled.
- **Trigger.** A native `<button>` with an explicit `type="button"` and a stable
  `React.useId()`-based id; `aria-controls` points at the content id and `aria-expanded` follows the
  open state. Enter and Space activate natively — there is no own keydown-toggle and no
  `preventDefault()`. The trigger's accessible name comes from the consumer `trigger` prop.
- **Content.** A stable panel id with `role="region"` and an `aria-labelledby` pointing at the
  trigger id; it carries `hidden={!open}`, backed by a targeted
  `.collapsible__content[hidden] { display: none; }`. Closed, it is out of the Tab order and the
  accessibility tree; open, it is natural block layout. Children stay **mounted**, so child state and
  uncontrolled input values survive. There is no `aria-hidden`, `inert`, conditional unmount or
  programmatic focus.
- **Focus & keyboard.** Tab / Shift+Tab follow natural document order, Enter / Space toggle the
  trigger, there is no focus trap and no panel focus, no Arrow / Home / End navigation, and focus
  stays on the trigger after a toggle.
- **Focus-visible.** Normal mode: `.collapsible__trigger:focus-visible` is `outline: none` plus
  `box-shadow: var(--ep-shadow-focus)` — not animated, no layout shift. Forced-colors mode replaces
  it with `outline: 2px solid Highlight`, `outline-offset: 2px` and `box-shadow: none`, with hover +
  focus-visible both visible. **Known P2:** the root's `overflow: hidden` can partly clip the outer
  edges of the normal outset box-shadow ring.
- **Panel height & motion.** There is **no** `grid-template-rows` panel animation and no height /
  `max-height` transition: open content takes its natural height, there is no panel enter / exit
  animation, the `hidden` toggle is **instant**, and there is no exit-state. In normal mode the
  trigger background and the chevron `transform` may transition; under
  `prefers-reduced-motion: reduce` both are turned off, the chevron's end-state is preserved and the
  `hidden` contract is unchanged.
- **Forced colors** (`forced-colors: active`). The root gets a real `CanvasText` border, the trigger
  text is `CanvasText` with a `Highlight` / `HighlightText` hover, the chevron stays visible as
  `CanvasText` via `currentColor`, and the content's own text recipe is `CanvasText`; the trigger
  focus is a `Highlight` outline. There is no `forced-color-adjust: none`, and consumer child
  controls keep their own forced-colors styling.
- **Chevron.** The component's own chevron is decorative (`aria-hidden="true"`, `focusable="false"`)
  and rotates to signal the state — which is also conveyed by the trigger's `aria-expanded`.
- **Root overflow (known P2).** The root uses `overflow: hidden` to clip its rounded boundary; as a
  result the normal outset box-shadow focus ring can be partly clipped, and an overlay or dropdown
  that extends past the root boundary from inside the content can be clipped too. In forced-colors
  mode the focus is outline-based. This is a documented P2 root-geometry limit, not resolved.
- **Nested & multiple instances.** Each instance owns its own state and `useId` id pair, so nested
  Collapsible ids do not collide; an inner toggle never changes the outer state, a closed outer
  content's `hidden` hides the inner subtree, reopening preserves the inner state, and one instance's
  `onOpenChange` never fires on another's toggle. There is no global active Collapsible.
- **Inside a form.** The trigger's `type="button"` means toggling never submits; a closed content's
  form controls are unreachable, while an open content's real `type="submit"` can submit.
  `onOpenChange` is not a form-submit callback.
- **Standalone demo.** The demo uses the real export and covers initially-closed, `defaultOpen`,
  `onOpenChange`, interactive content, the hidden-when-closed focus test, child-state preservation,
  long and dynamic content, a form, a nested Collapsible, multiple instances, keyboard, focus-visible,
  reduced-motion, forced-colors and the root-overflow P2. It keeps no open state and no DOM lifecycle
  of its own.
- **Known limitations.** No controlled `open`, no `disabled` API, no heading wrapper, no multiple
  mode, no item-value API, no panel enter / exit animation, the root `overflow: hidden` clipping
  above, and a browser-only `window` export.

  ```jsx
  // Single disclosure; optional onOpenChange notification, uncontrolled.
  <Collapsible
    trigger="Advanced options"
    defaultOpen={false}
    onOpenChange={(nextOpen) => console.log(nextOpen)}
  >
    <p>Fine-tune the request before sending it.</p>
  </Collapsible>
  ```

### Tabs
`UnderlineTabs` is the **in-page content Tabs** export — a horizontal tablist that switches
mutually-exclusive content panels **on the same page**. It is **not** page navigation, **not** a
route-switching link list and **not** a radiogroup. The `.tabs` visual recipe may also be reused in
separate, hand-written navigation markup (for example the static `settings` `<nav>`), but that markup is
a plain navigation consumer — **not** the `UnderlineTabs` component or its semantics.

- **Public export.** Exactly one: `UnderlineTabs`. There is **no** compound `TabsList` / `TabsTrigger` /
  `TabsContent`, `TabsRoot`, provider or context API.
- **Public API.** `UnderlineTabs({ items, active, onChange, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby })`.
  The root props are `items`, `active`, `onChange`, `aria-label` and `aria-labelledby`. There is **no**
  `value`, `defaultValue`, `onValueChange`, `defaultActive`, `activationMode`, `orientation`, `disabled`,
  `loop`, `dir`, `className`, `panelId`, `tabId`, `forceMount` or `unmountOnExit` prop.
- **Item shape.** Each item is `{ id, label, count?, content? }`: `id` is the selection identity, `label`
  the tab's visible name, `count` an optional badge, `content` the optional panel body. A missing
  `content` renders an **empty but valid** tabpanel (its `aria-controls` / `aria-labelledby` stay intact).
- **State contract.** `active != null` is **controlled** (so `active={0}` and `active=""` are valid
  controlled values); `active={null}` or omitting `active` is **uncontrolled**, with the first item's id
  as the initial value — there is no separate `defaultValue` / `defaultActive`. With a non-empty `items`
  there is always an effective active item; an invalid controlled `active` falls back to the first item
  **in render**, and that automatic fallback never calls `onChange`. Uncontrolled, removing the active
  item makes the first item the new internal fallback; reorder follows the item **id**, not the index.
  Re-activating the active tab is a selection- and callback-no-op; activating another tab calls
  `onChange(nextId)` **once**. Runtime controlled↔uncontrolled switching is not a separately supported
  contract.
- **DOM & ARIA.** An outer `.tabs-root` wraps a `.tabs` element with `role="tablist"` (the triggers) and
  a non-interactive `.tabs__panels` container (the panels). Each trigger is a native
  `<button type="button" role="tab">` with `aria-selected`, roving `tabIndex`, a stable `id` and an
  `aria-controls` pointing at its own panel. Each panel is a `.tabs__panel` with `role="tabpanel"`, a
  stable `id`, an `aria-labelledby` pointing back at its tab, and `hidden` while inactive. With a
  non-empty `items` there is **exactly one** selected tab, **exactly one** `tabIndex=0` and **exactly
  one** non-hidden panel. There is **no** `aria-hidden`, `inert`, panel `tabIndex`, automatic panel focus
  or focus trap.
- **Stable ids.** One top-level `React.useId()` base per component instance builds the tab and panel ids,
  so nested and sibling instances are isolated and no tab's `aria-controls` points at another instance's
  panel. The selection identity stays `item.id` — DOM id and selection id are separate contracts — and
  within a given render the tab↔panel references stay consistent across reorder. There is no random,
  time-based or module-global id, and **no** consumer-supplied `tabId` / `panelId` prop.
- **Keyboard (fixed horizontal, automatic activation).** `Tab` enters on the selected tab; `→` / `←`
  move to the next / previous tab, `Home` / `End` jump to the first / last, and movement **loops**.
  Moving focus changes the selection and the visible panel immediately when uncontrolled; when controlled
  it calls `onChange` and the selection follows the parent prop update. `↑` / `↓` are **not** Tabs
  navigation; `Enter` / `Space` are native button activation; the next `Tab` after a tab moves into the
  panel content or the next document element (no automatic panel focus). RTL: `←` / `→` follow the live
  visual direction, while `Home` / `End` are direction-independent.
- **Panel lifecycle.** Every panel stays **mounted**; only the inactive panels' `hidden` state changes.
  Child React state, uncontrolled input values and nested component state survive a tab switch — there is
  no conditional unmount, no panel enter / exit animation, no height measurement, and the active panel
  takes its natural block height. There is **no** `forceMount` or unmount configuration.
- **Form safety.** Every trigger is `<button type="button">`, so switching tabs never submits a
  surrounding form; a real `type="submit"` inside the active panel submits normally, while an inactive
  panel's form controls are `hidden` and unreachable.
- **Selected visual.** The active tab carries an accent text color **and** a real bottom underline /
  border (a count badge is optional) — selection is **not** color-only. `.is-on` marks the active tab
  from the single effective state, and the class name is part of the contract.
- **Focus-visible.** Normal mode: `.tabs button:focus-visible` is `outline: none` plus
  `box-shadow: var(--ep-shadow-focus)` — not animated, no layout shift, not a color-only cue, and the
  selected underline stays visible alongside the ring (a pointer click alone may not show it). **Known
  P2:** because `.tabs` is a horizontal scroll container, the user agent can partly clip the outer edges
  of the normal outset box-shadow ring at the scrollport boundary; `scroll-padding-inline` improves the
  inline edge-tab visibility, but the normal-mode clipping is **not** fully solved. Forced-colors mode
  uses an inner `Highlight` outline instead (not clipped).
- **Transition & reduced-motion.** There is **no** `transition: all`: `.tabs button` transitions only a
  targeted color property — no layout-property transition, no focus-ring transition and no panel
  animation. Under `prefers-reduced-motion: reduce` the trigger transition is turned off while the
  selected end-state, the underline and the panel `hidden` contract are preserved, with no
  `transitionend` / `animationend` lifecycle.
- **Forced colors** (`forced-colors: active`). The tablist divider is `CanvasText`, tab text is
  `ButtonText`, the selected tab carries a real `Highlight` underline, the count badge is
  `ButtonFace` / `ButtonText` (selected `Highlight` / `HighlightText`) and the panel is `CanvasText`; the
  tab focus is an inner `Highlight` outline. There is **no** `forced-color-adjust: none`, and a consumer
  control inside a panel keeps its own forced-colors styling.
- **Layout & responsive.** `.tabs` stays on **one row** and scrolls horizontally (`max-width: 100%`, thin
  scrollbar, touch / pointer scroll, no JS scroll measurement); long labels neither wrap nor ellipsise.
  There is token spacing between the tablist and the panels, and the panel takes its natural height.
- **Standalone demo.** `components/tabs/tabs.html` uses a real React / ReactDOM / Babel bootstrap,
  renders the real exports, and covers uncontrolled and controlled UnderlineTabs, interactive panels with
  child-state preservation, long / dynamic content, a narrow viewport, nested and multiple instances, a
  form context, keyboard instructions, and the focus-visible / reduced-motion / forced-colors /
  known-limitations notes. It keeps no own selection state and no ARIA / roving / DOM lifecycle of its
  own.
- **Known limitations.** Browser-only `window` export; no `disabled` API; no runtime item-id validation
  (ids must be unique and non-empty — a consumer responsibility, practically string or number); fixed
  horizontal orientation and fixed automatic activation (no `activationMode`); no explicit `forceMount` /
  `unmountOnExit` API; a missing `content` renders an empty panel; the scrollport focus-ring clipping P2
  above; and native focus-scroll has browser-dependent fine detail. These are documented design limits,
  not P1 / accessibility defects.

  ```jsx
  // In-page content tabs; uncontrolled (first item selected), with a count badge and panel bodies.
  <UnderlineTabs
    aria-labelledby="settings-tabs-heading"
    items={[
      { id: 'overview', label: 'Overview', content: <OverviewPanel /> },
      { id: 'activity', label: 'Activity', count: 3, content: <ActivityPanel /> },
      { id: 'settings', label: 'Settings', content: <SettingsPanel /> },
    ]}
  />
  ```

### Segmented and Pills
`Segmented` and `Pills` are two **single-select, horizontal radiogroup** exports — a value / display-mode
picker that does **not** swap a content region. Neither is a `Tabs`, navigation or a multi-select toggle
group; for the distinction see **Button group → "Radiogroup vs Tabs"** above, whose semantic table and
**Radiogroup keyboard map** apply here unchanged (these React exports implement that same radiogroup
pattern with `.is-on` and React state rather than the vanilla-JS `.is-active` path).

- **Public exports.** `Segmented({ items, active, onChange, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby })`
  and `Pills({ items, active, onChange, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby })`.
  Both are single-select horizontal radiogroups and UI-only callback controls — not Tabs, not navigation
  and not a multi-select toggle group. There is **no** `value`, `defaultValue`, `onValueChange`,
  `multiple`, `selectionMode`, `disabled`, `orientation`, `loop`, `dir` or `name` prop, no native radio
  input and no form-value API.
- **Pills is single-select.** The current scalar Pills API is **single-select** — not a multi-select
  filter-chip set. There is **no** `aria-pressed` and **no** array-based `active` API.
- **Item shape.** Both accept object items `[{ id: 'day', label: 'Day' }]` or bare-string items
  `['Day', 'Week', 'Month']`: for an object the id is `item.id` and the label is `item.label`; for a
  string the id and the label are the string itself. Reorder follows the id; ids must be unique and
  non-empty (practically string or number), and there is no runtime id validation.
- **State contract.** Same controlled / uncontrolled model as UnderlineTabs: `active != null` is
  controlled, omitted / null `active` is uncontrolled with the first item checked initially; an invalid
  active value falls back to the first item (the automatic fallback never calls `onChange`); re-activating
  the checked radio is a no-op; selecting another radio calls `onChange(nextId)` **once**. With a
  non-empty `items` there is **exactly one** checked item — no zero-checked state and no separate checked
  state.
- **DOM & ARIA.** The `.seg` / `.pills` root is `role="radiogroup"`, named by `aria-label` or
  `aria-labelledby`; each child is a native `<button type="button" role="radio">` with `aria-checked`,
  roving `tabIndex` and `.is-on` from the same effective state. There is **no** native / hidden radio
  input and **no** automatic form-value submission. With neither name prop there is **no** hardcoded
  generic fallback name — providing the group name is a **consumer responsibility**.
- **Keyboard.** The standard radiogroup map: `Tab` enters on the checked radio and the next `Tab` leaves
  the group; `→` / `↓` next, `←` / `↑` previous, `Home` / `End` first / last, with looping and
  selection-follows-focus; `Enter` / `Space` are native button activation; re-activating the checked radio
  is a callback-no-op. There is no disabled-skip because there is no `disabled` API, and there is **no**
  vertical-orientation prop.
- **Form safety.** Every radio is `<button type="button">`, so selecting never submits a form, and
  neither export emits an automatic form value (no `name` / `value` form API).
- **Selected (checked) visual.** Segmented keeps a shared surface with a distinct checked
  background / text and a slight normal-mode elevation; Pills keeps its pill geometry with a dark checked
  surface and light checked text — a single-select visual contract. There is no checkmark, extra icon or
  multi-select indicator.
- **Focus-visible.** `.seg button:focus-visible` / `.pills button:focus-visible` are `outline: none` plus
  `box-shadow: var(--ep-shadow-focus)` — not animated, no layout shift, not color-only, with the checked
  state visible alongside the ring. Their wrappers do not clip, so the ring is not edge-clipped (unlike
  the scrollable `.tabs`). Forced-colors mode uses a `Highlight` outline.
- **Transition, reduced-motion & forced-colors.** No `transition: all`: each radio transitions only
  targeted background / color properties (no layout, no focus-ring, no animation), and
  `prefers-reduced-motion: reduce` turns those off while the checked end-state and surfaces are kept. In
  forced-colors mode Segmented gets a `Canvas` root with a `CanvasText` border, Pills gets a real system
  per-pill border, radios are `ButtonText`, the checked radio is `Highlight` / `HighlightText`, and focus
  is a `Highlight` outline; there is **no** `forced-color-adjust: none`.
- **Layout.** Segmented is a compact inline row (no vertical or auto-scrolling layout); Pills currently
  **wraps** to multiple rows (`flex-wrap`) rather than scrolling.
- **Standalone demo.** Covered in `components/tabs/tabs.html` alongside UnderlineTabs (object- and
  string-item, uncontrolled and controlled examples for each).
- **Known limitations.** UI-only radiogroups: browser-only `window` export, no automatic form-value, no
  `disabled` item, no vertical orientation, and no runtime item-id validation; Pills is single-select,
  not multi-select. Documented design limits, not defects.

  ```jsx
  // Single-select radiogroups; controlled Segmented (string items) + uncontrolled Pills (object items).
  <Segmented aria-label="Reporting range" items={['Day', 'Week', 'Month']} active={range} onChange={setRange} />
  <Pills aria-labelledby="status-filter-heading" items={[{ id: 'all', label: 'All' }, { id: 'active', label: 'Active' }]} />
  ```

### Select
`Select` is a **button-based, select-only combobox** — it picks **one value** from a predefined option list
and renders a custom popup listbox. It is **not** a native `<select>`, **not** the searchable `Combobox`,
**not** a freeform input, **not** multi-select, and **not** navigation or a Menu action-list. The popup
semantics are a `role="combobox"` trigger over a `role="listbox"` panel of `role="option"` items.

- **Public API.** `Select({ options = [], value, onChange, placeholder = 'Select…', size = 'md', icon,
  align = 'left', className = '', id, ...rest })`. Root props: `options`, `value`, `onChange`, `placeholder`,
  `size`, `icon`, `align`, `className`, `id`, and `...rest` spreads valid button / `data-` / ARIA attributes
  onto the trigger. The **option item** is object-only — `{ value, label, icon?, meta?, disabled? }`: `value`
  is the selection identity and the callback value, `label` is the visible text, `icon` is optional leading
  visual content, `meta` is an optional right-aligned trailer, and `disabled` disables the single item. There
  is **no** scalar / bare-string option support.
- **Controlled-only state.** Selection is **controlled-only**: there is no internal selected-value state, the
  visible selection always derives from the `value` prop, and `onChange(nextValue)` fires on selection —
  without a parent update the visible selected value does not persist. There is **no** `defaultValue` and
  **no** uncontrolled mode. An invalid / `null` / `undefined` `value` shows **no** selected option and renders
  the placeholder. Empty `options`, or a `value` whose option was removed, does not throw: it falls back to
  the placeholder, does **not** auto-select the first item and does **not** call `onChange`. Reorder is
  **value-based, not index-based**. Re-selecting the current value currently still calls `onChange` — a
  documented P2 limit.
- **Trigger DOM & accessible name.** The trigger is `<button type="button" role="combobox"
  aria-haspopup="listbox" aria-expanded="true|false" aria-controls="…" aria-activedescendant="…">`.
  `aria-activedescendant` is present **only** while open with a valid active option; `aria-controls` points at
  the mounted listbox id; the explicit `type="button"` means it never submits a form. The trigger's **field
  name is the consumer's responsibility** — supply `aria-label` or `aria-labelledby`; the selected label or
  placeholder alone is not a reliable accessible name. The component emits no runtime warning and no automatic
  label fallback.
- **Listbox lifecycle.** The `.select__panel` listbox is **always mounted**: open → `hidden={false}`, closed →
  `hidden={true}`. The shared `.menu[hidden] { display: none; }` rule (from `menu.css`) removes the closed
  panel from layout and pointer interaction, and native `hidden` removes it from the accessibility tree, while
  the option DOM stays mounted. There is **no** `aria-hidden`, **no** `inert`, **no** conditional
  panel-unmount, **no** focus trap and **no** separate panel-visible state — the closed popup is hidden in
  place, not unmounted.
- **Option, active & selected state.** Each option is `role="option"` with `aria-selected` and (when disabled)
  `aria-disabled`. **Selected** and **active** are separate states: active tracks keyboard / pointer
  navigation, while selection changes **only** on an explicit choose — moving the active option does **not**
  call `onChange` (manual activation, not selection-follows-focus). A disabled option is not selectable and is
  skipped during navigation; option ids are stable and linked through `aria-activedescendant`.
- **Keyboard.** Closed trigger: `Enter` / `Space` / `↓` / `↑` open, `Tab` moves on naturally, `Escape` is a
  no-op, `Home` / `End` do not open, and there is **no** printable-character typeahead. Open popup: `↓` / `↑`
  move the active option, `Home` / `End` jump to the first / last enabled option, navigation loops, disabled
  options are skipped, `Enter` / `Space` select the active option, `Escape` closes and refocuses the trigger,
  `Tab` closes but lets focus move on, and an all-disabled list cannot spin. Click and keyboard share one
  selection path.
- **Pointer & focus.** Trigger click opens / closes; option click selects; a disabled-option click is a no-op;
  selection closes the popup. An outside `mousedown` closes it — the document listener is attached **only**
  while open and is cleaned up on close. `Escape` and selection return focus to the trigger; `Tab` is never
  trapped. Multiple instances keep isolated state and ids; there is no global, always-on keyboard listener.
- **Form behaviour.** `Select` is a **UI-only callback control**: **no** `name`, **no** hidden input, **no**
  `required`, **no** automatic form value and **no** native form-reset integration; the `type="button"`
  trigger never submits. To send a form value, the consumer wires its own state / form adapter — the component
  does not associate with a form directly.
- **Size & visual API.** `size="sm" | "md"` (default) and `align="left" | "right"` (panel alignment) are the
  real options, plus an optional trigger `icon`, per-option `icon` / `meta`, and a placeholder state. Classes:
  `.select`, `button.select`, `.select__icon`, `.select__value` (placeholder via
  `.select__value--placeholder`), `.select__caret`, `.select__panel`, plus the `.select--sm` size and
  `.select--open` state modifiers. There is **no** `lg` size and **no** `width`, `portal`, `placement`,
  `open` / `defaultOpen` prop.
- **CSS contract.** React Select uses `.select` / `button.select` / `.select__value` / `.select__caret` /
  `.select__panel`; the popup and its rows reuse `.menu` / `.menu__item` and the `menu.css` states. The
  **native static `<select class="select">`** (see "Static native consumers" below) shares the same `.select`
  shell but keeps the platform dropdown indicator — **no `appearance: none`, no custom caret**; React Select
  does **not** render a native `<select>`.
- **Focus, forced-colors & reduced-motion.** The Select trigger (and the native static `<select>`) show the
  focus ring on `:focus-visible`; in normal mode it is `box-shadow: var(--ep-shadow-focus)` with no layout
  shift and no animation. Under `forced-colors: active` the trigger and native select get a real `outline: 2px
  solid Highlight; outline-offset: 2px; box-shadow: none;`, and the popup / options map to system colors via
  `menu.css` (`Canvas` / `CanvasText`, `Highlight` / `HighlightText`, `GrayText`) with no
  `forced-color-adjust: none`; the selected option is additionally distinguished by its checkmark, not by
  highlight alone. There is **no** `transition: all`: only the caret's `transform` transitions, and
  `prefers-reduced-motion: reduce` drops both the caret rotation and the panel-entrance animation (the rotated
  end-state is kept); the focus ring is never animated and there is no transitionend / animationend lifecycle.
- **Static native consumers.** `web-app-examples/examples/onboarding.html` (primary / billing contact) and
  `admin-app-examples/examples/settings.html` (timezone, auto-archive period) intentionally use native
  `<select class="select">` / `.select--sm` controls for their plain-text static fields: a visible
  `<label for>` bound to the select `id`, a native `name`, native `<option selected>`, platform keyboard /
  pointer / touch, and **no** custom ARIA and **no** page-local popup JavaScript. These are **not** React
  `Select` instances. The `settings` `<nav class="tabs">` section navigation is a separate, closed
  link-navigation pattern (see "Tabs").
- **Standalone demo.** `Select` and `Combobox` share one demo, `components/select/select.html`: two
  programmatically named Selects (selected + placeholder state, a disabled option, multi-instance isolation, a
  long option / meta value, the always-mounted `hidden` panel lifecycle), a searchable Combobox with a real
  `<label>` and a `name` + `FormData` form example (selection value vs. label / query), a `disabled`
  Combobox, and documented keyboard, ARIA / lifecycle, and focus / forced-colors / reduced-motion notes.
- **Known limitations (P2).** Controlled-only; no root `disabled`; no `name` / automatic form value; no
  `defaultValue`; no typeahead; no runtime option-shape validation; re-selecting the current value still calls
  `onChange`; the popup stays mounted and is `hidden` when closed; browser-only `window` export. Documented
  design limits, not defects.

  ```jsx
  // Controlled, select-only. The trigger's accessible name comes from a visible label via aria-labelledby.
  <span id="status-label">Status</span>
  <Select
    id="status-select"
    aria-labelledby="status-label"
    options={[
      { value: 'draft', label: 'Draft' },
      { value: 'shipped', label: 'Shipped' },
      { value: 'archived', label: 'Archived', disabled: true },
    ]}
    value={status}
    onChange={setStatus}
  />
  ```

### Combobox
`Combobox` is a **searchable, predefined-option combobox** — an autocomplete-list / searchable select whose
input filters the option list as you type. It is **not** a freeform text input, **not** creatable, **not** a
tags input, **not** multi-select and **not** a native `<select>`. The typed query only **filters**; it never
becomes a standalone selection value.

- **Public API.** `Combobox({ options = [], value, onChange, placeholder = 'Search…', className = '',
  disabled = false, name, id, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, 'aria-describedby':
  ariaDescribedby })`. The **option item** is the same object shape as Select — `{ value, label, icon?, meta?,
  disabled? }`. There is **no** `defaultValue`, `defaultQuery`, `onInputChange`, `filter`, `loadOptions`,
  `multiple`, `freeSolo` or `required` prop.
- **State model.** Selection is controlled through `value` + `onChange(nextValue)`; the component owns three
  internal states — `query`, `open` and `activeIndex`. The visible input shows the `query` while open, the
  selected option's `label` while closed, and empty text for an invalid / null value. Selection is
  **controlled-only** (no uncontrolled selected value); `query` is **not** a public controlled prop. Every
  close path — selection, `Escape`, `Tab`, outside interaction — clears the query and active option, and as
  `options` / the filter change the active index is corrected to stay on an enabled, in-range option. A
  `disabled` prop closes and inactivates an open popup **without** calling `onChange`.
- **DOM & ARIA.** The input is `<input type="text" role="combobox" aria-autocomplete="list"
  aria-expanded="true|false" aria-controls="…" aria-activedescendant="…">`. The popup is **conditionally
  mounted** — present in the DOM only while open, absent while closed — as `role="listbox"` with
  `role="option"` rows carrying `aria-selected` and `aria-disabled`. DOM focus **stays on the input**
  (active-descendant model); the active option is marked by `aria-activedescendant`, which is absent while
  closed or on a no-match state; there is no focus trap.
- **Accessible name.** The consumer supplies the name via a visible `<label htmlFor={id}>`, `aria-label` or
  `aria-labelledby`; the placeholder is input help text, **not** a name. An optional `aria-describedby` is
  passed through. There is no automatic label.
- **Filtering & selection.** Typing opens and filters; filtering is **label-based** (case-insensitive
  substring match on `label`). A no-match state shows a **"No matches"** row. The query alone is never a
  selection — only explicitly activating an option (`Enter` or click) calls `onChange`; disabled options are
  skipped, pointer and keyboard share one selection path, and after selection the popup closes and the
  selected label shows. Filtering is neither async nor consumer-supplied.
- **Keyboard & IME.** Typing filters and opens; `↓` / `↑` move the active option; `Enter` with an active
  option selects it, while `Enter` with **no** active option does not select — so a native form submit can
  proceed; `Escape` closes; `Tab` closes and moves on; `Home` / `End` keep the native **text-caret** behaviour
  (not list navigation); `Space` / `Backspace` / `Delete` are native text editing. During composition / IME
  the keyboard selection does not run, and a no-result state never creates a free-text value.
- **Pointer & focus.** Focus / click opens the input and typing filters; an option `mousedown` calls
  `preventDefault` so the input keeps focus, and option click selects; the touch click path works; after
  selection focus stays on the input; an outside interaction closes. Multiple instances are isolated, and
  there is no popup focus or focus trap.
- **Form behaviour.** With a `name`, the component renders a **hidden input** whose value is the selection
  `value` (a string) — **not** the visible label and **not** the query — so a form submits `name=<value>`.
  When `disabled`, that hidden input is also `disabled` and is therefore excluded from `FormData`. Without a
  `name` there is no automatic form value; there is **no** `required` API; a native form reset does **not**
  automatically overwrite the controlled parent state; and `Enter` with no active option can allow the
  surrounding form to submit. This is not a full form-associated custom-element.
- **CSS contract.** Combobox uses `.combo` (wrapper), `.combo__input`, `.combo__caret`, `.combo__panel` and
  the empty-state `.combo__empty`; the panel and its rows reuse `.menu` / `.menu__item` and the `menu.css`
  states.
- **Focus, forced-colors & reduced-motion.** The text input shows its ring on `:focus` (not only
  `:focus-visible`) — a visible ring on pointer focus of a text field is intentional — as `box-shadow:
  var(--ep-shadow-focus)` with no layout shift or animation. Under `forced-colors: active` the input gets a
  real `outline: 2px solid Highlight; outline-offset: 2px; box-shadow: none;`, and the listbox / options
  follow the `menu.css` system-color mapping (`Canvas` / `CanvasText`, `Highlight` / `HighlightText`,
  `GrayText`) with no `forced-color-adjust: none`. There is no `transition: all` and the focus ring is never
  animated; the panel-entrance animation drops under `prefers-reduced-motion: reduce`.
- **Standalone demo.** Covered in the shared `components/select/select.html` demo alongside `Select` (see
  "Select" above): a searchable Combobox with a real `<label htmlFor>`, a `name` + `FormData` form example
  and a `disabled` Combobox example.
- **Known limitations (P2).** Controlled selection; a searchable select, not freeform; no `required`; a native
  form reset is not fully honoured under controlled state; no runtime option-shape validation; browser-only
  `window` export. Documented design limits, not defects.

  ```jsx
  // Searchable select bound to a form; a visible label names the field, name renders the hidden form input.
  <label htmlFor="client-combobox">Client</label>
  <Combobox
    id="client-combobox"
    name="client"
    options={[
      { value: 'northbeam', label: 'Northbeam' },
      { value: 'lumenwerk', label: 'Lumenwerk' },
    ]}
    value={client}
    onChange={setClient}
  />
  ```

### DatePicker + Calendar

**DatePicker** and **Calendar** are two **sibling** date-selection components in B / components that independently
solve the same month-grid problem. Each is a separately exported browser-global React component; they **share no
helper** and **do not consume each other**, and each builds its own 42-cell **Monday-first month grid** over native
`Date` objects. Both are a **button-only month grid** — **not** an ARIA grid, **not** a native `<input type="date">`,
**not** a popover date field, and **not** related to the Slider input or the DataTable dual-thumb range filter.
**DatePicker** is a controlled inline month grid (**not** a popup); **Calendar** is a standalone inline calendar with
**single + range** modes. Both are **demo-only** (no active application consumer). P0 = 0, P1 = 0.

- **DatePicker — export & API.** One React component exported browser-global as `window.DatePicker`
  (`Object.assign(window, { DatePicker })`) — **no** ESM/CJS export, **no** auto-init; it is **not** IIFE-wrapped, so
  the module's `formatDayLabel` helper leaks to global scope (documented **P3**).
  `function DatePicker({ value, onChange, month: initialMonth, minDate, maxDate, showFooter = true, className = '' })`.
  It is **controlled**: `value` is the selected `Date` and `onChange(Date)` fires on day click; `month` seeds the
  visible month; `minDate` / `maxDate` bound the selectable days; `showFooter` (default `true`) toggles the footer with
  its quick-action buttons; `className` is appended to the root. There is **no** `defaultValue`, `placeholder`,
  `label`, `format`, `locale`, `firstDayOfWeek`, `style` or `...rest`; **no** popup / open-state; **no** trigger /
  input API; **no** range mode; and **no** TypeScript type. The React component renders an **inline month grid, not a
  popover** (the source notes it is meant to be paired with a separate `<Popover>`).
- **Calendar — export & API.** One React component exported browser-global as `window.Calendar`
  (`Object.assign(window, { Calendar })`), **IIFE-wrapped** — **no** ESM/CJS export, **no** auto-init.
  `function Calendar({ value, onChange, minDate, maxDate, mode = 'single' })`. `value` is used **only as a mount-time
  seed** — a `Date` in `single` mode or a `[Date, Date]` in `range` mode; `onChange(Date | [Date, Date])` fires on
  selection; `minDate` / `maxDate` bound selectable days; `mode` is `'single'` (default) or `'range'`. Internal state
  is `year`, `month`, `selected`, `rangeStart`, `rangeEnd`; there is **no** `useEffect` re-syncing a changed `value`
  after mount, so **Calendar is seeded-uncontrolled** — a later `value` prop change does **not** move the selection, so
  it must **not** be described as fully controlled. There is **no** `selected`, `defaultValue`, `onSelect`, `month` /
  `year`, `disabledDates`, `locale`, `firstDayOfWeek`, `className`, `style`, `...rest` or render-slot prop, and **no**
  TypeScript type.
- **Date model & formatting.** Both build the grid from native `Date` objects with **no** local-midnight / timezone
  normalization; day equality is a plain year/month/date compare (`isSameDay`); the **Monday-first** column offset is
  `(getDay() + 6) % 7`; every month renders **exactly 42 cells** (leading / trailing out-of-month days included), and
  leap days / month & year rollover rely on native `Date`. Month and weekday copy is **hard-coded English**. Each day
  cell's accessible name is a **full date** — `toLocaleDateString('en-US', { weekday: 'long', month: 'long', day:
  'numeric', year: 'numeric' })` → e.g. `Monday, June 15, 2026` — produced by a `formatDayLabel` helper that is
  **duplicated verbatim** in both files (no shared module, a documented **P3**). DatePicker falls back to `value ||
  today` for the initial month; Calendar seeds from `value`, or from `today` for an invalid / empty `value`.
- **Accessibility — button-only, no ARIA grid.** Both are a **button-only month grid**: day cells are native
  `<button>`s, and there is **no** `role="grid"` / `role="row"` / `role="gridcell"` / `role="columnheader"`, **no**
  roving tabindex, and **no** Arrow / Home / End / PageUp / PageDown grid-keyboard model. Every day carries a
  **full-date `aria-label`** (never a bare number). The selected day — and, in Calendar range mode, both range
  endpoints — carries **`aria-pressed="true"`**; the current day carries **`aria-current="date"`**, and selected +
  today coexist meaningfully (a day can be both pressed and current). **`aria-pressed` is the deliberate choice** over
  `aria-selected`: it is valid on a plain `<button>`, requires **no** grid / listbox / option container role, and so
  avoids introducing a **false ARIA-grid contract** — consistent with the button-only model. Disabled days are
  **programmatically disabled**: Calendar day buttons get the **native `disabled`** attribute (plus a JS click guard as
  defense-in-depth), and DatePicker day buttons get native `disabled` from `minDate` / `maxDate`. Previous / next
  navigation buttons are named (`Previous month` / `Next month`), and DatePicker's footer quick-action buttons are
  preserved.
- **Keyboard & pointer.** Tab reaches the native day / nav / footer buttons; **Enter / Space** and pointer click select
  a day; previous / next move the month; DatePicker's footer quick buttons act; Calendar supports single selection and
  two-click range selection; disabled days cannot be activated. There is **no** arrow-key day navigation and **no**
  Home / End / PageUp / PageDown — day selection is fully keyboard-reachable **but not as an ARIA grid**. The absence of
  a full grid-keyboard model is a documented **P2** consistent with the button-only pattern.
- **Class contract.** **DatePicker**: `.date-picker`, `.date-picker__header`, `.date-picker__navigation`,
  `.date-picker__month`, `.date-picker__grid`, `.date-picker__weekday`, `.date-picker__day` (`--muted`, `--selected`,
  `--today`, and the range modifiers `--range`, `--start`, `--end`), `.date-picker__footer`, `.date-picker__quick`, and
  the demo trigger `.date-picker-trigger`. The React DatePicker now emits the canonical `.date-picker__day` classes —
  the earlier `dp__day` ↔ `.date-picker__day` drift (which left the React grid unstyled) is **P1-closed**; the range
  (`--range` / `--start` / `--end`) and trigger classes are **exercised only by the static demo** (a documented limit).
  **Calendar**: `.calendar`, `.calendar__header`, `.calendar__navigation`, `.calendar__month-label`, `.calendar__grid`,
  `.calendar__day-name`, `.calendar__day` with `is-outside`, `is-today`, `is-selected`, `is-range`, `is-range-start`,
  `is-range-end`, `is-disabled` (range endpoints carry `is-selected`; `is-range` marks only the strict interior).
- **Focus, forced-colors & reduced-motion.** DatePicker's `.date-picker__day:focus-visible` and Calendar's
  `.calendar__navigation:focus-visible` / `.calendar__day:focus-visible` share the house-style ring `box-shadow:
  var(--ep-shadow-focus)` (**no** bare `:focus`, **no** global button-focus selector, **no** `!important`; disabled
  days are not focusable); after the class-drift fix the DatePicker ring now applies to the React grid. Each CSS has a
  local **`@media (forced-colors: active)`** block using **system colors only** (no token / hex / rgb / hsl, no
  `forced-color-adjust: none`): the selected day (and range endpoints) become `Highlight` + `HighlightText`, the range
  interior `Canvas` + `Highlight` (distinct from the solid endpoints), today's number and dot `CanvasText` (its dot
  flips to `HighlightText` on a selected fill), muted / outside / disabled recede to `GrayText`, surfaces / dividers /
  nav map to `CanvasText` / `ButtonText`, and the dropped box-shadow focus ring is restored as a `Highlight` outline.
  Each CSS also has a **`@media (prefers-reduced-motion: reduce)`** block that sets the day / nav (and DatePicker's
  quick / trigger) transitions to `none`; `calendar.css`'s former **`transition: all`** on nav and day was narrowed to
  `background-color, color` (so `transition: all` is now `0` in both files) and the focus ring is never animated.
  **Live forced-colors and reduced-motion emulation were not run** — both are **CSSOM / source-verified only**
  (documented verification **P2**).
- **Canonical demos.** The **DatePicker demo** (`components/date-picker/date-picker.html`) is a **static HTML demo**
  that does **not** load React / Babel / `DatePicker.jsx`: it renders trigger chrome (no real popup API), March + April
  grids and static `--range` / `--start` / `--end` classes, plus a small vanilla script that injects full-date
  `aria-label`s and the static `aria-pressed` / `aria-current="date"` state; it is visually regression-free but **does
  not exercise the React DatePicker path** (a documented **P2**). The **Calendar demo**
  (`components/calendar/calendar.html`) is a **real React demo** (vendored React + ReactDOM + Babel + `Calendar.jsx`)
  with a single-date and a range instance; the range instance uses `minDate` / `maxDate` to exercise native-disabled
  days, renders 84 day buttons total with full-date `aria-label`s, `aria-pressed` on the selected day / range
  endpoints, `aria-current="date"` on today and native `disabled` on out-of-bounds days, and is visually
  regression-free.
- **Consumers & duplication.** There is **no active application consumer** of either component; both are demo-only.
  DatePicker and Calendar **duplicate** the month-grid logic with **no shared helper**, and their divergence
  (controlled vs. seeded-uncontrolled, `--start` / `--end` vs. `is-range-*`, separate `formatDayLabel`) is a known
  **DatePicker / Calendar drift** (**P2**). The CLOSED **DataTable** (dual-thumb range filter) and **Slider** families
  are unrelated to this date-selection family, and there is **no** third canonical date-grid source of truth.
- **Known limitations (P2 / P3).** *(P2)* no full grid-keyboard model (button-only); browser-only `window.DatePicker` /
  `window.Calendar` export; no active app consumer; the DatePicker React path has no canonical React demo; DatePicker /
  Calendar duplication & drift; Calendar's seeded-uncontrolled / no-`value`-re-sync ambiguity; live forced-colors
  emulation not run (CSSOM / source-verified); live reduced-motion emulation not run (CSSOM / source-verified). *(P3)*
  DatePicker is not IIFE-wrapped (helper global leak); hard-coded `en-US` locale / date copy; fixed `width=720` demo
  overflow on very narrow viewports; demo-only trigger / range classes; duplicated `formatDayLabel`; Calendar disabled
  days keep an inert `tabindex` that the native `disabled` overrides; minor naming / copy drift. Accepted, non-blocking
  limits — there is **no** open P0 or P1.

### Breadcrumb
`Breadcrumb` is a **hierarchical page-structure navigation** component — it traces the path from the site
root toward the current page, rendering navigable ancestors as real links and the current page as a single
non-interactive current element. It is **not** Tabs, **not** a stepper, **not** pagination, **not** a history /
back control, **not** a Menu action-list, **not** a progress indicator and **not** a route-switcher button group.

- **Public API.** `Breadcrumb({ items = [], separator = 'slash', maxItems = 6, className = '' })`. Root props:
  `items`, `separator`, `maxItems`, `className`. `separator` is one of `'slash'` (default), `'chevron'` or
  `'dot'`; there is **no** additional separator value and **no** consumer-supplied separator-node API.
- **Item model.** Each item is **object-only** — `{ label, href?, icon?, onClick? }`: `label` is the visible
  text, `href` is the real navigation target of a navigable ancestor, `icon` is optional decorative / visual
  React node content, and `onClick` optionally passes through to the link. There is **no** scalar / bare-string
  item, **no** `current` field, **no** `id`, **no** per-item separator, **no** disabled item and **no** runtime
  item-shape validation.
- **Implicit current-page model.** The **last displayed item is the current page** — the current state is
  **implicit**, derived from position, with no explicit `current` item field. The current item is **not** a
  link: it renders as a `<span class="breadcrumb__item breadcrumb__item--current" aria-current="page">`, and
  there is exactly **one** current element whenever at least one item renders; the current page is out of the
  Tab order. An **empty `items`** does not throw — it renders an empty but named `<nav aria-label="Breadcrumb">`,
  and a consumer normally should not mount an empty breadcrumb. A **single item** is the current page: a current
  span with no link and no separator.
- **Collapse & `maxItems`.** `maxItems` defaults to `6`. When `items.length <= maxItems` there is no collapse.
  For a longer list the **first item is kept**, the trailing items are kept, the current (last) item is kept,
  and the intervening middle levels collapse into a single non-interactive ellipsis
  `<span class="breadcrumb__more" aria-hidden="true">…</span>`. The ellipsis is **not** a button, **not** a
  disclosure, **not** a popup, **not** a menu, **not** focusable and **not** clickable; it offers no expand /
  collapse interaction, and there is **no** `onMore` / `expandable` / `defaultExpanded` / overflow-menu API.
- **Root landmark.** The root is a native `<nav aria-label="Breadcrumb">` navigation landmark — **no** redundant
  `role="navigation"`. The landmark name is fixed to `Breadcrumb`; the current API offers **no** `aria-label` /
  `aria-labelledby` override, so several breadcrumbs on one page currently share the same landmark name (a
  documented P2 limit).
- **DOM structure.** The structure is **flat**: the items and separators render directly under the `nav`, with
  **no** `<ol>`, **no** `<ul>` and **no** `<li>`. The navigation order runs from the root toward the current
  page. The absence of list semantics is a documented design limit — the component does not render a classic
  `nav > ol > li` structure.
- **Navigable links.** Every non-current item is a native `<a>`; when `href` is missing the current
  implementation falls back to `#`, so the consumer should supply a real `href`. Modifier-click, the context
  menu, open-in-new-tab, and `Tab` / `Enter` stay native link behavior. The optional `onClick` passes through
  to the link; the component itself does **not** call `preventDefault`, so the consumer is responsible for not
  breaking native link behavior. There is **no** built-in router integration.
- **Separator contract.** All three variants — slash, chevron, dot — render a separator wrapper
  `.breadcrumb__separator` with a variant-specific class, `aria-hidden="true"`, not focusable, not part of the
  link's accessible name, and never rendered after the current item. The **chevron** variant renders the
  component's own SVG (`focusable="false"`, no accessible name); the **dot** variant draws its dot from a CSS
  pseudo-element. There is **no** consumer-supplied separator-node API.
- **Class contract.** The real classes are `.breadcrumb`, `.breadcrumb__item`, `.breadcrumb__item--current`,
  `.breadcrumb__separator`, `.breadcrumb__separator--slash`, `.breadcrumb__separator--chevron`,
  `.breadcrumb__separator--dot`, `.breadcrumb__more` and `.breadcrumb__icon`. The React JSX, the shared
  `breadcrumb.css` and the five static consumers all follow the same `.breadcrumb__*` naming scheme.
- **Current visual state.** `.breadcrumb__item--current` gives the current page a stronger foreground plus a
  non-color emphasis (`font-weight`); it is a non-interactive span with no hover / focus state, and under
  forced-colors it stays distinguishable through the font-weight as well.
- **Keyboard.** The model is the native link model: `Tab` steps through the navigable links, `Shift+Tab`
  reverses, `Enter` follows the link, and modifier-click / context menu are native. The current span and the
  ellipsis are not focusable. There is **no** Arrow-key handling, **no** Home / End handling, **no** roving
  tabindex, **no** selection-follows-focus, **no** focus trap and **no** own keyboard listener.
- **Pointer.** Link click is native navigation, with native modifier-click, open-in-new-tab and context menu;
  an item's optional `onClick` passes through. The ellipsis is not clickable and the current item is not
  clickable. There is **no** built-in route interception.
- **Focus-visible.** Navigable links get the focus ring only on `:focus-visible` —
  `.breadcrumb__item[href]:focus-visible { outline: none; box-shadow: var(--ep-shadow-focus); }`. It applies
  only to navigable links (not the current span), appears on keyboard focus, is not forced on a pointer click,
  causes no layout shift and is not animated; the UA outline is switched off and replaced by the token
  box-shadow in the same rule.
- **Forced-colors.** Under `@media (forced-colors: active)` the navigable-link focus becomes a real system
  outline — `.breadcrumb__item[href]:focus-visible { outline: 2px solid Highlight; outline-offset: 2px;
  box-shadow: none; }`. There is **no** `forced-color-adjust: none` and **no** `!important`; links and text use
  native system-color mapping, the current state stays distinct through its font-weight, and the separators and
  ellipsis remain visible.
- **Transition & reduced-motion.** There is **no** `transition: all`: the breadcrumb item transition is only
  `color` and `background-color`, with no layout-property transition and no focus-ring transition. Under
  `prefers-reduced-motion: reduce` the transition switches off; there is no animation, no keyframes and no
  transitionend / animationend lifecycle.
- **Responsive.** `.breadcrumb` is `inline-flex` with `flex-wrap`, in natural document flow — **no** JS
  measurement, **no** ResizeObserver, **no** horizontal-scroll controller and **no** built-in truncation or
  tooltip. Long labels wrap in a content- and platform-dependent way (a documented P2 subtlety); the component
  promises no automatic ellipsis-truncation.
- **Standalone demo.** `components/breadcrumb/breadcrumb.html` renders the real `window.Breadcrumb` export over
  vendored React / ReactDOM / Babel in a single React root, covering slash, chevron, dot, collapsed,
  single-item, empty-list and a long-label narrow fixture, an icon item, and real resolvable fragment hrefs,
  plus keyboard, ARIA / current / separator / ellipsis, focus-visible, forced-colors, reduced-motion and
  known-limit notes.
- **Static consumers.** Five active static consumers — `admin-app-examples/examples/analytics.html`,
  `admin-app-examples/examples/billing.html`, `app-common/skeletons/shell-sidebar.html`,
  `app-common/skeletons/shell-topnav.html` and `web-app-examples/examples/docs.html` — each use a native
  `<nav class="breadcrumb">` with `aria-label="Breadcrumb"`, `.breadcrumb__item` links, a
  `.breadcrumb__item--current` non-interactive current span carrying `aria-current="page"`, the shared
  `breadcrumb.css`, and no page-local keyboard logic and no custom popup or state. These are **not** React
  `Breadcrumb` instances.
- **Static href limit.** The static example and shell consumers currently use `href="#"` placeholder links;
  these are demo / skeleton limits, not route-URLs produced by the React Breadcrumb API, and must be swapped for
  real route targets in a real application.
- **Known limitations (P2).** Browser-only `window.Breadcrumb` export; the root accessible name is not
  overridable; no `<ol>` / `<li>` list semantics; the implicit current model; no runtime item validation; a
  missing `href` yields a `#` fallback; no interactive overflow disclosure (the ellipsis is visual collapse
  only); no router integration; long-label and separator wrapping subtleties; the static skeleton hrefs are
  placeholders. Accepted, non-blocking limits, not defects.

  ```jsx
  // Ancestor links carry a real href; the last item has none → it renders as the current page.
  const items = [
    { label: 'Studio', href: '/studio' },
    { label: 'Projects', href: '/studio/projects' },
    { label: 'Project overview' }
  ];

  <Breadcrumb
    items={items}
    separator="chevron"
    maxItems={6}
  />
  ```

### LcWrap
`LcWrap` is the **chrome / layout wrapper** around a financial or time-series chart — it owns the header (title,
symbol, meta, price / delta), the live-feed state, the action slot, the timeframe selector, the chart body, the
legend and the footer. It is **layout / wrapper only**: the React export is **not** a chart library and **not** a
chart-instance manager, and it mounts no chart itself. The chart content is **consumer-owned**, supplied through
`children` or `bodyRef`; not every LcWrap needs a lightweight-charts instance — an empty body, a placeholder, or
any consumer content is valid.

- **Exports.** Browser-only globals `window.LcWrap` and `window.LcWrapIconButton` (set via
  `Object.assign(window, …)` in `LcWrap.jsx`). There is **no** ESM / CJS export; the component is consumed in
  standalone demos over vendored React / ReactDOM / Babel as browser globals. `LcWrapIconButton` is a separate
  convenience helper for the `actions` slot.
- **Public API.** `LcWrap({ title, symbol, meta, price, delta, deltaDir='flat', ranges, activeRange,
  onRangeChange, feedState, feedMeta, actions, legend, footer, surface='paper', density='normal', height,
  placeholder=false, bodyRef, children, className='', style, ...rest })`. **Header / metadata:** `title`,
  `symbol`, `meta`, `price`, `delta`, `deltaDir` (`'up' | 'down' | 'flat'`, default `flat`), `feedState`,
  `feedMeta`, `actions`. **Range:** `ranges`, `activeRange`, `onRangeChange`. **Content:** `children`, `bodyRef`,
  `legend`, `footer`, `placeholder` (default `false`). **Visual variants:** `surface` (default `paper`),
  `density` (default `normal`), `height`, `className`, `style`. **DOM pass-through:** `...rest`. Every prop is
  **optional** — there is **no** required prop and **no** TypeScript type.
- **Timeframe range contract.** The range items are **object-only** — `ranges: Array<{ id, label }>`. The control
  is **controlled**: `activeRange` is the selected item id and `onRangeChange(id)` handles the change. There is
  **no** internal uncontrolled selection, **no** disabled-range API and **no** runtime item validation. An
  unknown `activeRange` falls back to making the first item the roving target, and with no `ranges` the component
  renders **no** range control.
- **Timeframe accessibility.** The range control is a **radiogroup, not tabs**: root `role="radiogroup"` with a
  fixed `aria-label="Time range"`, each button `role="radio"` with `aria-checked`, and roving `tabindex`.
  Keyboard: ArrowLeft/Right/Up/Down move and select, Home/End jump to first/last, selection **wraps** and
  **follows focus**, and Enter/Space are the native button activation. It is **not** Tabs, **not** a `tablist`,
  **not** segmented tabs and **not** an `aria-pressed` toggle group.
- **React chart lifecycle (consumer-owned).** The React `LcWrap` creates **no** chart. The consumer supplies its
  own plot node (`.line-chart-plot`) as `children` and mounts a chart into it imperatively via the public
  `const handle = LcCharts.mount(element, options)`, then drives updates with `handle.setRange(id)`. For a
  React-controlled range, the consumer's `onRangeChange` callback updates React state and calls `setRange(id)`
  **once** per interaction. Do **not** call `LcCharts.bindRanges()` on React-controlled range buttons and do
  **not** use the automatic `LcCharts.init()` path in a React consumer — either would create a second, DOM-owned
  selection source competing with React state. There is **no** public dispose / cleanup API; the standalone demo
  mounts for the page lifetime.
- **Static declarative helper path.** Separately from React, the static path is declarative: a `[data-lc]` mount
  node inside `.line-chart-wrapper__body`, auto-initialised on DOM-ready by scanning
  `[data-lc]:not([data-lc-ready])`. Each mount is marked `data-lc-ready="1"` with its handle at `element.__lc`,
  and static range wiring is done by `LcCharts.bindRanges(root)` over `.line-chart-wrapper` wrappers and their
  `.line-chart-wrapper__range-button` buttons. The static declarative path and a React-controlled range must
  **not** drive the same radiogroup at once.
- **`LcCharts` helper API.** The global (`components/lc-wrap/lc-charts.js`) is
  `LcCharts = { mount, init, bindRanges, readTheme, rethemeAll }`. `mount(element, options)` imperatively mounts
  one chart from an options object and returns the handle; `init(root)` scans declarative `[data-lc]` mounts then
  runs the static range binding; `bindRanges(root)` wires the static DOM radiogroups to their chart handles;
  `readTheme(element)` picks the paper / ink palette from the nearest `.line-chart-wrapper--ink` ancestor; and
  `rethemeAll()` rethemes existing instances. All five are the **public** API — there is **no** destroy / dispose
  method.
- **Class contract.** The canonical root is `.line-chart-wrapper` with modifiers `.line-chart-wrapper--ink`,
  `.line-chart-wrapper--compact`, and `.line-chart-wrapper--h-sm` / `--h-md` / `--h-lg`. The React JSX and the
  static markup share the **same** `.line-chart-wrapper*` scheme; the old `.lc-wrap*` naming is **not** an active
  class contract. Element classes include `__header`, `__actions`, `__icon-button`, `__ranges`, `__range-button`,
  `__body`, `__legend`, `__legend-item`, `__legend-swatch`, `__footer`, `__placeholder`, and the
  `.line-chart-plot` mount node.
- **Surface, density & height.** `surface` is `paper` (default) or `ink`; `density` is `normal` (default) or
  `compact`. A **string** `height` (`sm` / `md` / `lg`) adds a `.line-chart-wrapper--h-*` modifier; a **numeric**
  `height` becomes an inline pixel height with no modifier class. A consumer `className` is **additive** (appended
  after the canonical classes) and a consumer `style` **merges** with the component-generated height style.
- **Legend.** Each legend item is `{ label, color?, kind? }` where `kind` is one of `dot` (default), `bar`,
  `candle-up` or `candle-down`; an optional `color` sets the swatch background inline. With no `legend` the
  component renders **no** legend container. There is **no** `value`, `icon`, `series`, `formatter` or `ariaLabel`
  legend field.
- **Action, feed & footer.** `actions` is a React-node slot (typically one or more `LcWrapIconButton`);
  `LcWrapIconButton` is a real `<button>` taking `aria-label` (programmatic name) and `title` (native tooltip),
  activated by native click / Enter / Space. `feedState` and `feedMeta` are passed to the `FeedIndicator`
  molecule (which composes `Dot`). `footer` is a React-node slot.
- **Placeholder.** `placeholder` is a boolean that renders the component's own design-time chart-placeholder
  grid; it is **not** a loading state, **not** an error state and **not** a chart lifecycle state. The React demo
  shows a separate no-chart placeholder example.
- **Theme.** `.line-chart-wrapper--ink` switches the ink chrome; the chart helper reads its palette (ink vs
  paper) from the nearest `.line-chart-wrapper--ink` ancestor, so React and static markup share the same theme
  contract, and the correct theme is preserved across retheme.
- **Focus, forced-colors & motion.** The timeframe radio and the icon button both take the house-style
  `:focus-visible` ring from the shared design-system focus token, with no layout shift and no ring animation;
  under forced-colors the ring becomes a real system-color outline; under reduced-motion the affected transitions
  switch off; and the icon button transitions only background and color.
- **Standalone demos.** Two primary demos with distinct roles: the **static helper demo**
  `components/lc-wrap/lc-wrap.html` covers the declarative
  `[data-lc]` + auto-init / `bindRanges` path, and the **React export demo**
  `components/lc-wrap/lc-wrap-react.html` drives the real
  `window.LcWrap` / `window.LcWrapIconButton` with the consumer-owned `LcCharts.mount` lifecycle and a
  React-controlled range (no `init` / `bindRanges`), covering paper / ink / compact / height / legend / action /
  feed / placeholder. Secondary showcases:
  `demos/lc-wrap.html`,
  `demos/live-trading.html` and
  `demos/chart-focus.html`.
- **Known limitations (P2).** Browser-only `window.LcWrap` / `window.LcWrapIconButton` exports; the React chart
  lifecycle is consumer-owned with no public dispose / cleanup API; the range is controlled-only with no disabled
  range and no runtime item validation; the radiogroup accessible name is currently the fixed `"Time range"`; and
  the static declarative and React usage paths are maintained in parallel. Accepted, non-blocking limits, not
  defects.

  ```jsx
  // React consumer-owned lifecycle: the wrapper is chrome; the consumer mounts the chart.
  const plotRef = React.useRef(null), handleRef = React.useRef(null);
  const [range, setRange] = React.useState('5m');
  React.useEffect(() => {
    handleRef.current = LcCharts.mount(plotRef.current, { kind: 'candles', seed: 7, base: 68200 });
    handleRef.current.setRange('5m');
  }, []);

  <LcWrap
    symbol="BTCUSDT"
    ranges={[{ id: '5m', label: '5m' }, { id: '1h', label: '1H' }]}
    activeRange={range}
    onRangeChange={(id) => { setRange(id); handleRef.current.setRange(id); }}
    surface="paper"
    height="md"
  >
    <div ref={plotRef} className="line-chart-plot" />
  </LcWrap>
  ```

### TradeTable
`TradeTable` is the domain-specific **dark trade blotter** — a demoable order / trade-monitoring table with a
stats toolbar, sortable columns, multi-row selection and a footer summary. It is a **div-based ARIA table** (not
a native `<table>`, not an ARIA grid), sorted through **TanStack React Table**, over a **fixed internal trade
data set and column model**. It is **not** a generic DataTable and **not** the separate live-trading
`TradesTable` island (see *Canonical demo & non-consumer* below).

- **Exports & bootstrap.** Browser-only global `window.TradeTable` (set via `Object.assign(window, { TradeTable })`
  in `TradeTable.jsx`). There is **no** ESM / CJS export. The standalone demo runs over vendored React / ReactDOM /
  Babel plus **TanStack React Table** (`window.ReactTable`); there is **no** auto-init — a single React root renders
  `<TradeTable />`. Canonical demo:
  `components/trade-table/trade-table.html`.
- **Public API.** `function TradeTable()` — it takes **no props**. There is **no** external `data` API, **no**
  external `columns` API, **no** `className` / `style` / `...rest`, **no** controlled sorting or selection prop and
  **no** action-callback prop. Every trade row and every column is a **component-internal constant**. This is the
  **fixed domain contract** by design (documented as a known non-generic limit, not a defect).
- **Internal data model.** Each internal trade item is `{ id, time, symbol, name, side, qty, price, value, change,
  pnl, status, trader }`. `id` is the **stable row key** (`getRowId: row => row.id`); `trader` is currently **not
  rendered**; all fields come from the internal constant set, and there is **no** missing-data fallback API.
- **Column model.** A fixed, domain-specific set: **select, ID, Time, Symbol, Side, Qty, Price, Value, Change,
  P&L, Status**. Columns use TanStack column descriptors internally; the **select** column is **not sortable**, the
  others are sortable. Columns are **not** externally configurable — there is **no** column-visibility, width or
  render-callback API.
- **Table semantics.** The div-based ARIA table exposes:

  ```text
  role="table" aria-label="Recent trades"
  ├── role="rowgroup"                  header group
  │   └── role="row"
  │       └── role="columnheader"      select (inert) + sortable × N
  └── role="rowgroup"                  body group
      └── role="row"
          └── role="cell"
  ```

  This is a **data table, not an ARIA grid**: there is no grid keyboard model and no native `<table>`. The table
  accessible name is `Recent trades`; header and body are **separate rowgroups**, so the `row` / `columnheader` /
  `cell` roles are **not orphaned**.
- **Sorting.** TanStack `getSortedRowModel` over an **internal** `sorting` state (initial `time desc`). Each
  **sortable columnheader** is keyboard-reachable (`tabindex="0"`) and activated by pointer, **Enter** and
  **Space** (Space suppresses page scroll), sharing one TanStack toggle path; `aria-sort` reflects the live state as
  `ascending` / `descending` / `none`. Sort **removal** (the `none` / unsorted state) is supported — the footer
  summary is null-guarded, so an empty sort renders `unsorted` and never throws. The **select** header is **not
  sortable**: no `tabindex`, no `aria-sort`, no sort handler. Sorting is **internal state**, not a controlled API.
- **Selection & checkbox.** Select-all (header) and per-row checkboxes are **custom `<button type="button"
  role="checkbox">`** controls with `aria-checked` (`true` / `mixed` / `false`). The select-all name is
  `Select all trades`; each row checkbox is named `Select trade T-… SYMBOL` (e.g. `Select trade T-10472 AAPL`).
  Labels are **state-independent** — `aria-checked` communicates the state, and the header uses `aria-checked="mixed"`
  when only some rows are selected. Names come from stable trade data, so selection **survives sorting** (bound to
  the stable row id, not the visual index); `Clear` resets the selection; a checkbox click does **not** trigger row
  inspect and does **not** sort.
- **Row inspect.** Clicking a non-interactive cell area sets an **active row** (`.is-active`) and the footer shows
  an `Inspecting …` readout; a checkbox click does not activate it. *Known limit:* row inspect is **pointer-only** —
  there is no keyboard row activation and no `aria-selected`. Documented as a current product limit, not a fix plan.
- **Toolbar & footer.** The dark stats toolbar shows the selected count, net notional and net P&L, plus the
  `Square off` / `Cancel` / `Clear` / `New order` buttons; the footer shows the summary and a static `1–10 of 10`
  label. `Clear` is a working selection reset; `Square off` / `Cancel` / `New order` are **demo stubs**; there is
  **no** real pagination API and **no** row-action callback API.
- **Status, side & numerics.** `BUY` / `SELL` side pills, status pills (`filled` / `partial` / `pending` /
  `rejected`), signed `Change` / `P&L`, a per-row sparkline and tabular numerics. Every meaningful state is carried
  by **text and/or icon, never color alone**. *Known limits:* the number formatting uses a hardcoded `en-US`
  locale, and a few hardcoded colors remain an implementation P2.
- **Class contract.** Canonical classes: `.trade-table-wrapper`, `.trade-table-toolbar`, `.trade-table-stats`,
  `.trade-table-button`, `.trade-table-scroll`, `.trade-table`, `.trade-table__header`, `.trade-table__body`,
  `.trade-table__row`, `.trade-table__cell` (with `--header` / `--checkbox` / `--left` / `--right` / `--center`),
  `.trade-table-symbol`, `.trade-table-side`, `.trade-table-status`, `.trade-table-footer`, and `.data-table-checkbox`.
  The component **styles `.data-table-checkbox` locally** in its own `tradetable.css` for standalone operation (the
  focus-visible drift versus B's DataTable is now closed); it does **not** import the full B DataTable CSS.
- **Focus, forced-colors & motion.** Sortable columnheaders take a house-style **inset** `:focus-visible` ring (an
  inset ring is used because the header sits at the top edge of the horizontal-scroll container); checkboxes take
  the house-style `:focus-visible` ring; both have a **forced-colors** system-color outline fallback. No global
  button focus selector is used, and these focus paths add no `transition: all` and no ring animation. *Known
  limits:* general forced-colors coverage is not yet complete, and the `tt-pulse` live-dot still lacks a
  reduced-motion guard.
- **Responsive & state coverage.** Desktop-first with **horizontal scroll** and a table `min-width`; there is **no**
  stacked mobile row, **no** column hiding and **no** sticky header. There is **no** loading / empty / error state,
  **no** real pagination and **no** virtualization. These are known P2 limits of a small, fixed domain list — not
  broken implementations.
- **Canonical demo & non-consumer.** The canonical demo is
  `components/trade-table/trade-table.html` — a **React-only**
  standalone page that renders the real `window.TradeTable` export; there is no static-HTML equivalent. Separately,
  `demos/live-trading-trades.jsx` is a **distinct `TradesTable`
  island** built on a **native `<table>`**; it does **not** import or consume the canonical `TradeTable` component
  and must **not** be merged with it on visual similarity.
- **Known limitations (P2).** Browser-only `window.TradeTable` export; no prop API; fixed internal data and column
  model; row inspect pointer-only; no loading / empty / error state; no real pagination or virtualization;
  horizontal-scroll-only responsive model; no general forced-colors coverage; `tt-pulse` reduced-motion guard
  missing; hardcoded `en-US` locale; some hardcoded colors remain; inert demo toolbar actions; `trader` field not
  rendered. Accepted, non-blocking limits — there is **no** open P0 or P1.

### DataTable

The **DataTable** is a **DataTable-shaped showcase component** — a rich **TanStack React Table** feature
demonstration on EggProject tokens (sorting, global search, a per-column filter row, row selection + bulk bar,
column resize / drag-reorder / visibility / pinning, row pinning, pagination, sticky header + pinned rows). It is
**not** a generic, prop-driven reusable table API, **not** the trade-domain `TradeTable`, and **not** the billing
`InvoiceTable island`.

- **Export & bootstrap.** Browser-global `Object.assign(window, { DataTable })` — there is **no** ESM/CJS export and
  **no** auto-init. The canonical demo mounts **one** React root (`ReactDOM.createRoot(...).render(<DataTable />)`)
  and depends on vendored **React**, **ReactDOM**, **Babel**, **TanStack React Table** (`window.ReactTable`, read
  lazily inside the component) and the design-system **Tooltip** (`window.Tooltip`). Canonical demo:
  `components/data-table/data-table.html`.
- **Public API.** `function DataTable()` takes **no props** — no external `rows`, `columns`, `data`, callbacks,
  `className`, `style`, or `...rest`, and no controlled sorting / selection / row-action-callback API. All data,
  columns and state (sorting, rowSelection, globalFilter, columnFilters, columnVisibility, columnOrder,
  columnPinning, rowPinning, pagination) live **inside** the component. This is the current contract, not a bug; the
  non-generic shape is a documented P2 limit. **Do not** document `rows`/`columns` as a public input.
- **Internal data model.** `ROWS` is a **fixed internal constant** of **18** items, each
  `{ id, project, owner.initials, owner.name, status, statusLabel, priority, hours, updated }`. `getRowId: row =>
  row.id` yields stable string keys (`AT-*` / `NB-*` / …) — **no** index-key risk under sort/reorder/selection.
  There is no missing-data fallback API; the fixed dataset holds no null/undefined, and the numeric filter helpers
  are guarded (`isNumeric`). The internal data is **not** a public input.
- **Column model.** A **fixed 9-column** model: **select · ID · Project · Owner · Status · Priority · Hours ·
  Updated · Actions**. Built from internal TanStack column descriptors using both `accessorKey` (e.g. ID, Project)
  and `accessorFn` (Owner → `row.owner.name`); Priority uses a custom `sortingFn` (weighted Low/Medium/High). Select,
  Updated and Actions are **not** sortable. Column visibility, reorder, resize and pinning are internal showcase
  state — columns are **not** externally configurable.
- **Table semantics (div-based ARIA table, not a grid).** The component renders a **div-based ARIA table** — **not**
  an ARIA grid and **not** a native `<table>`; there is no grid keyboard model:

  ```text
  role="table" aria-label="Projects"
  ├── role="rowgroup"        header   (.data-table__header-group, display: contents)
  │   └── role="row"         (.data-table__header)
  │       └── role="columnheader"
  ├── role="rowgroup"        pinned body rows
  │   └── role="row" → role="cell"
  └── role="rowgroup"        center body rows
      └── role="row" → role="cell"
  ```

  The header row is wrapped in its own `role="rowgroup"` (`.data-table__header-group`) carrying **`display:
  contents`**, so the wrapper adds no box and the **sticky header contract is preserved** (`.data-table__header`
  stays `position: sticky; top: 0`). Every `row`/`rowgroup`/`columnheader`/`cell` role has the table root as its
  semantic ancestor — **no orphaned roles**.
- **Sorting accessibility.** Sorting runs through an internal TanStack `sorting` state (initial **`hours desc`**) via
  `getSortedRowModel`, plus the Priority custom `sortingFn`. **Sortable columnheader** cells are activated by
  **pointer, Enter and Space** (Space calls `event.preventDefault()` to suppress page scroll; one keypress = one
  toggle through the same `getToggleSortingHandler()` path as click). Each sortable header exposes
  **`aria-sort`** = `ascending` / `descending` / `none`, and sort **removal** is supported (the TanStack
  none→asc→desc→none cycle). Non-sortable headers (**select, Updated, Actions**) receive **no** `tabindex` and **no**
  `aria-sort`. There is **no** controlled sorting API.
- **Selection & checkbox.** Select-all + per-row selection use a **custom checkbox button**
  (`<button type="button" role="checkbox">`) whose state is carried by **`aria-checked`** = `false` / `mixed` /
  `true`. Accessible names are state-independent: select-all is **`Select all projects`**; row checkboxes follow
  **`Select project <id> <project>`** (e.g. `Select project AT-014 Atlas — Logistics platform`, unique + stable-id
  bound so selection survives sort/pagination); column-visibility checkboxes are **`Toggle column <name>`**; filter
  checkboxes are **`Filter owner <name>`**, **`Filter <column> <option>`** and the reset **`<column> filter:
  <placeholder>`**; the Hours filter toggles are **`<Min|Max|Equals> hours filter`**. State lives in `aria-checked`,
  not the name. A checkbox click `stopPropagation`s — it never sorts or opens row inspect.
- **Filtering & empty state.** Global search plus a per-column **filter row**: text inputs, a select filter, a
  Priority multi-select, an Owner autocomplete, a Hours **Min / Max / Equals** control (with inline validation
  errors), and an Updated **dual-thumb range** slider. All filter controls reuse the design-system `.input` /
  `.select` / `.menu`. The empty state renders **`No projects match your filters.`** There is **no**
  loading / error / retry / live-region state (documented P2).
- **Pagination & pinning.** Page-size options **5 / 7 / 12 / 20** (default 7), prev/next with a disabled gate, and a
  range + page-count readout. **Row pinning** (NB-101 pinned to top initially) and **column pinning** (sticky
  left/right) are supported, with a sticky header + filter row + pinned-row group and **horizontal scroll**
  (`min-width: getTotalSize()`); column visibility, native drag **reorder** and edge **resize** round out the
  showcase. Drag/reorder/resize/pin are pointer-driven — their keyboard reach is a documented P2, and the responsive
  model is horizontal-scroll-only with no stacked-mobile layout (P2).
- **Row inspect & actions.** Clicking a row sets an active row and a footer **`Row open: <id> · <project>`** readout
  — this row inspect is **pointer-only** (documented P2). The Actions column carries a row **pin** button; the bulk
  bar exposes **Assign · Archive · Delete · Clear**. **Clear** works (`resetRowSelection`); **Assign / Archive /
  Delete are inert demo stubs** (no handler), so there is **no** destructive-wrong-row P0 (documented P3).
- **Class contract.** Root card `.data-table-wrapper` (height-resizable via `--dt-wrap-h`) → `.data-table-toolbar`
  (+ `__title/__count/__engine/__tools/__search`), `.data-table-tool-button` (+ `__badge`), `.data-table-column-menu`
  (+ `__popover/__row/__visibility/__pin`), `.data-table-bulk` (+ `__count/__button/__button--danger/__clear`),
  `.data-table-scroll` → **`.data-table`** (`role="table"`) → **`.data-table__header-group`** (the `display: contents`
  header rowgroup) → `.data-table__header` → `.data-table__cell--header` (+ `.is-sortable/.is-sorted/.is-draggable/
  .is-dragover/.is-dragging`), `.data-table__label`, `.data-table__resizer`; `.data-table__filter-row`; body
  `.data-table__body` (+ `--pinned`), `.data-table__row` (+ `--pinned/.is-selected/.is-active`), `.data-table__cell`
  (+ `--checkbox/--center/--right/--mono/--filter/--pinned`), `.data-table__empty`; content atoms `.data-table-main`,
  `.data-table-owner`, `.data-table-avatar`, `.data-table-status` (+ `--progress/--review/--hold/--shipped`),
  `.data-table-priority` (+ `--high/--medium/--low`); the checkbox **`.data-table-checkbox`** (+ `--on/--partial`);
  `.data-table-footer` (+ `__message`), `.data-table-pager` (+ `__size/__range/__navigation/__button/__page`);
  filter atoms `.data-table-filter-popover`, `.data-table-chip`, `.data-table-number-row`, `.data-table-range`;
  `.data-table-grip`, `.data-table-pin`. **`.data-table-checkbox` is the canonical checkbox styling origin**;
  TradeTable only **mirrors** this focus behaviour locally, and DataTable does **not** import TradeTable CSS. (The
  root class is `.data-table-wrapper`; there is no `.data-table-shell` / `.data-table-card`.)
- **Focus, forced-colors & motion.** The sortable header `:focus-visible` uses an **inset** ring
  (`inset … var(--ep-accent), inset … var(--ep-ink-900)`) — inset because the header is sticky at the
  `.data-table-scroll` overflow edge, where an outer glow would clip. The checkbox `:focus-visible` uses
  `box-shadow: var(--ep-shadow-focus)`. Both have a **`@media (forced-colors: active)`** fallback (`Highlight`
  outline, `box-shadow: none`). There is **no** global button-focus selector, **no** bare `:focus`, and the new
  focus paths avoid `transition: all`. **Live forced-colors emulation was not run** (rules are CSSOM-verified only),
  general forced-colors coverage is not complete, and a reduced-motion guard is missing on some paths (bulk-bar
  transitions, the filter-reset WAAPI entrance) — all documented P2.
- **Theme & responsive.** Light / paper appearance on EggProject tokens, with a sticky header, pinned rows,
  horizontal scroll and a height-resizable card. There is **no** dark / ink variant and **no** stacked-mobile
  layout. Some status / avatar colors are hardcoded and the responsive model is horizontal-scroll-only (documented
  P2).
- **Canonical demo & non-consumer boundary.** The canonical demo
  `components/data-table/data-table.html` renders the real
  `window.DataTable` export as a **React-only** standalone page (no static-HTML equivalent). There is currently
  **no active application consumer** of the canonical `DataTable`. Separately,
  `examples/billing-invoices.jsx` is a **distinct `InvoiceTable
  island`** built on a **native `<table>`** + TanStack that **reuses `datatable.css`** but does **not** import or
  consume the canonical `DataTable` component — it must **not** be merged with it.
- **Known limitations (P2 / P3).** *(P2)* browser-only `window.DataTable` export; no prop API; fixed internal data +
  column model; no active app consumer of the canonical component; pointer-only row inspect; limited keyboard reach
  for drag / reorder / resize / pin; no loading / error / retry / live-region; horizontal-scroll-only responsive
  model; no dark / ink variant; incomplete general forced-colors coverage; live forced-colors emulation not run;
  missing reduced-motion guard on some paths; hardcoded status / avatar colors. *(P3)* hardcoded `en-US` / “ago”
  formatting; inert bulk actions (Assign / Archive / Delete). Accepted, non-blocking limits — there is **no** open P0
  or P1.

### Carousel

The **Carousel** is a standalone design-system component family: a browser-global React slide deck with
previous/next + optional dot navigation and optional auto-play. It is a **carousel-region pattern** — **not** a
Tabs component, **not** a tabpanel system, **not** a Slider input, **not** an ARIA grid, and **not** a data-prop
slide model. The earlier misleading tabs costume (`role="tablist"` / `role="tab"` on the dots) has been removed.
P0 = 0, P1 = 0.

- **Component role & export.** One React component exported browser-global as `window.Carousel`
  (`Object.assign(window, { Carousel })`) — **no** ESM/CJS export, **no** auto-init. Slide content is
  **children-slot based**, the internal slide index is **uncontrolled** state, and previous/next **loop**. Needs
  React + ReactDOM + Babel; the canonical demo mounts one React root.
- **Public API.** `function Carousel({ children, autoPlay = false, interval = 4000, showDots = true, label = 'Carousel' })`.
  `children` is the slide source (one child = one slide); `autoPlay` (bool, default `false`); `interval` (ms,
  default `4000`); `showDots` (bool, default `true`); `label` — an **optional, default-valued, backwards-compatible
  accessible-name** prop (default `'Carousel'`) added for the region name. There is **no** `slides` data-prop, **no**
  image/title/description slide-object API, **no** `initialIndex`, **no** controlled index, **no** `onChange`
  callback, **no** `className`/`style`/rest forwarding, **no** `disabled` prop, and **no** TypeScript type.
- **Slide & content model.** `Children.toArray(children)`; every child renders as one slide; slide content is
  **consumer-owned JSX** (no built-in image / alt / action data model). The slide `key` is currently **index-based**
  — low risk with static children, a documented **P3** for dynamic reorder / conditional children. Edge cases are
  guarded: `count === 0` → no nav / dots / pause and **no `NaN` index**; `count === 1` → no nav / dots / pause, and
  the status reads `Slide 1 of 1`.
- **Carousel-region ARIA.** The root `.carousel` carries `role="region"` + `aria-roledescription="carousel"` +
  `aria-label={label}` (exactly one carousel root). It uses **no** `role="tablist"`, **no** `role="tab"`, **no**
  `role="tabpanel"`, and **no** `aria-selected`, and builds **no** tabs keyboard model — no roving tabindex is
  required, because it is not tabs. The dots are native buttons, so their Enter / Space activation is native.
- **Slide accessibility & inert.** Each slide is `role="group"` + `aria-roledescription="slide"` + `aria-label` =
  `Slide N of M`. The current slide is exposed to AT; inactive slides carry `aria-hidden="true"` **and** `inert`, so
  any interactive content in an inactive slide stays out of the Tab order and the a11y tree while active-slide
  content remains focusable. `inert` (not bare `aria-hidden`) is the deliberate choice that prevents the
  hidden-focusable bug; the vendored React renders `inert` with no console warning.
- **Dot navigation.** Dots are native `<button type="button">` controls named `Go to slide N of M`; the current dot
  carries `aria-current="true"` (no false current on the others) and keeps its `.is-active` visual state. There is
  **no** `aria-selected` and **no** `aria-pressed`. Dot click, Enter and Space all jump to the matching slide, and
  `aria-current`, `.is-active` and the status text update together. `aria-current` fits because it marks one current
  item within a set — without creating a false tabs keyboard obligation.
- **Previous / next.** Native buttons labelled `Previous slide` / `Next slide`; behaviour **loops**, so there is no
  runtime `disabled` state (the dead `.carousel__*:disabled` CSS is a documented **P3**). One interaction = one index
  transition; active slide, active dot and status text update together.
- **Live / status announcement.** A visually-hidden `.carousel__status` element (AT-reachable) with
  `aria-atomic="true"` announces `Slide N of M`; it is `aria-live="polite"` in the manual state and `aria-live="off"`
  during auto-play — never `aria-live="assertive"` — so manual slide changes are announced without over-talking.
- **Auto-play (Pause / Stop / Hide).** `autoPlay` defaults `false`, `interval` defaults `4000ms`, and the timer runs
  only when `autoPlay && count > 1`. An explicit pause/play button renders **only** when `autoPlay && count > 1`,
  labelled `Pause carousel` while running and `Play carousel` while paused; pause stops the timer and play restarts
  it. Auto-play also **pauses on hover** and **on focus** within the carousel, and — after an explicit pause —
  leaving hover/focus does **not** unexpectedly resume it. `clearInterval` cleanup is present (no interval leak), and
  `count === 0` produces no `NaN`. This closes the earlier Pause / Stop / Hide P1 (WCAG 2.2.2).
- **Keyboard & pointer.** Previous/next and dots are native buttons activated by **Enter and Space**; there is **no**
  tabs Arrow / Home / End model (the component is not tabs); pointer click works on prev/next/dot; focus never sticks
  in an inactive slide, and there is no focus trap.
- **Focus, forced-colors & reduced-motion.** `.carousel__previous`, `.carousel__next`, `.carousel__pause` and
  `.carousel__dot` share a house-style `:focus-visible` = `box-shadow: var(--ep-shadow-focus)` ring (**no** bare
  `:focus`, **no** global button-focus selector; the dot ring's clipping is handled locally with dots-container
  padding). A **`@media (forced-colors: active)`** block gives a `Highlight` focus outline + `box-shadow: none` and an
  active-dot `Highlight` background (no token / hex / rgb / hsl, no `forced-color-adjust: none`). A **`@media
  (prefers-reduced-motion: reduce)`** block turns off the track / previous / next / pause / dot transitions (the
  active-dot width micro-interaction does not run under reduced motion). **Live forced-colors and reduced-motion
  emulation were not run** — both are **CSSOM-verified only** (documented verification P2).
- **Visual, responsive & transition.** The desktop baseline visual is unchanged; slide motion is transform-based
  (no layout shift on slide change); the active dot is distinguished by **width and colour** (a wider gold pill).
  `transition: all` was removed — nav and dot transitions are narrowed to explicit properties, and the focus ring is
  not animated. On a very narrow viewport the **demo's** fixed `width=720` can push the next-control off-screen — a
  demo-only nicety, documented **P3**.
- **Class contract.** Canonical classes: `.carousel`, `.carousel__viewport`, `.carousel__track`, `.carousel__slide`,
  `.carousel__previous`, `.carousel__next`, `.carousel__dots`, `.carousel__dot` (`.is-active`), `.carousel__pause`,
  and the visually-hidden `.carousel__status`. There is **no** split contract and **no** demo-only component
  override; the canonical demo uses the real `window.Carousel` export. (The dead `:disabled` selectors on prev/next
  are a P3.)
- **Canonical demo & consumers.** `components/carousel/carousel.html`
  renders the real `window.Carousel` with 4 slides and `showDots`; `autoPlay` defaults `false`, so the pause/play
  button does **not** render there, and the screenshot is visually regression-free. There is currently **no active
  application consumer**, and **no** duplicate carousel / slider / gallery implementation as source of truth.
- **Known limitations (P2 / P3).** *(P2)* browser-only `window.Carousel` export; no active app consumer; live
  forced-colors emulation not run (CSSOM-only); live reduced-motion emulation not run (CSSOM-only). *(P3)* index-based
  slide key with static children; dead `:disabled` CSS on prev/next; very-narrow-viewport demo-overlap from the fixed
  demo width. Accepted, non-blocking limits — there is **no** open P0 or P1.

### Resizable

The **Resizable** is a standalone design-system component family: a browser-global React split-panel layout with a
draggable **separator handle** between adjacent panels. It is a **split-panels / separator-handle pattern** — **not**
a Slider input, **not** a DataTable, **not** a DatePicker, and **not** an ARIA grid. After the P1 hardening pass its
separator is keyboard-operable, named, valued, and panel-bound; **P0 = 0, P1 = 0**.

- **Component role & export.** One React component exported browser-global as `window.Resizable`
  (`Object.assign(window, { Resizable })`), **IIFE-wrapped** — **no** ESM/CJS export, **no** auto-init. Panel content
  is **children-slot based**, the internal panel `sizes` are **uncontrolled** state, and the canonical demo mounts two
  React roots (needs React + ReactDOM + Babel). There is **no** helper component, **no** static alternative component,
  and **no** duplicate splitter / resizer implementation as source of truth.
- **Public API.** `function Resizable({ children, direction = 'horizontal', defaultSizes })`. `children` are the
  panels (one child = one panel); `direction` is `'horizontal'` (default) or `'vertical'`; `defaultSizes` is a
  percent-array of initial panel sizes (when omitted, panels split equally, `100 / count`). The model is
  **uncontrolled percent split** — internal `sizes` state drives inline `flex-basis` percentages, clamped **5–95**.
  Panel ids are generated **internally** solely to wire `aria-controls`. There is **no** controlled `sizes` prop,
  **no** `onResize`, **no** `orientation` prop (the prop is `direction`), **no** `minSize`, **no** `maxSize`, **no**
  `className`, **no** `style`, **no** `disabled`, **no** `label`, **no** public `aria-label` / `aria-labelledby` /
  `aria-controls` prop, **no** `...rest` forwarding, **no** panel API, and **no** TypeScript type.
- **Layout & DOM contract.** Root `.resizable-group` (vertical variant `.resizable-group--vertical`) contains
  `.resizable-panel` panels with inline `flex-basis` percentages and a `.resizable-handle` rendered **between** each
  adjacent pair. Horizontal layout lays panels in a **row**, vertical in a **column**; panels carry a minimum CSS size
  (`min-width` horizontal, `min-height` vertical) and `overflow: auto`. With **0 or 1 child** no handle renders (no
  crash). A resize compensates the two adjacent panels through a **single shared internal size helper** used by both
  the keyboard and pointer paths, so the two can never diverge. Panels carry **no** role or landmark contract —
  panel ids exist **only** as `aria-controls` targets.
- **Separator ARIA contract.** Every handle is `role="separator"`, focusable (`tabIndex={0}`), and **named**: the
  default accessible name is `Resize panels {i+1} and {i+2}` (via `aria-label`). Each handle also carries
  `aria-orientation`, `aria-valuemin="5"`, `aria-valuemax="95"`, `aria-valuenow`, and `aria-controls`. `aria-valuenow`
  reports the **rounded percent of the leading panel** (left in horizontal, top in vertical) and **updates live** on
  both keyboard and pointer resize; min/max match the real clamp range. `aria-controls` names the **two** affected
  panel ids; panel ids are **stable and instance-unique**, so multiple `Resizable` instances on one page never
  collide.
- **Orientation contract.** In **horizontal** layout the visual separator bar is vertical, so
  `aria-orientation="vertical"`; in **vertical** layout the separator bar is horizontal, so
  `aria-orientation="horizontal"`. (Runtime-verified — this reflects the bar's visual orientation, not the layout
  axis.)
- **Keyboard resize.** Tab focuses each handle. In horizontal layout **ArrowLeft / ArrowRight** resize; in vertical
  layout **ArrowUp / ArrowDown** resize; arrows **perpendicular** to the layout are a **no-op**. **Home** sets the
  leading panel to its minimum, **End** to its maximum. The base step is **5 percentage points**, **Shift+Arrow** is
  **10 pp**. Handled keys call `preventDefault`; focus **stays on the handle** after resize; `aria-valuenow` updates;
  min/max clamp holds. There is **no** Enter / Space toggle contract, **no** roving tabindex, and **no** custom panel
  focus management.
- **Pointer / touch resize.** The former **mouse-only** path was replaced with pointer events: `onPointerDown` on the
  handle + window-level `pointermove` / `pointerup`, so **mouse, pen and touch** all resize in modern browsers. Pointer
  drag runs the **same size helper** as the keyboard path and updates `aria-valuenow` live. Listeners are cleaned up
  after `pointerup`, and an unmount cleanup prevents an obvious listener leak; multiple instances do not interfere.
- **`is-dragging` state.** The previously **dead** `.resizable-handle.is-dragging` selector is now live: only the
  **active** handle gets `is-dragging` during a drag, so its drag-active accent renders at runtime, and the class is
  removed when the drag ends. There is **no** parallel new drag-class system.
- **Class contract.** Canonical classes: `.resizable-group`, `.resizable-group--vertical`, `.resizable-panel`,
  `.resizable-handle`, `.resizable-handle.is-dragging`, `.resizable-handle::before` (grip), and
  `.resizable-handle:focus-visible`. There is **no** split contract and **no** demo-only component override; the raw
  HTML demo's `style={{...}}` literal is a P3 demo nicety and **not** part of the class contract.
- **Focus, forced-colors & reduced-motion.** `.resizable-handle:focus-visible` uses an **inset** house-style ring
  (`box-shadow: inset 0 0 0 2px var(--ep-accent)`) — chosen deliberately because the root's `overflow: hidden` would
  clip the **outset** `--ep-shadow-focus` ring, so an inset accent ring guarantees a non-clipped, always-visible
  keyboard focus indicator on both horizontal and vertical handles (**no** bare `:focus`, **no** global selector,
  **no** `!important`). A **`@media (forced-colors: active)`** block re-expresses the separator with system colors:
  `.resizable-group` gets a `CanvasText` border, `.resizable-handle` a `ButtonText` bar, `.resizable-handle::before`
  a system-color grip, hover / `is-dragging` a `Highlight` state, the dragging grip `HighlightText`, and
  `:focus-visible` a `Highlight` outline (**no** token / hex / rgb / hsl, **no** `forced-color-adjust: none`). A
  **`@media (prefers-reduced-motion: reduce)`** block sets `.resizable-handle` and `.resizable-handle::before`
  `transition: none`, so the hover / drag / focus micro-transition does not run; `transition: all` is **0**, panel
  resize gained **no** new animation, and the focus ring is static. **Live forced-colors and reduced-motion emulation
  were not run** — both are **CSSOM-verified only** (documented verification P2).
- **Canonical demo & consumers.**
  `components/resizable/resizable.html` is a real React demo (React +
  ReactDOM + Babel + `Resizable.jsx`) with **two** separate roots: a **horizontal** example (Sidebar / Main,
  `defaultSizes={[35, 65]}`) and a **vertical** example (Top / Bottom, `defaultSizes={[40, 60]}`). Handles are named
  and valued, keyboard resize and pointer drag both work, the grip and active-drag state are visible, and the
  screenshot is regression-free. The raw `style={{...}}` literal on the mount-point roots is a P3 demo nicety that does
  **not** break the render. There is currently **no active application consumer** and **no** external `.resizable*`
  class use in source-truth scope — the component is **demo-only, low blast radius**. Closed families (Slider,
  DatePicker + Calendar, DataTable, Carousel, TradeTable, LcWrap) are unrelated.
- **Known limitations (P2 / P3).** *(P2)* browser-only `window.Resizable` export; no active app consumer; live
  forced-colors emulation not run (CSSOM-only); live reduced-motion emulation not run (CSSOM-only). *(P3)* raw HTML
  demo `style={{...}}` literal on the roots; minor visual polish. Accepted, non-blocking limits — there is **no** open
  P0 or P1.

### File Upload

The **File Upload** (`FileUpload`) is a standalone design-system component family: a browser-global React **dropzone**
built on a **native file input** wrapped in a `<label>`, with an optional controlled **file list** showing per-file
progress, status and removal. It is a **native-input + label dropzone pattern** — the drag/drop surface is an *extra*
convenience, **not** the sole upload path. After the P1 accessibility hardening pass its primary input focus is
visible, every progress bar is a named/valued `role="progressbar"`, upload status is announced through a live region,
and remove controls are filename-bound; **P0 = 0, P1 = 0**.

- **Component role & export.** One React component exported browser-global as `window.FileUpload`
  (`Object.assign(window, { FileUpload })`) — **no** ESM/CJS export, **no** auto-init, and (unlike Resizable) **not
  IIFE-wrapped** (module-scope `const { useState, useCallback, useRef } = React`; a `formatBytes()` helper lives at
  module scope — a P3 leak note). Component directory `components/file-upload`; source `FileUpload.jsx`; CSS
  `file-upload.css`; canonical demo `file-upload.html`. The canonical demo is a **static HTML showcase** — it loads
  **only** `_theme.js` + `file-upload.css`, and does **not** load React / ReactDOM / Babel / `FileUpload.jsx`, so
  `window.FileUpload` is **absent** there and the React component's hardening does **not** appear automatically in the
  hand-written demo markup. There is **no** duplicate upload / dropzone implementation as source of truth.
- **Public API.** `function FileUpload({ onFiles, accept, multiple = true, size = 'md', title, hint, files = [],
  onRemove, className = '' })`. `onFiles(File[])` fires from **both** the native input `onChange` and the drop handler;
  `accept` and `multiple` (default `true`) forward to the native input; `size` is `'md'` (default) or `'sm'`
  (`.dropzone--small`, purely visual); `title` / `hint` override the copy; `files` (default `[]`) renders the rows;
  `onRemove(file)` fires from the per-row remove button; `className` is applied to the outer wrapper. The model is a
  **controlled file list** — the **parent owns `files`**, and the component's only internal state is the `dragging`
  boolean. File objects have the shape `{ name, size, status?, progress? }` where `status ∈ {'done','error'}` and
  `progress` is a **number**; the progress value is **clamped 0–100** (`Math.max(0, Math.min(100, Number(progress) ||
  0))`) and the same clamped value feeds **both** the visual bar width **and** the ARIA value. There is **no**
  `maxSize`, **no** `defaultFiles` / uncontrolled mode, **no** `onChange`, **no** `onUpload`, **no** `disabled`,
  **no** `label`, **no** `description`, **no** `style`, **no** `children`, **no** `...rest` forwarding, **no**
  validation API (no type / count / size validation logic), **no** retry API, **no** render slot, and **no**
  TypeScript type.
- **DOM & input contract.** Outer `<div className={className}>` → a wrapping `<label class="dropzone">` (variant
  `.dropzone--small`, drag-active `.dropzone.is-dragging`) that **is** the drop target, containing the native
  `<input type="file" class="dropzone__input">`, then `.dropzone__icon` / `.dropzone__copy` / `.dropzone__hint`. The
  input is `opacity: 0` with `position: absolute; inset: 0` — it is **layout-present and focusable**, **not**
  `display: none`; the wrapping `<label>` supplies its accessible name, and `accept` / `multiple` sit on it. When
  `files.length > 0`, a `.dropzone-files` list renders `.dropzone-file` rows: `.dropzone-file__icon`,
  `.dropzone-file__body` (`.dropzone-file__name` + `.dropzone-file__meta`), the progress bar, the status, and the
  remove button. There is **no** custom button-only file picker.
- **Keyboard & drag/drop contract.** The native file input is the **primary keyboard path**: Tab focuses it, Enter /
  Space open the native picker; there is **no** pointer-only selection, **no** custom roving tabindex, and **no**
  custom keyboard handler for the picker. Drag/drop is the **extra** path: `onDragOver` calls `preventDefault()` and
  sets `is-dragging`, `onDragLeave` clears it, and `onDrop` calls `preventDefault()` + `setDragging(false)` +
  `onFiles(Array.from(event.dataTransfer.files))`. The component is fully usable **without** drag/drop; the
  drag-active visual has a forced-colors fallback.
- **Progressbar ARIA contract.** Each visual progress bar (`.dropzone-file__bar`, rendered when `progress` is a number
  and `status !== 'done'`) is a programmatic **`role="progressbar"`** with `aria-valuemin="0"`, `aria-valuemax="100"`,
  a **numeric `aria-valuenow`** (the rounded clamped value), and a **filename-bound accessible name**
  `Upload progress for ${file.name}`. The bar `width` and `aria-valuenow` derive from the **same** clamped `pct`, so
  overflow (`150`) clamps to `100` and invalid / `NaN` progress falls back to `0`. With multiple files every bar is
  bound to its own file; a **`done`** row renders **no** bar (its status conveys completion, so nothing misleading),
  and an **`error`** row may show a valued bar alongside its error status. There is **no** unnamed or valueless
  progressbar in the active React component.
- **Live/status contract.** The `done` / `error` status (`.dropzone-file__status`, `--error` modifier) is a live
  region: `role="status"` + `aria-live="polite"` + `aria-atomic="true"`. The visible glyph (`✓ uploaded` / `failed`)
  is wrapped **`aria-hidden`**, and a visually-hidden `.dropzone-file__sr` span carries the full filename-bound
  sentence (`${file.name} uploaded` / `${file.name} failed`), so status is never color- or icon-only. Uploading
  progress is **not** pushed through a noisy live region — it is programmatic via the progressbar's `aria-valuenow`.
  Per-remove status is **not** a separate live contract (the file list is controlled by the parent).
- **Remove button contract.** Each remove control is a native `<button class="dropzone-file__remove">` with a
  **filename-bound** `aria-label={`Remove ${file.name}`}` — the former generic `aria-label="Remove"` is **gone**, so
  with multiple rows the remove names are unique. `onRemove?.(file)` and native Enter / Space are preserved; the
  SVG-only visual is fine because the programmatic name is correct; remove focus is visible via `:focus-visible`.
- **Focus, forced-colors & reduced-motion.** `.dropzone:focus-within` surfaces the focus of the `opacity: 0` input on
  the wrapping label (`border-color: var(--ep-accent)` + `box-shadow: var(--ep-shadow-focus)`), and
  `.dropzone-file__remove:focus-visible` gives the remove button the same house-style ring (**no** bare `:focus`,
  **no** global selector, **no** `!important`; the ring is not clipped — the dropzone is not in an `overflow: hidden`
  root). A **`@media (forced-colors: active)`** block re-expresses the surface with **system colors only**: `.dropzone`
  border `CanvasText`, `.dropzone.is-dragging` `Highlight`, `.dropzone:focus-within` a `Highlight` outline,
  `.dropzone-file` border `CanvasText`, `.dropzone-file__bar` a `CanvasText` border with a `Highlight` fill
  (`> span`), `.dropzone-file__status` / `--error` `CanvasText`, `.dropzone-file__remove` `ButtonText`, and
  `.dropzone-file__remove:focus-visible` a `Highlight` outline (**no** token / hex / rgb / hsl, **no**
  `forced-color-adjust: none`). A **`@media (prefers-reduced-motion: reduce)`** block sets `.dropzone`,
  `.dropzone-file__bar > span` and `.dropzone-file__remove` `transition: none` and `.dropzone.is-dragging`
  `transform: none`, so the drag / hover / focus micro-transition, the progress-fill width animation and the
  drag-active scale do not run; the former `.dropzone` `transition: all` is **narrowed to an explicit property list**
  (`transition: all` = **0**) and the focus ring (a static `box-shadow`) is never animated. **Live forced-colors and
  reduced-motion emulation were not run** — both are **CSSOM/source-verified only** (documented verification P2).
- **Class contract.** Canonical classes: `.dropzone` (`.dropzone--small`, `.dropzone.is-dragging`), `.dropzone__input`,
  `.dropzone__icon`, `.dropzone__copy`, `.dropzone__hint`, `.dropzone-files`, `.dropzone-file`, `.dropzone-file__icon`,
  `.dropzone-file__body`, `.dropzone-file__name`, `.dropzone-file__meta`, `.dropzone-file__bar` (`> span` fill),
  `.dropzone-file__status` (`.dropzone-file__status--error`), `.dropzone-file__remove`, and the new visually-hidden
  helper `.dropzone-file__sr` (CSS-backed). Every rendered class has CSS; the CSS still carries **dead**
  `.dropzone__separator` and `.dropzone__browse` selectors plus a header-comment `.dropzone__file` name-drift (actual
  is `.dropzone-file`) — all **P3**, left untouched.
- **Canonical demo & consumers.**
  `components/file-upload/file-upload.html` is a **static HTML showcase**
  (an empty-state dropzone + a "with files queued" list of 3 hand-written rows); it renders cleanly with no 404 /
  console-fatal, it did **not** change during the hardening, and — because it does **not** load React / ReactDOM /
  Babel / `FileUpload.jsx` — it does **not** exercise the React component's accessibility hardening. Its static
  progress / live / remove markup gaps are therefore **non-blocking, documented P2** (the demo is **not** a live React
  canonical runtime and is **not** treated as a standalone canonical accessibility surface). There is currently **no
  active React application consumer**: `demos/index.html` holds only a **gallery link** to the static demo,
  `onboarding.html` and `settings.html` `<link>` `file-upload.css` but render **no** `.dropzone` markup (CSS-only,
  unaffected by the additive/transition-narrowing CSS change), and there is **no** duplicate upload / dropzone
  implementation — the component is **demo-only, low blast radius**. Closed families (Resizable, DatePicker + Calendar,
  Slider, Carousel, DataTable, TradeTable, LcWrap) are unrelated.
- **Known limitations (P2 / P3).** *(P2)* browser-only `window.FileUpload` export; **not** IIFE-wrapped
  (module-scope helper leak); no active app consumer; canonical demo is static and does not exercise the React
  component; the static demo's markup is not synced to the React hardening; no validation API (no `maxSize` / type /
  count); programmatic error description reaches only the existing `status: 'error'` path (no separate
  `aria-describedby` error text); live forced-colors emulation not run (CSSOM-only); live reduced-motion emulation not
  run (CSSOM-only). *(P3)* dead CSS `.dropzone__separator` / `.dropzone__browse`; CSS header-comment `.dropzone__file`
  name-drift; static demo `too large` vs React source `failed` copy-drift; SVG-only remove visual; hardcoded sample
  files in the demo; minor visual polish. Accepted, non-blocking limits — there is **no** open P0 or P1.

### TopNav
- **Component & export.** `TopNav` is the pill-style marketing top bar (brand · links · actions) that collapses to a
  hamburger + dropdown sheet under 720px. It is a React component exported as a **browser global** via
  `Object.assign(window, { TopNav })` — **no** ESM/CJS export, **no** auto-init. Source `components/nav/TopNav.jsx`, CSS
  `components/nav/nav.css`, canonical demo `components/nav/nav.html`. It is unrelated to the closed Menu / ContextMenu /
  Menubar application-menu family — see the disclosure-navigation contract below.
- **Public API.** `function TopNav({ brand, links = [], activeId, onSelect, actions })`. `brand` = `{ src, label }`
  (logo + wordmark; `brand.src` optional). `links` = `[{ id, label, href? }]`. `activeId` marks the current link.
  `onSelect(id)` fires on link click (both breakpoints) and closes the mobile sheet. `actions` is a ReactNode for the
  right-side controls (also rendered inside the sheet). Links and the active state are **parent-controlled**; the only
  internal state is the mobile sheet `open` flag (**uncontrolled**). Internally it uses `useId()` for the sheet id and
  `useRef()` for the toggle (focus return on Escape) — neither is public API. There is **no** `items`, `logo`, `active`,
  `current`, `onNavigate`, `className`, `style`, `children`, `...rest`, render slot, TypeScript type, public id prop,
  public label prop, controlled-open prop, or menu-widget API.
- **Disclosure-navigation contract (not an ARIA menu widget).** TopNav is a **disclosure navigation**, not an ARIA
  menu. The hamburger `toggle` opens/closes a mobile link list; the sheet is a normal navigation list. Desktop and
  mobile links are native `<a href>` elements. The sheet has **no** `role="menu"`; its links have **no**
  `role="menuitem"`; there is **no** roving `tabindex`, **no** `aria-activedescendant`, **no** Arrow/Home/End menu
  handling, and **no** faux listbox/tree/grid/menu pattern. Tab walks the open sheet's links; Enter activates them
  natively. The closed sheet is `display:none`, so it is not focusable and not in the accessibility tree; the
  desktop/mobile link duplication does not double-announce because each set is `display:none` at the other breakpoint.
  Rationale: the links are real navigation `<a href>` links, an application-menu pattern would mislead assistive tech,
  and the native link list is the smaller-risk model than a menu-widget keyboard contract.
- **Toggle ↔ sheet relationship.** The toggle is a native `<button type="button">` named `Open menu` / `Close menu`;
  its `aria-expanded` reflects the `open` state; its `aria-controls` points to the sheet id, which is generated by
  `useId()` (so multiple TopNav instances do not collide — the id is not public API). **Escape** closes the open sheet
  and returns focus to the toggle; Escape in the closed state is a no-op (no error). There is **no** focus trap, **no**
  click-outside / scroll-lock contract, and **no** overlay.
- **Root nav & current link.** The root element is a native `<nav aria-label="Primary navigation">`. The active link
  (matching `activeId`) receives both the `is-on` class and `aria-current="page"`, in both the desktop and the mobile
  list; non-active links carry no `aria-current`. The desktop/mobile pair may both point at the same page and both be
  marked current — this is not misleading because it is breakpoint-duplicated DOM. `aria-current` and `is-on` stay in
  sync.
- **DOM & class contract.** `.topnav` (root) / `.topnav.is-open` (open modifier); `.topnav__brand`; `.topnav__links`
  with `.topnav__links a.is-on` (desktop current); `.topnav__actions` (actions slot); `.topnav__toggle`;
  `.topnav__sheet` with `.topnav__sheet a` and `.topnav__sheet a.is-on` (sheet current); `.topnav__sheet-actions`;
  `.topnav__sheet hr` (separator). Every active class has CSS; the added id/ref introduces **no** new class contract;
  there is **no** dead selector in the post-hardening class contract. Action-slot controls may carry their own
  component focus (e.g. the closed Button family's `.btn`).
- **Keyboard contract.** Desktop links are Tab-reachable; the toggle is Tab-reachable at the mobile breakpoint and
  opens/closes natively with Enter / Space. Closed-sheet links are not focusable; open-sheet links are Tab-reachable
  and activate natively with Enter. Escape closes the open sheet and returns focus to the toggle; Escape closed is a
  no-op. There is **no** keyboard trap, **no** pointer-only open/close, and — because this is disclosure nav — **no**
  Arrow/Home/End menu handling.
- **Focus-visible.** House-style outset ring on the nav's own controls — `.topnav__toggle:focus-visible`,
  `.topnav__links a:focus-visible`, `.topnav__sheet a:focus-visible` → `box-shadow: var(--ep-shadow-focus)`. No bare
  `:focus`, no global selector, no `!important`, and the ring does not clip (the `.topnav` is not clipped). Toggle,
  desktop-link and sheet-link focus are all visible. The **action slot** relies on the slotted component's own focus
  style (e.g. the Button family) — a documented **P2** at the action-slot level, not a React P1.
- **Forced colors.** A local `@media (forced-colors: active)` block covers `.topnav`, `.topnav__brand`,
  `.topnav__links a`, `.topnav__links a.is-on`, `.topnav__actions`, `.topnav__toggle`,
  `.topnav.is-open .topnav__toggle`, `.topnav__sheet`, `.topnav__sheet a`, `.topnav__sheet a.is-on`, and the
  focus-visible selectors — **system colors only** (Canvas/CanvasText/LinkText/Highlight/HighlightText/ButtonText),
  **no** token/hex/rgb/hsl inside the block, **no** `forced-color-adjust: none`. Nav separation, brand, links, the
  active/current link, the toggle and its open state, the sheet border/background, and the focus ring stay visible.
  **Live forced-colors emulation was not run** — this is source/CSSOM-verified and remains a documented **P2** caveat.
- **Reduced motion.** `nav.css` contains **no** `transition` and **no** `animation`; `transition: all` = 0. The sheet
  open/close, hover/focus, and icon swap are not animated, and the focus ring is static. A `prefers-reduced-motion`
  block is therefore **N/A** (nothing to reduce); if motion is ever added, a local reduced-motion block becomes
  required.
- **Canonical demo & consumers.** The canonical demo `components/nav/nav.html` is a **static HTML mock**: it does
  **not** load React / ReactDOM / Babel / `TopNav.jsx`, `window.TopNav` is absent, and it drives a small vanilla toggle
  script. It was left unchanged by the hardening, so it does not exercise the React component's a11y hardening and may
  still carry the **old** `role="menu"` / `role="menuitem"` markup plus a fixed `aria-controls="topnav-sheet"` /
  `id="topnav-sheet"` pairing (not `useId()`) — this is a React↔demo markup drift, **non-blocking, documented P2/P3**.
  There is **no** active React app consumer of `window.TopNav`; the `web-app-examples` marketing-site defines its **own**
  separate `TopNav` (`.ep-topnav`, duplicate-by-name, not a consumer, does not import the component); external `.topnav`
  hits are shell/skeleton or CSS-only. The component is **demo-only, low blast radius**.
- **Known limitations (P2 / P3).** *(P2)* browser-only `window.TopNav` export; no active React app consumer; central
  DESIGN/catalog docs only now added; canonical demo is static and does not exercise the React component; the static
  demo's markup is not synced to the React hardening (may still carry old `role="menu"` / `role="menuitem"`); live
  forced-colors emulation not run (CSSOM-only); the action slot's focus relies on the slotted component (e.g. Button).
  *(P3)* marketing-site's own `TopNav` duplicate-by-name; static demo is a hand-written mock; theme-toggle duplicated in
  the demo; hardcoded sample links; two instances sharing the same `Primary navigation` landmark name is a
  consumer-side, benign concern; minor visual polish. Accepted, non-blocking limits — there is **no** open React P0 or
  P1.

### HoverCard
- **Component & export.** `HoverCard` is a **rich hover-card** — floating content revealed on hover/focus of an inline
  trigger, holding structured profile/entity content (avatar, name, subtitle, body, tags). It is a React component
  wrapped in an **IIFE** and exported as a **browser global** via `Object.assign(window, { HoverCard })` — **no** ESM/CJS
  export, **no** auto-init. Source `components/hover-card/HoverCard.jsx`, CSS `components/hover-card/hover-card.css`,
  canonical demo `components/hover-card/hover-card.html`. It is **not** the closed Tooltip family and **not** the closed
  Popover family; it is neither a Tooltip wrapper nor a Popover wrapper.
- **Public API.** `function HoverCard({ trigger, children, side = 'top' })`. `trigger` is the ReactNode shown as the
  inline anchor (its text/content is the trigger's accessible name); `children` is the floating panel content;
  `side = 'top'` is appended to the panel class (`hover-card__panel--${side}`). The open/close state is **uncontrolled**
  (internal `open` via `useState`) with a `timerRef` intent delay of **180ms open / 120ms close**. Internally it uses
  `useId()` for the panel id — **not** public API. Sub-components: `HoverCard.Head({ avatar, name, subtitle })`,
  `HoverCard.Body({ children })`, `HoverCard.Tags({ tags })`. There is **no** `className`, `align`, `delay`, `open`,
  `defaultOpen`, `onOpenChange`, `content`, `title`, `description`, main-component `tags` prop, `href`, `asChild`,
  `disabled`, `style`, `...rest`, TypeScript type, public id prop, or Tooltip / Popover / Dialog / Menu API.
- **Rich hover-card model (not a tooltip).** HoverCard is **not** a simple tooltip and **not** an ARIA
  `role="tooltip"` pattern. The panel is rich, structured floating content and renders as a **role-less generic
  container**; the `HoverCard.Head` / `HoverCard.Body` / `HoverCard.Tags` native DOM structure is preserved. There is
  **no** `role="tooltip"`, **no** `role="dialog"`, **no** `role="popover"`, **no** `role="menu"`, **no** faux
  listbox/tree/grid/menu pattern, **no** roving `tabindex`, **no** `aria-activedescendant`, and **no** rich structure
  hidden with `aria-hidden`. Removing the previous misleading `role="tooltip"` was a deliberate remediation: for a rich,
  hoverable card the native structure is the smaller-risk model than a false tooltip role (which would have flattened the
  heading/body/tags into a single announced description).
- **Trigger ↔ panel relationship.** The trigger wrapper is a `<span tabIndex={0}>` — focusable, with an accessible name
  from the `trigger` content. It carries `aria-controls` pointing at the panel id and `aria-expanded` reflecting the
  `open` state (`false` closed, `true` open, back to `false` after blur/close). The panel id is generated by `useId()`,
  so **multiple HoverCard instances do not collide** (the id is not public API). There is **no** `aria-describedby` (the
  panel is not a plain descriptive tooltip), **no** `aria-haspopup="dialog"` (not a dialog), and **no** `role="button"`
  (no Enter/Space activation contract added). Keeping the `<span tabIndex=0>` rather than a native `<button>` is a
  deliberate compromise: `trigger` is an arbitrary ReactNode, so a native button would risk nested-interactive / invalid
  DOM — a documented **P2** nuance (generic element carrying `aria-expanded`), **not** a React P1.
- **Hover / focus / dismiss contract.** Hover opens the panel via the JS handler (`onMouseEnter` → delayed `show`);
  `mouseleave` closes it; **focus** opens and **blur** closes (the reveal is keyboard-reachable, so the content is
  **not pointer-only**). The panel's own `onMouseEnter` keeps it open so the pointer can travel onto it; `onMouseLeave`
  closes it. The 180ms/120ms delay is preserved. **Escape** dismisses the open panel; Escape in the closed state is a
  **no-op** (no error). Escape does **not** issue an explicit refocus — focus is already on the trigger, and a refocus
  would re-fire `onFocus` → `show` and reopen; so focus simply stays on the trigger. There is **no** focus trap, **no**
  Arrow/Home/End interception, and **no** false Dialog/Menu widget behaviour. Against **WCAG 1.4.13**: *dismissible*
  (Escape), *hoverable* (panel `onMouseEnter` keeps it), *persistent* (stays while hover/focus holds).
- **CSS-only hover drift closed.** The former CSS-only `.hover-card:hover .hover-card__panel` open path was **removed**;
  visibility is now driven **solely** by the React `open` state via the `.is-open` class. So a visible panel always has
  `aria-expanded="true"` and a hidden panel `aria-expanded="false"` — the earlier CSS-only-hover ↔ `aria-expanded` drift
  is gone. Hover reveal still works through the JS handler.
- **DOM & class contract.** `.hover-card` (root) / `.hover-card__trigger` (trigger) / `.hover-card__panel` (panel) with
  the default `.hover-card__panel--top` side variant and the `.hover-card__panel.is-open` open state;
  `.hover-card__header`, `.hover-card__avatar`, `.hover-card__name`, `.hover-card__subtitle`, `.hover-card__body`,
  `.hover-card__footer`, `.hover-card__tag`. Every active class has CSS; the added id/ARIA attributes introduce **no**
  new class contract; the rich sub-component classes are intact; the focus-visible / forced-colors / reduced-motion
  selectors are present. The `side` prop is **partially wired**: the default `top` positioning works, but
  `left`/`right`/`bottom` have **no** CSS variant (non-`top` values fall back to the `top` position) — a documented
  **P2**, **not** a P1 (class injection does not crash).
- **Focus-visible.** `.hover-card__trigger:focus-visible` → `box-shadow: var(--ep-shadow-focus)` (house-style outset
  ring). No bare `:focus`, no global selector, no `!important`; the ring is static and does not clip; the trigger focus
  is visible, with a dedicated forced-colors fallback.
- **Forced colors.** A local `@media (forced-colors: active)` block covers `.hover-card__trigger`,
  `.hover-card__trigger:focus-visible`, `.hover-card__panel`, the arrow `::after` / `::before` pseudo-elements,
  `.hover-card__avatar`, `.hover-card__name`, `.hover-card__subtitle`, `.hover-card__body`, and `.hover-card__tag` —
  **system colors only** (Canvas/CanvasText/Highlight), **no** token/hex/rgb/hsl inside the block, **no**
  `forced-color-adjust: none`. Trigger, trigger focus, panel border/background separation, panel text, name, subtitle,
  body and tags stay visible. **Live forced-colors emulation was not run** — this is source/CSSOM-verified and remains a
  documented **P2** caveat.
- **Reduced motion.** `hover-card.css` uses explicit opacity + transform transitions in normal mode (`transition: all`
  = 0). A local `@media (prefers-reduced-motion: reduce)` block covers `.hover-card__panel` (and `.is-open`):
  `transition: none` with the translateY slide neutralised, so the opacity change is instant and nothing slides; the
  focus ring is not animated and no new animation is introduced. The earlier real reduced-motion P2 is closed.
- **Canonical demo & consumers.** The canonical demo `components/hover-card/hover-card.html` is a **real React demo**: it
  loads React / ReactDOM / Babel / `HoverCard.jsx`, `window.HoverCard` is present, and it bootstraps **two** HoverCard
  instances. It renders with **no** 404 and **no** JS console fatal (the macOS Chrome `task_policy_set` process-policy
  lines are not JS/console errors); post-hardening its rendered DOM has `role="tooltip"` = 0. The demo source was left
  **unchanged** by the hardening and carries **demo-only P3** drift: it passes `sub=` where `HoverCard.Head` reads
  `subtitle`; it references tokens that are not defined (`--ep-second`, `--ep-accent-on`); it uses a fixed `width=720`
  viewport; and it holds hardcoded sample content. These are non-blocking because the demo works and the React component
  is P0/P1 = 0. There is **no** active React app consumer of `window.HoverCard`; `<HoverCard>` / `React.createElement`
  usage is absent from any app — external hits are registry / README / catalog / skill-family-map / gallery / CSS-import
  only, there is **no** duplicate implementation, and the component is **demo-only, low blast radius**.
- **Known limitations (P2 / P3).** *(P2)* browser-only `window.HoverCard` export; no active React app consumer; central
  DESIGN/catalog docs only now added; the `side` prop is partially wired (only `top` has CSS positioning); the
  `<span tabIndex=0>` + generic `aria-expanded` is a deliberate trigger compromise (arbitrary-ReactNode trigger); live
  forced-colors emulation not run (CSSOM-only); Escape issues no explicit refocus, so focus stays on the trigger.
  *(P3)* demo `sub=` vs component `subtitle` prop drift; demo references undefined tokens `--ep-second` / `--ep-accent-on`;
  demo fixed `width=720` viewport; hardcoded sample content; minor visual polish. Accepted, non-blocking limits — there
  is **no** open React P0 or P1.

### Charts

The `charts` family is a pair of **custom inline-SVG data-visualisation** components — `LineChart` and `BarChart`.
They draw their own SVG paths / rects with hand-rolled geometry; they are **not** a charting-library wrapper and, in
particular, **not** the closed `LcWrap` family and **not** a `lightweight-charts` binding. Both are React components
wrapped in an **IIFE** and exported as **browser globals** — `Object.assign(window, { LineChart })` and
`Object.assign(window, { BarChart })` — with **no** ESM/CJS export and **no** auto-init. Sources
`components/charts/LineChart.jsx` and `components/charts/BarChart.jsx`, shared CSS `components/charts/charts.css`;
canonical demos `components/charts/charts.html`, `components/charts/linechart.html`, `components/charts/barchart.html`.

- **Public API — zero props.** `function LineChart()` and `function BarChart()` take **no props**. All data is
  **hardcoded sample data** inside the source: LineChart from `LC_SERIES` (three series — Revenue, Gross profit, Net
  income) and `LC_MONTHS` (twelve months, Jan–Dec); BarChart from `CATEGORIES` (four services — Product engineering,
  Internal tooling, MVP sprints, Design audits) and `COLUMNS_DATA` (nine quarters, Q1 24–Q1 26). All state is
  **uncontrolled and internal**: `hoverIndex` (tooltip/crosshair position), `hiddenKeys` (legend-toggled series /
  categories), `mounted` (mount-animation gate). Both use `React.useId()` internally to mint the SVG title/desc ids —
  **not** public API. There is **no** `data`, `labels`, `series`, `value`, `height`, `width`, `title` prop,
  `description` prop, `ariaLabel`, `ariaDescription`, `color`, `colors`, `className`, `style`, `showLegend`, `showGrid`,
  `showTooltip`, `formatValue`, `children`, `...rest`, TypeScript type, table API, or keyboard-tooltip API. Do **not**
  assume any prop-driven configuration — reconfiguring a chart means editing its source sample data.
- **SVG text alternative (`role="img"`).** Each chart's **main** SVG (`.line-chart-svg` / `.bar-chart-svg`) carries
  `role="img"` and `aria-labelledby="{titleId} {descId}"`, where `titleId`/`descId` come from `useId()` and point at the
  SVG's own first-child `<title id>` and `<desc id>`. Because the ids are per-instance, **multiple LineChart / BarChart
  instances on one page never collide**, and LineChart and BarChart ids do not collide with each other. The `<title>` is
  a short chart name (LineChart: *“Revenue and profit trend, trailing 12 months”*; BarChart: *“Quarterly hours billed,
  stacked by service”*); the `<desc>` is a **data-driven summary generated from the source data**, so it always matches
  what is drawn and updates with the legend. Neither main chart carries `aria-hidden`, and the `aria-labelledby`
  relationship resolves (verified in a multi-instance runtime harness).
- **Data-driven `<desc>` summary.** The LineChart `<desc>` states the visible **series count**, the **Jan–Dec 2026**
  range, and per series the **first→last value with % change** plus the **min/max range**, closing with a legend/hidden
  note. The BarChart `<desc>` states the **quarter count and Q1 24–Q1 26 range**, the visible **category names**, the
  **latest quarter's per-category hours**, the **total with % change vs. the prior quarter**, the **quarter-total
  range**, and a legend/hidden note. Both are recomputed from the visible data, so a screen-reader user gets the
  essential values and trend without hovering.
- **Pointer-tooltip and data-fallback boundary.** The rich per-point / per-quarter **tooltip is pointer-hover only**
  (`hoverIndex` set from `onMouseMove` on the line SVG and `onMouseEnter`/`onMouseLeave` on each bar column). There is
  **no** full keyboard-tooltip path, **no** focusable data-point grid, and **no** complete `sr-only` data table or
  exhaustive point-by-point list. The SVG-text-alternative P1 was closed because the `<desc>` summary makes the
  essential data and trend **non-visually available** — not because a keyboard tooltip or table was added. A full
  keyboard-tooltip / focusable data-point interaction and a full `sr-only` data table remain **documented P2
  follow-ups**. Do **not** claim keyboard-tooltip or table-fallback support.
- **Legend-toggle contract.** Legend items are native `<button>` elements (`.line-chart-legend-item` /
  `.bar-chart-legend-item`). LineChart legend buttons toggle **series**, BarChart legend buttons toggle **categories**,
  both via the internal `hiddenKeys` set; a hidden entry gets the `.is-off` class. Toggling changes **no** public API
  and, because the `<desc>` is recomputed, the summary updates (or flags the hidden state) after a toggle. Hiding every
  series/category is handled by a baseline fallback (LineChart stats fall back to the first series) and is **not** a P0.
- **Hover-tooltip contract.** Both tooltips render only while `hoverIndex != null`. LineChart uses `LcTooltip`; BarChart
  uses `BarTooltip`, which **reuses the shared `.line-chart-tooltip` classes** plus `.bar-chart-tooltip__total` for its
  total row. The tooltip is **not** a keyboard tooltip and is **not** the only route to the essential data (the `<desc>`
  summary covers that); its point-level detail interaction is the keyboard-side **P2** follow-up.
- **Reduced motion & transition.** In normal mode the charts have mount animations — LineChart **line-draw**
  (`lc-draw`, stroke-dashoffset), BarChart **bar-grow** (`bc-grow`, scaleY), a tooltip fade (`lc-tip-in`) and
  legend/column transitions; **`transition: all` = 0** (the legend transitions an explicit
  `background-color`/`color`/`opacity` list). A local `@media (prefers-reduced-motion: reduce)` block turns the
  line-draw and bar-grow animations off and **pins each element to its final visible state** — the line's
  `stroke-dasharray` is cleared and `stroke-dashoffset: 0` (fully drawn), the segment is `transform: scaleY(1)` (full
  height) — so the chart renders complete and static, never blank or half-drawn; the tooltip fade and the legend/column
  transitions are set to `none` and the focus ring is not animated. No new animation is introduced; the earlier
  mount-motion P2 is closed.
- **Forced colors.** A local `@media (forced-colors: active)` block keeps the charts legible under Windows High
  Contrast using **system colors only** — **no** token/hex/rgb/hsl inside the block and **no** `forced-color-adjust:
  none`. Wrappers, SVGs, axis/grid lines and axis text map to `CanvasText`; the hardcoded hex series/category colours
  flatten under the UA, so **series/category identity does not rely on colour alone**: LineChart series are told apart
  by **dash pattern** (`.line-chart-series--0` solid, `.line-chart-series--1` long-dash `7 4`, `.line-chart-series--2`
  dotted `2 3`), BarChart segments get a `CanvasText` fill with a `Canvas` outline marking the stacking boundaries, and
  both also carry identity in the **legend text** and the **`<desc>`**. Legend buttons use `ButtonText` (`GrayText` when
  off), the focus ring falls back to `2px solid Highlight`, and the tooltip uses `Canvas`/`CanvasText`. **Live
  forced-colors emulation was not run** — this is source/CSSOM-verified and remains a documented **P2** caveat (no live
  forced-colors PASS is claimed).
- **Focus-visible.** `.line-chart-legend-item:focus-visible` and `.bar-chart-legend-item:focus-visible` apply the
  house-style outset ring `box-shadow: var(--ep-shadow-focus)`. There is **no** bare `:focus`, **no** global selector,
  and **no** focus-related `!important` (the only `!important` is the pre-existing `.is-off` legend-dot rule). The ring
  is static, does not clip (the wrapper is not clipped), and has the dedicated forced-colors `Highlight` outline
  fallback above.
- **Hardcoded colours & theming boundary.** The SVG sample colours (`#2E5BE0`, `#D4AC5E`, `#0A1230`, `#7E9EF5`, grid
  `#0A1230`, axis text `#5C6981`) are **hardcoded hex and were intentionally kept in normal mode** — this hardening was
  an accessibility pass, **not** a token migration, and no token files were touched. Under forced colors the CSS
  overrides the essential stroke/fill, and series/category differentiation is carried by dash / outline / legend /
  `<desc>`. The remaining normal-mode hardcoded SVG hex is a documented **P2/P3** polish item.
- **DOM & class contract.** `.line-chart-wrapper` / `.bar-chart-wrapper` (roots); `.line-chart-svg` / `.bar-chart-svg`
  (+ `.bar-chart-svg.is-mounted`); `.line-chart-series` (+ `.is-mounted`, + index variants `.line-chart-series--0/1/2`)
  and `.line-chart-line`; `.line-chart-tooltip` (shared by both tooltips); `.line-chart-legend-item` /
  `.bar-chart-legend-item` (+ `.is-off`); `.bar-chart-column` (+ `.is-other`), `.bar-chart-segment`, and
  `.bar-chart-tooltip__total`. Every active visual class has CSS; the added `<title>`/`<desc>` need **no** new class
  contract; the forced-colors and reduced-motion selectors cover real active elements. **Class-name collision:** the
  chart root `.line-chart-wrapper` **shares its name with the closed `LcWrap` root class** — but `LcWrap` lives in a
  separate skill with its own CSS, `charts.css` is scoped, and it does **not** reopen or affect `LcWrap`. This is a
  documented **P3**.
- **Global CSS reset boundary.** `charts.css` carries **pre-existing** global page resets (`* { box-sizing; margin;
  padding }`, `html, body`, `button`, `h2`). The hardening **did not extend** them; leaked global reset remains a
  documented **P2** follow-up (a later CSS-architecture clean-up, not a React P1 — it caused no new breakage).
- **Canonical demos & consumers.** All three demos are **real React demos** loading vendored React / ReactDOM / Babel
  (plus `_theme.js`): `charts.html` bootstraps one BarChart and one LineChart, `linechart.html` one LineChart,
  `barchart.html` one BarChart. `window.LineChart` / `window.BarChart` are present; the demos render with **no** 404 and
  **no** JS console fatal (macOS Chrome `task_policy_set` process-policy lines are not JS/console errors), and runtime
  DOM shows `role="img"` + `<title>` + `<desc>` with the `aria-labelledby` targets resolving. The demo sources were left
  **unchanged** by the hardening; their hardcoded sample data and minor polish are **demo-only P3**, non-blocking
  because the React components are P0/P1 = 0. There is **no** active React app consumer — `<LineChart>` / `<BarChart>` /
  `window.LineChart` / `window.BarChart` usage is confined to the charts demos and registry; there is **no** duplicate
  implementation; `LcWrap` / `TradeTable` / `DataTable` are separate closed families and the `.line-chart-wrapper`
  name-clash is **not** a consumer relationship. **Low blast radius.**
- **Known limitations (P2 / P3).** *(P2)* no full `sr-only` data table / exhaustive point-by-point list; no full
  keyboard-tooltip / focusable data-point interaction; live forced-colors emulation not run (CSSOM-only); `charts.css`
  global-reset leak risk; browser-only `window.LineChart` / `window.BarChart` export; no active consumer; normal-mode
  hardcoded SVG hex sample colours. *(P3)* fully hardcoded sample data; `.line-chart-wrapper` class-name collision with
  the closed `LcWrap`; demo-only hardcoded data; minor visual polish. Accepted, non-blocking limits — there is **no**
  open React P0 or P1.

### Scroll Area

`scroll-area` is a **CSS-only** styled-scroll container — a themed, thin-scrollbar overflow wrapper with a static HTML
canonical demo. It is **not** a React component: there is **no** `ScrollArea.jsx` / `scroll-area.jsx`, **no** component
JS, **no** helper script, **no** `window.ScrollArea`, **no** browser-global / ESM / CJS export, and **no** auto-init.
Source `components/scroll-area/scroll-area.css`, canonical demo `components/scroll-area/scroll-area.html` (the demo's
`_theme.js` `<script>` is the shared preview theme loader, **not** scroll-area component JS). Use it by applying the
classes to your own markup; there is no import surface.

- **DOM & class contract.** `.scroll-area` is the root (`position: relative`, `overflow: hidden`, `border-radius`);
  `.scroll-area__viewport` is **the actual scroller** — vertical by default (`overflow-y: auto`, `overflow-x: hidden`,
  `height/width: 100%`, `scrollbar-width: thin`, `scrollbar-color`). Variants: `.scroll-area--x` switches it to
  horizontal (`overflow-x: auto`, `overflow-y: hidden`) and `.scroll-area--both` to both axes (`overflow: auto`). The
  thin scrollbar is themed via the WebKit pseudo-elements `::-webkit-scrollbar` (6px), `::-webkit-scrollbar-track`
  (transparent), `::-webkit-scrollbar-thumb` (`var(--ep-border)`) and `::-webkit-scrollbar-thumb:hover`
  (`var(--ep-fg-muted)`), plus the standard `scrollbar-color`. `.scroll-area--both` is a **documented variant that has
  CSS but no canonical-demo instance** (documented P2). The demo-only `.list-item` / `.code-line` styles are sample
  content, **not** part of the component class contract. Every active demo class has CSS; the focus-visible /
  forced-colors / reduced-motion selectors all cover real active elements; there is **no** JS-widget class contract.
- **Keyboard-reachability contract (normative pattern).** A scroll container that carries real overflow content must be
  reachable and scrollable by keyboard. So **every standalone, genuinely-overflowing `.scroll-area__viewport` gets
  `tabindex="0"` + `role="region"` + a non-empty, content-matched accessible name** (via `aria-label`). In the canonical
  demo the two viewports are named `aria-label="Scrollable activity list"` (vertical) and `aria-label="Scrollable code
  sample"` (horizontal) — **unique** names. The viewports are Tab-reachable and, once focused, the native scroll keys
  (Arrow / PageUp-Down / Space / Home-End) work. This pattern **does not rely on Chromium's keyboard-focusable-scroll-container
  heuristic** — the explicit `tabindex="0"` makes it cross-browser. There is **no** `aria-hidden` on the essential
  content, **no** `role="application"`, **no** `role="scrollbar"`, **no** custom scrollbar widget, and **no** JS keyboard
  handler. This closed the keyboard-reachability **P1**.
- **Focus-visible.** `.scroll-area__viewport:focus-visible` shows the keyboard-focus ring. Because the root
  `.scroll-area` is `overflow: hidden` and the viewport fills it, an **outset** ring would be clipped — so the ring is
  an **inset** one: `outline: none; box-shadow: inset 0 0 0 2px var(--ep-accent)` (this is the same overflow-clipped-container
  approach as Resizable; it deliberately uses an inset `--ep-accent` ring, **not** the outset `--ep-shadow-focus` token).
  It does not clip. There is **no** bare `:focus`, **no** global `:focus`, and **no** `!important`; the ring is static,
  with a dedicated forced-colors fallback.
- **Forced colors.** A local `@media (forced-colors: active)` block keeps the container edge, scroll affordance and
  focus visible with **system colors only** — **no** token/hex/rgb/hsl inside the block and **no** `forced-color-adjust:
  none`. It covers `.scroll-area` (`border: 1px solid CanvasText`), `.scroll-area__viewport`
  (`scrollbar-color: CanvasText Canvas`), `.scroll-area__viewport:focus-visible` (`outline: 2px solid Highlight;
  outline-offset: -2px` — inset, so it does not clip; `box-shadow: none`), and the WebKit scrollbar track (`Canvas`) /
  thumb (`CanvasText`). **Live forced-colors emulation was not run** — this is source/CSSOM-verified and remains a
  documented **P2** caveat (no live forced-colors PASS is claimed).
- **Reduced motion & transition.** `transition: all` = 0 and there is **no** `scroll-behavior: smooth` and **no**
  keyframe animation; the only transition is a cosmetic `::-webkit-scrollbar-thumb` hover colour fade. A local
  `@media (prefers-reduced-motion: reduce)` block sets that thumb `transition: none`; the focus ring is not animated and
  no new animation is introduced. The earlier reduced-motion-guard gap is closed. (Live reduced-motion emulation was not
  run — source/CSSOM-verified.)
- **Canonical demo & consumers.** `components/scroll-area/scroll-area.html` is a **static HTML demo** (its `_theme.js` is
  the shared preview theme loader, not component JS). It bootstraps **two** `.scroll-area` instances: a vertical activity
  list and a horizontal code sample, both of which genuinely overflow. Both viewports carry `tabindex="0"` +
  `role="region"` + a unique non-empty `aria-label`; the demo renders with **no** 404 and **no** JS console fatal, and
  pointer + keyboard scroll both work. There is **no** active app consumer — `<ScrollArea>` / `window.ScrollArea` /
  `React.createElement(ScrollArea)` are absent, and external `.scroll-area` hits are registry / style-aggregation
  (`styles.css`) / demo / skill-family-map only, **not** consumers. There is **no** duplicate implementation;
  `DataTable` / `TradeTable` / `LcWrap` are separate closed families with their **own** overflow handling, and
  scroll-area does not reopen them. **Low blast radius.**
- **Known limitations (P2 / P3).** *(P2)* CSS-only / no-export model with no active consumer; central DESIGN/catalog
  docs only now added; live forced-colors and live reduced-motion emulation not run (CSSOM-verified); the
  `.scroll-area--both` variant has CSS but no canonical-demo instance; possible further scrollbar polish. *(P3)* demo
  fixed `width=720` viewport; demo-scoped global reset; demo-only sample content; pre-existing demo hook findings
  (single-font, em-dash cadence, numbered section markers in the sample data); minor visual polish. Accepted,
  non-blocking limits — there is **no** open P0 or P1.

### Tag Input

`tag-input` / `TagInput` is a **React** multi-value field — pill "chips" plus a free-text input in one control, for
entering an arbitrary list of short string tags. Source `components/tag-input/TagInput.jsx`, styles
`components/tag-input/tag-input.css`, canonical demo `components/tag-input/tag-input.html`. It exports a browser-global
via `Object.assign(window, { TagInput })` — there is **no** ESM/CJS export, **no** IIFE wrapper, **no** auto-init, and
**no** helper component. The canonical demo is a **static HTML mock**, not a React demo (its `_theme.js` `<script>` is the
shared preview theme loader, **not** tag-input component JS). The React `TagInput` has **no active app consumer**; two
static pages replicate the `.tagi` chip markup only (see Consumers). `input` / form-controls and Buttons are separate
closed families.

- **Public API.** `TagInput({ value = [], onChange, placeholder = 'Add a tag…', tone = 'blue', separators = ['Enter',
  ','], className = '', ariaLabel = 'Tags' })`. `value` is the **controlled** string array; `onChange(nextTags:
  string[])` is an optional callback fired with the new array; `placeholder` is the input placeholder (blank once there
  are tags); `tone` is the chip colour variant (`'blue'` default `| 'ink' | 'yolk' | 'paper'`); `separators` is the array
  of keys that commit the current draft (default `Enter` + comma); `className` is appended to the wrapper; `ariaLabel` is
  the input's accessible-name hook (default `'Tags'`). Internal state is only `draft` (the in-progress text) and
  `announcement` (the live-region string), plus an `inputRef`. This is a **controlled-only** model: there is **no**
  internal tag-list state and **no** uncontrolled mode. There is **no** `defaultValue`, `disabled`, `maxTags`,
  `suggestions`, `name`, required `id`, visible-label rendering, `inputProps`, `...rest` passthrough, remove-callback
  prop, or TypeScript type — and **no** combobox / listbox / menu / grid API, **no** roving `tabindex`, **no**
  `aria-activedescendant`, and **no** suggestions / autocomplete pattern.
- **Accessible-name contract.** The embedded `input` **always** carries a programmatic name via `aria-label={ariaLabel ||
  'Tags'}`, so the default name is `Tags` and an **empty** `ariaLabel` falls back to `Tags` (the control is never left
  nameless); a consumer overrides the name by passing `ariaLabel`. The placeholder is **not** relied on as the only
  accessible name; there is **no** associated visible `<label>` and **no** `aria-labelledby`, and the input has **no**
  combobox/listbox role. This closed the input accessible-name **P1**.
- **Tag lifecycle & keyboard.** Creating a tag: the draft is trimmed, a trailing comma is stripped, an empty draft is a
  no-op, duplicates are rejected (`value.includes`), then `onChange([...value, trimmed])`. Removing a tag:
  `onChange(value.filter(…))` by index. **Enter** commits the draft; **comma** commits when `separators` contains it;
  **Backspace on an empty input** removes the last tag; **Backspace with a non-empty draft does not remove** a tag;
  **blur** commits the draft; clicking the wrapper focuses the input. Each chip's remove control is a native `<button
  type="button">` with `aria-label="Remove {tag}"`, is Tab-reachable, and is activated by Space/Enter; **after removal
  focus is not lost — it returns to the input**. There is **no** keyboard trap, **no** pointer-only add/remove path, and
  **no** false `listbox`/`combobox`/`menu` role. (All paths runtime-verified.)
- **Live region (aria-live).** Add/remove is announced through an internal **visually-hidden** polite status region:
  `.tagi__status` with `role="status"` + `aria-live="polite"`. Adding sets `Added {tag}`; removing sets `Removed {tag}`;
  a dedup / empty-draft **no-op emits no false "Added" message**. The region is not assertive and does not change the
  visual layout; it is hidden via the sr-only clip pattern — **no** `display:none`, **no** `visibility:hidden`, **no**
  `aria-hidden`.
- **Focus-visible.** On input focus the wrapper shows the ring via `.tagi:focus-within` (`border-color: var(--ep-accent)`
  + `box-shadow: var(--ep-shadow-focus)`); the input's own `outline: none` is **not** a violation because that wrapper
  ring is the visible replacement. The remove button has a house-style ring: `.tagi__tag-x:focus-visible { box-shadow:
  var(--ep-shadow-focus) }` (outset; the chip / wrapper are not `overflow: hidden`, so it does not clip). There is **no**
  bare `:focus`, **no** global `:focus` selector, and **no** `!important`; in forced colors the remove button gets a
  `Highlight` outline fallback.
- **Forced colors.** A local `@media (forced-colors: active)` block keeps the field edge, chips, input text, remove button
  and focus visible with **system colors only** — **no** token/hex/rgb/hsl inside the block and **no**
  `forced-color-adjust: none`. It covers `.tagi` (`CanvasText` border), `.tagi:focus-within` (`Highlight` border),
  `.tagi__input` (`CanvasText`), `.tagi__tag` (`CanvasText` border), `.tagi__tag-text` (`CanvasText`), `.tagi__tag-x`
  (`ButtonText`), `.tagi__tag-x:hover` (`Canvas`) and `.tagi__tag-x:focus-visible` (`Highlight` outline). The
  `.tagi__status` region is visually hidden, so it is not relevant in forced colors. **Live forced-colors emulation was
  not run** — this is source/CSSOM-verified and remains a documented **P2** caveat (no live forced-colors PASS is
  claimed).
- **Reduced motion & transition.** `transition: all` = 0: `.tagi` transitions only `border-color` + `box-shadow`, and
  `.tagi__tag-x` transitions only `background-color`. A local `@media (prefers-reduced-motion: reduce)` block sets both
  `.tagi` and `.tagi__tag-x` to `transition: none`; there is **no** new animation and **no** `scroll-behavior: smooth`,
  and the focus ring is not animated. The earlier `transition: all` and reduced-motion-guard gaps are closed.
- **DOM & class contract.** `.tagi` is the wrapper (looks like `.input`); `.tagi:focus-within` is the focus state;
  `.tagi.is-focused` is a **demo/CSS-only** static-focus state, **not** part of the React contract. Each chip is
  `.tagi__tag` (`--ink` / `--yolk` / `--paper` tone modifiers; the default `--blue` class **has no CSS rule and remains a
  no-op P3** because the base `.tagi__tag` is already blue) → `.tagi__tag-text` (ellipsis) + `.tagi__tag-x` (remove
  button). The field is `.tagi__input`, and `.tagi__status` is the visually-hidden live region. Every active visual class
  has CSS; the focus-visible / forced-colors / reduced-motion selectors all cover real elements; there is **no** source ↔
  CSS drift.
- **Canonical demo.** `components/tag-input/tag-input.html` is a **static HTML mock** (not React; `_theme.js` is the
  shared loader). It renders four tone groups, with **no** 404 and **no** JS fatal. **Demo drift (P3):** 8 of its 11
  remove buttons have **no** `aria-label` and none carry `type="button"` — this is demo-only, since the React `TagInput`
  names every remove button and sets `type="button"`. Other demo-only items: fixed `width=720` viewport, a demo-scoped
  global reset, and copy/layout polish. Non-blocking.
- **Consumers & blast radius.** There is **no** active React `TagInput` consumer — `<TagInput>` /
  `React.createElement(TagInput)` are absent and `window.TagInput` usage is registry / demo / harness only. Two
  **static** pages replicate the `.tagi` chip CSS: `web-app-examples/onboarding.html` (remove buttons use a generic
  `aria-label="Remove"`, and it carries a **dead** `.tag-input { width: 100% }` override that matches no component class —
  the wrapper is `.tagi`) and `admin-app-examples/inbox.html` (its chip remove buttons have no `aria-label`). These are
  documented **static-consumer drift**, out of scope, and were **not** modified during hardening; `styles.css` only
  aggregates the CSS. **Medium blast radius** (two static CSS replicas, no React consumer). The `input` / form-controls
  and Buttons closed families were not reopened.
- **Known limitations (P2 / P3).** *(P2)* browser-only `window.TagInput` export; controlled-only model with no
  `defaultValue` / `disabled` / `maxTags` / `name`; no active React consumer; static consumer replica drift (out of
  scope); live forced-colors emulation not run (CSSOM-verified). *(P3)* the `.tagi__tag--blue` no-op class; demo
  remove-button `aria-label` / `type` drift; hardcoded rgba hover colours; fixed `width=720` demo; demo-scoped global
  reset; minor visual polish. Accepted, non-blocking limits — there is **no** open P0 or P1.

### InputOTP

`input-otp` / `InputOTP` is a **React** one-time-code field — a fixed number of single-digit slots for an SMS / email
verification code. Source `components/input-otp/InputOTP.jsx`, styles `components/input-otp/input-otp.css`, canonical
demo `components/input-otp/input-otp.html`. It is **IIFE-wrapped** with `'use strict'` and exports a browser-global via
`Object.assign(window, { InputOTP })` — there is **no** ESM/CJS export, **no** auto-init, **no** TypeScript type, and
**no** `InputOTPGroup` / `InputOTPSlot` / `InputOTPSeparator` helper component. It is **not** the general text field
(`input` / form-controls is a separate closed family), **not** `TagInput` (which collects an arbitrary list of strings
under one text input), and **not** a native form field — see Form and value limits. The canonical demo is a **real
React demo**. There is **no active React consumer**; `styles.css` aggregates the CSS and the SKILL registry lists the
component. **Low blast radius.**

- **Public API.** `InputOTP({ length = 6, separator = false, separatorAt = 3, onComplete, status })`. `length` is the
  slot count (default `6`) and is read at mount only; `separator` turns on the visual separator; `separatorAt` is the
  slot index it is rendered before (default `3`); `onComplete(code: string)` fires when the new full values array has
  every slot filled; `status` is the visual state — `'error'`, `'success'`, anything else / `undefined` is neutral.
  The model is **uncontrolled**: the code lives in internal state, and the component renders **`length` real
  `<input>` elements** (a **multiple-input slot model**), not one masked input. There is **no** public
  controlled/uncontrolled switch, **no** `className` passthrough and **no** `style` passthrough.
- **API negations.** There is **no** `value`, `defaultValue`, `onChange`, `name`, `id`, `label`, `description`,
  `disabled`, `readOnly`, `required`, `autoFocus`, `autoComplete`, `className`, `style`, `ariaLabel`,
  `ariaLabelledby`, `ariaDescribedby`, `mask` or `groupSize` prop, **no** aggregated hidden input, **no** public
  `inputMode` / `pattern` prop (`inputMode="numeric"` and `maxLength={1}` are fixed internals on each slot input),
  **no** TypeScript type and **no** helper component.
- **DOM and accessibility contract.** The root is `role="group"` with `aria-label="One-time password input"`; it is
  **not** an alert, **not** a dialog and **not** an interactive wrapper. Each slot is a real `<input>` carrying the
  digit as its `value` plus a unique `aria-label` (`Digit 1`, `Digit 2`, …), so the essential value is reachable by
  assistive tech. The visible glyph is a decorative `<span aria-hidden="true">`, and the separator is
  `<span class="input-otp__separator" aria-hidden="true" />`. The slot `<div>` is **not** focusable and carries no
  role; its `onClick` only forwards focus to the real input inside it. There is **no** hidden input.
- **Error-state contract.** When `status === 'error'`, every slot input gets `aria-invalid="true"` and an
  `aria-describedby` pointing at one internal `React.useId()`-based, per-instance-stable error id; the component
  renders a single `.input-otp__sr-only` message — *"The verification code is invalid."* — visually hidden and
  reachable by screen readers. `status === 'success'` and every other `status` value emit **neither** attribute, so
  there is no false invalid state. There is **no** live region and **no** `role="alert"` — the programmatic error
  contract is deliberately minimal and was added without expanding the public API. The hardcoded English accessible
  names stay a known P2 limit.
- **Keyboard, paste and autofill contract.** Typing one digit writes it into that slot and advances focus to the next
  slot when there is one. `Backspace` clears the current slot in place, or clears the previous slot and steps back if
  the current one is already empty; `ArrowLeft` / `ArrowRight` move between slots. `Delete` is currently a **no-op**
  and `Home` / `End` are unhandled (known P2). Paste and multi-digit autofill share one bulk path: digits are filtered
  out of the pasted text, the value is rebuilt **from a blank array aligned to slot 0**, so the slots the code does not
  cover are cleared and a short paste can never leave stale digits behind or fire a false `onComplete`. A full paste is
  still truncated to `length` and still fires the correct `onComplete`; a non-numeric or empty paste is a no-op and
  cannot produce a wrong complete value. After a bulk fill, focus lands on the **first empty slot** when the code is
  incomplete and on the **last slot** when it is complete. `onComplete` fires only when every slot is filled; it can
  fire again when an already-full field is edited (known P3).
- **Form and value limits.** There is **no** `name` prop and **no** aggregated hidden input, so a native form submit
  does **not** automatically receive a single concatenated OTP value. `onComplete` is the primary way to obtain the
  code; there is **no** `onChange` for partial values and **no** controlled `value` / `defaultValue` public API. This
  is a documented **P2 API limitation**, not a P1 under the current contract — a consumer that needs form submission
  must supply its own hidden input or state handling. Do **not** treat this as a complete native form field.
- **Focus contract.** All `length` inputs are individually tabbable (a known P2), there is no roving tabindex and no
  keyboard trap. Because the real input is `opacity: 0`, `:focus-visible` on the input itself is not load-bearing —
  the slot projects the focus instead, through two channels: the CSS-native `.input-otp__slot:focus-within` and the
  JS-driven `.input-otp__slot.is-focused`. The focus ring is a real `outline` (`2px solid var(--ep-accent)`,
  `outline-offset: 2px`), not box-shadow-only, so the higher-specificity `.is-error` / `.is-success` rules can no
  longer swallow it; under either status the offset widens to `4px` so the ring clears the state halo — **error and
  focus stay visible together**. There is no `outline: none`, the slot `<div>` is not focusable, and the root carries
  no focus contract of its own.
- **Forced colors.** `input-otp.css` carries a local `@media (forced-colors: active)` block using **system colours
  only** — no token / `var()` / `--ep` / hex / rgb / rgba / hsl / hsla, and no `forced-color-adjust: none`. Empty slots
  keep a `GrayText` border and filled slots a `CanvasText` one, so the fill state survives without colour coding; the
  digit is `CanvasText`; focus is a `Highlight` outline on both `.is-focused` and `:focus-within`; the error state is
  a `Mark` border plus a 1px → 2px width step, success a `CanvasText` border with the same width step; error/success
  plus focus widen the outline offset; the caret `::after` is `CanvasText` and the separator `CanvasText`. `.input-otp`
  is a layout-only wrapper and `.input-otp__input` an `opacity: 0` proxy with no visual surface, so neither takes a
  colour rule. Hue alone is not reliable in high contrast, so the error state is carried by the width step **and** the
  programmatic `aria-invalid` / error text, not by colour. All of this is **source / CSSOM-verified — live
  forced-colors emulation was not run.**
- **Reduced motion.** The only animation is the `input-otp-blink` caret keyframe (an otherwise unstoppable infinite
  opacity blink); a local `@media (prefers-reduced-motion: reduce)` block sets the caret to `animation: none` +
  `opacity: 1` and the slot to `transition: none`. No new motion was introduced, the keyframes belong to the caret
  only, and **`transition: all` = 0** — the slot's remaining transitions are property-scoped
  (`border-color`, `box-shadow`, `background`). Live reduced-motion emulation was not run.
- **Visual mapping and theming.** The root is `inline-flex` with an 8px gap; slot sizes are hardcoded (44×52,
  `--sm` 36×42, `--lg` 52×60) and the border / radius / background / typography come from tokens
  (`--ep-border`, `--ep-border-strong`, `--ep-radius-md`, `--ep-bg-elevated`, `--ep-font-mono`, `--ep-fg`,
  `--ep-accent`, `--ep-shadow-focus`, `--ep-danger`, `--ep-danger-bg`, `--ep-success`, `--ep-success-bg`) — **token
  resolution 15/15 OK**, no hardcoded hex/rgb/hsl in normal CSS. States are filled / focused / error / success /
  caret; the separator is a small rounded bar; the sr-only error text is `position: absolute`, so it stays out of the
  root's flex gap rhythm. Dark and light themes come through the tokens. An unrecognised `status` yields an empty
  status class and does not crash. The caret's `border-radius: 1px` is a pre-existing P3, and the `--sm` / `--lg`
  drift (descendant selectors with no `className` prop to emit them) is a documented P2.
- **Class contract.** `.input-otp` (`.is-error`, `.is-success`, plus the wrapper-applied `--sm` / `--lg`),
  `.input-otp__slot` (`.is-filled`, `.is-focused`, `.is-caret`), `.input-otp__slot > span` (the visible digit),
  `.input-otp__input`, `.input-otp__separator`, `.input-otp__sr-only`. Every active class has CSS and every hardening
  class exists in both the source and the stylesheet; the forced-colors and reduced-motion selectors all cover real
  rendered elements. `.input-otp__slot.is-focused:empty::after` is a **dead** selector (the slot always contains an
  input and a span) and stays a documented P3. There is no source ↔ CSS ↔ demo drift — the canonical React demo uses
  the same contract.
- **Canonical demo and consumers.** `components/input-otp/input-otp.html` is a **real React demo** (React + ReactDOM +
  Babel + `InputOTP.jsx`) with three examples — a 6-digit field with `onComplete` + `status`, a separator variant, and
  a 4-digit `--sm` field inside a wrapper `<div>`. It was **not modified** during hardening and its asset smoke is
  7/7 OK. There is **no active React consumer**: `styles.css` aggregation, the SKILL registry, `components/README.md`
  and the demo gallery link are registry / aggregation references, not consumers. Live headless rendering was not run
  (no jsdom / playwright / puppeteer available), so the DOM, forced-colors and motion claims above are source- and
  CSSOM-level.
- **Known limitations (P2 / P3).** *(P2)* no `name` and no aggregated hidden input; no `onChange`; no `value` /
  `defaultValue`; no `autocomplete="one-time-code"` (so OS OTP autofill is not opted into, even though the bulk path
  handles it if it arrives); no `disabled` / `readOnly` / `required` / `autoFocus` / `id` / `className` / `style` /
  `label` / `description` / `aria-*` public prop; hardcoded English accessible names; `Delete` no-op; `Home` / `End`
  unhandled; `length` separately tabbable inputs; `--sm` / `--lg` drift; browser-only export; no active consumer; live
  headless / forced-colors / reduced-motion emulation not run. *(P3)* the dead
  `.input-otp__slot.is-focused:empty::after` selector; `useEffect` destructured but never used; growing `length` after
  mount triggers a controlled→uncontrolled warning; `onClick` on the non-interactive slot `<div>` (it only forwards
  focus); repeated `onComplete` when an already-full field is edited; hardcoded slot sizes; the caret
  `border-radius: 1px`; fixed `width=720` demo viewport; demo copy; cosmetic spacing; minor visual polish. Accepted,
  non-blocking limits — there is **no** open P0 or P1.

### Pagination
`Pagination` is a **page-navigation control** for stepping through a paginated result set — it renders a
numbered page list with previous / next chevrons and an optional result-count meta label. It is **not**
Breadcrumb, **not** Tabs, **not** a Menu, **not** a stepper, **not** a route-switcher, and it is **not** the
same as the internal pagers built into the closed `DataTable` / `TradeTable` families — those are separate,
closed contracts and are not this component.

- **Component identity & export.** `Pagination` is a **React** component. Source `components/pagination/Pagination.jsx`,
  styles `components/pagination/pagination.css`, canonical demo `components/pagination/pagination.html`. It is a
  browser-global: `Object.assign(window, { Pagination })` → `window.Pagination`. There is **no** ESM / CJS export,
  **no** IIFE wrapper and **no** auto-init. Two module-scope helpers, `range()` and `buildPages()`, compute the page
  window (first / last / current ± siblings with up to two ellipses); they are **not** exported subcomponents. The
  canonical demo is a **static HTML mock**, not a React demo, and `_theme.js` there is the shared preview loader, not
  Pagination component JS.
- **Public API.** `Pagination({ page = 1, pageCount, total, pageSize, siblings = 1, onChange, variant = 'plain', className = '' })`.
  `page` is the current page (**1-indexed**); `pageCount` is the total page count; `total` + `pageSize` are optional
  metadata from which the count is derived; `siblings` (default `1`) is the number of neighbour pages shown on each
  side of the current page; `onChange(page)` is an optional callback; `variant` is `'plain'` (default) or
  `'outlined'`; `className` adds a wrapper class. The resolved count is `pageCount ?? (total && pageSize ?
  Math.ceil(total / pageSize) : 1)` — falling back to `1`. Page changes route through a `go()` helper that **clamps**
  the target to `[1, resolvedPageCount]`. The component is **fully controlled** — it holds **no** internal page state.
  There is **no** `href` builder, **no** router API, **no** link-based API, **no** `boundaryCount`, **no**
  `showFirstLast`, **no** `showPrevNext`, **no** `labels` prop, **no** `ariaLabel` prop, **no** `disabled` prop, **no**
  `style` prop, **no** TypeScript type, **no** public subcomponent, **no** uncontrolled mode, **no** roving tabindex,
  **no** `aria-activedescendant` and **no** tablist / menu / listbox API.
- **Navigation landmark.** The root is a native `<nav class="pagination …" aria-label="Pagination">` navigation
  landmark — the accessible name is programmatic and there is **no** redundant `role="navigation"` and **no** false
  menu / listbox / tablist / grid role. The landmark name is **hardcoded** to `Pagination`; the current API offers
  **no** `ariaLabel` override, so several React paginations on one page would currently share the same landmark name.
  This is a documented **P2** API limit, not a P1 of the active contract.
- **Current-page contract.** The current page is a native `<button>` that receives **`aria-current="page"`** plus the
  visual class `.pagination__page--active`; the programmatic and visual current state agree, exactly one button per
  pagination instance is current, and the ellipsis never receives `aria-current`. The static demo's earlier missing
  `aria-current` was **closed** during hardening. There is **no** open current-page P1.
- **Page / previous / next / disabled / ellipsis contract.** Page items are native `<button>` elements. The previous
  and next controls are native icon-only `<button>`s with programmatic names — `aria-label="Previous"` and
  `aria-label="Next"`. There are **no** first / last controls. Disabled previous / next use a real HTML `disabled`
  attribute (`disabled={page <= 1}` / `disabled={page >= resolvedPageCount}`) — the disabled state is **not** class-only
  and a disabled button is not keyboard-activatable; there is **no** `aria-disabled` substituting for native
  `disabled`. The ellipsis is `<span class="pagination__ellipsis">…</span>` — **not** a button, **not** focusable and
  **not** an active page control. There is **no** pointer-only page-change path.
- **Keyboard contract.** Because every control is a native `<button>`, `Tab` / `Shift+Tab` follow the natural focus
  order, `Enter` and `Space` activate, and pointer and keyboard both route through the same `onChange(page)` path.
  Disabled previous / next cannot be activated; the ellipsis never takes focus. There is **no** keyboard trap, **no**
  roving tabindex, **no** `aria-activedescendant` and **no** false custom-keyboard-handler pattern.
- **Focus-visible.** `.pagination__page:focus-visible` applies to every page / previous / next button. In normal mode
  it is house-style — `outline: none` replaced by `box-shadow: var(--ep-shadow-focus)` (the outset gold ring). There
  is **no** bare `:focus`, **no** global selector and **no** `!important`; the ring is not clipped and stays legible on
  current, disabled and `outlined` states. In forced-colors mode the focus falls back to a `Highlight` outline.
- **Forced-colors.** A local `@media (forced-colors: active)` block uses **system colors only** — no token / hex / rgb /
  hsl, and no `forced-color-adjust: none`. It covers `.pagination`, `.pagination__meta`, `.pagination__meta strong`,
  `.pagination__page`, `.pagination__page:hover:not(:disabled)`, `.pagination__page--active`, `.pagination__page:disabled`,
  `.pagination__page:focus-visible`, `.pagination__ellipsis` and `.pagination--outlined .pagination__page`. The current
  page renders `Highlight` / `HighlightText`, disabled renders `GrayText`, focus falls back to a `Highlight` outline,
  the outlined border becomes `CanvasText`, and the ellipsis stays `CanvasText` (not an active control). **Live
  forced-colors emulation was not run** — this block is source / CSSOM-verified and remains a documented **P2** caveat;
  no live PASS is claimed.
- **Reduced-motion & transition.** `transition: all` is **`= 0`**: `.pagination__page` uses an explicit property list —
  `background-color`, `color`, `border-color`, `box-shadow` (all `var(--ep-dur-fast) var(--ep-ease-out)`). A local
  `@media (prefers-reduced-motion: reduce)` sets `.pagination__page { transition: none }`. There is **no** animation,
  **no** `scroll-behavior: smooth`, and the focus ring does not animate. The earlier `transition: all` and the missing
  reduced-motion guard were **closed** during hardening.
- **Class contract.** The real classes are `.pagination`, `.pagination--outlined`, `.pagination--compact`,
  `.pagination__meta` (+ `.pagination__meta strong`), `.pagination__pages`, `.pagination__page`,
  `.pagination__page--active` and `.pagination__ellipsis`. `.pagination--outlined` is switchable via React
  `variant="outlined"`; `.pagination--compact` exists in the CSS but has **no** dedicated `variant` prop and **no**
  canonical demo instance — it is reachable **only** via `className`, a **P3** orphan-style polish. The focus-visible,
  forced-colors and reduced-motion selectors all cover real elements; there is **no** source ↔ CSS drift.
- **Canonical static demo.** The canonical demo `components/pagination/pagination.html` is a **static HTML mock** (not
  a React demo; `_theme.js` is the shared loader, not Pagination JS) with three pagination blocks; it renders with no
  404 and no JS fatal. Its accessibility drift was **closed** during hardening: each `<nav class="pagination">` gets a
  unique accessible name (`aria-label="Pagination example: first page" / "…: middle page" / "…: outlined"`), each block
  carries exactly one `aria-current="page"` on its active button, the icon-only previous / next buttons carry
  `aria-label="Previous"` / `aria-label="Next"`, the first-page block's previous button is a real `disabled`, and the
  middle / outlined blocks' previous / next are **not** disabled because they are not on a boundary page. The demo
  stays static with no new JS and no false role. Demo-only **P3** items: hardcoded page numbers, fixed `width=720`, a
  demo-scoped global reset, the `single-font` design-hook finding (out of scope / false positive) and minor visual
  polish.
- **Consumers & blast radius.** There is **no** active React `Pagination` consumer — `<Pagination>` /
  `React.createElement(Pagination)` are absent, and `window.Pagination` usage is own-demo / registry / harness only.
  The `.pagination*` classes are confined to the component's own demo and the `styles.css` aggregation (unchanged). No
  duplicate pagination implementation exists as an active component; the `DataTable` / `TradeTable` internal pagers are
  separate closed contracts, and the closed nav / Breadcrumb / Buttons families were not reopened. **Low blast radius.**
- **Known limitations (P2 / P3).** *(P2)* browser-only `window.Pagination` export; no active React consumer; live
  forced-colors emulation not run (CSSOM-verified); the React nav accessible name is hardcoded `Pagination` with no
  `ariaLabel` prop. *(P3)* `.pagination--compact` reachable only via `className`; demo hardcoded page numbers; fixed
  `width=720` demo; demo-scoped global reset; the `single-font` hook finding (out of scope); minor visual polish.
  Accepted, non-blocking limits — there is **no** open P0 or P1.

### Progress / Loading

The determinate and indeterminate progress bars live in the **loading** family, not a
`components/progress/` directory (an earlier audit premise that proved wrong). Source of truth:
`components/loading/Loading.jsx`,
`loading.css`, canonical demo `loading.html` — all under `components/loading/`.

- **Component identity & export.** **React** components `ProgressBar` (determinate) and
  `ProgressIndeterminate` (indeterminate), alongside `LogoSpinner` and the demo `Demo`, exported
  browser-global via `Object.assign(window, { ProgressBar, ProgressIndeterminate, LogoSpinner, Demo })`
  → `window.ProgressBar` / `window.ProgressIndeterminate`. **No** ESM/CJS export, **no** auto-init, **no**
  native `<progress>` refactor — both are a **custom `role="progressbar"`** pattern. The canonical demo is a
  real React demo (vendored React/ReactDOM/Babel + `Loading.jsx`); its `_theme.js` is the shared preview
  theme loader, not component JS. The `splash` `ProgressBar` is a separate **decorative** element (different
  namespace, no ARIA), and the closed `file-upload` progressbar is its own separate contract — neither is
  this family.
- **Public API.** `ProgressBar({ value = 0, size = 'md', showLabel = true, label, ariaLabel })` and
  `ProgressIndeterminate({ size = 'md', label, ariaLabel })`. `ProgressBar`: `value` is a determinate number
  clamped to 0–100 (non-finite `NaN`/`Infinity` normalises to 0); `size` `sm`/`md`/`lg`; `showLabel` toggles
  the visible header; `label` is the visible + programmatic-name basis (default `Uploading`); `ariaLabel` is an
  optional accessible-name override; no internal value state; determinate-only. `ProgressIndeterminate`: `size`
  `sm`/`md`/`lg`; `label` optional visible label; `ariaLabel` optional override; default accessible name
  `Loading` when no label; indeterminate-only. **No** `min`, `max`, `valueText`, `tone`, `variant`, `animated`,
  `className`, `style` prop, TypeScript type, public subcomponent, native `<progress>` API, or
  slider/meter/status/alert role.
- **Accessible name.** Every essential `role="progressbar"` element always carries a programmatic name — the
  progressbar role does **not** take its name from descendant subtree text, so it is never left to the visible
  label span alone. `ProgressBar` with a visible label uses `aria-labelledby` pointing at the
  `.progress-bar__label` span's stable `useId()` id (stays in sync, no drift); `showLabel={false}` falls back to
  `aria-label` from the label copy; an explicit `ariaLabel` prop always overrides; an empty string never leaves it
  nameless. `ProgressIndeterminate` uses `aria-labelledby` when a label renders, else `aria-label="Loading"`, with
  `ariaLabel` override. Per-instance `useId()` ids do not collide across multiple bars. **ProgressBar and
  ProgressIndeterminate accessible-name P1 closed.**
- **Determinate ARIA & value mapping.** Root `role="progressbar"` with `aria-valuemin="0"`,
  `aria-valuemax="100"`, `aria-valuenow={percent}`. `percent` comes from the same clamped/normalised value that
  drives the visual fill `width: ${percent}%` — negative → 0, above 100 → 100, non-finite → 0 — so **ARIA and the
  visual fill never dangerously drift**; 0% and 100% stay interpretable. The visible readout is
  `percent.toFixed(0)` (its rounding vs the raw `aria-valuenow` is a P3, since both derive from the same
  `percent`).
- **Indeterminate ARIA.** Root `role="progressbar"` + `aria-busy="true"` with **no `aria-valuenow`** — it does
  not fake a determinate value or a false percent, and uses no slider/meter/status/alert role. It always has a
  name (`ariaLabel` → label `aria-labelledby` → default `aria-label="Loading"`). **Indeterminate label-less name
  P1 closed.**
- **Non-interactive / focus.** The progressbar is a display, not an interactive control: no `tabindex`, no keyboard
  handler, no pointer-only path, no disabled API. Focusability is not warranted (it is not made focusable merely to
  reach a screen reader — the programmatic name + value carry the accessibility contract), so there is **no**
  focus-visible contract on the bar.
- **Forced colors.** A local `@media (forced-colors: active)` block uses **system colors only** (no
  token/hex/rgb/hsl, no `forced-color-adjust: none`), covering `.progress-bar`, `__label`, `__value`, `__track`,
  `__fill`, `__shimmer`, `__indeterminate`, `__value--dots span`. Track = `Canvas` background + `CanvasText` border;
  fill = `Highlight`; shimmer = `background: none`; indeterminate indicator = `Highlight`; dots = `CanvasText`;
  label/value text = `CanvasText`. Because the fill's normal-mode gradient is stripped in forced-colors, pinning it
  to `Highlight` keeps the filled portion **distinct from the track** — the determinate track/fill high-contrast
  merge risk is closed; the indeterminate state stays perceivable. **Live forced-colors emulation was not run** —
  CSSOM/source-verified only (documented P2 caveat).
- **Reduced motion & animation.** Continuous motion — shimmer, indeterminate indicator, dot animation and the logo
  spinner — is disabled under `@media (prefers-reduced-motion: reduce)` (`animation: none`), which also snaps the
  determinate `.progress-bar__fill { transition: none }`. **`transition: all` = 0**; the hardening added no new
  animation. In normal mode the determinate value change still eases via a `width` transition and snaps under
  reduced motion. The design-hook `layout-transition` finding on that `width` transition is an accepted local
  exception / false positive: the fill's width **is** the progress affordance (a `transform: scaleX` would distort
  the shimmer, gradient and `border-radius`), and it is reduced-motion-guarded.
- **DOM & class contract.** `.progress-bar` (`--sm`/`--md`/`--lg`, `--indeterminate`), `__header`, `__label`,
  `__value` (`__value--dots`), `__track`, `__fill`, `__shimmer`, `__indeterminate`. Every active class has CSS; the
  forced-colors and reduced-motion selectors cover real rendered elements; no source ↔ CSS drift. The `splash` and
  `file-upload` progressbars are separate contracts.
- **Canonical demo.** `components/loading/loading.html` is a real React demo (vendored React/ReactDOM/Babel;
  `_theme.js` shared loader). It renders with no 404 / JS fatal: **8 progressbars, all 8 programmatically named**,
  5 determinate (each with `aria-valuenow`) and 3 indeterminate (none with `aria-valuenow`); `aria-labelledby`
  resolves to the visible labels; determinate value and ARIA agree; indeterminate never fakes a determinate value.
  `loading.html` was **not** modified during hardening.
- **Consumers & blast radius.** There is **no** active external `ProgressBar` or `ProgressIndeterminate` consumer;
  `.progress-bar` usage is confined to the loading demo and the `styles.css` aggregation (unchanged). The decorative
  `splash` progressbar and the closed `file-upload` progressbar are separate; no duplicate active progressbar exists
  in this family. **Low blast radius.**
- **Known limitations (P2 / P3).** *(P2)* browser-only `window` export; no active consumer; no `min`/`max` API; no
  `valueText` API; live forced-colors emulation not run (CSSOM-verified). *(P3)* the visible percent rounds against
  the raw/clamped `aria-valuenow`; demo-only copy/layout drift; cosmetic spacing; minor visual polish. Accepted,
  non-blocking limits — there is **no** open P0 or P1.

### Skeleton

Content-shaped loading placeholders. Source of truth:
`components/skeleton/Skeleton.jsx`,
`skeleton.css`, canonical demo `skeleton.html` — all under `components/skeleton/`. This is a **decorative
placeholder**, distinct from the closed **loading / progressbar** family (which is a stateful
`role="progressbar"` contract) and from the non-interactive **charts** family — a skeleton communicates no
value, only "content is loading".

- **Component identity & export.** **React** components `Skeleton` and `SkeletonList`, exported browser-global via
  `Object.assign(window, { Skeleton, SkeletonList })` → `window.Skeleton` / `window.SkeletonList`. **No** ESM/CJS
  export, **no** IIFE, **no** auto-init. Dual model: a React component **and** a static CSS-only markup pattern —
  the canonical `skeleton.html` is a **static HTML mock** (plain `<span class="skel …">` markup, not a React demo);
  its `_theme.js` is the shared preview theme loader, not component JS. **No** active app consumer. The loading /
  progressbar shimmer is a separate closed family; low blast radius.
- **Public API.** `Skeleton({ shape = 'block', w, h, ink, lines, ariaHidden = true, className = '', style = {} })`.
  `shape` ∈ `block` (default) · `text` · `title` · `circle` · `btn` · `card` · `avatar` · `avatar-lg`. `w`/`h`
  override width/height — a **number becomes a `px` string**, a **string passes through unchanged** — applied as
  inline `style` on the root. `ink` selects the dark-surface shimmer variant. `lines` renders N stacked lines
  **only when `shape='text'`** (the last line is `60%` wide). `ariaHidden` controls decorative hiding (**default
  `true`**). `className`/`style` pass through. No internal state; controlled/uncontrolled is not a relevant concept
  — it is a pure presentational component. `SkeletonList({ rows = 4, withAvatar = true, ink })` renders `rows`
  preset rows (optional avatar + a `title` + a `text` line + a trailing shorter `text`); its inner `Skeleton`
  elements are decorative through the default `ariaHidden=true`. **No** `animated`, `label`, `ariaLabel`,
  `decorative`, `loading`, or `radius` prop, **no** TypeScript type, **no** `Skeleton.List` public subcomponent,
  **no** progressbar/status/loading-state API, and **no** keyboard or pointer interaction.
- **Decorative accessibility contract.** The skeleton is a **decorative placeholder** — it is **not** a
  `progressbar`, **not** `status`, **not** `alert`, **not** `img`, and **not** an interactive control. The root
  `.skel` element carries **`aria-hidden="true"` by default**, for every shape, and every line generated by `lines`
  as well as every inner `Skeleton` rendered by `SkeletonList` stays decorative. `ariaHidden={false}` **only
  removes the hiding** — it adds **no** automatic accessible name, **no** `role`, and does **not** turn the
  placeholder into a state announcement. There is **no** `aria-busy`, `aria-live`, `aria-label`, `aria-labelledby`,
  `role`, or `tabindex`. Do not hide real content under a skeleton; if the consuming app must announce a loading
  state, it does so with an **external container** (its own `aria-busy`/status region), not with the decorative
  skeleton — the component ships no built-in loading API. **Decorative aria-hidden contract closed.**
- **Non-interactive / focus.** A placeholder, not an interactive control: no focusability, no `tabindex`, no
  keyboard handler, no pointer handler, no disabled API, **no** focus-visible contract. A focus severity level is
  not relevant, and the element is **not** made focusable merely to reach a screen reader.
- **Forced colors.** A local `@media (forced-colors: active)` block uses **system colors only** (no token/hex/rgb/
  hsl, no `forced-color-adjust: none`), covering `.skel`, `.skel--ink` and `.skel-list__row`. The shared `.skel`
  base covers **all shapes** (each shape modifier carries `.skel`), so the placeholder surface = `ButtonFace` with a
  `CanvasText` outline, the list divider = `CanvasText`, and `.skel--ink` uses no token in forced-colors. The
  shimmer is made **static** (`animation: none`) so avatar / circle / card / text-like shapes stay visible and
  distinct while remaining decorative, never looking like an active control. **Live forced-colors emulation was not
  run** — CSSOM/source-verified only (documented P2 caveat).
- **Reduced motion & animation.** The base shimmer is `skel-shimmer`, an infinite `background-position` sweep.
  `@media (prefers-reduced-motion: reduce)` sets `.skel { animation: none }` and holds a static surface. There is
  **no** `transition` — **`transition: all` = 0** — and no new transform/opacity/pulse motion. When forced-colors
  and reduced-motion are both active the placeholder stays **static and system-coloured**; the reduced-motion
  contract remains regression-free after hardening.
- **Visual mapping & theming.** Light shimmer tokens `--ep-paper-200` / `--ep-paper-100`; ink shimmer tokens
  `--ep-slate-700` / `--ep-slate-600`; reduced-motion fallback `--ep-bg-pressed`. **No** hardcoded hex/rgb/hsl in
  the CSS. `w`/`h` overrides land as inline style on the root; `shape` determines the radius / size pattern. A `0`
  width/height can render it invisible but does **not** crash. Hardcoded placeholder sizes remain a P3 polish item.
- **DOM & class contract.** `.skel` (root) · `.skel--text` · `.skel--title` · `.skel--btn` · `.skel--card` ·
  `.skel--circle` · `.skel--avatar` · `.skel--avatar-lg` · `.skel--ink` · `.skel-stack` · `.skel-list` ·
  `.skel-list__row` · `.skel-list__main`. Every active class has CSS. `.skel-row` exists in CSS but is **not**
  rendered by the JSX or the HTML — a documented **P3 dead / legacy utility selector** (left in place as a possible
  `className` escape-hatch, not aggressively removed). `.skel--circle` is not used in the canonical HTML but is
  reachable through `shape="circle"`. The forced-colors selectors cover real elements; the reduced-motion selector
  covers the real `.skel`; no source ↔ CSS drift.
- **Canonical demo.** `components/skeleton/skeleton.html` is a **static HTML mock** (not a React demo); its
  `_theme.js` is the shared loader, not component JS. It renders with no 404 / JS fatal — **34 `.skel` spans**, no
  skeleton `role`, no skeleton `tabindex`, nothing focusable. The demo's static spans still carry **no**
  `aria-hidden`, which is a **documented static-demo drift (P2/P3)** now that the React component defaults to
  `ariaHidden=true`: the static HTML does **not** yet fully model the new hidden contract, so for copy-paste the
  **React component is the recommended contract source**. A later HTML polish is possible but non-blocking; the
  demo was **not** modified during hardening.
- **Consumers & blast radius.** There is **no** active external `Skeleton` / `SkeletonList` consumer and **no**
  external `.skel` / `.skel-list` usage; `styles.css` aggregation is unchanged; the `SKILL.md` registry entry is
  present (registry presence is not an active React consumer, and the `components/README` "CSS" column is a uniform
  house convention, not a skeleton drift). The closed loading / progressbar shimmer is a separate contract, and
  `file-upload` and `splash` are untouched; no duplicate active skeleton implementation exists. **Low blast
  radius.**
- **Known limitations (P2 / P3).** *(P2)* DESIGN/catalog documentation only now backfilled; browser-only `window`
  export; no active consumer; the canonical static demo's `aria-hidden` drift; live forced-colors emulation not run
  (CSSOM-verified). *(P3)* the `.skel-row` dead / legacy selector; hardcoded placeholder sizes; the pre-existing
  `border-radius: 4px` design-hook finding; demo-only copy/layout drift; cosmetic spacing; minor visual polish.
  Accepted, non-blocking limits — there is **no** open P0 or P1.

### Avatar

Person / entity identity chips — an image, initials fallback, size/shape/tone variants, an optional presence
status dot, and an overlapping group. Source of truth:
`components/avatar/Avatar.jsx`,
`avatar.css`, canonical demo `avatar.html` — all under `components/avatar/`. Distinct from the decorative
**skeleton** placeholder, the stateful **loading / progressbar** family, and the rich **hover-card** person card.

- **Component identity & export.** **React** components `Avatar` and `AvatarGroup`, exported browser-global via
  `Object.assign(window, { Avatar, AvatarGroup })` → `window.Avatar` / `window.AvatarGroup`. **No** ESM/CJS export,
  **no** IIFE, **no** auto-init. Module-scope helpers `hashTone()` + `initialsOf()` are **not** exported
  subcomponents. Dual model: a React component **and** a static CSS-only markup pattern — the canonical `avatar.html`
  is a **static HTML mock** (plain `<span class="avatar …">`, not a React demo); its `_theme.js` is the shared
  preview theme loader, not component JS. There is **no** active `window.Avatar` / `window.AvatarGroup` React
  consumer, but the **`.avatar` CSS class contract is widely consumed** as static markup (app-common shells,
  admin-app-examples, trade-components); a separate local `Avatar` in `client-portal/Portal.jsx` is a **duplicate
  implementation** (its own signature), not a consumer of this component. **Blast radius: low for the React
  component, medium–high for the CSS class contract.**
- **Public API.** `Avatar({ name = '', src, alt, size = 'md', shape = 'circle', tone = 'auto', status, decorative = false, children, className = '', ...rest })`.
  `name` = full name (initials source + default root accessible-name source); `src` = image URL; `alt` = explicit
  image-avatar root-name override; `size` ∈ `xs`/`sm`/`md`/`lg`/`xl`/`2xl`; `shape` ∈ `circle`/`square`; `tone` ∈
  `auto`(hashed from `name`)/`blue`/`ink`/`yolk`/`slate`/`violet`/`teal`; `status` ∈ `online`/`away`/`busy`/`offline`;
  `decorative` (default `false`); `children` = visual initials override; `className` passthrough; `...rest` is a root
  escape hatch. No internal state; **no** image load/error state and **no** visual broken-image fallback; no
  TypeScript type. `AvatarGroup({ children, max = 4, size = 'md', className = '' })` overlaps `max` avatars and
  renders a `+N` overflow chip, cloning `size` onto children. **No** `initials`, `fallback`, `presence`, `online`,
  `color`, `ariaLabel`, `ariaHidden`, `href`, or `as` prop, **no** TypeScript type, **no** public subcomponent, and
  **no** button/link/interactive API.
- **Accessible name.** The programmatic name lives on the **root**, not on the visible initials or on `title` alone.
  An informative avatar gets `role="img"` + `aria-label={accessibleName}`, where `accessibleName` = (`alt ?? name`
  for an image, else `name`) with the status label appended when present — e.g. `Evelyn Price, Online`. The visible
  initials span is `aria-hidden="true"`, so the full name is no longer initials-only or title-only; `title={name}`
  remains only as a secondary tooltip. When there is no name / alt / status (and not decorative), the root stays a
  plain generic span with **no** role — there is never a nameless `role="img"`. **Initials-only / title-only
  accessible-name P1 closed.**
- **Image alt / broken image.** For an image avatar the `<img>` is decorative `alt=""` and the **root** carries the
  name (`role="img"` + `aria-label`), so an explicit `alt` prop becomes the root name — one consistent,
  non-double-reading pattern (never both an informative `img alt` and an informative root label). A broken image
  still keeps the root accessible name; there is **no** visual broken-image fallback (documented P2/P3 limit).
- **Decorative path.** `decorative={true}` hides the whole avatar from assistive tech: root `aria-hidden="true"`,
  **no** role, **no** programmatic name. It is for a redundant avatar already identified by adjacent text; it adds
  no status / live-region / interactive contract, hides no genuinely interactive element, and does **not**
  auto-fix the static-consumer bare markup. Default (`false`) stays safe for informative avatars.
- **Status / presence.** `status` ∈ `online`/`away`/`busy`/`offline` maps to the labels `Online`/`Away`/`Busy`/
  `Offline`, folded into the root `aria-label` so the meaning is **never colour-only**; the status dot itself is a
  visual marker with `aria-hidden="true"`. **No** `role="status"`, **no** live region, no empty colour-only dot as
  essential state. In forced colors the programmatic name guarantees the four states are distinguishable while the
  dot stays a visible indicator. **Status/presence colour-only P1 closed.**
- **Non-interactive / focus.** A display, not an interactive control: no `tabindex`, no keyboard handler, no pointer
  handler in the component contract, no button/link API, **no** focus-visible contract (a focus severity level is
  not relevant). The `...rest` escape hatch remains but does not make Avatar an interactive component; a consumer who
  needs an interactive avatar wraps it in a native `<button>`/`<a>`.
- **Forced colors.** A local `@media (forced-colors: active)` block uses **system colors only** (no token/hex/rgb/
  hsl, no `forced-color-adjust: none`), covering `.avatar`, `.avatar__initials`, `.avatar__status`,
  `.avatar__status--offline`, `.avatar-group > .avatar` and `.avatar-group__more`. Avatar surface = `ButtonFace`
  with a `CanvasText` outline; initials text = `CanvasText` (the normal-mode `#fff` is overridden so it stays
  visible); status dot = `Highlight` + `CanvasText` border + `Canvas` ring, with `offline` dimmed to `GrayText`; the
  image is outlined by the `.avatar` container border; group overlap rings stay interpretable. The four status
  states are differentiated authoritatively by the root aria-label text; the dot remains a visible marker. **Live
  forced-colors emulation was not run** — CSSOM/source-verified only (documented P2 caveat).
- **Motion.** There is **no** `transition`, `animation` or `@keyframes` anywhere — **`transition: all` = 0**, no
  image fade, no presence pulse, no shimmer/loading state. A reduced-motion guard is not required, and hardening
  introduced no motion.
- **Visual mapping & theming.** Sizes xs 20 / sm 24 / md 32 / lg 40 / xl 56 / 2xl 80 (font-size scaled; 2xl uses the
  display font); shapes circle (50%) / square (`--ep-radius-md`, 2xl `--ep-radius-lg`); image `object-fit: cover`;
  tones blue/ink/yolk/slate (token gradients) + violet/teal (hardcoded hex) + `auto` hash; group overlap = negative
  margin + ring; status dot bottom/right + ring. An invalid `size`/`tone` yields a non-existent modifier class but
  does **not** crash (the base `.avatar` stays valid). Hardcoded `#fff` and the violet/teal hex remain P3, and the
  `avatar-group__more` no-op inline style remains P3.
- **DOM & class contract.** `.avatar`, `.avatar__image`, `.avatar__initials`, `.avatar__status`
  (`--online`/`--away`/`--busy`/`--offline`), `.avatar--xs/sm/md/lg/xl/2xl`, `.avatar--square` (circle is the
  default, no `.avatar--circle` class), `.avatar--blue/ink/yolk/slate/violet/teal`, `.avatar-group`
  (`--sm`/`--lg`), `.avatar-group__more`. Every active class has CSS; the forced-colors selectors cover real
  elements; no source ↔ CSS drift. The canonical component wraps initials in `.avatar__initials` whereas the static
  consumers put bare text in the `.avatar` span — a documented markup drift (P3).
- **Canonical demo.** `components/avatar/avatar.html` is a **static HTML mock** (not a React demo); its `_theme.js`
  is the shared loader. It renders with no 404 / JS fatal — **49 `.avatar` spans**, no role/aria on the avatar
  markup, nothing focusable; there is no image-avatar or broken-image example. The demo's static spans still carry
  no `role="img"` / `aria-label` and its status dots do not model the React hardening contract — a **documented
  static-demo drift** now that the React component carries the name programmatically; the React component is the
  recommended contract source, and an HTML polish is possible but non-blocking. The demo was **not** modified during
  hardening.
- **Consumers & blast radius.** No active `window.Avatar` / `window.AvatarGroup` React consumer. The `.avatar` CSS
  class is consumed as static markup in app-common shells, admin-app-examples and trade-components (unchanged, often
  bare-initials markup) — a **documented static CSS-consumer drift**. A local `Avatar` in `client-portal/Portal.jsx`
  is a separate duplicate implementation (own signature), not a `window.Avatar` consumer. `styles.css` aggregation is
  unchanged; the `SKILL.md` registry entry is present (not a React consumer; the `components/README` "CSS" column is
  a house convention). **Blast radius: low for the React component, medium–high for the CSS class contract.**
- **Known limitations (P2 / P3).** *(P2)* DESIGN/catalog documentation only now backfilled; browser-only `window`
  export; no active React consumer; static CSS-consumer drift; the canonical static demo's initials/status drift;
  live forced-colors emulation not run (CSSOM-verified). *(P3)* hardcoded `#fff` and violet/teal hex in normal CSS;
  the `avatar-group__more` no-op inline style; the canonical `.avatar__initials` vs static bare-text markup drift;
  the image-avatar `title` secondary tooltip; no visual broken-image fallback; the `...rest` escape hatch;
  demo-only drift; cosmetic spacing; minor visual polish. Accepted, non-blocking limits — there is **no** open P0 or
  P1.

## 6. Do's and Don'ts

### Do:
- **Do** keep the token layer whole and treat it as the single source — the
  light/dark scopes and the contrast ratios were verified together. **Never
  cherry-pick individual token values**, and never re-declare an `--ep-` token
  outside it.
- **Do** build on semantic role tokens (`--ep-bg`, `--ep-accent`, `--ep-fg`), so
  both themes and AA/AAA contrast come for free.
- **Do** use gold for action and sapphire for voice — and keep gold rare. Its
  rarity is the point.
- **Do** put dark ink text (`#16130C`) on every solid gold fill; never white.
- **Do** signal status with the colored-dot pill **plus text**, never color alone.
- **Do** keep dark mode warm graphite, separated by borders + the gold tonal tint.
- **Do** gate any ambient/scroll motion on `prefers-reduced-motion`, and keep
  durations restrained (base 220ms, `ease-out`).

### Don't:
- **Don't** ship a cold "server-rack" dark theme — no pure-black backgrounds, no
  cold-blue tone without warmth. Dark is warm graphite, always.
- **Don't** use hype, emoji, or shouting oversized headlines. Plainspoken copy
  only; status is a dot, not an emoji.
- **Don't** add overdone motion — no bounce, shake, spin, parallax, particles, or
  orchestrated page-level entrances.
- **Don't** reach for geek-SaaS clichés: purple-gradient dark mode, neon accents,
  glassmorphism-by-default, the hero-metric template (big number + gradient), or
  identical icon-plus-heading card grids repeated down the page.
- **Don't** put white text on gold, or hand-pick a dark hex — both break contrast.
- **Don't** use a `border-left`/`border-right` greater than 1px as a colored
  accent stripe; use full borders, tints, or a leading dot/number instead.
- **Don't** use gradient text (`background-clip: text`); emphasis is weight, size,
  or the sapphire flourish.
- **Don't** add a Google Fonts `<link>` or `@import` — fonts are self-hosted.
