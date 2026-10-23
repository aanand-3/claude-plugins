---
id: CHORE-003
type: chore
title: A wrong-role move reports content gates before the role gate
status: new
priority:
goal: G-003
plan:
created: 2026-10-23
closed:
---

# CHORE-003: A wrong-role move reports content gates before the role gate

## Summary
move checks a transition's content gate (evidence, review, readiness) before the role gate, so e.g. QA moving a plan to done hears 'no code review yet' instead of 'this is the pm role's step' (found in T4). Check role gates first.

## Done when
- [ ]

## Notes
