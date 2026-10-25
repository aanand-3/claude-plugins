---
id: CHORE-014
type: chore
title: Plan-worktree follow-ups from P-018's review
status: triaged
priority: P1
goal: G-007
plan: P-028
created: 2026-10-24
closed:
---

# CHORE-014: Plan-worktree follow-ups from P-018's review

## Summary
Non-blocking from P-018's architect review: (1) guard: git -c 'alias.x=!crew.mjs …' runs the hub with no identity — add ! to RUNNER; (2) review gate refuses done from inside a plan worktree (uncommitted code counts as changed since the approval) — compare a fingerprint of the worktree diff instead; (3) a retitled ID across worktrees is still decided by worktree order; (4) lostPlans can hint wrongly for an origin-only plan branch; (5) one fail() in autoWorktrees aborts the remaining plans, and auto checkpoints record the main session's run; (6) squash detection misses a squash where main also changed the file, and compares only a renamed file's new path. Also: P-017 must port the two assign lines added to test_plan_worktrees_are_seen_and_edited_from_main.

## Done when
- [ ]

## Notes
- 2026-10-25: P-026 hit this: from inside its plan worktree, move P-026 done was refused even after a fresh Architect approval, because the plan branch had uncommitted non-.crew changes (review.ts reviewProblems). Completed from the main checkout instead.
- 2026-10-25: status new → triaged — priority P1
- 2026-10-25: Architect: placed in P-028 — item 2 (review gate), item 5 (auto checkpoints survive a failing worktree; the main-session run on auto checkpoints is harmless, since implementers come from claims and moves), item 6 (squash detection via merge-tree). Item 1 split to CHORE-020 (guard.ts). Item 3 obsolete since P-026 (one home). Item 4 (lostPlans on origin-only branches) is in P-039's scope (AC4).
