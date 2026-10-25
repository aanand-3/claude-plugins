---
id: K-2026-10-25-a-plan-task-that-says-to-git-stash
type: gotcha
title: A plan task that says to git stash a source file to test against the base has nothing to stash once a checkpoint committed it; write the base version from git show BASE:path into the plan worktree instead, then restore it from git show HEAD:path
scope: packages/crew/**
source: P-042
supersedes:
tier: project
created: 2026-10-25
---

# A plan task that says to git stash a source file to test against the base has nothing to stash once a checkpoint committed it; write the base version from git show BASE:path into the plan worktree instead, then restore it from git show HEAD:path

checkpoints commit the developer's code on the plan branch, so the working tree is clean after each task (P-042 T4)
