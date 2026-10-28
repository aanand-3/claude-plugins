---
id: BUG-055
type: bug
title: Targeted e2e checks time out under load; resume shows only last line of failing output
status: new
severity:
priority:
goal:
plan:
created: 2026-10-28
closed:
origin: P-068
---

# BUG-055: Targeted e2e checks time out under load; resume shows only last line of failing output

## Summary
Targeted e2e checks (not the full suite) fail under machine load although the code is fine, and the failure is sent back to developers as "a check failed". It happened for P-068, P-074, P-078, P-085 and once in the P-080 review. Two parts: (1) the test timeouts are too tight for a loaded machine; (2) `resume`/`context` print only the last line of a failing check's output (e.g. "⎯⎯[1/1]⎯"), so agents conclude "no output was recorded" although the full tail is in the ledger (`ledger --ref P-068 --type checkpoint --json`). Not covered by P-077/BUG-049 (full-suite view.test.ts / sample-project setups, 120 s) or BUG-022/BUG-028 (done; other files).

## Environment
8-core Mac, several crew agents and suites running at once, packages/crew vitest, 2026-10-28.

## Steps to reproduce
1. Load the machine (several agents/suites running).
2. Run `cd packages/crew && npx vitest run test/hub/e2e/guard-writes.test.ts` (or with team.test.ts), the inbox ui test, or any e2e using test/helpers/repo.ts.
3. Run `crew.mjs resume P-068` and read the failing check line.

## Expected
Checks pass when the code is fine, or fail with a distinct load/timeout signal; resume/context show enough of the failing output (the error line, not only the last line) to tell a timeout from a real failure.

## Actual
Causes seen in the ledger: `Error: Hook timed out in 10000ms` in guard-writes.test.ts beforeEach (Repo.create + init); `spawnSync node ETIMEDOUT` from test/helpers/repo.ts Repo.run (1-minute kill); a 30 s per-test timeout in inbox.test.ts's ui test. resume/context show only "⎯⎯[1/1]⎯". The same files pass alone or combined (19/19) when rerun.

## Evidence

## Impact

## Notes
