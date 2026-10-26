---
id: P-055
title: Triage owns goal links
goal: G-007
items: FEAT-048, BUG-037
touches:
depends_on:
status: draft
branch: plan/P-055-triage-owns-goal-links
pr:
created: 2026-10-26
started:
completed:
---

# P-055: Triage owns goal links

## Context
FEAT-048 and BUG-037 (G-007). Goal links should be decided at triage, not capture. BUG-037: `triage --goal none` errors ("Goal NONE does not exist") and `--goal ""` reports updated but changes nothing, so an item cannot be unlinked. Today a plan's goal is also fixed at `new-plan`.

**Approval needed before a developer starts:** the capture rule (items are captured with no goal; a suggested goal goes in Notes) and the PM re-goal rule change role permissions. The executive must approve them first. The architect should spec the plan and raise that approval as one escalation naming the exact rules.

## Scope
**In:**
- `new-item` captures with no goal; a filer's suggested goal is recorded in Notes.
- `new-item bug` is refused when Steps to reproduce, Expected or Actual is empty.
- `triage` can clear a goal (fixes BUG-037); `--goal ""` never reports updated while changing nothing.
- The PM can re-goal items and plans, with a required `--note`; every re-goal is logged.
- Limits: done or dropped goals and their work are frozen; a plan in flight moves only as a whole with its items.

**Out (explicitly not doing):**
- The overlap check at triage (FEAT-049).
- Changing who may create or approve goals.

## Acceptance criteria
- [ ] `new-item` ignores or refuses a goal; the suggestion is kept in Notes and the item starts with no goal.
- [ ] `new-item bug` is refused with the empty sections named.
- [ ] `triage <ID> --goal none` clears the goal and logs it; `--goal ""` clears it or errors, never a silent no-op (BUG-037 regression test).
- [ ] The PM can re-goal an item or plan with `--note`; each re-goal is logged.
- [ ] Items and plans on a done or dropped goal cannot be re-goaled.
- [ ] A plan in flight moves goals only together with its items; a partial move is refused.
- [ ] Role permissions and docs are updated for the new rules; tests cover each rule.

## Approach
(Architect.)

## Tasks
- [ ] T1: (Architect.)

## Test plan
**Targeted checks:**
- (Architect.)

## Rollout & rollback
Ships in the bundle and reaches this repo through refresh-bin. Rollback: revert the commit. The executive's approval of the permission changes is a gate before a developer starts.

## Risks & open questions
- Executive approval of the capture and re-goal rules is required first (see Context).
- Existing items keep their goals; only new captures start goal-less.

## Handoff

## Progress log

## Outcome
