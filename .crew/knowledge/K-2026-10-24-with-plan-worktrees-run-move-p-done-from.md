---
id: K-2026-10-24-with-plan-worktrees-run-move-p-done-from
type: gotcha
title: With plan_worktrees, run `move P-### done` from the main checkout, not from the plan's worktree
scope: packages/crew/src/hub/commands/work/review.ts, plugins/crew/skills/hub/agents/release.md
source: P-018
supersedes:
tier: project
created: 2026-10-24
---

# With plan_worktrees, run `move P-### done` from the main checkout, not from the plan's worktree

From inside the worktree the review gate sees the plan's uncommitted code as changed since the approving review and refuses done; nothing is committed until Release, so it always would (P-018)
