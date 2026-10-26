---
id: FEAT-070
type: feat
title: escalate --follow-up: the asker attaches a human follow-up step when it escalates
status: triaged
priority: P3
goal:
plan:
created: 2026-10-26
closed:
origin: P-072
---

# FEAT-070: escalate --follow-up: the asker attaches a human follow-up step when it escalates

## Summary
FEAT-068 AC1 allows the asker to attach a follow-up at escalation; P-072 deferred it because it needs a new field on ask() in questions.ts, which P-070 and FEAT-065 are changing. Do it after both land to avoid conflicts. The hub detecting a met condition by itself is not wanted: conditions are free text, the human answers the follow-up done.

## User story

## Acceptance criteria
- [ ]

## Notes
- 2026-10-26: status new → triaged — priority P3
