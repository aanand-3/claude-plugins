---
id: BUG-007
type: bug
title: Guard compares paths without resolving symlinks
status: new
severity:
priority:
goal:
plan:
created: 2026-10-24
closed:
---

# BUG-007: Guard compares paths without resolving symlinks

## Summary
The guard matches a tool's file_path against protected paths as given, so the same file via a symlink (macOS /var -> /private/var, found in P-017's port of 'the guard protects hub files inside plan worktrees') can match differently; resolve both sides with realpath before matching.

## Environment

## Steps to reproduce
1.

## Expected

## Actual

## Evidence

## Impact

## Notes
