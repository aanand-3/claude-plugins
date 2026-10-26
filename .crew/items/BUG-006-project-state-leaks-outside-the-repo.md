---
id: BUG-006
type: bug
title: Project state leaks outside the repo (hand-over notes, memory, scratchpad)
status: done
severity: S2
priority: P1
goal: G-001
plan: P-019
created: 2026-10-24
closed: 2026-10-26
completed: 2026-10-26
---

# BUG-006: Project state leaks outside the repo (hand-over notes, memory, scratchpad)

## Summary
Project state leaks outside the repo. P-018's hand-over (findings, gotchas, a request to P-017) went to a Claude side-session notes folder in ~/Library/Application Support instead of the hub, so no teammate, agent or later session could see it.

## Environment
This repo on main at d73e417; Claude Code desktop, a side session started by another session; P-018 run from the main session with `--as ROLE`.

## Steps to reproduce
1. Start a side session from another session and give it a shared notes folder (the app does this).
2. Have it run a hub plan from the main session, playing the roles with `--as` and not through crew agents.
3. At the end it writes its hand-over to the notes folder, as the app's side-session instructions say.

## Expected
Hand-overs, findings and questions go through the hub (`handoff`, the plan's log, items, `learn`, `ask`). Places outside the repo hold only pointers to hub IDs.

## Actual
The hand-over existed only in the external notes file. Nothing in the project told the session otherwise:
- the repo has no CLAUDE.md;
- "the hub is your only memory" appears only in agents/director.md;
- the guard covers subagents only;
- `check` can't see files outside the repo.

## Evidence
/Users/aanand/Library/Application Support/Claude/side-session-notes/local_0c7635c0-1d14-4749-9a60-d21aa5bd6727/P-018-handover.md. Its facts were moved into K-2026-10-24-with-plan-worktrees-run-move-p-done-from, K-2026-10-24-release-runs-hub-full-suite-after-making, Q-6d92ae and CHORE-014.

## Impact
Breaks G-001's outcome ("nothing important lives only in chat"). Hits every crew project, since the plugin's init writes no such rule either.

## Notes
The executive found it while reviewing P-018's report (2026-10-24).
- 2026-10-24: status new → triaged — priority P1, severity S2
- 2026-10-26: DONE: fixed by P-019 (152650b). CLAUDE.md and templates/CLAUDE.project.md carry the 'Project state lives in the hub' block; guard.ts denies subagent writes outside the repository (guard.test.ts 'guard_outside_repo: subagents keep project state in the repository (BUG-006)'), tightened later by P-051 (paths.write). No remaining work.
- 2026-10-26: status triaged → done — DONE per Architect review: fixed by P-019 (152650b), tightened by P-051.
