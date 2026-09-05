# check_integrity.py — Usage & Examples

## Overview

`check_integrity.py` is a **read-only** Python 3 script (stdlib only, no pip required) that verifies every local import reference in `.html` and `.css` files across the eggproject design skills.

It checks:
| Pattern | Example |
|---|---|
| CSS `@import url(...)` | `@import url('../eggproject-design/colors_and_type.css')` |
| HTML `<link href="...">` | `<link rel="stylesheet" href="../components/button/button.css">` |
| HTML `<script src="...">` | `<script src="../assets/vendor/react.production.min.js">` |
| HTML `<img src="...">` | `<img src="../eggproject-design/assets/logo-mark.svg">` |

External refs (`https://`, `//`, `data:`) are reported separately and never flagged as errors.

---

## Common invocations

```bash
# Standard: check three core skills
python3 check_integrity.py \
  /path/to/skills/eggproject-design \
  /path/to/skills/eggproject-design-components \
  /path/to/skills/eggproject-design-app-common

# Including trade-components when present
python3 check_integrity.py \
  /path/to/skills/eggproject-design \
  /path/to/skills/eggproject-design-components \
  /path/to/skills/eggproject-design-app-common \
  /path/to/skills/eggproject-design-trade-components

# Auto-discover sibling skills (no args needed when run from its own skill dir)
python3 check_integrity.py
```

---

## Example output — all OK

```
============================================================
EGGPROJECT DESIGN SKILLS — IMPORT INTEGRITY REPORT
Scanned: 2026-06-20T10:00:00
============================================================

SKILL: eggproject-design-components
  Path: /skills/eggproject-design-components

  styles.css:9                              OK   ../eggproject-design/colors_and_type.css
  styles.css:12                             OK   ./components/accordion/accordion.css
  ...
  preview/components-breadcrumb.html:7      OK   _theme.js
  preview/components-breadcrumb.html:9      OK   ../components/breadcrumb/breadcrumb.css
  preview/components-breadcrumb.html:10     OK   ../../eggproject-design/assets/logo-mark.svg

  SUMMARY: 62 OK, 0 MISSING
------------------------------------------------------------

SKILL: eggproject-design-app-common
  Path: /skills/eggproject-design-app-common

  _shell.css:1                              OK   ../eggproject-design/colors_and_type.css
  index.html:7                              OK   ../eggproject-design/preview/_theme.js
  index.html:9                              OK   ../eggproject-design/assets/logo-mark.svg
  index.html:10                             OK   ../eggproject-design/colors_and_type.css
  index.html:11                             OK   _shell.css
  ...

  SUMMARY: 8 OK, 0 MISSING
------------------------------------------------------------

============================================================
TOTAL: 70 OK, 0 MISSING
EXIT: 0 (all references resolved)
============================================================
```

---

## Example output — broken reference detected

```
SKILL: eggproject-design-components
  ...
  styles.css:15                             MISSING  ./components/badge/badge.css
                                                     => /skills/eggproject-design-components/components/badge/badge.css
  ...
  SUMMARY: 61 OK, 1 MISSING
------------------------------------------------------------

============================================================
TOTAL: 61 OK, 1 MISSING
EXIT: 1 (1 reference(s) MISSING)
============================================================
```

Exit code is `1`, so CI pipelines / shell scripts can use `&&` or `if` checks.

---

## When this skill triggers

The orchestrator should invoke this skill when a user says things like:
- "check/validate local imports across the eggproject design skills"
- "find broken references after deleting/moving a component"
- "run the integrity checker"
- "are all cross-skill paths still valid?"
- "verify imports before shipping"
