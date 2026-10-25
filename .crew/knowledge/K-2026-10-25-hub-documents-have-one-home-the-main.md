---
id: K-2026-10-25-hub-documents-have-one-home-the-main
type: decision
title: Hub documents have one home: the main checkout, committed on the base branch by every hub write
scope: packages/crew/src/hub/core/store.ts, packages/crew/src/hub/core/work/hubstate.ts, packages/crew/src/hub/commands/work/gather.ts
source: P-026
supersedes:
tier: project
created: 2026-10-25
---

# Hub documents have one home: the main checkout, committed on the base branch by every hub write

With plan worktrees, per-worktree copies of .crew forked plan state and reused IDs (BUG-018). The store roots .crew at the repository's first worktree; with plan_worktrees each write commits only hub documents (chore(hub): <command> <IDs>); the guard refuses copies elsewhere; migrate --gather brings old copies home. Executive decision 2026-10-25.
