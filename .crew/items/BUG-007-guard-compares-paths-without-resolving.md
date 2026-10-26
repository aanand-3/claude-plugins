---
id: BUG-007
type: bug
title: Guard compares paths without resolving symlinks
status: done
severity: S3
priority: P2
goal: G-001
plan: P-019
created: 2026-10-24
closed: 2026-10-26
completed: 2026-10-26
---

# BUG-007: Guard compares paths without resolving symlinks

## Summary
The guard matches a tool's file_path against protected paths as given, so the same file via a symlink (macOS /var -> /private/var, found in P-017's port of 'the guard protects hub files inside plan worktrees') can match differently; resolve both sides with realpath before matching.

## Environment

## Steps to reproduce
1. In a plan worktree on macOS (temp repos live under /var → /private/var), have a crew subagent Write or Edit a protected hub file (e.g. `.crew/bin/crew.mjs`) by a path that reaches it through a symlink, or by a relative path from a subdirectory `cwd`.

## Expected
Denied, the same as the path given from the repo root.

## Actual
The path is matched as given, so it can miss `paths.protected` and the write passes. Absolute paths go through `real()` today; relative ones are not resolved against the hook's `cwd`.

## Evidence

## Impact

## Notes
- 2026-10-24: status new → triaged — priority P2, severity S3
- 2026-10-26: DONE: fixed by P-019 (152650b). guard.test.ts 'guard_resolves_paths: relative and symlinked paths are matched where they lead (BUG-007)' (symlink to .crew denied); targets.ts resolves with realpathSync. P-050/P-051 kept it (test still on main). No remaining work.
- 2026-10-26: status triaged → done — DONE per Architect review: fixed by P-019 (152650b).
