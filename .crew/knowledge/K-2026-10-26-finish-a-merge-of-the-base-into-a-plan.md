---
id: K-2026-10-26-finish-a-merge-of-the-base-into-a-plan
type: gotcha
title: Finish a merge of the base into a plan branch (git merge --no-edit) before any crew checkpoint; a checkpoint run mid-merge fails with 'cannot do a partial commit during a merge' and leaves the merged code unstaged, so committing the merge afterwards records a merge commit missing the base's changes
scope: .claude/worktrees/**
source: P-036
supersedes:
tier: project
created: 2026-10-26
---

# Finish a merge of the base into a plan branch (git merge --no-edit) before any crew checkpoint; a checkpoint run mid-merge fails with 'cannot do a partial commit during a merge' and leaves the merged code unstaged, so committing the merge afterwards records a merge commit missing the base's changes

P-036: merge db3a692 lost P-031's code until the next checkpoint re-committed the working tree
