---
id: BUG-005
type: bug
title: merge-order lists squash-merged plans as unmerged
status: triaged
severity: S3
priority: P2
goal: G-003
plan: P-018
created: 2026-10-24
closed:
---

# BUG-005: merge-order lists squash-merged plans as unmerged

## Summary
isMerged uses git merge-base --is-ancestor, never true after a squash-merge: P-001, P-014, P-015, P-016 still show under merge

## Environment
This repo, main at ae9c4c6; PRs merged with GitHub's squash-merge.

## Steps to reproduce
1. `node .crew/bin/crew.mjs merge-order` on main.

## Expected
P-001, P-014, P-015, P-016 (squash-merged as #5–#8) listed as `merged: … — delete the branch`; nothing to merge.

## Actual
All four listed under merge (`1. P-001 … merge plan/P-001-… into main`): Release would try to merge them again.

## Evidence

## Impact

## Notes
- 2026-10-24: status new → triaged — priority P2, severity S3
