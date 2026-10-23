---
id: CHORE-004
type: chore
title: Captured usage has tokens but no cost
status: new
priority:
goal: G-003
plan:
created: 2026-10-23
closed:
---

# CHORE-004: Captured usage has tokens but no cost

## Summary
usage --hook (T7) records tokens from each subagent transcript but cost 0: the hub has no price table, so budgets.*.max_cost never bites from captured usage, and the main session's own usage isn't captured. Options: a policy prices table per model, or reading cost from OpenTelemetry.

## Done when
- [ ]

## Notes
