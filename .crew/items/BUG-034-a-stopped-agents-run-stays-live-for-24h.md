---
id: BUG-034
type: bug
title: A stopped agent's run stays live for 24h and keeps a director dispatch entry
status: new
severity:
priority:
goal: G-007
plan:
created: 2026-10-26
closed:
---

# BUG-034: A stopped agent's run stays live for 24h and keeps a director dispatch entry

## Summary
2026-10-26: the session stopped QA run qa:af405bc1f1c24a473 (P-034) with TaskStop; SubagentStop never fired, so no usage/report event closed it. liveRuns() (core/memory/activity.ts) keeps it live for 24h, and dispatch keeps routing 'run ... idle: resume or reassign' to the director though P-034 is done and merged (4a124be). No hub command ends another run. Fix ideas: dispatch skips idle runs whose plan is done/merged, or a command to mark a run stopped.

## Environment

## Steps to reproduce
1.

## Expected

## Actual

## Evidence

## Impact

## Notes
