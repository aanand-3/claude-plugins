---
id: FEAT-075
type: feat
title: The PM amends the goals and items it owns through the hub
status: triaged
priority: P1
goal:
plan: P-083
created: 2026-10-26
closed:
---

# FEAT-075: The PM amends the goals and items it owns through the hub

## Summary
The roles that own goals and items can't change their bodies. Under the lifecycle preset the PM's and Director's `paths.write` is `.crew/drafts/**`, and the hub has no command that edits a goal's or item's sections (Scope, Acceptance criteria, Breakdown); it only logs, triages, moves and re-goals. So agreed changes are logged as notes and wait for a human to edit the file. The Architect can write anywhere, but its charter covers plans, and it leaves item edits to the plan spec.

## User story
As the executive, I want the PM to amend the goals and items it owns through the hub, logged and gated like other moves, so that agreed scope changes don't wait on me to edit files by hand.

## Acceptance criteria
- [ ] A hub command (for example `amend ID --section "Acceptance criteria" --from DRAFT --note TXT`) replaces one section of an item or goal from a draft, logs the change with its note on the document and in the ledger, and refuses front-matter fields (status, goal, priority stay with move, triage and regoal).
- [ ] Items: the PM may amend any open item's sections; the Architect may amend an item's Acceptance criteria while specing its plan.
- [ ] Goals: the PM may amend a goal's Breakdown and Notes. Changing an active goal's Outcome, Scope or Acceptance criteria needs the executive (`--approved-by`), since the executive approved that scope.
- [ ] Closed documents (done, dropped, wontfix, duplicate) are refused.
- [ ] The guard allows the command for those roles without widening `paths.write`; hub documents still have one home (the main checkout).

## Notes
Executive's request 2026-10-26. It hit twice that day: G-009's Breakdown stayed stale ("No role can edit goal files", FEAT-064 report, 11:49), and Q-088a6e (G-005 Breakdown and In scope, FEAT-072 criteria, FEAT-066 criteria), which the executive's session edited by hand in 3d50d9b. Q-088a6e also stopped the whole team, which is BUG-051.
- 2026-10-26: status new → triaged — priority P1
- 2026-10-28: re-goaled G-007 → none by Arpit Anand: G-007 cut list: goal-doc tooling advances none of AC1-AC5 (Q-4cc64a)
