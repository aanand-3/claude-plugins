---
id: BUG-014
type: bug
title: Review approval is pinned to HEAD, so uncommitted changes after it go unnoticed
status: new
severity:
priority:
goal: G-001
plan: P-028
created: 2026-10-24
closed:
---

# BUG-014: Review approval is pinned to HEAD, so uncommitted changes after it go unnoticed

## Summary
review --approve records the HEAD commit (P-019: 'approved (6239707)' in every round). With plan worktrees the plan's work stays uncommitted until Release, so HEAD never moves: an approval of round-2 code still looks current after round-3 changes, and the done gate can't tell. Seen in P-019, where the architect re-approved, so no harm. Possible fix: record a hash of the plan's working-tree diff with the approval and compare it at done.

## Environment

## Steps to reproduce
1.

## Expected

## Actual

## Evidence

## Impact

## Notes
