---
id: K-2026-10-25-with-plan-worktrees-every-non-auto
type: gotcha
title: With plan_worktrees, every non-auto checkpoint of a plan commits the code still uncommitted in its worktree, whoever runs it (QA's --run checkpoints too); only --auto never commits
scope: packages/crew/src/hub/commands/work/execution.ts
source: 
supersedes:
tier: project
created: 2026-10-25
---

# With plan_worktrees, every non-auto checkpoint of a plan commits the code still uncommitted in its worktree, whoever runs it (QA's --run checkpoints too); only --auto never commits

P-028: commitWork runs in checkpoint for any role, so a QA check run while the developer's edits are uncommitted lands them on the plan branch under QA's checkpoint subject
