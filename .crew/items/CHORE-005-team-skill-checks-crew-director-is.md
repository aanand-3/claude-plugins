---
id: CHORE-005
type: chore
title: Team skill checks crew-director is loaded before handing over
status: triaged
priority: P1
goal: G-007
plan: P-034
created: 2026-10-23
closed:
---

# CHORE-005: Team skill checks crew-director is loaded before handing over

## Summary
agents --check only compares files on disk; the first BUG-001 run found the files current but the session had no crew-director subagent type. The skill should check the session's agent list and say to restart when it is missing.

## Done when
- [ ]

## Notes
- 2026-10-25: status new → triaged — priority P1
