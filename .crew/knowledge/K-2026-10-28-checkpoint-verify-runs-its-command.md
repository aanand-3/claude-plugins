---
id: K-2026-10-28-checkpoint-verify-runs-its-command
type: gotcha
title: checkpoint --verify runs its command in the plan's worktree, so a relative path to a script in the main checkout's .crew/drafts/ fails with MODULE_NOT_FOUND; pass the absolute path
scope: .crew/drafts/**
source: P-078
supersedes:
tier: project
created: 2026-10-28
---

# checkpoint --verify runs its command in the plan's worktree, so a relative path to a script in the main checkout's .crew/drafts/ fails with MODULE_NOT_FOUND; pass the absolute path

P-078 AC9: two QA checkpoints of node .crew/drafts/qa78-ac9b.mjs failed only on the path, not on the code
