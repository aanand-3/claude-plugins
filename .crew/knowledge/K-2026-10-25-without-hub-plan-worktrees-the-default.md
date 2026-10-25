---
id: K-2026-10-25-without-hub-plan-worktrees-the-default
type: gotcha
title: Without hub.plan_worktrees (the default), a started plan's state lives on its plan/* branch: Store.plans(true) must keep reading branch copies in that mode
scope: packages/crew/src/hub/core/store.ts
source: P-039
supersedes:
tier: project
created: 2026-10-25
---

# Without hub.plan_worktrees (the default), a started plan's state lives on its plan/* branch: Store.plans(true) must keep reading branch copies in that mode

P-039 first dropped branch reads everywhere and broke context.test and view.test (Q-16112d)
