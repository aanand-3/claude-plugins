---
id: BUG-057
type: bug
title: Harden flaky layout-sweep AC5 and playbook-home setup
status: triaged
severity: S2
priority: P1
goal:
plan:
created: 2026-10-28
closed:
origin: P-062
---

# BUG-057: Harden flaky layout-sweep AC5 and playbook-home setup

## Summary
Main's full suite fails on two timing-sensitive tests, so no plan can land (Q-9b0ef6). Both files are unchanged since 10-26 and lands after that passed, so this is flakiness, not a regression. Related: Q-51ab50 (P-086 saw the same layout-sweep behaviour), BUG-039/P-086 (CSS-only wrap fix, keeps out of the sweep), BUG-049/P-077 (mcp/view 120s beforeAll timeouts, which fold into P-077 and are NOT in scope here).

## Environment
Main at 47d9c68 (10-28 P-062 land, quiet machine, 1189s full suite).

## Steps to reproduce
1. Run the full suite on main (`land P-062`, or the hub's full_suite).
2. Observe test/tools/layout-sweep.test.ts AC5 and test/hub/e2e/playbook-home.test.ts fail.

## Expected
- layout-sweep AC5: the board finding carries the same route label at every width and theme.
- playbook-home: beforeEach (Repo.create + init) completes inside its hook deadline.

## Actual
- layout-sweep AC5 race: the same run labelled the board finding `#/board:` at 1440px dark but `#/board:backlog:` at 375px light (expected '375px light #/board: overflow ...', got '#/board:backlog:'). The route label races the board's hash update.
- playbook-home setup timeout: beforeEach hook (Repo.create plus init) timed out at 10s in all 4 tests.

## Evidence
packages/crew/test/tools/layout-sweep.test.ts (AC5) and packages/crew/test/hub/e2e/playbook-home.test.ts, P-062 land of 10-28 (commit 47d9c68); Q-9b0ef6, Q-51ab50.

## Impact
Main's full suite is red, so no plan can land. P0 per the Director's decision in Q-9b0ef6.

## Notes
Suggested direction from the Director (the Architect decides): wait for a stable route label before asserting; give the playbook-home hook a deadline like P-077's. Out of scope: mcp.test.ts / view.test.ts beforeAll timeouts (P-077), P-086's CSS fix.
- 2026-10-28: status new → triaged — priority P1, severity S2
