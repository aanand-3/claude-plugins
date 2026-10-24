---
id: P-016
title: Upgrade path off the vendored Python
goal:
items: CHORE-009
touches: packages/crew/**, plugins/crew/skills/git-setup/**, plugins/crew/skills/guidelines/**, plugins/crew/skills/design/scripts/**, plugins/crew/skills/research/scripts/**, plugins/crew/skills/global-setup/scripts/**, plugins/crew/skills/hub/dist/**, .crew/bin/crew.mjs, .claude/launch.json
depends_on:
status: in-review
branch: plan/P-016-upgrade-path-off-the-vendored-python
pr: https://github.com/aanand-3/claude-plugins/pull/8
created: 2026-10-24
started: 2026-10-24
completed:
assignee: developer
---

# P-016: Upgrade path off the vendored Python

## Context
CHORE-009, first half of phase 4 of the move to Node only. P-015 ported the skill scripts. A project set up before that still has:
- `.crew/bin/{check_secrets,check_structure,check_design,format_on_edit,track_plan_draft}.py`;
- `python3 .crew/bin/X.py` lines in `.githooks/*` and `.claude/settings.json`, and possibly in its own CI and Makefile.

Re-running the setup scripts vendors the `.mjs` beside them. But nothing rewrites the old lines or removes the old files, and `setup_git` never overwrites an existing hook, so those projects keep needing python3.

This plan gives them a safe way off. The rule is that a `.py` is never deleted while anything still calls it, so no commit or Claude hook breaks at any step.

The other half, removing the last Python from this repo (`tests/`, the pytest docs), waits for P-004 and the hub-test port. P-004 is in progress in another session.

## Scope
**In:**
- `src/tools/legacy.ts`, shared by `setup_git` and `compose_rules`; the structure rule allows it next to `tools/cli`:
  - **Rewrite, in the files crew owns** (`.githooks/*`, `.claude/settings.json`): `python3 … .crew/bin/X.py` becomes `node … .crew/bin/X.mjs`, and `.crew/bin/X.py` (e.g. in `[ -f … ]`) becomes `.crew/bin/X.mjs`. This happens only for a script whose `.mjs` is already vendored, and every other line stays as it was, customisations included.
  - **Report, without editing, references in project-owned files:**
    - `.claude/settings.local.json`
    - `.github/workflows/*`, `.gitlab-ci.yml`, `Makefile`
    - `.pre-commit-config.yaml`, `package.json`
    - `.husky/*`, and a foreign `core.hooksPath` dir
  - **Remove** `.crew/bin/X.py` only once no file in either list mentions `X.py`. Otherwise keep it, and say which file still calls it.
- `setup_git.mjs` applies this for `check_secrets`. `compose_rules.mjs` applies it for the four it vendors. Each prints `UPGRADE`, `REMOVE` and `KEEP` lines.
- **`crew.mjs check` hints**, with a `next:`-style pointer at `/crew:guidelines --refresh`, for:
  - a leftover `.crew/bin/X.py`;
  - a file that still runs one of them;
  - a leftover `modules:` block in `.crew/config.yaml`.
- `guidelines/SKILL.md` *Refresh*: run `setup_git` and `compose_rules`, then hand-edit only what they report, showing the user each one-line change.
- `.claude/launch.json`: the hub preview runs on the existing `vite` dev dependency instead of `python3 -m http.server`.

**Out (explicitly not doing):**
- Rewriting project-owned files (CI, Makefile, settings.local.json, foreign hooks); they're only reported.
- Editing the user's `.crew/config.yaml`; the `modules:` block is only hinted.
- Deleting `tests/` or the pytest docs (after P-004).
- `plugins/crew/skills/hub/**` and `.crew/templates/**` (P-004's area).

## Acceptance criteria
- [ ] A fixture of a pre-port project ends clean after `setup_git.mjs` and `compose_rules.mjs`:
  - hooks and `settings.json` run `node .crew/bin/*.mjs`;
  - every unreferenced `.py` is gone;
  - a commit runs the node checks (a staged fake key is blocked).
- [ ] A `.py` still named by a project file (e.g. `Makefile`) is kept and reported, and is removed on a later run once that file changes.
- [ ] A customised pre-commit keeps its own lines; only the legacy references change.
- [ ] A reference to a script whose `.mjs` isn't vendored yet is left as it is, so nothing is skipped silently.
- [ ] `crew.mjs check` hints at each leftover kind, and says nothing in a clean project.
- [ ] The `hub-preview` launch config serves `packages/crew/preview` without python.
- [ ] `npm run typecheck && npm test` pass in `packages/crew`, `dist/` is in sync, and `test_hub.py`/`test_team.py` still pass.

## Approach
- **One module:** `legacy.ts` holds the five script names, the two file lists and three functions (`rewrite`, `references`, `cleanup`). Both scripts call it after vendoring, so the `.mjs` exists before any line points at it.
- **Exact text replacement:** the rewrite is a text replacement scoped to those exact paths (`\bpython3?\s+(\S*?\.crew/bin/X)\.py` → `node $1.mjs`, then `.crew/bin/X.py` → `.crew/bin/X.mjs`). It works the same in shell hooks and in JSON strings (`\"$CLAUDE_PROJECT_DIR/.crew/bin/X.py\"`), and it's idempotent.
- **Hub hints:** the hub can't import tools, so `commands/views/legacy.ts` has its own copy of the five names. It's a small, stable list that this plan's tests pin on both sides.
- **Preview:** `node packages/crew/node_modules/vite/bin/vite.js packages/crew/preview --port 4173 --strictPort --host 127.0.0.1`.

## Tasks
- [x] T1: `src/tools/legacy.ts` with tests for rewrite, references and cleanup on fixture files → verify: `cd packages/crew && npx vitest run test/tools/legacy.test.ts`
- [x] T2: `setup_git` and `compose_rules` call it; a pre-port project fixture covers AC1–AC4 → verify: `npx vitest run test/tools/upgrade.test.ts`
- [x] T3: hub `check` hints with a vitest case → verify: `npx vitest run test/upgrade-hints.test.ts`
- [x] T4: guidelines SKILL Refresh step; launch.json on vite → verify: start the preview config and fetch `/habitly.html`
- [x] T5: build and the full suites → verify: `npm run typecheck && npm test && npm run build && git status --porcelain` is empty; `cd tests/crew && env -u CREW_ROLE -u CREW_RUN uvx --with pyyaml pytest -q`

## Test plan
- **AC1–AC4:** `test/tools/upgrade.test.ts` builds a pre-port project:
  - the old `.py` copies from `git show d08d56c^…`, or literal fixtures;
  - old-style hooks and settings, and a `Makefile` line;
  - it runs the real `setup_git.mjs` and `compose_rules.mjs`, then commits.
- **AC5:** a vitest case runs `crew.mjs check` on that fixture before and after.
- **AC6:** a manual check, recorded as a checkpoint.
- **AC7:** the existing suites.

## Rollout & rollback
- Existing projects pick it up the next time `/crew:guidelines --refresh` or git-setup runs. The first run rewrites what crew owns and reports the rest; the `.py` files go as soon as nothing calls them.
- Rollback: revert the PR. A project that already upgraded keeps working, because its `.mjs` files and node hooks stand on their own.

## Risks & open questions
- **A custom hook that calls the `.py` some other way** (e.g. `python3 -B .crew/bin/check_secrets.py`) isn't matched by the rewrite. So it's reported and the `.py` is kept, never broken.
- **Project-owned CI and Makefile references** need the user's hand. The hint and the refresh step point at each one.

## Handoff

_Generated 2026-10-24 by `crew.mjs handoff` from the ledger._

- P-016: Upgrade path off the vendored Python [in-review] tasks 5/5 — claimed by Arpit Anand (main-node-only)
- last checkpoint 2026-10-24 09:33 at done (7f7b456) by Arpit Anand; since then 1 commit(s), 0 uncommitted file(s)
- ✓ vitest test/tools/upgrade.test.ts — 6 passed: rewrite in shell and JSON, idempotent, unsafe forms left; pre-port fixture ends clean and a fake key is blocked by check_secrets.mjs; Makefile caller keeps the .py then frees it; customised hook keeps its lines; no .mjs, no rewrite (AC 1,2,3,4) (reported)
- ✓ vitest test/upgrade-hints.test.ts — check hints at leftover .py, files that run them and modules:, and is silent once clean (AC 5) (reported)
- ✓ launch.json hub-preview (vite preview packages/crew --outDir preview) serves /habitly.html 200, byte-identical to the file, no python (AC 6) (reported)
- ✓ npm run typecheck && npx vitest run — 19 files, 124 tests; build clean; tests/crew pytest 112 passed (no CREW_*) (AC 7) (reported)
- ✓ cd packages/crew && npx vitest run test/tools/upgrade.test.ts (AC 1,2,3,4)
- ✓ cd packages/crew && npx vitest run test/upgrade-hints.test.ts (AC 5)
- ✓ node -e "const fs=require('fs'),cp=require('child_process');const c=JSON.parse(fs.readFileSync('.claude/launch.json','utf8')).configurations.find(x=>x.name==='hub-preview');const p=cp.spawn(c.runtimeExecutable,c.runtimeArgs,{stdio:'ignore'});setTimeout(async()=>{let ok=false;try{const r=await fetch('http://127.0.0.1:4173/habitly.html');const b=Buffer.from(await r.arrayBuffer());ok=r.status===200&&b.equals(fs.readFileSync('packages/crew/preview/habitly.html'));console.log('status',r.status,'bytes',b.length,'identical',ok,'cmd',c.runtimeExecutable)}catch(e){console.error(e)}p.kill();process.exit(ok?0:1)},4000)" (AC 6)
- ✓ npm run typecheck && npx vitest run — 19 files, 127 tests (10 upgrade cases incl. each review repro); build clean; tests/crew pytest 112 passed (AC 1,2,3,4,5,7) (reported)
- evidence: AC1 ✓ (self), AC2 ✓ (self), AC3 ✓ (self), AC4 ✓ (self), AC5 ✓ (self), AC6 ✓, AC7 ✓ (self)

Latest log:
- 2026-10-24: review: changes requested — 1) packages/crew/src/tools/legacy.ts:25-30 projectOwned() never scans .git/hooks. setup_git (its own 'left hooks alone: .git/hooks has pre-commit ... merge it into your hooks' message) invites exactly that setup, and old merged lines are '[ -f .crew/bin/check_secrets.py ] && python3 ...'. Reproduced: hooksPath unset, .git/hooks/pre-commit = old template -> setup_git prints REMOVE .crew/bin/check_secrets.py, and secret scanning silently stops on every commit. Scan .git/hooks (non-.sample) whenever core.hooksPath is unset, and resolve an absolute core.hooksPath instead of join(root, abs) (line 27). Add the case to test/tools/upgrade.test.ts. 2) legacy.ts:36 the leading \bpython3? matches after a path, so '.venv/bin/python .crew/bin/X.py' becomes '.venv/bin/node ...' and '/opt/homebrew/bin/python3' becomes '/opt/homebrew/bin/node'; the .py is then removed as unreferenced. In settings.json ('; true') that drops format_on_edit/track_plan_draft silently. Anchor it (e.g. (?<![\w./-])python3?) so a path-qualified interpreter is left alone and KEEPs its .py; likewise give the -f regex (line 37) a boundary so 'rm -f .crew/bin/X.py' is not turned into 'rm -f .crew/bin/X.mjs'. Add both to the 'leaves a call alone' test. 3) AC5 fails for every base-only project (no design pack, the default): the old pre-commit always carried a guarded '[ -f .crew/bin/check_design.py ] && python3 .crew/bin/check_design.py', there is no check_design.py and no .mjs, so upgrade() leaves the line and crew.mjs --as architect --run-id architect:ab22dd1985ce7a09c check hints '.githooks/pre-commit still runs .crew/bin/check_design.py' forever; the refresh it points at cannot clear it. Reproduced with the real 5483ba6 templates and packs [base]. Fix in legacy.ts:47: also rewrite a name when its .py is absent (the guarded line is inert before and after, so nothing is skipped that ran), keeping AC4 for a .py that exists. Cover it with a fixture that writes only the .py files the packs actually vendored. Should (not blocking): the reference check reads a fixed list; consider adding 'git grep -l .crew/bin/X.py' over tracked files (scripts/*.sh, lefthook.yml, justfile, .circleci, .github/actions) before REMOVE, since the plan's rule is that a .py is never deleted while anything calls it.
- 2026-10-24: status in-review → in-progress — changes requested: 1) packages/crew/src/tools/legacy.ts:25-30 projectOwned() never scans .git/hooks. setup_git (its own 'left hooks alone: .git/hooks has pre-commit ... merge it into your hooks' message) invites exactly that setup, and old merged lines are '[ -f .crew/bin/check_secrets.py ] && python3 ...'. Reproduced: hooksPath unset, .git/hooks/pre-commit = old template -> setup_git prints REMOVE .crew/bin/check_secrets.py, and secret scanning silently stops on every commit. Scan .git/hooks (non-.sample) whenever core.hooksPath is unset, and resolve an absolute core.hooksPath instead of join(root, abs) (line 27). Add the case to test/tools/upgrade.test.ts. 2) legacy.ts:36 the leading \bpython3? matches after a path, so '.venv/bin/python .crew/bin/X.py' becomes '.venv/bin/node ...' and '/opt/homebrew/bin/python3' becomes '/opt/homebrew/bin/node'; the .py is then removed as unreferenced. In settings.json ('; true') that drops format_on_edit/track_plan_draft silently. Anchor it (e.g. (?<![\w./-])python3?) so a path-qualified interpreter is left alone and KEEPs its .py; likewise give the -f regex (line 37) a boundary so 'rm -f .crew/bin/X.py' is not turned into 'rm -f .crew/bin/X.mjs'. Add both to the 'leaves a call alone' test. 3) AC5 fails for every base-only project (no design pack, the default): the old pre-commit always carried a guarded '[ -f .crew/bin/check_design.py ] && python3 .crew/bin/check_design.py', there is no check_design.py and no .mjs, so upgrade() leaves the line and crew.mjs --as architect --run-id architect:ab22dd1985ce7a09c check hints '.githooks/pre-commit still runs .crew/bin/check_design.py' forever; the refresh it points at cannot clear it. Reproduced with the real 5483ba6 templates and packs [base]. Fix in legacy.ts:47: also rewrite a name when its .py is absent (the guarded line is inert before and after, so nothing is skipped that ran), keeping AC4 for a .py that exists. Cover it with a fixture that writes only the .py files the packs actually vendored. Should (not blocking): the reference check reads a fixed list; consider adding 'git grep -l .crew/bin/X.py' over tracked files (scripts/*.sh, lefthook.yml, justfile, .circleci, .github/actions) before REMOVE, since the plan's rule is that a .py is never deleted while anything calls it.
- 2026-10-24: review fixes: callers via git grep plus .git/hooks and absolute core.hooksPath (tools and hub hints); rewrite only bare python/python3 and [ -f …]; guarded calls move when neither file exists; 30s test timeout

## Progress log

- 2026-10-24: status draft → ready
- 2026-10-24: assigned to the developer role
- 2026-10-24: status ready → in-progress — branch plan/P-016-upgrade-path-off-the-vendored-python
- 2026-10-24: status in-progress → in-review
- 2026-10-24: review: changes requested — 1) packages/crew/src/tools/legacy.ts:25-30 projectOwned() never scans .git/hooks. setup_git (its own 'left hooks alone: .git/hooks has pre-commit ... merge it into your hooks' message) invites exactly that setup, and old merged lines are '[ -f .crew/bin/check_secrets.py ] && python3 ...'. Reproduced: hooksPath unset, .git/hooks/pre-commit = old template -> setup_git prints REMOVE .crew/bin/check_secrets.py, and secret scanning silently stops on every commit. Scan .git/hooks (non-.sample) whenever core.hooksPath is unset, and resolve an absolute core.hooksPath instead of join(root, abs) (line 27). Add the case to test/tools/upgrade.test.ts. 2) legacy.ts:36 the leading \bpython3? matches after a path, so '.venv/bin/python .crew/bin/X.py' becomes '.venv/bin/node ...' and '/opt/homebrew/bin/python3' becomes '/opt/homebrew/bin/node'; the .py is then removed as unreferenced. In settings.json ('; true') that drops format_on_edit/track_plan_draft silently. Anchor it (e.g. (?<![\w./-])python3?) so a path-qualified interpreter is left alone and KEEPs its .py; likewise give the -f regex (line 37) a boundary so 'rm -f .crew/bin/X.py' is not turned into 'rm -f .crew/bin/X.mjs'. Add both to the 'leaves a call alone' test. 3) AC5 fails for every base-only project (no design pack, the default): the old pre-commit always carried a guarded '[ -f .crew/bin/check_design.py ] && python3 .crew/bin/check_design.py', there is no check_design.py and no .mjs, so upgrade() leaves the line and crew.mjs --as architect --run-id architect:ab22dd1985ce7a09c check hints '.githooks/pre-commit still runs .crew/bin/check_design.py' forever; the refresh it points at cannot clear it. Reproduced with the real 5483ba6 templates and packs [base]. Fix in legacy.ts:47: also rewrite a name when its .py is absent (the guarded line is inert before and after, so nothing is skipped that ran), keeping AC4 for a .py that exists. Cover it with a fixture that writes only the .py files the packs actually vendored. Should (not blocking): the reference check reads a fixed list; consider adding 'git grep -l .crew/bin/X.py' over tracked files (scripts/*.sh, lefthook.yml, justfile, .circleci, .github/actions) before REMOVE, since the plan's rule is that a .py is never deleted while anything calls it.
- 2026-10-24: status in-review → in-progress — changes requested: 1) packages/crew/src/tools/legacy.ts:25-30 projectOwned() never scans .git/hooks. setup_git (its own 'left hooks alone: .git/hooks has pre-commit ... merge it into your hooks' message) invites exactly that setup, and old merged lines are '[ -f .crew/bin/check_secrets.py ] && python3 ...'. Reproduced: hooksPath unset, .git/hooks/pre-commit = old template -> setup_git prints REMOVE .crew/bin/check_secrets.py, and secret scanning silently stops on every commit. Scan .git/hooks (non-.sample) whenever core.hooksPath is unset, and resolve an absolute core.hooksPath instead of join(root, abs) (line 27). Add the case to test/tools/upgrade.test.ts. 2) legacy.ts:36 the leading \bpython3? matches after a path, so '.venv/bin/python .crew/bin/X.py' becomes '.venv/bin/node ...' and '/opt/homebrew/bin/python3' becomes '/opt/homebrew/bin/node'; the .py is then removed as unreferenced. In settings.json ('; true') that drops format_on_edit/track_plan_draft silently. Anchor it (e.g. (?<![\w./-])python3?) so a path-qualified interpreter is left alone and KEEPs its .py; likewise give the -f regex (line 37) a boundary so 'rm -f .crew/bin/X.py' is not turned into 'rm -f .crew/bin/X.mjs'. Add both to the 'leaves a call alone' test. 3) AC5 fails for every base-only project (no design pack, the default): the old pre-commit always carried a guarded '[ -f .crew/bin/check_design.py ] && python3 .crew/bin/check_design.py', there is no check_design.py and no .mjs, so upgrade() leaves the line and crew.mjs --as architect --run-id architect:ab22dd1985ce7a09c check hints '.githooks/pre-commit still runs .crew/bin/check_design.py' forever; the refresh it points at cannot clear it. Reproduced with the real 5483ba6 templates and packs [base]. Fix in legacy.ts:47: also rewrite a name when its .py is absent (the guarded line is inert before and after, so nothing is skipped that ran), keeping AC4 for a .py that exists. Cover it with a fixture that writes only the .py files the packs actually vendored. Should (not blocking): the reference check reads a fixed list; consider adding 'git grep -l .crew/bin/X.py' over tracked files (scripts/*.sh, lefthook.yml, justfile, .circleci, .github/actions) before REMOVE, since the plan's rule is that a .py is never deleted while anything calls it.
- 2026-10-24: review fixes: callers via git grep plus .git/hooks and absolute core.hooksPath (tools and hub hints); rewrite only bare python/python3 and [ -f …]; guarded calls move when neither file exists; 30s test timeout
- 2026-10-24: status in-progress → in-review

## Outcome
- **What shipped:**
  - `tools/legacy.ts`, run by `setup_git` (for `check_secrets`) and `compose_rules` (for the other four) after they vendor the `.mjs`.
  - It rewrites crew's own `.githooks/*` and `.claude/settings.json` from `python3 … .crew/bin/X.py` to `node … .crew/bin/X.mjs`, and `[ -f …X.py ]` to `.mjs`. It does this only for scripts whose `.mjs` is vendored, and nothing else in the file changes.
  - It removes `.crew/bin/X.py` only when no file names it. That includes the project's own CI, `Makefile`, `settings.local.json`, `package.json`, pre-commit config, `.husky` and a foreign `core.hooksPath`; each of those callers is reported as `KEEP`.
  - `crew.mjs check` hints at leftover `.py` copies, files that still run them, and a `modules:` block.
  - The guidelines *Refresh* section has the steps.
  - `launch.json` serves the preview with `vite preview`.
- **Deviations:**
  - `vite preview` replaces the plan's vite dev server. The dev server rewrites HTML, and it choked on the inlined bundle; `vite preview` serves the file byte for byte.
  - The out-dir is `packages/crew` + `preview`, because vite warns when the out-dir is its own root.
- **Review fixes:**
  - The callers are now found with `git grep` over tracked files (docs and `.crew/` aside), plus the usual CI and build files even when untracked, the hooks git actually runs (`.git/hooks`, a `core.hooksPath` anywhere, absolute too) and `settings.local.json`.
  - The rewrite only touches a bare `python`/`python3` and a `[ -f …]` test. A path-qualified interpreter, `rm -f` and `X.py.bak` keep their `.py`.
  - A guarded call is also moved when neither the `.py` nor the `.mjs` exists, so a project without the design pack ends with nothing for `check` to report.
  - `vitest.config.ts` sets a 30s per-test timeout, because the script tests drive real repos and hooks.
- **Follow-ups:** CHORE-011 removes the last Python (`tests/crew`, the pytest docs and the `.gitignore` lines) once P-004 lands and CHORE-008's hub-test port is done.

Learnings: none
