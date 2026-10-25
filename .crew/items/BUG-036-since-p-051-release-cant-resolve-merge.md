---
id: BUG-036
type: bug
title: Since P-051 Release can't resolve merge conflicts: its Bash writes are bound to paths.write .crew/drafts/**
status: new
severity:
priority:
goal: G-007
plan:
created: 2026-10-26
closed:
---

# BUG-036: Since P-051 Release can't resolve merge conflicts: its Bash writes are bound to paths.write .crew/drafts/**

## Summary
2026-10-26: Release merging P-032 hit one trivial conflict (core/team/policy.ts NOTIFY_ON/ACTIONS, keep both sides). Edit was refused as before, and now sed -i through Bash too (P-051 binds Bash writes to paths.write). Release aborted the merge. Before P-051 Release resolved conflicts and committed rebuilt dist via Bash. Routed this time to the developer (resolve + checkpoint, re-review). Needs a decision: widen release paths.write to plan worktrees (policy, executive), or route conflict resolution to the developer by design (P-032 land bounces on conflict already).

## Environment

## Steps to reproduce
1.

## Expected

## Actual

## Evidence

## Impact

## Notes
