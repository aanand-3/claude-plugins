---
id: P-057
title: Overlap check at triage
goal: G-007
items: FEAT-049
touches:
depends_on: P-055
status: draft
branch: plan/P-057-overlap-check-at-triage
pr:
created: 2026-10-26
started:
completed:
---

# P-057: Overlap check at triage

## Context
FEAT-049 (G-007). Triage today gives the PM no help spotting duplicates or conflicts with plans in flight. The hub can list overlap candidates mechanically at triage so the PM decides, and the architect is pulled in only when the hub flags a technical question. Builds on the triage rules of P-055 (Triage owns goal links), so it depends on that plan.

## Scope
**In:**
- `triage <ID>` prints overlap candidates: open items with similar titles, and in-flight plans whose `touches` cover paths the item names.
- Candidates are computed by the hub with no model call.
- The PM acts with the existing paths (reject duplicate, merge note, triage); nothing changes automatically.
- The hub flags a technical question for the architect only for overlap with an in-progress plan or an unclear cause.
- An item overlapping an in-flight plan becomes a dependent plan or a note on that plan, never a mid-flight scope change.

**Out (explicitly not doing):**
- Automatic merging, rejecting or re-planning.
- Semantic or model-based similarity.

## Acceptance criteria
- [ ] `triage <ID>` lists open items with similar titles and in-flight plans whose touches cover paths named in the item.
- [ ] Candidates need no model call.
- [ ] Nothing is changed automatically; the PM uses the existing reject, note and triage paths.
- [ ] The architect flag appears only for overlap with an in-progress plan or an unclear cause.
- [ ] An item overlapping an in-flight plan is recorded as a dependent plan or a note; the plan's scope is never edited mid-flight.
- [ ] Tests cover candidate listing, the flag and the no-mid-flight-change rule.

## Approach
(Architect.)

## Tasks
- [ ] T1: (Architect.)

## Test plan
**Targeted checks:**
- (Architect.)

## Rollout & rollback
Ships in the bundle; reaches this repo through refresh-bin. Rollback: revert the commit.

## Risks & open questions
- Depends on P-055; both touch triage.
- Title similarity may be noisy; the architect picks the measure and threshold.

## Handoff

## Progress log

## Outcome
