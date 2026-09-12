---
name: eggproject-design-skills-integrity-checker
description: A dev/maintenance tool that checks and validates all local file imports across the eggproject design skills, finding broken references after moving or deleting a component or file, and auditing cross-skill relative (../) import paths. Scans HTML and CSS files for @import, link, script, and img src references, resolves each path relative to the file that contains it (including ../path cross-skill references), then reports OK vs MISSING per skill. Use when checking whether imports resolve after refactoring, when a component was moved or deleted and you want to find every broken reference, or when auditing cross-skill relative paths before shipping. This is a REPORT-ONLY tool — it never creates, modifies, moves, or deletes any file. It is a development/maintenance utility, distinct from the eggproject-design, eggproject-design-components, and eggproject-design-app-common skills which provide the actual design assets and components.
---
# eggproject-design-skills-integrity-checker

**REPORT-ONLY tool** — verifies that all local file imports across the eggproject design skills resolve to existing files. Never modifies anything.

## Description

Scans `.html`, `.htm`, and `.css` files across one or more skill folders and checks every local import reference:
- CSS `@import url('...')` declarations
- HTML `<link href="...">` attributes
- HTML `<script src="...">` attributes
- HTML `<img src="...">` attributes

Resolves each reference relative to the directory of the file that contains it (handles `../` cross-skill paths via `os.path.normpath`), then reports OK vs MISSING per skill. Exits 0 if all references resolve, non-zero if any are missing.

## When to use this skill

Use when the user asks to:
- **check or validate local imports** across the eggproject design skills
- **find broken references** after deleting or moving a component
- **verify integrity** of cross-skill file references
- **audit imports** before shipping or after refactoring
- confirm that `../eggproject-design/...` or other relative paths still exist

**Scope: the `eggproject-design-*` skill family only.** Do not run it against an
outside project that consumes copies of these files — there, a missing
`../eggproject-design/…` path is expected, not a defect, and the checker has no
way to tell the difference.

## This skill is REPORT-ONLY

The checker **never** creates, edits, moves, or deletes any file. It only reads and reports. If you need to fix missing references, do that separately.

## Usage

The script takes zero or more skill directories as arguments — they are fully configurable.

```bash
# Check specific skills (pass any directories as arguments)
python3 scripts/check_integrity.py \
  /path/to/skills/eggproject-design \
  /path/to/skills/eggproject-design-components \
  /path/to/skills/eggproject-design-app-common

# Check a single skill
python3 scripts/check_integrity.py /path/to/skills/eggproject-design-components

# No arguments: auto-discover sibling skills from the script's location
python3 scripts/check_integrity.py
```

With no arguments, it auto-discovers these sibling skill folders (relative to the script at `../../`), skipping any that do not exist:
`eggproject-design`, `eggproject-design-components`, `eggproject-design-app-common`, `eggproject-design-trade-components`.

## Exit codes

- `0` — all local references resolve to existing files
- `1` — one or more references are MISSING
- `2` — no valid skill directories were found to scan

## Output format

```
============================================================
EGGPROJECT DESIGN SKILLS — IMPORT INTEGRITY REPORT
Scanned: 2026-06-20T10:00:00
============================================================

SKILL: eggproject-design-components  (/path/to/skills/eggproject-design-components)
  styles.css:9          OK   ../eggproject-design/colors_and_type.css
  styles.css:12         OK   ./components/accordion/accordion.css
  ...
  SUMMARY: 62 OK, 0 MISSING

------------------------------------------------------------

SKILL: eggproject-design-app-common  (/path/to/skills/eggproject-design-app-common)
  ...
  SUMMARY: 8 OK, 0 MISSING

============================================================
TOTAL: 70 OK, 0 MISSING
EXIT: 0 (all references resolved)
============================================================
```

## Notes

- External references (`http://`, `https://`, `//`, `data:`, `mailto:`, `#`) are skipped and noted separately — never flagged as MISSING.
- Only files with `.css`, `.html`, or `.htm` extensions are scanned; `.md` files (including everything in `references/`) and all other extensions are ignored. Hidden directories (names starting with `.`) are skipped.
- Any reference type listed above resolves to a real file — including `.woff2`/`.svg` assets — so font and image paths are checked too.
- Works with Python 3 standard library only (`os`, `re`, `sys`, `datetime`) — no pip dependencies.
