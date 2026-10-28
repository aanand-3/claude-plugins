---
id: K-2026-10-28-land-refreshes-crew-bin-through
type: decision
title: land refreshes .crew/bin through an internal copy function in release.ts (no role or plan-branch check), called by land-steps rebuild for both the plan worktree and the batch candidate; the refresh-bin command keeps its role and plan-worktree checks and calls the same function after them
scope: packages/crew/src/hub/commands/work/release.ts, packages/crew/src/hub/commands/work/land-steps.ts
source: 
supersedes:
tier: project
created: 2026-10-28
---

# land refreshes .crew/bin through an internal copy function in release.ts (no role or plan-branch check), called by land-steps rebuild for both the plan worktree and the batch candidate; the refresh-bin command keeps its role and plan-worktree checks and calls the same function after them

BUG-059: the batch candidate is a detached HEAD, so the command's plan check refused it; land is already authorised by its plan.landed gate and picks the checkout itself, and loosening the command's check would let an agent's refresh-bin bypass it
