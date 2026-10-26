---
id: BUG-037
type: bug
title: triage can't unlink an item from its goal
status: new
severity: S3
priority: P2
goal: G-007
plan:
created: 2026-10-26
closed:
---

# BUG-037: triage can't unlink an item from its goal

## Summary
Grooming G-001 needed SPIKE-001 and FEAT-047 moved off the goal: 'triage --goal none' refuses (Goal NONE does not exist) and '--goal ""' reports updated but changes nothing, since backlog.ts only sets a non-empty goal. Both stay linked to G-001.

## Environment
crew hub at main, any project. `triage` in `packages/crew/src/hub/commands/work/backlog.ts`; `Store.checkRef` in `packages/crew/src/hub/core/store.ts`.

## Steps to reproduce
1. In a project with goal G-001, create an item linked to it: `new-item feat "x" --goal G-001` (or let `breakdownToItems` link it from G-001's Breakdown). Triage it.
2. Run `triage FEAT-### --goal none`.
3. Run `triage FEAT-### --goal ""`.
4. Read the item's front matter (`goal:`).

## Expected
There is a way to unlink an item from its goal at triage (for example `--goal none`), which clears `goal:` and logs the change in Notes. Re-linking it to another goal works as today (`--goal G-002`).

## Actual
- Step 2 fails with `Goal NONE does not exist.`. `checkRef` upper-cases the value and requires an existing goal ID.
- Step 3 prints `FEAT-###: updated` (re-triaged) but changes nothing. `checkRef` returns `""` for an empty value, and triage applies an update only when its value is non-empty (`for (const [key, value] of updates) if (value) item.set(key, value)`, backlog.ts line 70).
- The item stays linked to G-001.

## Evidence
- backlog.ts line 69: `["goal", store.checkRef(o.goal, "goal")]`; line 70 skips empty values.
- store.ts lines 282–288 (`checkRef`): returns `""` for no value, otherwise fails unless the value is an existing goal ID.
- Seen while grooming G-001: SPIKE-001 and FEAT-047 could not be moved off the goal (Summary).
- No other command sets an item's or plan's `goal` (`git grep 'set("goal"'` finds only triage and `breakdownToItems`'s link-if-unset).

## Impact
- Grooming can't take items off a goal. They keep counting toward its open work, which affects the goal's progress, whether the goal can close (the PM's goal-closure rule) and the focus ordering. The only workaround is editing the item's front matter by hand.
- A plan's goal can't be changed after `new-plan` either. `new-plan` sets it once (planning.ts), and no command edits it, so a plan filed under the wrong goal stays there.
- Suggested severity S3: it gets in the way of grooming and goal closure, has a manual workaround, and loses no data.

## Notes
