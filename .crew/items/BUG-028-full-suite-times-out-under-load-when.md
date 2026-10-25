---
id: BUG-028
type: bug
title: Full suite times out under load when plans run in parallel
status: new
severity: S2
priority: P1
goal: G-007
plan:
created: 2026-10-25
closed:
---

# BUG-028: Full suite times out under load when plans run in parallel

## Summary
On 2026-10-25 main after P-033 (7c017d4): the full vitest run failed only in test/mcp.test.ts, 'Hook timed out in 120000ms' in its beforeAll (sample-project.mjs, then spawning mcp.mjs), at load average 50-100 with several plans' suites and agents running at once; mcp.test.ts and view.test.ts pass alone (20/20, 64s). Release merged P-033 without one green full run for the same reason. A gate that fails on load lets Release merge on per-file passes, or stalls. Fix options: one full suite at a time across worktrees (a hub lock that Release takes for hub.full_suite), cap vitest workers (maxWorkers) for the full suite, and make the heavy beforeAll setups cheaper.

## Environment

## Steps to reproduce
1.

## Expected

## Actual

## Evidence

## Impact

## Notes
