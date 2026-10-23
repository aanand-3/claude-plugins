---
id: SPIKE-002
type: spike
title: Non-developer agents must work on the plan's branch to move or review it
status: new
priority:
goal: G-003
plan:
created: 2026-10-23
closed:
---

# SPIKE-002: Non-developer agents must work on the plan's branch to move or review it

## Summary
store.find reads plans from the current worktree only, so the PM completing, QA recording evidence on and the Architect reviewing a plan in progress must switch the shared checkout to its branch, or run in their own worktree (found in T4). Decide: isolation: worktree for QA/Architect/PM too, or let moves write plan files on their branch.

## Question

## Timebox

## Output

## Findings

## Notes
