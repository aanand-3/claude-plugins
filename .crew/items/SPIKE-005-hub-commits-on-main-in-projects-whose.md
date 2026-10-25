---
id: SPIKE-005
type: spike
title: Hub commits on main in projects whose git hooks protect main
status: new
priority:
goal: G-007
plan:
created: 2026-10-25
closed:
---

# SPIKE-005: Hub commits on main in projects whose git hooks protect main

## Summary
Since P-026, with plan_worktrees every hub write commits on the base branch. Projects set up by git-setup have hooks that refuse commits on main, so every hub commit fails with 'written but not committed'. Bypassing hooks is not allowed: decide how hub-only commits pass (a hook allowance for chore(hub) commits touching only .crew documents, or another route).

## Question

## Timebox

## Output

## Findings

## Notes
