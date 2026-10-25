---
id: BUG-026
type: bug
title: context and status show a plan's stale branch copy over the main checkout's document
status: triaged
severity: S2
priority: P1
goal: G-007
plan:
created: 2026-10-25
closed:
---

# BUG-026: context and status show a plan's stale branch copy over the main checkout's document

## Summary
`crew.mjs context`, `resume` and `status` show a plan from the copy committed on its `plan/*` branch instead of the main checkout's document whenever the plan is open. Every plan branch is cut from main, so it carries main's plan file as of the cut, and that stale copy wins. Sparse worktrees (P-038) don't change this: git still tracks the hub paths on the branch.

## Environment
This repo, main at dd59086, vendored `.crew/bin/crew.mjs` (9faaefb); source `packages/crew/src/hub/core/store.ts` `plans(includeBranches)` / `branchPlans()`.

## Steps to reproduce
1. From the main checkout: `node .crew/bin/crew.mjs context P-038`.
2. Compare with `git show main:.crew/plans/P-038-plan-worktrees-check-out-no-hub.md` and `git show plan/P-038-plan-worktrees-check-out-no-hub:.crew/plans/P-038-plan-worktrees-check-out-no-hub.md`.

## Expected
`context` shows main's document: status `in-review`, AC6 as amended for Q-5e93cb (two assertion edits allowed), tasks 3/3.

## Actual
The header reads `[ready]` and the criteria show the pre-amendment AC6 ("pass unchanged"). The tasks read 0/3. `status` lists P-038 as `ready (live on plan/P-038-…)`. Both match the branch copy (status: ready), not main (status: in-review). `store.plans(true)` replaces main's doc with the branch copy unless main's status is closed (store.ts:198-201).

## Evidence
QA on P-038 asked Q-ca72af because `context` showed the stale AC6. The Director confirmed AC6 had already been amended (9be1ac9).

## Impact
Every agent that follows the documented loop (`context` / `resume`) reads stale specs, statuses and task progress for every open plan with a branch. That leads to wrong questions, wrong evidence targets, and possibly wrong decisions. Workaround: read `.crew/plans/P-###.md` in the main checkout directly.

## Notes
The branch override looks like a migration path for plans specced before hub state had one home (P-026). Possibly it should apply only when main has no doc for the plan.
- 2026-10-25: status new → triaged — priority P1, severity S2
- 2026-10-25: Triaged S2/P1 under G-007; fixed by P-039 (drop plans(true)). Asked the Architect to add it to P-039's items.
