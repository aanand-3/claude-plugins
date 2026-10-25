---
id: BUG-018
type: bug
title: Plan state forks across worktree copies of .crew
status: triaged
severity: S2
priority: P1
goal: G-001
plan: P-026
created: 2026-10-24
closed:
---

# BUG-018: Plan state forks across worktree copies of .crew

## Summary
With plan_worktrees, plan files created or moved after a plan's worktree exists live only in that worktree's .crew/plans, so plan state forks: main's .crew/plans ends at P-019 while P-020, P-021 and P-022 exist only in worktrees, and two worktrees each hold a P-020 file with different statuses. Plan state should have one home (the main checkout); worktrees should carry code only. Replaces BUG-015 (same report, sections completed).

## Environment
main at 152650b with plan_worktrees on; worktrees under .claude/worktrees/ (P-020-jira-style-document-page-spend-by-plan at 3baae03, suspicious-gates-764ced at 9e1e2e3, P-021-…, P-022-…).

## Steps to reproduce
1. `ls .crew/plans` in the main checkout: the last plan is P-019.
2. `grep -H '^status:' .claude/worktrees/*/.crew/plans/P-02*.md`.

## Expected
One P-020 file, in the main checkout's .crew/plans, with one status; P-021 and P-022 visible there too.

## Actual
P-020 is in-review in .claude/worktrees/P-020-…/.crew/plans and in-progress in .claude/worktrees/suspicious-gates-764ced/.crew/plans; P-021 (ready) and P-022 (ready) exist only in their own worktrees; none are in main.

## Evidence
The grep in step 2 (2026-10-24): P-020 in-review (P-020 worktree), P-020 in-progress (suspicious-gates-764ced), P-021 ready, P-022 ready. Open question Q-d4e060 arose from this split.

## Impact
Every role reading the hub from a different checkout sees a different plan state; status moves can be lost at merge and plan IDs can be reused (a new plan created in main would take the next number after P-019). No safe workaround beyond running all hub writes from one checkout.

## Notes
Severity S2: core shared-context guarantee of G-001 broken, no workaround.
- 2026-10-24: status new → triaged — priority P1, severity S2
