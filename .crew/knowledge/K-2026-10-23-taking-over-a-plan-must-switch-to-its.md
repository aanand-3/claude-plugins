---
id: K-2026-10-23-taking-over-a-plan-must-switch-to-its
type: gotcha
title: Taking over a plan must switch to its existing branch, possibly still checked out in the gone run's worktree
scope: packages/crew/src/hub/commands/work/workflow.ts
source: 
supersedes:
tier: project
created: 2026-10-23
---

# Taking over a plan must switch to its existing branch, possibly still checked out in the gone run's worktree

After reassign, the next developer's start finds plan/P-… already exists (git switch -c fails) and, with isolation: worktree, still checked out in the previous agent's worktree. start detects the takeover (branch exists, no live claim, last status in-progress/blocked) and uses git switch --ignore-other-worktrees; uncommitted work in the old worktree is not carried over — agents must commit before handing off.
