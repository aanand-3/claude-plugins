---
id: K-2026-10-23-worktree-isolated-subagents-share
type: learning
title: Worktree-isolated subagents share the ledger
scope: packages/hub/src/core/ledger.ts
source: G-003
supersedes:
tier: project
created: 2026-10-23
---

# Worktree-isolated subagents share the ledger

T0 spike: an agent with isolation: worktree runs in <repo>/.claude/worktrees/agent-<agent_id> on branch worktree-agent-<agent_id>; git rev-parse --git-common-dir points at the main repo's .git, so the ledger (in the common dir) is shared. Developers start their plan branch from there. .claude/worktrees/ must be gitignored.
