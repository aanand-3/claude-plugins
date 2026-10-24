---
id: P-016
title: Upgrade path off the vendored Python
goal:
items: CHORE-009
touches: packages/crew/**, plugins/crew/skills/git-setup/**, plugins/crew/skills/guidelines/**, plugins/crew/skills/design/scripts/**, plugins/crew/skills/research/scripts/**, plugins/crew/skills/global-setup/scripts/**, plugins/crew/skills/hub/dist/**, .crew/bin/crew.mjs, .claude/launch.json
depends_on:
status: in-progress
branch: plan/P-016-upgrade-path-off-the-vendored-python
pr:
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
- [ ] T1: `src/tools/legacy.ts` with tests for rewrite, references and cleanup on fixture files → verify: `cd packages/crew && npx vitest run test/tools/legacy.test.ts`
- [ ] T2: `setup_git` and `compose_rules` call it; a pre-port project fixture covers AC1–AC4 → verify: `npx vitest run test/tools/upgrade.test.ts`
- [ ] T3: hub `check` hints with a vitest case → verify: `npx vitest run test/upgrade-hints.test.ts`
- [ ] T4: guidelines SKILL Refresh step; launch.json on vite → verify: start the preview config and fetch `/habitly.html`
- [ ] T5: build and the full suites → verify: `npm run typecheck && npm test && npm run build && git status --porcelain` is empty; `cd tests/crew && env -u CREW_ROLE -u CREW_RUN uvx --with pyyaml pytest -q`

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

## Progress log

- 2026-10-24: status draft → ready
- 2026-10-24: assigned to the developer role
- 2026-10-24: status ready → in-progress — branch plan/P-016-upgrade-path-off-the-vendored-python

## Outcome
