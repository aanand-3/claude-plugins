---
id: FEAT-063
type: feat
title: Expedite and steering from anywhere
status: triaged
priority: P1
goal: G-009
plan:
created: 2026-10-26
closed:
---

# FEAT-063: Expedite and steering from anywhere

## Summary
Let the human make work urgent and steer the team from any view (CLI, a chat session or the hub ui) without launching agents themselves. Source: draft step 5 (the ask-closing part is BUG-044 on G-007).

- `expedite <ref>` (executive, or a caller with no role): in `dispatch()` expedited entries move to just after rows 1-2, after hold and duplicate filtering and before the `max_agents` cut. It overrides the off-focus filter and the spec `room()` limit, never dependencies, holds or gates. At most `max(1, max_agents-1)` expedited entries per round and at most 3 open at once. The flag follows an item to its plan and clears when the ref is done or dropped.
- The reply gives the next step and its role, or the current wait reason (reuse `staffing().waiting`, e.g. "3/3 slots held by P-051, P-055, P-058").
- ui: `ask`, `expedite`, `pause` and `resume` actions in `server.ts` ACTIONS and views, plus a runner panel with its state, last stop reason and the start command.
- Notifications: new kinds `answered` (for the human's asks) and `expedited-started`/`done`; the runner's pass report lists the entries it dispatched.
Touches `dispatch.ts`, a new `expedite` command, `server.ts`, ui views. Depends on the runner lock and idle mode (FEAT-059).

## User story
As the human, I want to say "start P-060 now" from any session or the ui, so that urgent work takes the next round and next free slot without me launching agents.

## Acceptance criteria
- [ ] `expedite <ref>` moves the ref's entry to the front of `dispatch --json` within the caps; a blocked ref returns its wait reason.
- [ ] Expedite never overrides dependencies, holds or gates, and never exceeds `max_agents`.
- [ ] The ui POSTs for ask, expedite, pause and resume work with the token, and the runner panel shows state and the start command.
- [ ] `answered` and `expedited-started`/`done` notifications fire; the pass report lists dispatched entries.

## Notes
Goal G-009. Source draft: .crew/drafts/yes-pm-logs-them-recursive-sparkle.md step 5 ("Plan B").
- 2026-10-26: goal hint G-009 (by Arpit Anand)
- 2026-10-26: status new → triaged — priority P1
- 2026-10-26: re-triaged: priority P1
