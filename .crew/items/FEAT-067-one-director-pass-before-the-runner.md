---
id: FEAT-067
type: feat
title: One Director pass before the runner stops
status: new
priority:
goal:
plan:
created: 2026-10-26
closed:
---

# FEAT-067: One Director pass before the runner stops

## Summary
On a no-progress or escalation stop, the runner runs exactly one Director-only pass first and exits only if that pass changes nothing in the ledger. The runner stays a role-less loop and the Director never launches agents (the pass is an ordinary dispatch entry). Pause, budget and goal-approval stops stay immediate.

## User story
As the executive, I want the runner to give the Director one chance to unblock before it stops, so that I am not woken for something the Director can move.

## Acceptance criteria
- [ ] A no-progress or escalation stop is preceded by one Director pass.
- [ ] The runner exits only when that pass changes nothing in the ledger.
- [ ] Pause, budget and goal-approval stops skip the pass.
- [ ] One targeted test; the full suite passes.

## Notes
Goal G-009 (Director-first exceptions). Source: Q-24ba43 (d), Q-73467a.
- 2026-10-26: goal hint G-009 (by Arpit Anand)
