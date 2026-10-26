---
id: BUG-022
type: bug
title: run-check tests time out in beforeEach under load (vitest hookTimeout 10s)
status: done
severity: S2
priority: P1
goal: G-001
plan: P-023
created: 2026-10-25
closed: 2026-10-26
completed: 2026-10-26
---

# BUG-022: run-check tests time out in beforeEach under load (vitest hookTimeout 10s)

## Summary
All 3 tests in `packages/crew/test/hub/run-check.test.ts` fail under load: their `beforeEach` (Repo.create + lifecycle, about 10 CLI subprocesses) exceeds vitest's default 10s `hookTimeout`. `packages/crew/vitest.config.ts` raises only `testTimeout` (120s), so hooks keep the 10s default. This stopped P-023's release at `hub.full_suite`.

## Environment
main at fc812e2 (P-023 marked done, release stopped). macOS, local, full suite running file-parallel.

## Steps to reproduce
1. Load the machine (e.g. run the full hub suite, `cd packages/crew && npx vitest run`, in parallel).
2. `cd packages/crew && npx vitest run test/hub/run-check.test.ts`

## Expected
The 3 run-check tests pass; setup hooks get the same headroom as tests.

## Actual
`Error: Hook timed out in 10000ms.` at test/hub/run-check.test.ts:9 (`beforeEach`) for all 3 tests.

## Evidence
Release's full-suite log: /private/tmp/claude-502/-Users-aanand-Documents-Projects-Personal-claude-plugins/db2dd55f-de9c-4386-9876-00d5531ec929/scratchpad/p023-suite.log — Test Files 2 failed | 37 passed; Tests 3 failed | 268 passed. The same run also shows `test/mcp.test.ts` failing with `Hook timed out in 120000ms` (file-level hook); check whether it is the same load cause.

## Impact
Blocks P-023's release (hub.full_suite gate). Flaky for anyone running the full suite on a busy machine. No workaround short of rerunning.

## Notes
Likely fix: set `hookTimeout` alongside `testTimeout` in packages/crew/vitest.config.ts (or a per-hook timeout in run-check.test.ts). Fix belongs to reopened P-023.
- 2026-10-25: status new → triaged — priority P1, severity S2
- 2026-10-25: Found by P-023's release (hub.full_suite failed after P-023 was marked done); fix belongs to P-023 once reopened. Reopen refused: 'P-023: done → in-progress not allowed (from done: none). Use --force to override.'
- 2026-10-25: Fixed by P-023 (eaa70df): run-check.test.ts setup moved into each test. Linked to P-023's items by the executive session at the executive's request.
- 2026-10-26: DONE: fixed by P-023 (eaa70df): run-check.test.ts has no beforeEach, setup moved into each test (its own Notes record this). The broader load-timeout problem is BUG-028 (G-007). No remaining work.
- 2026-10-26: status triaged → done — DONE per Architect review: fixed by P-023 (eaa70df); broader timeouts are BUG-028.
