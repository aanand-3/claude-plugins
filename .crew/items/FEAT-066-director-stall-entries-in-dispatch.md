---
id: FEAT-066
type: feat
title: Director stall entries in dispatch for repeated refusals and denials
status: triaged
priority: P1
goal: G-009
plan:
created: 2026-10-26
closed:
---

# FEAT-066: Director stall entries in dispatch for repeated refusals and denials

## Summary
Dispatch turns repeated refusals, no-progress passes and reported permission denials into a Director `stall` entry naming the ref and the reason, and stops re-offering that work to the role until the Director has moved it (answer, reassign, ask or escalate).

## User story
As the executive, I want a loop that keeps bouncing off the same refusal to be handed to the Director, so that I am not the one who notices it.

## Acceptance criteria
- [ ] A ref refused or bounced N times in a row (default 2, e.g. P-060 PM accept refused, BUG-048) yields one Director stall entry naming the ref and reason.
- [ ] A runner pass that made no progress, and a reported permission denial (a checkpoint "don't retry" attempt or an auto-mode denial), each yield one Director stall entry.
- [ ] The role is not re-offered that work until the Director has moved it.
- [ ] A routed check hint still open after N runner passes (policy key, default 3) yields one Director stall entry naming the hint's ref and text, using the first-seen pass FEAT-074 records.
- [ ] The P-060 / BUG-048 loop is a regression test; the full suite passes.

## Notes
Goal G-009 (Director-first exceptions). Source: Q-24ba43 (a)(b), Q-73467a.
- 2026-10-26: goal hint G-009 (by Arpit Anand)
- 2026-10-26: status new → triaged — priority P1
- 2026-10-26: Add acceptance criterion (Architect Q-b1501e): a routed check hint still open after N runner passes (policy key, default 3) gives one Director stall entry naming the hint ref and text, using the first-seen pass recorded by FEAT-074. PM cannot edit the item body: Architect to include it in the plan spec.
