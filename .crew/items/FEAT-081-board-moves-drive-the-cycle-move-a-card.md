---
id: FEAT-081
type: feat
title: Board moves drive the cycle: move a card in the hub UI and the team carries it out
status: new
priority:
goal:
plan:
created: 2026-10-28
closed:
---

# FEAT-081: Board moves drive the cycle: move a card in the hub UI and the team carries it out

## Summary
Moving a card on the hub UI board carries out that lifecycle step: the backend makes the hub move, and the runner picks it up and launches the next role. Manual moves take priority over the runner's own ordering. Today the human drives the cycle by typing commands: asking the Director, assigning, speccing, accepting and landing.

## User story
As the executive, I want to move a card on the board (for example from draft to triaged) and have the team carry out the full cycle from there, so that I can steer and expedite work from the hub UI instead of running commands by hand.

## Acceptance criteria
- [ ] Dragging a card to another column on the board, or choosing an action on the card, asks the backend for that move. The backend runs the same hub command a role would run, under the same gates.
- [ ] Some moves belong to a role (for example triage → PM, spec → Architect, implement → Developer). For those, the backend records a request for that role, and the runner's next pass dispatches it. The UI does not run the role's step itself.
- [ ] Some moves are the human's own steps: approving a goal, accepting with `--force`, or landing when the permission check refuses Release. For those, the UI asks for the human's name and records it as `--approved-by`.
- [ ] Moves made by hand go to the front of dispatch, within its caps (like `expedite`), ahead of the runner's own ordering. Dependencies, holds and gates are never overridden.
- [ ] A move the hub refuses snaps the card back and shows the gate's message on the card.
- [ ] The card shows what happened next: queued for a role, picked up by a run, done or refused, as it changes.

## Notes
Executive's request, 2026-10-28. During the P-062 / P-092 landing chain, every step needed a hand-typed command or a role launched by hand:
- ask the Director;
- assign;
- spec;
- move to review;
- review;
- accept;
- land.

Goal hint G-009 (one runner, many views). Its scope already includes `expedite <ref>`, dispatch ordering with caps, and UI ask/expedite/pause/resume actions; this extends that to moves on the board. Related:
- FEAT-043, the human inbox, whose UI already answers and approves;
- BUG-050, the hub UI stalls;
- the board view in the hub UI.
- 2026-10-28: goal hint G-009 (by Arpit Anand)
