# EggProject Design Components

This directory contains all CSS/JSX/HTML component units for the `eggproject-design-components` skill.
Each subdirectory = one component.

## Component List (37 base + 15 shadcn)

### Base Components
| Dir | Component | Type |
|-----|-----------|------|
| accordion | Accordion | CSS |
| alert | Alert | CSS |
| avatar | Avatar | CSS |
| badge | Badge | CSS |
| breadcrumb | Breadcrumb | CSS |
| button | Button | CSS |
| card | Card | CSS |
| charts | Bar + Line Chart | JSX (React) |
| code-block | Code Block | CSS |
| command-palette | Command Palette | JSX (React) |
| data-table | Data Table | JSX (React/TanStack) |
| date-picker | Date Picker | JSX (React) |
| divider | Divider | CSS |
| dot | Dot indicator | CSS |
| drawer | Drawer | CSS |
| empty | Empty state | CSS |
| feed-indicator | Feed Indicator | CSS |
| file-upload | File Upload | CSS |
| form-controls | Form Controls | CSS |
| input | Input | CSS |
| kbd | Keyboard | CSS |
| loading | Loading | CSS |
| menu | Menu | CSS |
| modal | Modal | JSX (React) |
| nav | Nav | CSS |
| pagination | Pagination | CSS |
| popover | Popover | CSS |
| select | Select | CSS |
| skeleton | Skeleton | CSS |
| slider | Slider | CSS |
| splash | Splash | CSS |
| stat | Stat | CSS |
| stepper | Stepper | CSS |
| tabs | Tabs | CSS |
| tag-input | Tag Input | CSS |
| toast | Toast | CSS |
| tooltip | Tooltip | CSS |

### shadcn Components (added)
| Dir | Component | Type |
|-----|-----------|------|
| alert-dialog | Alert Dialog | JSX (React) |
| aspect-ratio | Aspect Ratio | CSS |
| calendar | Calendar | JSX (React) |
| carousel | Carousel | JSX (React) |
| collapsible | Collapsible | JSX (React) |
| context-menu | Context Menu | JSX (React) |
| hover-card | Hover Card | JSX (React) |
| input-otp | Input OTP | JSX (React) |
| menubar | Menubar | JSX (React) |
| resizable | Resizable | JSX (React) |
| scroll-area | Scroll Area | CSS |
| textarea | Textarea | CSS |
| toggle | Toggle | JSX (React) |
| button-group | Button Group | CSS |
| input-group | Input Group | CSS |

## Token Usage
All components import `../../../eggproject-design/colors_and_type.css` (depth 3 from `components/<name>/`).
Only `--ep-*` custom properties are used. No hardcoded hex or px values that have a token equivalent.

## Vendored JS (assets/vendor/)
- `react.production.min.js` — React 18.3.1
- `react-dom.production.min.js` — ReactDOM 18.3.1
- `babel.min.js` — @babel/standalone 7.29.0
- `lucide.min.js` — Lucide 0.525.0
- `react-table.production.min.js` — TanStack Table 8.21.3

No CDN links. All external JS is vendored locally.
