---
id: FEAT-054
type: feat
title: Audit cadence
status: triaged
priority: P1
goal: G-008
plan:
created: 2026-10-26
closed:
---

# FEAT-054: Audit cadence

## Summary
ledger `audit` events, due computation, dispatch entry, goal-closure hold, `audit` command, human-only `audit --waive`

Slice of G-008 (Whole-project security): Audit cadence — ledger `audit` events, due computation, dispatch entry, goal-closure hold, `audit` command, human-only `audit --waive`.

`security.audit_every` lives in `.crew/policy.yaml` (protected), not config.yaml. A stuck audit must not hold a goal forever: the human can waive it, and the waiver is a ledger event.

## User story

## Acceptance criteria
- [ ] after `security.audit_every` plans land, `dispatch` shows exactly one `security` audit entry
- [ ] the focus goal can't close while an audit is due; `audit --record --findings …` clears the hold
- [ ] `audit --waive` from the human clears the hold and leaves a ledger event; the guard refuses it from an agent
- [ ] an agent edit of `security.audit_every` in policy.yaml is refused by the guard

## Notes
- 2026-10-26: triaged from G-008 breakdown
- 2026-10-26: sharpened from the pre-approval review of G-008 (see the goal's Notes & decisions)
