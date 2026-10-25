---
id: SPIKE-005
type: spike
title: Hub commits on main in projects whose git hooks protect main
status: new
priority:
goal: G-007
plan:
created: 2026-10-25
closed:
---

# SPIKE-005: Hub commits on main in projects whose git hooks protect main

## Summary
Since P-026, with plan_worktrees every hub write commits on the base branch. Projects set up by git-setup have hooks that refuse commits on main, so every hub commit fails with 'written but not committed'. Bypassing hooks is not allowed: decide how hub-only commits pass (a hook allowance for chore(hub) commits touching only .crew documents, or another route).

## Question
How should `chore(hub)` commits that touch only `.crew/` documents land on the base branch (main) in projects whose git hooks refuse commits on main, without bypassing hooks (no `--no-verify`, no plumbing that skips them, no allow-everything environment variable set by the hub)?

## Timebox
Half a day (Director decision Q-72fd03).

## Output
A decision (`learn decision`, see Findings) and the work it adds to P-036 (doctor's hook probe; a clearer hub-commit failure message). No new item.

## Findings
Experiments in a scratch repo (git 2.39.5), 2026-10-25:
- **crew's own hooks already allow it.** `plugins/crew/skills/git-setup/assets/githooks/pre-commit` refuses main commits only when a staged path is outside `.crew/`; `commit-msg` accepts `chore(hub): …`. The hub's `git commit --only -- <paths>` (core/work/hubstate.ts `commitState`) passed on main while the user had an unrelated file staged: with `--only` git runs the hooks against a temporary index holding HEAD plus the named paths, so the hook sees only `.crew/` paths, and the user's staged file stayed staged and uncommitted.
- **What breaks** is a hook crew doesn't own that refuses every commit on main (project-kit's non-tracker git-setup variant, its tracker variant that allows only `.project/`, husky or pre-commit `no-commit-to-branch` setups). Reproduced with a strict hook: the hub commit fails and the documents stay written but uncommitted in the main checkout. Hub state isn't lost (every checkout reads it from the main checkout's files), but history, and anything reading hub state from git, is.
- **Detectable without committing.** `GIT_INDEX_FILE=<temp> git read-tree HEAD`, add an existing blob as `.crew/.doctor-probe` with `git update-index --add --cacheinfo`, then `GIT_INDEX_FILE=<temp> git hook run pre-commit` in the main checkout: exit 0 with crew's hook, 1 with the strict hook, 1 with crew's hook for a non-`.crew/` probe path (so the hook really reads the temp index). `git hook run commit-msg -- <file with "chore(hub): doctor probe">` checks the message. Nothing is committed and the real index and working tree are untouched. `git hook run` needs git >= 2.36; older git can run the hook file under `git rev-parse --git-path hooks` directly. It honours `core.hooksPath`.
- **Rejected routes:** `--no-verify`; plumbing (`commit-tree` + `update-ref`) to skip hooks; the hub setting `CREW_ALLOW_MAIN=1` (it allows any path, so it is a bypass); a separate hub branch committed with plumbing (still skips hooks, and splits the one home).
- **Answer:** hub commits stay ordinary commits through every hook. A project allows them with a path rule in its own hook: on the base branch, accept a commit whose staged paths are all under `.crew/` (crew's git-setup hook is the reference). Changing a project's hooks is the human's call; crew detects and explains (`doctor`), never edits them. A project that won't allow it turns `hub.plan_worktrees` off.
- **Work this adds:** P-036's `doctor` runs the probe above and prints the allowance; `commitState`'s failure message names the hook's first stderr line and points to `doctor`. Both folded into P-036. Project-kit's own hooks live in another plugin and are out of this repo.

## Notes
