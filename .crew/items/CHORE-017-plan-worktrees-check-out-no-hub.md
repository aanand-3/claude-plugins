---
id: CHORE-017
type: chore
title: Plan worktrees check out no hub documents
status: triaged
priority: P2
goal: G-007
plan: P-038
created: 2026-10-25
closed:
---

# CHORE-017: Plan worktrees check out no hub documents

## Summary
A plan worktree still holds main's committed .crew documents as of its cut (read-only, stale since P-026). An agent that reads them instead of using crew.mjs sees old state. Use sparse-checkout to leave .crew/{plans,items,goals,knowledge,idea.md} out of plan worktrees.

## Done when
- [ ]

## Notes
- 2026-10-25: status new → triaged — priority P2
