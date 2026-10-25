---
id: FEAT-026
type: feat
title: Escalations stop only the work they block
status: triaged
priority: P1
goal: G-001
plan: P-023
created: 2026-10-24
closed:
---

# FEAT-026: Escalations stop only the work they block

## Summary
run --check (commands/team/autonomy.ts) stops the whole team on any open executive question. Today it reports STOP for Q-d4e060 and Q-67af6f (both about P-003), so the unattended loop cannot advance BUG-001 or anything else. An escalation should hold the plan or item it is about; unrelated ready work goes on, and run stops only when nothing can move.

## User story

## Acceptance criteria
- [ ]

## Notes
- 2026-10-24: status new → triaged — priority P1
