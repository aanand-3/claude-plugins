---
id: BUG-027
type: bug
title: Usage counts a resumed agent's tokens again at every stop
status: done
severity: S2
priority: P1
goal: G-007
plan: P-049
created: 2026-10-25
closed: 2026-10-26
completed: 2026-10-26
---

# BUG-027: Usage counts a resumed agent's tokens again at every stop

## Summary
usage --hook (commands/team/autonomy.ts:148) records transcriptUsage of the whole transcript at each SubagentStop, so a resumed run (the Director, reused architects/developers) logs its cumulative total again every time it stops; spend() (core/memory/ledger.ts:121) and the live page's per-run tokens (core/memory/activity.ts:182) then sum those snapshots. On 2026-10-25 director:afc95553afc679059 has 37 usage events reaching about 0.98M in / 34k out / 9.7M cache read in its latest one, but the sums report the director at 27M tokens in, roughly 2x the architects. Token budgets and per-role usage are overstated, and budgets.* could stop the team early. Fix: record the delta since the run's last usage event (or keep only the latest event per run when summing).

## Environment

## Steps to reproduce
1. Run a crew agent with the SubagentStop hook (`crew.mjs usage --hook`) installed, let it stop, then resume the same run (e.g. the Director, or a reused architect/developer) and let it stop again, several times.
2. List that run's usage events in the ledger (`crew.mjs ledger --type usage`) and compare the latest event's tokens with what spend() (core/memory/ledger.ts:121) and the live page's per-run tokens (core/memory/activity.ts:182) report for the run.

## Expected
Each token is counted once: a run's total equals its latest cumulative transcript usage (each SubagentStop records only the delta since the run's last usage event, or the sums keep only the latest event per run).

## Actual
usage --hook (commands/team/autonomy.ts:148) records transcriptUsage of the whole transcript at every stop, and the sums add those cumulative snapshots. On 2026-10-25 director:afc95553afc679059 has 37 usage events whose latest is about 0.98M in / 34k out / 9.7M cache read, yet the sums report the director at 27M tokens in, roughly 2x the architects.

## Evidence

## Impact

## Notes
- 2026-10-25: status new → triaged — priority P1, severity S2
- 2026-10-26: status triaged → done — delivered by P-049
