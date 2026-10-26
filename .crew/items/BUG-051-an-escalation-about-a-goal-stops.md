---
id: BUG-051
type: bug
title: An escalation about a goal stops the whole team instead of holding that goal
status: new
severity:
priority:
goal:
plan:
created: 2026-10-26
closed:
---

# BUG-051: An escalation about a goal stops the whole team instead of holding that goal

## Summary
An escalation about a goal stops the whole team. `run --check` treats an escalation whose ref is a goal as "an escalation with no plan or item to hold" and returns STOP, so the runner dispatches nothing, even when the escalation only concerns editing that goal's document.

## Environment
main at 3d50d9b, `.crew/bin` from 25fd09e, lifecycle preset, unattended runner (`run --until-done`).

## Steps to reproduce
1. As the PM, escalate about a goal: `crew.mjs escalate G-005 "…"` (Q-088a6e, 2026-10-26 15:47: "PM cannot edit G-005 Breakdown/In-scope …").
2. Run `crew.mjs run --check`.
3. Compare with an escalation on an item: Q-d55a87 on FEAT-074, raised at the same time.

## Expected
The goal escalation holds that goal (and at most the work it gates), like an item escalation holds only its item. The rest of the team keeps moving.

## Actual
`run --check` printed `STOP  waiting for the executive: Q-088a6e …` and exited 1; the runner stopped dispatching. In the same check, Q-d55a87 printed only `HELD  FEAT-074 (Q-d55a87)`. `inbox` showed Q-088a6e as `holds: stops the team`.

## Evidence
Ledger: 2026-10-26 15:47 `ask G-005 … Q-088a6e → executive (escalation)`; the team stayed stopped until the executive answered at about 16:10. The model (`references/model.md`, run --check): it stops on "an escalation with no plan or item to hold — an escalation about one holds only that document".

## Impact
One document-edit question froze every plan, landing and review for the whole wait. Workaround: answer the escalation at once, or escalate on an item instead of a goal.

## Notes
Decide the rule rather than special-casing G-005: a goal escalation holds the goal's status moves and, if it's about scope, its unstarted plans; only an escalation with no ref at all (or about the idea or policy) stops the team. Found with FEAT-075's gap (roles can't edit goal and item bodies), which is what made the PM escalate.
- 2026-10-26: Correction to Notes: the companion gap (roles can't edit goal and item bodies) is FEAT-075, not FEAT-075.
