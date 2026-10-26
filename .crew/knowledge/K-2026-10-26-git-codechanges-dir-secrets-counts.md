---
id: K-2026-10-26-git-codechanges-dir-secrets-counts
type: gotcha
title: git.codeChanges(dir, secrets) counts an untracked OS junk file (.DS_Store) as uncommitted code; filter OS_JUNK by basename before treating its result as 'something would be lost'
scope: packages/crew/src/hub/core/git.ts, packages/crew/src/hub/commands/work/**
source: P-062
supersedes:
tier: project
created: 2026-10-26
---

# git.codeChanges(dir, secrets) counts an untracked OS junk file (.DS_Store) as uncommitted code; filter OS_JUNK by basename before treating its result as 'something would be lost'

P-062's safeToDelete kept every stuck worktree as 'uncommitted code (.DS_Store)' until the junk was filtered
