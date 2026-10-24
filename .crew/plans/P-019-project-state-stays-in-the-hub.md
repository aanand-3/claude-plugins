---
id: P-019
title: Project state stays in the hub
goal: G-001
items: BUG-006, BUG-007
touches: CLAUDE.md, packages/crew/src/hub/**, packages/crew/test/**, plugins/crew/skills/hub/SKILL.md, plugins/crew/skills/hub/dist/**, plugins/crew/skills/guidelines/templates/CLAUDE.project.md, plugins/crew/skills/global-setup/assets/CLAUDE.global.md, .crew/bin/crew.mjs
depends_on: P-017
status: ready
branch: plan/P-019-project-state-stays-in-the-hub
pr:
created: 2026-10-24
started:
completed:
---

# P-019: Project state stays in the hub

## Context
Delivers BUG-006 and BUG-007 under G-001 (Shared context: the hub). BUG-007 (the guard matches relative paths as given, not resolved against the hook's `cwd`) is the same path resolution T3 needs, so it lands here. P-018's hand-over ended up only in a Claude side-session notes folder outside the repo, which breaks G-001's outcome ("nothing important lives only in chat"). Root cause, found while reviewing P-018:
- The repo has no CLAUDE.md. The only "the hub is your only memory" line is in `agents/director.md`, which reaches the Director agent alone. A main session that runs a plan with `--as ROLE` (as P-018 did) is told nothing.
- The app's side-session instructions tell a session to leave hand-over notes in that external folder. With no project rule, they win. Claude's memory folder and the scratchpad are sinks of the same kind.
- The guard covers subagents only, and has no rule for writes outside the repo. `check` can't see outside files.
- The rule ships nowhere either: the plugin's `CLAUDE.project.md` template and `CLAUDE.global.md` don't say it, and hub `init` writes no CLAUDE.md. Every crew project has the same gap.

## Scope
**In:**
- **One rule, one wording**, in a marked section (`<!-- crew:hub-state -->`): everything the next person or agent needs goes through `crew.mjs`:
  - where work stands → `handoff` and `log`;
  - findings and follow-ups → `new-item`;
  - what to know → `learn`;
  - questions → `ask`.

  Places outside the repo (side-session notes folders, the scratchpad, Claude's memory, `/tmp`) hold only pointers to hub IDs, never the facts. When other instructions say to leave notes elsewhere, write to the hub and leave a pointer there.
- **This repo:** a `CLAUDE.md` with that section (written by the new `init`), so every session here loads it: main, side and subagent sessions.
- **`init`:** writes the section into the project's `CLAUDE.md`. It creates the file, appends to an existing one, and leaves it unchanged when the marker is already there.
- **`check`:** hints when `CLAUDE.md` lacks the section (`init` adds it).
- **Guard:** refuses a crew subagent's `Write`/`Edit`/`MultiEdit`/`NotebookEdit`, and Bash write targets, outside the repository and its plan worktrees. The system temp directory stays allowed for throwaway files. The main session is left alone, as today.
- **Plugin docs:** the hub SKILL.md (next to "Who you are and the ledger"), the guidelines skill's `CLAUDE.project.md` (*How we work*) and global-setup's `CLAUDE.global.md` (*Defaults*) carry the same rule.
- Rebuild dist, re-vendor `.crew/bin/crew.mjs`.

**Out (explicitly not doing):**
- Anything that watches the main session's writes outside the repo: no hook can see them, so the CLAUDE.md rule is the only lever there.
- Changing the Claude app's side-session instructions (not ours).
- Re-rendering or rewording the agent templates: subagents load the project CLAUDE.md.

## Acceptance criteria
- [ ] This repo's `CLAUDE.md` holds the hub-state section, and `check` here gives no hint about it (git grep + `check`).
- [ ] `init` on a repo with no CLAUDE.md creates one with the section; on a CLAUDE.md without it, appends the section and keeps the existing text; a second `init` changes nothing (vitest).
- [ ] `check` hints when CLAUDE.md is missing or lacks the section, and stops once `init` has added it (vitest).
- [ ] The guard refuses a crew subagent's Write and Edit, and a Bash `>` redirect, to a path outside the repo. Examples: a side-session notes folder, `~/.claude/projects/*/memory/`. It allows paths in the repo, in a plan worktree and under the temp dir, and leaves the main session alone (vitest).
- [ ] The guard resolves a relative or symlinked path before matching `paths.protected` and the outside-repo rule: a protected hub file reached through a symlink or by a relative path from a subdirectory `cwd` is refused (vitest, BUG-007).
- [ ] The hub SKILL.md, `CLAUDE.project.md` and `CLAUDE.global.md` state the rule (git grep for `crew:hub-state` or its wording).

## Approach
- **Section text:** one constant in the hub (`HUB_STATE_RULE` with its marker). `init` and `check` use it, and the templates repeat the wording.
- **init** (`commands/work/planning.ts`): read `CLAUDE.md` at the repo root; if the marker is missing, append `\n<section>` (or write the file with just the section). Print what it did.
- **check** (`commands/views/checks.ts`, `hygiene`): a hint when the marker is missing.
- **Guard** (`commands/team/guard.ts`, the "every subagent" block): resolve each write path with `real()`. Refuse when it is neither under the main checkout's root (`git.worktrees()[0]`; plan worktrees live under it in `.claude/worktrees/`) nor under the real `os.tmpdir()`/`/tmp`. Relative paths resolve against the hook's `cwd`. Applies to crew and non-crew subagents alike, like `paths.protected`.
- Tests are vitest e2e, built on P-017's `test/hub/e2e` helpers once it merges (hence `depends_on: P-017`).

## Tasks
- [ ] T1: `HUB_STATE_RULE`; `init` writes it into CLAUDE.md → verify: `cd packages/crew && npx vitest run test/hub/e2e -t hub_state_init`
- [ ] T2: `check` hint → verify: `npx vitest run test/hub/e2e -t hub_state_check`
- [ ] T3: guard resolves paths against `cwd` (BUG-007) and refuses subagent writes outside the repo → verify: `npx vitest run test/hub/e2e -t "guard_outside_repo|guard_resolves_paths"`
- [ ] T4: hub SKILL.md, `CLAUDE.project.md`, `CLAUDE.global.md` → verify: AC6 grep
- [ ] T5: rebuild dist, re-vendor, run `init` here to write this repo's CLAUDE.md → verify: `node .crew/bin/crew.mjs check` shows no hub-state hint

## Test plan
**Targeted checks:**
- Regression test (BUG-006): vitest `-t guard_outside_repo` writes a crew subagent's hand-over to a side-session notes path and expects a deny (it passes through today), and `-t hub_state_check` expects the hint on a repo without the section (no hint today).
- AC1: `git grep -n "crew:hub-state" CLAUDE.md`; `node .crew/bin/crew.mjs check` has no hub-state hint.
- AC2: vitest `-t hub_state_init` (no file, existing file, run twice).
- AC3: vitest `-t hub_state_check`.
- AC4: vitest `-t guard_outside_repo` (side-session notes path, memory path, repo path, plan worktree path, temp path, main session).
- AC5 (BUG-007): vitest `-t guard_resolves_paths` (protected file via a symlink, via a relative path from a subdirectory `cwd`).
- AC6: `git grep -n "crew:hub-state\|pointers to hub IDs" -- plugins/crew/skills/hub/SKILL.md plugins/crew/skills/guidelines/templates/CLAUDE.project.md plugins/crew/skills/global-setup/assets/CLAUDE.global.md`.

**Full suite (before merge, and in CI):** `hub.full_suite` in `.crew/config.yaml`.

## Rollout & rollback
- Existing crew projects get the section when they next run `init`; `check` tells them.
- Users refresh `~/.claude/CLAUDE.md` with global-setup.
- Rollback: revert the commit. The CLAUDE.md section is plain text and can stay.

## Risks & open questions
- The guard could block a legitimate subagent write outside the repo, such as a tool cache in the home directory. Edits and redirects only; programs the agent runs are unaffected, and temp stays allowed.
- Wording drift between the constant and the three templates. The AC6 grep checks for the marker or the key phrase; keep them identical.

## Handoff

## Progress log

- 2026-10-24: status draft → ready

## Outcome
