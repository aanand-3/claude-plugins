---
id: SPIKE-001
type: spike
title: Cross-machine ledger sync
status: triaged
priority: P3
goal: G-001
plan:
created: 2026-10-23
closed:
---

# SPIKE-001: Cross-machine ledger sync

## Summary

## Question
How should the ledger sync across machines and cloud agents — a dedicated ref (refs/crew/ledger) pushed and fetched by
the hub, a remote service, or nothing until a real multi-machine team needs it?

## Timebox
1 day

## Output
An ADR choosing the approach (with the merge rule for concurrent appends and how claims stay exclusive across machines),
and follow-up items if it's go.

## Findings

## Notes
- 2026-10-23: status new → triaged — priority P3
- 2026-10-24: Constraint (2026-10-24, from the hub UI work): no database. Files, git and the append-only ledger stay the source of truth; ledger.jsonl lives in the local git common dir and is never pushed today.
- 2026-10-26: MOVE: off G-001. G-001 Scope lists cross-machine ledger sync as Out (later, via refs/crew/ledger), and G-007 lists it as Out too. Park it with no goal until a multi-machine or cloud-runner goal exists; the question is still open (ledger.jsonl stays in the local git common dir).
- 2026-10-26: re-triaged: priority P3
