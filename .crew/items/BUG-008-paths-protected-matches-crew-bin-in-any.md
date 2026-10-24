---
id: BUG-008
type: bug
title: paths.protected matches .crew/bin in any directory
status: new
severity:
priority:
goal:
plan:
created: 2026-10-24
closed:
---

# BUG-008: paths.protected matches .crew/bin in any directory

## Summary
The protected-path rule for .crew/bin/... matches at any depth, not only the project root and plan worktrees, so an unrelated nested .crew/bin (a fixture, a vendored example) is protected too. Found during P-017.

## Environment

## Steps to reproduce
1.

## Expected

## Actual

## Evidence

## Impact

## Notes
