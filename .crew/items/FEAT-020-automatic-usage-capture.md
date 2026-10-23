---
id: FEAT-020
type: feat
title: Automatic usage capture
status: triaged
priority: P2
goal: G-003
plan:
created: 2026-10-23
closed:
---

# FEAT-020: Automatic usage capture

## Summary
Budgets only see usage a run records with crew.mjs usage; nothing captures tokens or cost automatically. Record usage from the harness (a hook or the agent wrapper) so run and project budgets bite.

## User story

## Acceptance criteria
- [ ]

## Notes
- 2026-10-23: status new → triaged — priority P2
- 2026-10-23: T7: usage --hook (SubagentStop) sums each crew agent's transcript tokens under its role and run (branch feat/team-autonomy)
