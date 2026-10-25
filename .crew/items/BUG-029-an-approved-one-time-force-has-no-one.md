---
id: BUG-029
type: bug
title: An approved one-time --force has no one who can run it
status: triaged
severity: S3
priority: P2
goal: G-007
plan:
created: 2026-10-25
closed:
---

# BUG-029: An approved one-time --force has no one who can run it

## Summary
2026-10-25, P-030 (Q-81948c): the executive approved one forced done -> in-progress move. Claude Code's auto-mode permission check refused it to the developer subagent as a CI bypass, and from the executive's terminal the hub refused it because P-030 is assigned to the developer role and the run has no role; the executive had to use --as developer. Until P-032 sends a failed release back to its developer, a reopen after a failed release suite needs either a hub path that the executive's approval unlocks (e.g. answer Q-… lets the assigned role's move through without --force) or the release failure handled without a forced move.

## Environment

## Steps to reproduce
1. A plan assigned to the developer role (P-030 on 2026-10-25) needs a move the lifecycle allows only with --force (done -> in-progress, to reopen it after a failed release suite); the executive approves one forced move (Q-81948c).
2. The developer subagent runs the forced move.
3. The executive runs the same move from a terminal with no crew role.

## Expected
An executive-approved one-time force has a path someone can run: e.g. answering the approval question (answer Q-…) lets the assigned role's move through without --force, or the release failure is handled without a forced move.

## Actual
Step 2: Claude Code's auto-mode permission check refuses the forced move to the developer subagent as a CI bypass. Step 3: the hub refuses it because the plan is assigned to the developer role and the run has no role. The executive had to pass the developer role explicitly to get it through.

## Evidence

## Impact

## Notes
- 2026-10-25: Architect: superseded by P-032, not added to it. The case this bug records (reopen after a failed release suite, which needed an executive-approved forced done -> in-progress) disappears with P-032: a failed land or suite moves accepted -> in-progress through the plan.landed role gate, with no force and no human approval. The general mechanism (answer Q-... unlocking the assigned role's forced move) is not needed by any known flow after P-032, and P-032 is at the 10-task limit. PM: close BUG-029 as superseded once P-032 is done; if another executive-approved one-time force turns up, open a new item for that case.
- 2026-10-25: status new → triaged — priority P2, severity S3
