---
id: K-2026-10-25-a-plan-worktree-cut-before-its-depends
type: gotcha
title: A plan worktree cut before its depends_on plan merged reads that plan as unfinished, so start refuses; fast-forward the plan branch to main (git merge --ff-only main) before start and before rebuilding bundles
scope: .claude/worktrees/**, plugins/crew/skills/hub/dist/**
source: P-022
supersedes:
tier: project
created: 2026-10-25
---

# A plan worktree cut before its depends_on plan merged reads that plan as unfinished, so start refuses; fast-forward the plan branch to main (git merge --ff-only main) before start and before rebuilding bundles

P-022's worktree sat at 152650b (pre-P-020); start said P-020 unfinished though main has it done, and a rebuild there would have reverted P-020 in dist
