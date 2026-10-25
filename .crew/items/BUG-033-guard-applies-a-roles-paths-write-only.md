---
id: BUG-033
type: bug
title: Guard applies a role's paths.write only to Edit/Write, not Bash writes
status: new
severity:
priority:
goal: G-007
plan:
created: 2026-10-26
closed:
---

# BUG-033: Guard applies a role's paths.write only to Edit/Write, not Bash writes

## Summary
2026-10-26: the pm (paths.write .crew/drafts/**) filled BUG-032's sections in .crew/items/ with a python3 heredoc (activity pm:a8a85ae352e55ab7d 21:12:50Z); the Edit tool was refused for the same file earlier (P-050 PM). guard.ts decide() checks paths.write only for EDITS tools; Bash writeTargets are checked against paths.protected and outside-repo only, and interpreter heredocs (python3/node -e) aren't parsed for targets at all.

## Environment

## Steps to reproduce
1.

## Expected

## Actual

## Evidence

## Impact

## Notes
