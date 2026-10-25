---
id: FEAT-032
type: feat
title: run --check counts only work that can move
status: triaged
priority: P2
goal: G-001
plan:
created: 2026-10-25
closed:
---

# FEAT-032: run --check counts only work that can move

## Summary
`run --check` (commands/team/autonomy.ts) counts any open plan or item as unheld work, including draft or blocked plans, items whose plan is already done, and items no role can move. It can report GO while nothing can move, so the unattended loop keeps calling the Director and spends tokens until a budget stops it. Raised in P-023's review (Q-efbe24); P-023's spec defined "open" as "not closed", so this is follow-up work, not a P-023 defect.

## User story
As the human running the team unattended, I want `run --check` to say GO only when some work can actually move, so that the loop stops instead of spending tokens on a backlog nobody can act on.

## Acceptance criteria
- [ ] `run --check` counts as movable only: ready plans `staff` can start now, active plans (in-progress or in-review), and items the PM or Architect can act on (new items to triage, triaged items with no plan).
- [ ] Draft or blocked plans, items whose plan is done, and items held by an open escalation are not counted; with only those left, `run --check` reports STOP and exits 1 with a reason naming why nothing can move.
- [ ] A test covers a hub where every open plan and item is in one of the non-movable states.

## Notes
Source: Q-efbe24 (Architect, from QA's point on P-023). Builds on FEAT-026 (escalations stop only the work they block).
- 2026-10-25: status new → triaged — priority P2
