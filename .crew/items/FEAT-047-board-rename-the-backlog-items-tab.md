---
id: FEAT-047
type: feat
title: Board: rename the Backlog items tab or show only unplanned items
status: triaged
priority: P3
goal: G-001
plan:
created: 2026-10-25
closed:
---

# FEAT-047: Board: rename the Backlog items tab or show only unplanned items

## Summary
The Board's toggle labels the item view 'Backlog items', but it shows every item in every state (new, triaged, planned, in-progress, done), so an item whose plan is being built reads as still sitting in the backlog. Either rename the tab (for example 'Items') or make the backlog view mean items no plan links yet. Seen in packages/crew/ui/src/views/Board.tsx (ITEM_COLUMNS and the toggle label). Raised by the executive on 2026-10-25.

## User story

## Acceptance criteria
- [ ]

## Notes
- 2026-10-26: status new → triaged — priority P3
- 2026-10-26: KEEP (small, P3): packages/crew/ui/src/views/Board.tsx still labels the item toggle 'Backlog items' over ITEM_COLUMNS new..done. Remaining: rename the label to 'Items' (one line plus a UI test). Not needed for G-001's criteria; the PM may unlink it from G-001 as a no-goal UI chore.
- 2026-10-26: re-triaged: priority P3
- 2026-10-26: PM grooming: MOVE off G-001 intended (P3 UI chore, not needed for its criteria). triage has no way to clear a goal; link remains until the human or a hub change unlinks it.
