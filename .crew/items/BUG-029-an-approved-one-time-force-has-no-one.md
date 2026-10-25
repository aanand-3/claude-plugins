---
id: BUG-029
type: bug
title: An approved one-time --force has no one who can run it
status: new
severity: S3
priority: P2
goal: G-007
plan:
created: 2026-10-25
closed:
---

# BUG-029: An approved one-time --force has no one who can run it

## Summary
2026-10-25, P-030 (Q-81948c): the executive approved one forced done -> in-progress move. Claude Code's auto-mode permission check refused it to the developer subagent as a CI bypass, and from the executive's terminal the hub refused it because P-030 is assigned to the developer role and the run has no role; the executive had to use --as developer. Until P-032 sends a failed release back to its developer, a reopen after a failed release suite needs either a hub path that the executive's approval unlocks (e.g. answer Q-… lets the assigned role's move through without --force) or the release failure handled without a forced move.

## Environment

## Steps to reproduce
1.

## Expected

## Actual

## Evidence

## Impact

## Notes
