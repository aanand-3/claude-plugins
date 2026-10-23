---
id: CHORE-005
type: chore
title: Team skill checks crew-director is loaded before handing over
status: new
priority:
goal: G-003
plan:
created: 2026-10-23
closed:
---

# CHORE-005: Team skill checks crew-director is loaded before handing over

## Summary
agents --check only compares files on disk; the first BUG-001 run found the files current but the session had no crew-director subagent type. The skill should check the session's agent list and say to restart when it is missing.

## Done when
- [ ]

## Notes
