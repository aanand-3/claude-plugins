---
id: FEAT-048
type: feat
title: Triage owns goal links
status: triaged
priority: P2
goal: G-007
plan:
created: 2026-10-26
closed:
---

# FEAT-048: Triage owns goal links

## Summary
Goal links are decided at triage, not at capture. An item is captured with no goal; a goal the filer suggests goes in Notes. Bug items are refused at capture when Steps to reproduce, Expected or Actual are empty. Triage can clear a goal (fixes BUG-037: `--goal none` errors with "Goal NONE does not exist" and `--goal ""` reports updated but changes nothing). The PM can re-goal items and plans (today a plan's goal is fixed at new-plan), with limits: every re-goal is logged with a --note; done or dropped goals and their work are frozen; a plan in flight moves only as a whole, together with its items.

## User story
As the PM, I want to own which goal an item or plan belongs to, and to change it later, so that grooming a goal does not leave items stuck on the wrong one and bad bug reports do not enter the backlog.

## Acceptance criteria
- [ ] `new-item` ignores or refuses a `--goal`; a filer's suggested goal is recorded in Notes, and the item starts with no goal.
- [ ] `new-item bug` is refused when Steps to reproduce, Expected or Actual is empty, naming the empty sections.
- [ ] `triage <ID> --goal none` clears the item's goal and logs it; `--goal ""` either clears it or errors, never reports updated while changing nothing (BUG-037).
- [ ] The PM can re-goal an item or a plan with a required `--note`; every re-goal is logged.
- [ ] An item or plan whose goal is done or dropped cannot be re-goaled or moved off it.
- [ ] A plan in flight moves goals only as a whole with its items; moving one without the other is refused.
- [ ] Tests cover each rule; role permissions are updated in the policy and docs.

## Notes
- Fixes BUG-037 (triage can't unlink an item from its goal); link it to the plan when one is opened.
- Capture and re-goal rules change role permissions (PM, filers) and need the executive's approval before the plan is built.
- Approved in principle by the executive via the coordinator, 2026-10-26 ("yes, lets do it"); the permission change still needs their explicit approval at plan time.
- 2026-10-26: status new → triaged — priority P2
