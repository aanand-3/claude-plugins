---
id: FEAT-073
type: feat
title: Recurrence reopens a hardening disposition
status: new
priority:
goal:
plan:
created: 2026-10-26
closed:
origin: FEAT-072
---

# FEAT-073: Recurrence reopens a hardening disposition

## Summary
When a mistake that a knowledge entry covers happens again after the entry was recalled for that ref, the Architect is asked to review the entry's harden disposition (FEAT-072). Split from FEAT-072 AC3 because it cannot be built before FEAT-018's recalled and recurrence events.

## User story
As the executive, I want a repeated mistake to reopen the disposition of the entry that was supposed to prevent it, so that recalled text that did not work becomes enforcement.

## Acceptance criteria
- [ ] The review only reads the recurrence event owned by FEAT-018 (ref, scope paths, kind bounce|refusal|escalation, entries recalled for that ref); it never counts a recurrence a second time.
- [ ] A recurrence whose scope matches an entry recalled for that ref gives the Architect one dispatch entry to review that entry's disposition.
- [ ] Reviewing records the (possibly changed) disposition; no automatic prompt edits (G-005 Out).

## Notes
Depends on FEAT-072 (disposition field) and FEAT-018 (recalled and recurrence events); order after both. Priority after FEAT-071 (P0) and BUG-050. Source: Q-b1501e, Q-232a2b.
