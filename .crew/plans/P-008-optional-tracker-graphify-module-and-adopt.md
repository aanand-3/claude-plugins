---
id: P-008
title: Optional tracker, graphify module and adopt
goal: 
items: 
touches:
depends_on:
status: done
branch:
pr: https://github.com/aanand-3/claude-plugins/pull/2
created: 2026-10-21
started:
completed: 2026-10-21
---

# P-008: Optional tracker, graphify module and adopt

## Context
- **Tracker is always on.** Kickoff installs it unconditionally, and its assumptions are baked into the CLAUDE.md template, settings.json, the pre-commit main guard, commit-msg, the PR template and CI. Users should be asked first. When it's off, **nothing tracker-related** should be generated.
- **Graphify.** graphify (pip package `graphifyy`, CLI `graphify`, Claude skill installed via `graphify install`) builds a code knowledge graph that cuts token use when navigating a codebase. It isn't a Claude plugin, so `plugin.json` can't declare it. "Dependency" therefore means: project-kit checks for it, offers to install it, and wires it into the project as an opt-in module.
- **Existing projects.** Kickoff only handles greenfield. Existing repos need an adopt flow: infer instead of interviewing, merge instead of overwriting, and work on a branch instead of main.

Decisions (from the user): tracker off → main still protected, any branch name; new `adopt` skill; `graphify-out/` gitignored; work on a new branch `feat/optional-modules-adopt` cut **after** the user commits the TS-tracker work on `feat/tracker-ts-core`.

## Design

### 1. Module switches in config
`discover/templates/config.yaml` gets:
```yaml
modules:
  tracker: true     # repo-local planning in .project/ (plans, sprints, backlog)
  graphify: false   # code knowledge graph (graphify-out/, gitignored)
```
`git.branch_pattern` is `plan/P-###-<slug>` with the tracker and `feat|fix|chore/<slug>` without it. Every skill reads `modules:`, and a missing key means `tracker: true, graphify: false`, so existing projects are unchanged.

### 2. Conditional blocks in templates (tracker off ⇒ nothing tracker-related)
- **Marker syntax:** a mustache-lite `{{#tracker}}…{{/tracker}}` / `{{^tracker}}…{{/tracker}}`. It's resolved by a ~10-line `render_blocks(text, flags)` helper, duplicated in `setup_git.py` and `compose_rules.py`, since each script is self-contained today.
- **`git-setup/assets/githooks/pre-commit`:**
  - tracker on: current behaviour;
  - tracker off: on main, block any commit after the first one, with the hint `git switch -c feat/<slug>`. No `.project/`-only exception, no plan-branch naming warning.
  - The secrets and structure checks are unchanged.
- **`githooks/commit-msg`:** examples become `feat(P-012)…` / `chore(tracker)…` only with the tracker, and `feat(auth): …` without it.
- **`pull_request_template.md`:** the Plan/Items/Epic/Sprint line, "plan file updated" and the `tracker.mjs new-item` follow-up hint are tracker-only.
- **`setup_git.py`:**
  - reads `modules.tracker` from config, with a `--no-tracker` override;
  - renders the blocks when copying;
  - **for existing repos:** if `core.hooksPath` is already set to something else (Husky etc.) or `.git/hooks` has real hooks, don't touch them. Print what it found and require `--take-over-hooks`.
- **`guidelines/templates/CLAUDE.project.md`:** "How we work" gets tracker and no-tracker variants. Without the tracker: branch per change, PR to main, and no plan/`tracker.mjs` lines.
- **`guidelines/templates/settings.json`:** the guidelines skill (step 5) drops `plansDirectory`, the `tracker.mjs` allow rule and the tracker part of SessionStart when the tracker is off. These are explicit instructions in the SKILL.md.
- **`compose_rules.py`:** renders blocks in the tooling it copies. That covers the `ci.yml` "Tracker consistency" step, the Makefile if it references the tracker, and `guidelines/tooling/README.md`.
- **Graphify block:** `{{#graphify}}` in the CLAUDE.md template adds one line pointing to the graph. The full `## graphify` section comes from `graphify claude install`.

### 3. New skill `skills/graph/SKILL.md` (`/project-kit:graph`)
Small SKILL.md only, no script. It's usable standalone and is called by kickoff and adopt.
1. **Check:** `graphify --version`. If missing, ask, then install with `uv tool install graphifyy`, falling back to `pipx install graphifyy`. Then run `graphify install` (Claude skill). Never install without a yes.
2. **Project wiring:**
   - add `graphify-out/` to `.gitignore` (also add a `graphify.gitignore` part to the git-setup assets, picked when `modules.graphify` is on);
   - `graphify hook install` → lands in `.githooks/post-commit`, since graphify honours an in-repo `core.hooksPath`;
   - `graphify claude install`;
   - set `modules.graphify: true`.
3. **Build:**
   - existing code: run `/graphify .` and summarise `GRAPH_REPORT.md`;
   - greenfield: skip the build and tell the user it builds after the first code (P-001).
4. **Remove:** `graphify hook uninstall`, `graphify claude uninstall`, and set the flag to false.

### 4. Kickoff changes (`skills/kickoff/SKILL.md`)
- **Preflight:**
  - if the directory has existing code, stop and route to `/project-kit:adopt`;
  - ask one AskUserQuestion, multiSelect "Optional modules": *Tracker (Recommended)* and *Code graph (graphify)*. Pass the answers to discover so they're written to `modules:`.
- **Progress file:** add a `graph` step.
- **Steps:**
  - Tracker (4) and Project plan & Sprint 1 (6) become `skipped` when the tracker is off;
  - new step after git: Graph, following the `graph` skill (wiring only);
  - P-001's scope gains "build the code graph" when graphify is on.
- **Wrap-up:** next actions without the tracker are "create a branch, open a PR". Drop the P-001/BACKLOG lines.

### 5. New skill `skills/adopt/SKILL.md` (`/project-kit:adopt`)
Sequences the existing skills in "adopt" mode, tracked in `.project/adopt.yaml` for resume.
0. **Preflight:**
   - must be a git repo with a clean tree;
   - create branch `chore/project-kit-adopt` (never work on main);
   - inventory what exists: CLAUDE.md, `.claude/`, `.project/`, hooks/Husky/pre-commit, CI, README;
   - ask the modules question (same as kickoff).
1. **Map:**
   - if graphify is on, run the `graph` skill first (build) and use `GRAPH_REPORT.md` and its communities as the main input;
   - always read manifests (package.json, pyproject, go.mod, Dockerfile/compose, migrations, CI) and the top-level tree.
2. **Discover (inferred):**
   - fill `config.yaml` from the evidence and show a decision table marking *detected* vs *assumed*;
   - ask only about gaps, in at most one round plus confirmation;
   - `architecture.md` describes the **as-is** layout, and `structure:` mirrors the real top-level dirs with `structure_check: warn` (only new or changed files are checked, so legacy files over `module_max_lines` don't block);
   - write ADR 0001, plus one ADR "Adopt project-kit" recording the inferred stack;
   - brief from the README, with gaps marked TODO for the user.
3. **Design:** only for UI projects, and only if the user wants it. Offer `design review` of the existing UI rather than `init`.
4. **Guidelines:** `compose_rules.py --dry-run` first, then merge into the existing CLAUDE.md, settings and README, showing diffs (the skill already supports merge).
5. **Tracker (if on):**
   - run `tracker.mjs init`;
   - offer, don't force: a light project plan and RAID, an M-01 for the current release, and importing open TODO/FIXME clusters (or GitHub issues if `gh` is available) as `new-item … --why` items for triage;
   - no Sprint 1 unless asked.
6. **Git:**
   - `setup_git.py` (respecting existing hooks, see §2);
   - commit `chore: adopt project-kit` on the adopt branch;
   - offer a PR, never commit to main.
7. **Graph wiring** (hook and CLAUDE section) if not already done in step 1.
8. **Wrap-up:** files added or merged, detected stack, enabled modules, next actions.

### 6. Docs and metadata
- `README.md`: skill table (+graph, +adopt), an "Existing projects" section, and the optional modules.
- `plugin.json`: version 0.7.0 → 0.8.0 and description/keywords (graphify, adopt).
- `.claude-plugin/marketplace.json` description.
- `discover/SKILL.md`: write `modules:`, and support an "inferred" mode that adopt invokes.

## Critical files
- `plugins/project-kit/skills/kickoff/SKILL.md`, `discover/SKILL.md`, `discover/templates/config.yaml`
- New: `plugins/project-kit/skills/adopt/SKILL.md`, `plugins/project-kit/skills/graph/SKILL.md`
- `plugins/project-kit/skills/git-setup/scripts/setup_git.py`, `assets/githooks/{pre-commit,commit-msg}`, `assets/pull_request_template.md`, new `assets/gitignore/graphify.gitignore`
- `plugins/project-kit/skills/guidelines/SKILL.md`, `scripts/compose_rules.py`, `templates/CLAUDE.project.md`, `tooling/ci/ci.yml`
- `README.md`, `plugins/project-kit/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
- Tests: `tests/project-kit/test_git_setup.py`, `test_guidelines.py`, `test_plugin_contents.py`

## Verification
1. **Tests first** (pytest in `tests/project-kit/`):
   - `setup_git.py` with `modules.tracker: false`:
     - no `tracker` / `P-###` / `.project/plans` strings in `.githooks/*` or the PR template;
     - a second commit on main is blocked, and a commit on `feat/x` passes;
   - with the tracker on, existing behaviour is unchanged;
   - an existing `core.hooksPath=.husky` is left alone without `--take-over-hooks`;
   - `graphify-out/` is in `.gitignore` when graphify is on;
   - `compose_rules.py` with the tracker off → the copied `ci.yml` has no tracker step;
   - `test_plugin_contents`: adopt and graph have name/description;
   - no unresolved `{{#` markers remain in any rendered output.
2. Run `python -m pytest tests/project-kit -q`; all pass.
3. **Manual end to end:**
   - install the plugin from the local clone;
   - run `/project-kit:kickoff` in an empty temp dir with the tracker off and graphify on: confirm no `.project/bin/tracker.mjs`, and that CLAUDE.md, settings and hooks contain nothing tracker-related;
   - run `/project-kit:adopt` on a small existing repo (e.g. a clone of a toy FastAPI app): confirm it works on `chore/project-kit-adopt`, merges CLAUDE.md, builds the graph, and that the inferred config looks right.
4. Confirm `.githooks/post-commit` from `graphify hook install` doesn't fail commits on a machine without graphify. If it does, the graph skill documents the guard or wraps it.

## Progress log
- 2026-10-24: imported from plan mode (`~/.claude/plans/we-have-graphify-which-fluttering-glacier.md`); it predates the hub tracking plans, status done from git history

## Outcome
Shipped in `8b5820d` (https://github.com/aanand-3/claude-plugins/pull/2, 2026-10-21). Since reversed: the design studio (`b6665ea`) made the hub mandatory, and P-001 makes graphify always on, so nothing stays optional.

Learnings: none
