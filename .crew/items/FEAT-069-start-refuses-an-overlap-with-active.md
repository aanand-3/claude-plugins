---
id: FEAT-069
type: feat
title: start refuses an overlap with active work, as staff does
status: triaged
priority: P2
goal: G-007
plan: P-071
created: 2026-10-26
closed:
---

# FEAT-069: start refuses an overlap with active work, as staff does

## Summary
Remainder of FEAT-021 / P-003 from the unmerged branch claude/crew-bug-001-9d4b01 (b131393), per Q-0baafa: staff makes a ready plan wait when its touches overlap an in-progress, blocked or in-review plan on a path outside hub.shared, but start only prints a warning and starts it anyway, so a direct start (a human, or an agent not routed by dispatch) puts two overlapping plans in flight. start should refuse the same overlaps staff waits on, using the same footprint function, unless forced.

## User story

## Acceptance criteria
- [ ]

## Notes
- 2026-10-26: status new → triaged — priority P2
