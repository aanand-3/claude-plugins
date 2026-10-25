---
id: FEAT-024
type: feat
title: Designer role that shapes and reviews UI plans
status: triaged
priority: P1
goal: G-003
plan: P-021
created: 2026-10-24
closed:
---

# FEAT-024: Designer role that shapes and reviews UI plans

## Summary
A Designer role on the agent team that shapes a UI before it is built and reviews it after, in code and visually, so a plan that changes a UI can't reach done on scripted, functional checks alone.

## User story
As the executive running a crew team, I want a Designer agent to lay out UI plans before they are built and to approve how they look after, with a scripted layout check QA can run as evidence, so that visual defects such as overflowing cards, sideways page scroll and unstyled native controls are caught by the team, not by me.

## Acceptance criteria
- [ ] The team has a `designer` role with an agent, a charter and a queue (`next --role designer`).
- [ ] A plan whose `touches` include the project's UI paths can't move to done without the Designer's approving review of its current code.
- [ ] QA can record a scripted layout check (no card overflow, no sideways page scroll at 375/900/1440 px, light and dark) as evidence.
- [ ] The design skill's `review` mode has a checklist built from what slipped through in P-020.

## Notes
- Found while finishing P-020: the developer's browser checks and 264 passing tests missed unstyled native select arrows, a 288 px Goal filter sized by its longest option, Relations rows overflowing the rail, item pages that scroll sideways, and P-011's board card with seven FEAT IDs joined in one chip. All are fixed on the P-020 branch. Nothing on the team judges how a UI looks: QA records functional evidence, the Architect reviews code against the spec, `check_design.mjs --all` only catches mechanical drift (it passed every P-020 defect), and nothing in the loop runs the design skill's `page` or `review` mode.
- Decided with the user: no separate UI developer or UI QA agent. The Developer runs the design skill's `page` mode on UI plans, QA runs the layout check, the Designer owns taste and approval.
- Prototype of the layout check: `layout-sweep.js` (a console script, checked against a planted overflow) in the P-020 session's side notes.
- 2026-10-24: status new → triaged — priority P1
