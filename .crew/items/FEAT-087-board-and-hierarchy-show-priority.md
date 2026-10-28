---
id: FEAT-087
type: feat
title: Board and hierarchy show priority and what is picked up next
status: new
priority:
goal:
plan:
created: 2026-10-28
closed:
---

# FEAT-087: Board and hierarchy show priority and what is picked up next

## Summary
The hub UI shows goals by priority, and the board shows what is in progress and what the team picks up next, in that order. Today the board sorts plans and items by ID, and the goal list isn't ordered by priority, so the executive can't see which work comes next.

## User story
As the executive, I want the hierarchy ordered by goal priority, and the board ordered by what is running and what dispatch will pick up next, so that I can see at a glance where the team is and what happens next.

## Acceptance criteria
- [ ] The goal hierarchy lists goals by priority (P0 first), then by focus and queue order. The focus goal is marked.
- [ ] Within each board column, in-progress and in-review cards come first, then cards in the order `dispatch` would hand them out (the same ordering as `dispatch --json` and `staff`), then everything else by priority. IDs no longer decide the order.
- [ ] The next card dispatch will pick up for each role is marked as "next", with the role. A card that is waiting shows why: a dependency, an overlap, a hold or an open question.
- [ ] Priority within a goal (P0–P3, set at triage) is shown on each card and drives the order after dispatch order.
- [ ] The ordering comes from the hub's own dispatch and priority logic. The UI does not re-implement it.

## Notes
- **Executive's request, 2026-10-28,** made during the portfolio review that realigns goals, plans and items to goal criteria (see G-011, Goal-driven delivery).
- **Goal hint G-009** ("One runner, many views": a human can see why nothing moves).
- **Related:**
  - FEAT-081 (board moves drive the cycle);
  - BUG-050 (hub UI stalls);
  - the `dispatch` and `staff` ordering;
  - G-011 FEAT-082, whose `serves:` tags could later group cards by goal criterion.
- 2026-10-28: goal hint G-009 (by Arpit Anand)
