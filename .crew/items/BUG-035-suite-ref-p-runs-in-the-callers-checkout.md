---
id: BUG-035
type: bug
title: suite --ref P-### runs in the caller's checkout, not the plan's worktree
status: new
severity:
priority:
goal: G-007
plan:
created: 2026-10-26
closed:
---

# BUG-035: suite --ref P-### runs in the caller's checkout, not the plan's worktree

## Summary
2026-10-26 suites.jsonl: P-049's only full suite (21:12Z, exit 0) and P-050's first (21:30Z) ran with worktree = the main checkout, so they tested main, not the plan; Release merged P-049 on that run (b249d20). Its code was later covered by P-034's (21:23Z) and P-050's (21:37Z) green suites run in their worktrees after merging main. suite --ref should run in the plan's worktree (or refuse elsewhere), and the merge gate should only accept a suite whose worktree and sha match the plan branch.

## Environment

## Steps to reproduce
1.

## Expected

## Actual

## Evidence

## Impact

## Notes
