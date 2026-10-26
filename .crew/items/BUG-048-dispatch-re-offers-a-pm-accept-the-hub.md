---
id: BUG-048
type: bug
title: Dispatch re-offers a PM accept the hub refuses when a plan reached in-review with unchecked tasks
status: triaged
severity: S2
priority: P2
goal: G-001
plan: P-067
created: 2026-10-26
closed:
origin: P-060
---

# BUG-048: Dispatch re-offers a PM accept the hub refuses when a plan reached in-review with unchecked tasks

## Summary
A plan can be moved to in-review with its tasks unchecked. Once QA's evidence is green, dispatch routes "pm: accept" on every pass, but `move accepted` refuses because the tasks are unchecked. The loop stalls on that entry until someone routes it by hand.

## Environment
main at 4f82c3a, local hub (`.crew/bin/crew.mjs`), lifecycle preset, plan worktrees.

## Steps to reproduce
1. Developer moves a plan to in-review with every task still `- [ ]` (P-060: tasks 0/5).
2. QA records passing evidence for every criterion.
3. Run `crew.mjs dispatch --json`: it lists `pm: accept P-060`.
4. The PM runs `move P-060 accepted`: refused, T1-T5 unchecked.
5. Run `dispatch --json` again: the same `pm: accept P-060` entry comes back.

## Expected
Either `move in-review` refuses while tasks are unchecked, or dispatch routes the plan back to its developer (or to the Director as a stall) instead of re-offering an accept the hub will refuse.

## Actual
Dispatch re-offered the refused accept on every pass. It only cleared after a human asked the Director (Q-794258), who opened Q-ff5ed7 to the developer.

## Evidence
P-060 ledger: the PM's log at 12:01 ("accept blocked - 5 tasks unchecked"), then Q-794258 and Q-ff5ed7.

## Impact
An unattended runner would spend a PM agent per pass on a refused move until the no-progress stop. Workaround: ask the Director.

## Notes
Found while running the team loop on 2026-10-26. Related: BUG-047 (criteria parsing on the same plan).
- 2026-10-26: Root cause seen while unblocking P-060: no hub command ticks task boxes (checkpoint --step and handoff record the step but leave '- [ ]'); developers tick by editing the plan file (K-2026-10-26-checkpoint-step-tn-and-handoff-never). A fix could have checkpoint --step tick its task, or move in-review refuse unchecked tasks.
- 2026-10-26: status new → triaged — priority P2, severity S2
