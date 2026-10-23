---
id: K-2026-10-23-live-coordination-lives-in-an-append
type: decision
title: Live coordination lives in an append-only ledger in the git common dir
scope: packages/hub/src/core/ledger.ts, packages/hub/src/core/workspace.ts
source: IDEA
supersedes:
tier: project
created: 2026-10-23
---

# Live coordination lives in an append-only ledger in the git common dir

Claims, moves, logs, usage, checkpoints and questions must be visible from every worktree at once, which branch-scoped files can't be. Events are staged with the command and appended under a lock before any document is written, so a refusal records nothing; documents stay the reviewed source of content. (docs/vision.md → The model)
