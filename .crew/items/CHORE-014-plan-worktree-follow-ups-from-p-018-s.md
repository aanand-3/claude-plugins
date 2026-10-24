---
id: CHORE-014
type: chore
title: Plan-worktree follow-ups from P-018's review
status: new
priority:
goal: G-003
plan:
created: 2026-10-24
closed:
---

# CHORE-014: Plan-worktree follow-ups from P-018's review

## Summary
Non-blocking from P-018's architect review: (1) guard: git -c 'alias.x=!crew.mjs …' runs the hub with no identity — add ! to RUNNER; (2) review gate refuses done from inside a plan worktree (uncommitted code counts as changed since the approval) — compare a fingerprint of the worktree diff instead; (3) a retitled ID across worktrees is still decided by worktree order; (4) lostPlans can hint wrongly for an origin-only plan branch; (5) one fail() in autoWorktrees aborts the remaining plans, and auto checkpoints record the main session's run; (6) squash detection misses a squash where main also changed the file, and compares only a renamed file's new path. Also: P-017 must port the two assign lines added to test_plan_worktrees_are_seen_and_edited_from_main.

## Done when
- [ ]

## Notes
