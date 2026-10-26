---
id: FEAT-046
type: feat
title: Plan page shows its live activity
status: done
priority: P2
goal: G-007
plan: P-040
created: 2026-10-25
closed: 2026-10-26
completed: 2026-10-26
---

# FEAT-046: Plan page shows its live activity

## Summary
Raised by the executive 2026-10-25 after P-027: the hub UI shows live agent activity only on the overview. Each plan's page (and its tasks) should show the same feed filtered to that plan: who is working on it, the current task from the 'starting' checkpoint, recent tool calls and ledger events (what 'watch --ref P-###' prints), updating live. Reuse readActivity/liveRuns (activity.ts) and /api/activity with a ref filter.

## User story

## Acceptance criteria
- [ ]

## Notes
- 2026-10-25: status new → triaged — priority P2
- 2026-10-26: status triaged → done — delivered by P-040
