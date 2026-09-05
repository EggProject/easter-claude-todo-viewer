# Infrastructure Learnings — eggproject-design-skills-develop

Precise recipes discovered during Phase 4 development. Every item here was empirically verified
in the sandbox environment. Do not assume these apply to other environments — the environment is
specifically a minimal Ubuntu Linux sandbox where the mounted repo path forbids file deletion.

---

## §1 Git: Stale Lock Files

### Problem

The repo is mounted via the Cowork session filesystem. The mount kernel module forbids `unlink`
(file deletion). Git's post-commit cleanup attempts to remove `.git/index.lock`, `.git/COMMIT_EDITMSG.lock`,
etc. These fail silently or with a warning. The stale `.lock` files remain.

On the NEXT git operation, git finds the existing lock and exits:

```
fatal: Unable to create '/path/to/repo/.git/index.lock': File exists.
```

This blocks all subsequent git commands until the lock is cleared.

### Solution: git wrapper with lock quarantine

Create a wrapper script `git-safe.sh` that renames (not deletes) stale lock files before forwarding to git:

```bash
#!/usr/bin/env bash
# git-safe.sh — renames stale *.lock files before calling git
# Usage: git-safe.sh <git-args...>

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
GIT_DIR="${REPO_ROOT}/.git"
TRASH_DIR="${GIT_DIR}/lock-trash"
mkdir -p "${TRASH_DIR}"

# Quarantine any stale lock files
find "${GIT_DIR}" -maxdepth 2 -name "*.lock" 2>/dev/null | while read -r lock; do
  stamp=$(date +%s%N)
  mv "${lock}" "${TRASH_DIR}/$(basename "${lock}").${stamp}" 2>/dev/null || true
done

exec git "$@"
```

Key properties:
- Uses `mv` (rename), not `rm` — works under the no-unlink constraint.
- The `lock-trash/` directory accumulates renamed locks harmlessly. It grows slowly (one entry per
  blocked op). The user clears it on their OS (macOS Finder or `rm -rf lock-trash/` on the host).
- The `2>/dev/null || true` ensures the quarantine step never aborts the actual git call.

### Usage

```bash
chmod +x git-safe.sh
./git-safe.sh commit -m "feat: add component X"
./git-safe.sh add .
# etc.
```

Or alias it for the session:
```bash
alias git='./git-safe.sh'
```

---

## §2 Screenshot Harness

### Problem

Local HTML pages MUST be verified visually (Rule 2 in SKILL.md §1). The sandbox Ubuntu is minimal:
Playwright's headless Chromium requires `libXdamage.so.1` which is absent. Installing it normally
requires root and a full apt cache, which may not be available.

### Solution: dpkg-extract the missing lib, then launch with LD_LIBRARY_PATH

Step-by-step (run once per sandbox session, or bake into the setup script):

```bash
# 1. Update apt cache (writes to user-writable dirs only)
apt-get update

# 2. Download the .deb package without installing (safe, user-writable)
apt-get download libxdamage1

# 3. Extract the .so into /tmp/libs
mkdir -p /tmp/libs
dpkg -x libxdamage1_*.deb /tmp/libs

# 4. Confirm the lib is present
ls /tmp/libs/usr/lib/x86_64-linux-gnu/libXdamage.so.1
```

### Reusable screenshot script

Save as `/tmp/screenshot.js` (Node + Playwright):

```js
const { chromium } = require('playwright');
const path = require('path');

const url = process.argv[2];
const outFile = process.argv[3] || '/tmp/screenshot.png';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    env: {
      ...process.env,
      LD_LIBRARY_PATH: '/tmp/libs/usr/lib/x86_64-linux-gnu:' + (process.env.LD_LIBRARY_PATH || '')
    }
  });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push('[console] ' + msg.text()); });
  page.on('pageerror', err => errors.push('[pageerror] ' + err.message));
  page.on('requestfailed', req => errors.push('[netfail] ' + req.url() + ' — ' + req.failure().errorText));

  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
  await page.screenshot({ path: outFile, fullPage: false });
  await browser.close();

  if (errors.length) {
    console.error('Errors detected:\n' + errors.join('\n'));
    process.exit(1);
  } else {
    console.log('Screenshot saved: ' + outFile + ' (no errors)');
  }
})();
```

### Usage

```bash
# Ensure LD_LIBRARY_PATH is set if not handled inside the script
export LD_LIBRARY_PATH=/tmp/libs/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH

# Start HTTP server with docroot = .claude/skills/ parent
cd /path/to/repo/.claude/skills
python3 -m http.server 8080 &

# Screenshot a skill page
node /tmp/screenshot.js http://localhost:8080/eggproject-design/preview/brand-logo.html /tmp/outputs/brand-logo.png

# Read the screenshot to self-verify
# (use the Claude Read tool on the PNG path)
```

### Why the docroot matters

All cross-skill relative paths in HTML/CSS use `../../eggproject-design/...` patterns, anchored
at the `.claude/skills/` parent. If you serve from a skill subdirectory, those paths break.
Always serve from the skills root.

---

## §3 Build in /tmp, Not the Mount

Never run `npm install`, `npx create-*`, or any scaffolding tool inside the mounted repo path.
The no-delete constraint means leftover `node_modules`, generated files, and failed intermediate
artifacts accumulate and cannot be cleaned up.

Standard pattern:
```bash
# 1. Do all work in /tmp
mkdir -p /tmp/build/skills/my-new-skill
cd /tmp/build/skills/my-new-skill
npm install ...  # installs into /tmp — deletable

# 2. Validate
python3 /path/to/skill-creator/scripts/quick_validate.py /tmp/build/skills/my-new-skill

# 3. ONLY after green validation, publish into the repo (see §3a for the rename trick)
```

### §3a Publish-by-Directory-Rename (the no-delete publish trick)

The mount cannot delete files, so you cannot overwrite an existing skill dir cleanly (a plain
`cp -r` over it leaves stale/renamed-away files behind and can never remove them). The working
procedure used throughout the rework (tasks T1–T8b):

```bash
SK=.claude/skills/<skill>
# 1) Move the OLD skill dir aside into a trash dir (rename, not delete — allowed under no-unlink).
mv "$SK" ".claude/skills/.removed-trash/<skill>.$(date +%s)"
# 2) Copy the fresh, validated /tmp/work copy into place as a brand-new dir.
cp -r /tmp/work/skills/<skill> "$SK"
# 3) Commit. One commit per task.
```

- `.removed-trash/` accumulates the superseded dirs harmlessly; the user clears it on their OS.
- This guarantees a clean tree (no orphaned leftover files) despite the no-delete constraint.
- The orchestrator performs the publish + commit; agents build/validate in `/tmp/work` only.

---

## §4 Cross-Skill Import Paths — Verified Pattern

Skills are siblings under `.claude/skills/`. The skills-root (docroot) is `.claude/skills/`.

To import from skill A (eggproject-design) into a file in skill B:

```
depth 1 (B/styles.css):         @import '../eggproject-design/colors_and_type.css';
depth 2 (B/demos/x.html):       <link href="../../eggproject-design/colors_and_type.css">
depth 3 (B/components/btn/btn.css): @import '../../../eggproject-design/colors_and_type.css';
```

Formula: depth × "../" + "eggproject-design/" + relative-path-within-A

The legacy monolith used `@import '../../colors_and_type.css'` (2 hops, monolith-internal).
After the split this MUST be rewritten. This is the highest-risk mechanical change.

**Early smoke test (BLOCKING before building the full family):** create a 2-skill stub
(A stub + one consumer), serve via HTTP server from skills root, verify the token CSS loads
in the browser via screenshot. Do not proceed to build the full skill family without a green
smoke test result — relative sibling-dir import resolution must be verified in this environment.

---

## §5 Lint Config Integration

The file `_adherence.oxlintrc.json` (in this skill's root directory) is the authoritative
oxlint config for the entire repo. It enforces iron rules at the code level:

```sh
# Lint a specific skill
npx oxlint --config .claude/skills/eggproject-design-skills-develop/_adherence.oxlintrc.json \
  .claude/skills/eggproject-design-components/

# Lint everything
npx oxlint --config .claude/skills/eggproject-design-skills-develop/_adherence.oxlintrc.json \
  .claude/skills/
```

The config requires oxlint with `react` and `import` plugins. Pin the version to match the
project's Node toolchain.

---

## §6 Data-Driven Report — `gen_catalog.py` + Refresh-After-Each-Task

The dependency/inventory report (`docs/report/index.html`) is DATA-DRIVEN, not hand-maintained.

### What it does

`docs/report/scripts/gen_catalog.py` re-scans all 8 skill directories under `.claude/skills/`,
classifies every file (real component / demo / gallery-index / shell / asset / config / doc /
vendor JS / stylesheet), detects flags (component stubs; legacy duplicate
`preview/_base.css`/`_theme.js` in B), and writes a JSON manifest INLINE into `index.html`
between the markers:

```
<!--CATALOG_DATA_START-->  ...generated <script type="application/json">...  <!--CATALOG_DATA_END-->
```

The page renders this manifest as tabular per-skill cards plus a single searchable data table
with Skill + Kategória (category) filter chips beside the search box. The script is idempotent:
it only replaces the content between the two markers, so running it twice yields an identical file.

The `⚠ csonk` (stub) heuristic is intentionally narrow: a component dir is flagged ONLY when it
has a `.css` but NO `.jsx` AND NO `.html` demo (nothing to show). CSS-only / presentational
components that DO ship a `.html` demo (e.g. aspect-ratio, button-group, input-group,
scroll-area, textarea) are complete by design and are NOT stubs.

### Run it

```bash
python3 docs/report/scripts/gen_catalog.py
# prints the per-skill element counts (A–H) and "Frissítve"/"Változatlan"
```

### Rule: refresh after every task

Regenerate the catalog after EACH structural change (every T-task did this — see git log:
"report refresh"). A stale report is a defect. Because the script is idempotent and marker-scoped,
the refresh is safe to run repeatedly and produces a clean diff.
