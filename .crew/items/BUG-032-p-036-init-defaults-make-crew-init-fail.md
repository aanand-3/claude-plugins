---
id: BUG-032
type: bug
title: P-036 init defaults make crew init fail outside git
status: done
severity: S2
priority: P2
goal: G-007
plan:
created: 2026-10-26
closed: 2026-10-26
completed: 2026-10-26
---

# BUG-032: P-036 init defaults make crew init fail outside git

## Summary
Release's full suite for P-036 (branch tip 1ba1321, 471.7s) failed 1 of 429: packages/crew/test/hub/e2e/live-ui.test.ts:113 'outside git (the ledger in .crew itself), a server still sees edits deep in .crew and ledger writes' expects crew init to exit 0 in a non-git directory; it exits 1. Repro: crew init in a plain temp dir prints Initialized .crew/, Created CLAUDE.md, the two 'Wrote .crew/... (defaults; edit it)' lines, then 'Hub state lives on main in the main checkout (...), which is on a detached HEAD: switch it back to main, or turn hub.plan_worktrees off.' and exits 1. Deterministic (fails in ~1.5s, fails again alone). P-036's init defaults appear to turn hub.plan_worktrees on, and the base-branch check then fails with no git repo. Fix in init (skip or soften that check without a git repo) or justify a test change.

## Environment

## Steps to reproduce
1. In a plain non-git temp dir, run `crew init`.

## Expected
`crew init` exits 0 outside git.

## Actual
Exits 1 with the base-branch check failure (hub.plan_worktrees on, no git repo).

## Evidence

## Impact

## Notes
- 2026-10-26: status new → triaged — priority P2, severity S2
- 2026-10-26: fixed by P-036 (8be0bec); close once P-045 lands
- 2026-10-26: status triaged → done — Fixed by P-036 (landed 8be0bec); closed with P-045 rollout
