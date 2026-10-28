---
id: CHORE-034
type: chore
title: land: a killed batch land leaves its candidate worktree and suite child until the next batch
status: new
priority:
goal:
plan:
created: 2026-10-28
closed:
origin: P-079
---

# CHORE-034: land: a killed batch land leaves its candidate worktree and suite child until the next batch

## Summary
P-079 review: batch.ts removes .claude/worktrees/land-batch-<pid> in a finally and sweeps dead-pid leftovers at the start of the next landBatch. A SIGKILL, or a SIGTERM/SIGINT under Node's default handlers, skips the finally, so the candidate (with its node_modules from hub.setup) stays until the next batch land, and a spawnSync'd hub.full_suite child can outlive the land process (same as the single path). Consider a signal handler that removes the candidate and kills the suite child, and a sweep in land's start rather than only in landBatch.

## Done when
- [ ]

## Notes
