---
id: BUG-027
type: bug
title: Usage counts a resumed agent's tokens again at every stop
status: new
severity: S2
priority: P1
goal: G-007
plan: P-049
created: 2026-10-25
closed:
---

# BUG-027: Usage counts a resumed agent's tokens again at every stop

## Summary
usage --hook (commands/team/autonomy.ts:148) records transcriptUsage of the whole transcript at each SubagentStop, so a resumed run (the Director, reused architects/developers) logs its cumulative total again every time it stops; spend() (core/memory/ledger.ts:121) and the live page's per-run tokens (core/memory/activity.ts:182) then sum those snapshots. On 2026-10-25 director:afc95553afc679059 has 37 usage events reaching about 0.98M in / 34k out / 9.7M cache read in its latest one, but the sums report the director at 27M tokens in, roughly 2x the architects. Token budgets and per-role usage are overstated, and budgets.* could stop the team early. Fix: record the delta since the run's last usage event (or keep only the latest event per run when summing).

## Environment

## Steps to reproduce
1.

## Expected

## Actual

## Evidence

## Impact

## Notes
