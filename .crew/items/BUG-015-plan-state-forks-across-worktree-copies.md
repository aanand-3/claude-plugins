---
id: BUG-015
type: bug
title: Plan state forks across worktree copies of .crew
status: duplicate
severity:
priority:
goal: G-001
plan:
created: 2026-10-24
closed: 2026-10-24
---

# BUG-015: Plan state forks across worktree copies of .crew

## Summary
With plan_worktrees, P-020/P-021/P-022 plan files exist only in their worktrees' .crew/plans; main's .crew/plans ends at P-019. Two worktrees (P-020-… and suspicious-gates-764ced) each hold a P-020 file, one in-review and one in-progress. Q-d4e060 exists because of this split. Plan state should have one home (the main checkout) and worktrees should carry code only.

## Environment

## Steps to reproduce
1.

## Expected

## Actual

## Evidence

## Impact

## Notes
- 2026-10-24: status new → duplicate — Recaptured as BUG-018 with steps, expected and actual filled
