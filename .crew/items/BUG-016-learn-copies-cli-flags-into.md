---
id: BUG-016
type: bug
title: learn copies CLI flags into the knowledge body
status: duplicate
severity:
priority:
goal: G-001
plan:
created: 2026-10-24
closed: 2026-10-24
---

# BUG-016: learn copies CLI flags into the knowledge body

## Summary
K-2026-10-24-p-022-waits-on-p-020-rather-than has '--as architect --run-id architect:a173e6610bdd97359' inside its body text: the learn command lets trailing/inline flags leak into the --why/--from text instead of parsing them.

## Environment

## Steps to reproduce
1.

## Expected

## Actual

## Evidence

## Impact

## Notes
- 2026-10-24: status new → duplicate — Recaptured as BUG-017 with full sections; the cause is the guard's identity rewrite (guard.ts:189), not learn's parsing
