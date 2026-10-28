---
id: G-011
title: Goal-driven delivery
status: proposed
priority: P0
created: 2026-10-28
completed:
integration_branch:
---

# G-011: Goal-driven delivery

## Outcome
Every item on a goal names the goal criterion it serves, and the hub shows at any time how close each goal is to done. Work that serves no criterion of the focus goal waits.

## Scope
**In:**
- numbered goal criteria (AC1...) and a `serves:` tag on every item, such as `G-007/AC4`; triage onto a goal is refused without one; an item that serves no criterion becomes parked (a new status) and is not part of the goal
- a scope budget per goal: beyond the starting item count plus a margin (policy key, default +20%) adding an item needs the Director's sign-off; beyond +50% it escalates to the executive
- "wired in" as part of done for features: a feat spec names which existing step invokes it (a dispatch row, a role's instructions, the runner or a command) with one acceptance check through that real path; the Definition of Ready refuses a feat plan without both and the Architect checks them at review
- goal criteria that get closed: the PM verifies each goal criterion with evidence, as plan criteria are verified; a goal closes only when all are checked
- a goal review: every N closed plans (policy default 5) dispatch gives the Director a goal review covering progress per criterion (items done and open), scope growth and a cut list; it escalates to the executive when items close while no criterion moves; the review also shows in the hub UI
- a one-time G-007 review with the new tags, started by hand by the Director
- the product owner decision: after two goals run under these gates, report tag coverage, scope growth against the budget, criteria closed and `--force` bypasses of these gates

**Out:**
- the product owner role itself; if growth keeps exceeding the budget or the gates keep being bypassed, a dedicated product owner agent (plans and prioritises only, with authority to park work) is planned as a separate goal
- automatic priority scoring
- G-010's fresh-context spec reviews and template sync (G-010 also covers template drift, which P-094 partly delivered)

## Acceptance criteria
- AC1: `triage` refuses an item onto a goal without a `serves:` criterion tag.
- AC2: a parked status exists, and parked items do not count toward the goal.
- AC3: the scope budget gate fires at the policy margin (default +20%) and escalates to the executive past +50%.
- AC4: a feat plan without an integration point and a real-path acceptance check cannot move to ready.
- AC5: a goal cannot close with an unchecked criterion, and the PM records criterion evidence.
- AC6: dispatch gives the Director a goal review every N closed plans (default 5), and the review lists per-criterion progress, scope growth and a cut list.
- AC7: the product owner decision metrics (tag coverage, scope growth against budget, criteria closed, `--force` bypasses) are reported.

## Success metrics
After two goals run under these gates: tag coverage near 100%, scope growth within the +20% margin, every criterion closed with evidence, and no `--force` bypasses of these gates.

## Breakdown
- FEAT-082: Numbered criteria, serves tag and parked status — goal criteria get IDs, items carry `serves:`, triage refuses a goal without it, untagged work is parked (AC1, AC2).
- FEAT-083: Scope budget per goal — Director sign-off past the policy margin (default +20%), executive escalation past +50% (AC3).
- FEAT-084: Wired-in gate for feature plans — spec names the invoking step and a real-path acceptance check; Definition of Ready refuses without both and the Architect checks at review (AC4).
- FEAT-085: Goal criterion evidence and closure — the PM records evidence per goal criterion and a goal closes only when all are checked (AC5).
- FEAT-086: Goal review in dispatch and the hub UI — every N closed plans the Director gets per-criterion progress, growth and a cut list, escalating when items close but no criterion moves (AC6).
- CHORE-035: Product owner decision metrics report — tag coverage, scope growth, criteria closed and `--force` bypasses, reported after two goals (AC7).

## Notes & decisions
Why: G-007 has 74 items, 63 done (34 of them bugs), yet none of its 5 acceptance criteria is checked. Batch landing (P-079) met its own criteria but was not wired into dispatch or Release's agent until P-094. The executive wants gates closed with the existing agents first; a product owner role comes only if these gates do not work.
Policy defaults the executive can change: scope margin +20%, escalation threshold +50%, goal review every 5 closed plans, status name "parked".

## Progress log
