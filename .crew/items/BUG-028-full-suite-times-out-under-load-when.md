---
id: BUG-028
type: bug
title: Full suite times out under load when plans run in parallel
status: triaged
severity: S2
priority: P1
goal: G-007
plan: P-043
created: 2026-10-25
closed:
---

# BUG-028: Full suite times out under load when plans run in parallel

## Summary
On 2026-10-25 main after P-033 (7c017d4): the full vitest run failed only in test/mcp.test.ts, 'Hook timed out in 120000ms' in its beforeAll (sample-project.mjs, then spawning mcp.mjs), at load average 50-100 with several plans' suites and agents running at once; mcp.test.ts and view.test.ts pass alone (20/20, 64s). Release merged P-033 without one green full run for the same reason. A gate that fails on load lets Release merge on per-file passes, or stalls. Fix options: one full suite at a time across worktrees (a hub lock that Release takes for hub.full_suite), cap vitest workers (maxWorkers) for the full suite, and make the heavy beforeAll setups cheaper.

## Environment

## Steps to reproduce
1. Start two or three plans' suites at once on an 8-core Mac (several agents running; load average 50-100).
2. Run `hub.full_suite` (npm test in packages/crew) on main.

## Expected
The full suite passes when it is the only full run, however many plans are in flight.

## Actual
test/mcp.test.ts fails with 'Hook timed out in 120000ms' in its beforeAll; passes alone (20/20, 64s).

## Evidence

## Impact

## Notes
- 2026-10-25: Cause, measured 2026-10-25: the suite starts a fresh node process on the 527 KB dist/crew.mjs for every hub call (about 485 tr() call sites plus 82 repo.node() and the git init and commit processes each Repo.create runs) across 371 tests. vitest runs files in parallel (about 7 workers on this 8-core Mac), and three plans' suites at once gave load averages of 100-150. Options besides one-suite-at-a-time: run most hub tests in-process through cli.ts main(argv, open), keeping a small e2e set that spawns the real bundle; cap maxWorkers for hub.full_suite (e.g. 4); share one sample-project fixture per file instead of one per test.
- 2026-10-25: status new → triaged — priority P1, severity S2
