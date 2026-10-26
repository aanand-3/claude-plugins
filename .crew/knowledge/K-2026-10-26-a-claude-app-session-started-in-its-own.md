---
id: K-2026-10-26-a-claude-app-session-started-in-its-own
type: gotcha
title: A Claude app session started in its own claude/* worktree sits on a branch that can predate main: its skills, policy and hub bin are stale and hub writes made there never reach main; run the main checkout's hub by absolute path, or fast-forward the worktree to main first
scope: 
source: 
supersedes:
tier: project
created: 2026-10-26
---

# A Claude app session started in its own claude/* worktree sits on a branch that can predate main: its skills, policy and hub bin are stale and hub writes made there never reach main; run the main checkout's hub by absolute path, or fast-forward the worktree to main first

Re-recorded from the unmerged branch claude/crew-bug-001-9d4b01 (53e90da): that branch was cut behind main and its hub commits stranded there (Q-d1e1c6, Q-0baafa).
