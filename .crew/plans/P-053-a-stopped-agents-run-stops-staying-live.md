---
id: P-053
title: A stopped agent's run stops staying live
goal: G-007
items: BUG-034
touches:
depends_on:
status: draft
branch: plan/P-053-a-stopped-agents-run-stops-staying-live
pr:
created: 2026-10-26
started:
completed:
---

# P-053: A stopped agent's run stops staying live

## Context
BUG-034 (G-007). A stopped agent (TaskStop, a crashed session) writes no usage or report event, so `liveRuns()` keeps its run live for 24h and `dispatch` keeps routing "run ... idle: resume or reassign" to the Director, even though the plan is done and merged. It held a dispatch slot and staffing most of 2026-10-26, and a Director run was spent concluding nothing was wrong.

## Scope
**In:**
- A run that was stopped, or whose plan is done or merged, stops being listed as live and stops producing a Director dispatch entry, without waiting 24h. The architect picks the mechanism (item options: skip idle runs on a done plan; a hub command that ends a run; a closing event from the stop path).
- A regression test: activity for a run on a done plan, no stop event, idle past `limits.idle_minutes` gives no Director entry.

**Out (explicitly not doing):**
- Changing the idle threshold or the 24h window for runs on open plans.

## Acceptance criteria
- [ ] A run whose plan is done or merged is not live and has no Director dispatch entry.
- [ ] A stopped run can be ended promptly (by an event or a command), after which it is not live and not staffing a slot.
- [ ] A genuinely idle run on an open plan still shows "resume or reassign".
- [ ] Regression test fails before the fix and passes after.

## Approach
(Architect.)

## Tasks
- [ ] T1: (Architect.)

## Test plan
**Targeted checks:**
- (Architect.)

## Rollout & rollback
n/a — internal hub change; ships in the bundle. Rollback: revert the commit.

## Risks & open questions
- Whether a run with no plan ref also needs the end-run path (item Notes option b).

## Handoff

## Progress log

## Outcome
