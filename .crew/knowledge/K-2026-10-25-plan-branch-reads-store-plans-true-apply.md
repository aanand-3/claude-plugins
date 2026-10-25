---
id: K-2026-10-25-plan-branch-reads-store-plans-true-apply
type: decision
title: Plan-branch reads (Store.plans(true)) apply only in branch-per-plan mode (hub.plan_worktrees false); with plan worktrees the main checkout is the only copy read
scope: packages/crew/src/hub/core/store.ts
source: 
supersedes: K-2026-10-25-no-keep-branch-reads-when-hub-plan
tier: project
created: 2026-10-25
---

# Plan-branch reads (Store.plans(true)) apply only in branch-per-plan mode (hub.plan_worktrees false); with plan worktrees the main checkout is the only copy read

Without worktrees start switches the checkout to the plan branch and the plan's status, ticks and log are committed there, so main sees progress only through the branch copy; with worktrees every hub write is committed on the base and a branch copy is always stale (BUG-026). Q-16112d, P-039.
