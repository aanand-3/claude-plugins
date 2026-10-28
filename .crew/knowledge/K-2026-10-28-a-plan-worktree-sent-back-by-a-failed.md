---
id: K-2026-10-28-a-plan-worktree-sent-back-by-a-failed
type: gotcha
title: A plan worktree sent back by a failed land can hold an uncommitted merge of main (MERGE_HEAD set); checkpoint cannot commit it and its failure unstages the resolved files, so re-add them with git add before anything else touches the index
scope: packages/crew/src/hub/commands/work/**
source: P-080
supersedes:
tier: project
created: 2026-10-28
---

# A plan worktree sent back by a failed land can hold an uncommitted merge of main (MERGE_HEAD set); checkpoint cannot commit it and its failure unstages the resolved files, so re-add them with git add before anything else touches the index

commitWork uses git commit --only, which git refuses mid-merge, then resets the files (BUG-063)
