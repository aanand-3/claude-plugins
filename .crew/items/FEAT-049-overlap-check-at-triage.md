---
id: FEAT-049
type: feat
title: Overlap check at triage
status: triaged
priority: P2
goal: G-007
plan:
created: 2026-10-26
closed:
---

# FEAT-049: Overlap check at triage

## Summary
At triage the hub lists overlap candidates mechanically: open items with similar titles, and in-flight plans whose touches cover paths the item names. The PM can then reject as duplicate, merge, or triage. The architect is pulled in only when the hub flags a technical question (overlap with an in-progress plan, unclear cause). An item that overlaps an in-flight plan becomes a dependent plan or a note on that plan, never a mid-flight scope change.

## User story
As the PM, I want triage to show me likely duplicates and conflicting plans, so that I stop filing near-identical items and stop disturbing plans already being built, without asking the architect about every item.

## Acceptance criteria
- [ ] `triage <ID>` prints overlap candidates: open items with similar titles, and in-flight plans whose touches cover paths named in the item.
- [ ] Candidates are computed by the hub from titles and plan touches, with no model call.
- [ ] The PM can act on a candidate with the existing reject duplicate path or a merge note; nothing is changed automatically.
- [ ] When an item overlaps an in-progress plan or its cause is unclear, the hub flags a technical question for the architect; otherwise no architect step is added.
- [ ] An item overlapping an in-flight plan is recorded as a dependent plan or a note on that plan; the plan's scope is never edited mid-flight.
- [ ] Tests cover candidate listing, the flag, and the no-mid-flight-change rule.

## Notes
- Independent of "Triage owns goal links"; can follow it.
- Approved in principle by the executive via the coordinator, 2026-10-26 ("yes, lets do it").
- 2026-10-26: status new → triaged — priority P2
