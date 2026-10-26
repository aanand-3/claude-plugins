---
id: BUG-049
type: bug
title: Full suite view.test.ts beforeAll times out under load (BUG-028 recurring)
status: triaged
severity: S2
priority: P1
goal: G-007
plan:
created: 2026-10-26
closed:
origin: P-062
---

# BUG-049: Full suite view.test.ts beforeAll times out under load (BUG-028 recurring)

## Summary
On 2026-10-26 two landings in a row bounced on hub.full_suite, and in both only test/view.test.ts failed: 'Hook timed out in 120000ms' in its beforeAll, which runs sample-project.mjs and then `export --json`. The runs were P-064 at 6620206 (the suite ran 1123 s) and P-062 at a298f51 (it ran 1327 s, and the other 653 tests passed). Recent green runs took 620-940 s (`crew.mjs suites`). view.test.ts passes alone in the P-062 worktree (14/14, 73 s). Neither plan touches view or sample-project code, so the gate is failing because of machine load, as in BUG-028 (closed by P-043). Every bounce costs another review and QA round.

## Environment
8-core Mac, several crew agents and plan suites running at once, packages/crew vitest v5.0.5, Node v26.5.0.

## Steps to reproduce
1. Run agents and other plan checks in parallel on the machine (high load).
2. Run `crew.mjs land P-###` (hub.full_suite: npm test in packages/crew).

## Expected
The full suite passes when the plan's code is fine, even with other work running on the machine.

## Actual
test/view.test.ts fails with 'Hook timed out in 120000ms' in beforeAll, its 14 tests are skipped, and land sends the plan back with accepted → in-progress.

## Evidence
- `crew.mjs ledger --ref P-062 --type move` (2026-10-26 14:39) and the P-064 bounce at 14:16.
- `crew.mjs suites`: P-062 ran 1327.2 s and P-064 ran 1123.1 s, both exit 1. The earlier green runs took 620-940 s.
- `npx vitest run test/view.test.ts` alone in the P-062 worktree: 14 passed in 73 s.

## Impact
Accepted plans bounce for no fault in their code and loop through review and QA again. Two in a row so far.

## Notes
Options: raise the hookTimeout of the sample-project beforeAll setups, make the fixture cheaper, or lower maxWorkers for hub.full_suite.
- 2026-10-26: goal hint G-007 (by Arpit Anand)
- 2026-10-26: status new → triaged — priority P1, severity S2
