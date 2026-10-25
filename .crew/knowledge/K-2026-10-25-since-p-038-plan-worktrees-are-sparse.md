---
id: K-2026-10-25-since-p-038-plan-worktrees-are-sparse
type: gotcha
title: Since P-038, plan worktrees are sparse: .crew/plans, items, goals, knowledge and idea.md do not exist there, so tests or agents that read hub documents in a worktree path get ENOENT; read them from the main checkout or via crew.mjs --as developer --run-id developer:aac1317208fc9d5b5 context
scope: packages/crew/test/**, packages/crew/src/hub/commands/work/planning.ts
source: P-038
supersedes:
tier: project
created: 2026-10-25
---

# Since P-038, plan worktrees are sparse: .crew/plans, items, goals, knowledge and idea.md do not exist there, so tests or agents that read hub documents in a worktree path get ENOENT; read them from the main checkout or via crew.mjs --as developer --run-id developer:aac1317208fc9d5b5 context

two existing worktree tests read hub copies inside the plan worktree and broke
