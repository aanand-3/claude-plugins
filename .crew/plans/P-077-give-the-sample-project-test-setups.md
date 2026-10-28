---
id: P-077
title: Give the sample-project test setups a hang deadline, not a 120 s load limit
goal:
items: BUG-049
touches: packages/crew/test/setup/sample.ts, packages/crew/test/view.test.ts, packages/crew/test/mcp.test.ts
depends_on:
status: accepted
branch: plan/P-077-give-the-sample-project-test-setups
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
---

# P-077: Give the sample-project test setups a hang deadline, not a 120 s load limit

## Context
BUG-049 (G-007, P1): on 2026-10-26 the landings of P-064 (6620206, suite 1123 s) and P-062 (a298f51, suite 1327 s) bounced
on `hub.full_suite`; in both, only `test/view.test.ts` failed, with `Hook timed out in 120000ms` in its first `beforeAll`
(`scripts/sample-project.mjs`, then `export --json`). The file passes alone (14/14, 73 s); green full runs take 620-940 s
(`crew.mjs suites`). Asked in Q-a873f3.

This is BUG-028 again. P-043 fixed BUG-028 by (1) letting only one full suite run at a time across worktrees (`crew.mjs
suite`, `hub.suite_slots: 1`) and (2) capping vitest at `maxWorkers: "50%"`. Those still hold: only one suite ran in each
bounce. They no longer suffice because the load now comes from outside the suite. With G-007, several developer and QA
agents run targeted vitest checks, builds and `claude` sessions in other worktrees while Release's suite runs, and no slot
covers that. The suite has also grown from 371 to 654 tests, so it runs longer and overlaps more of that work. P-043 left
"cheaper beforeAll fixtures" out of scope.

The 120 s limit on these setups is the part that breaks. `sample-project.mjs` is a deterministic script of about 36
sequential hub calls, each a fresh `node` on the 527 KB bundle plus git processes, so its wall time grows with machine
load. The view hook is synchronous (`execFileSync`), so vitest cannot interrupt it: the 120 s limit catches no hang. It only
fails a setup that finished, slowly but correctly. `test/mcp.test.ts` has the same setup and limit, and it was the file
that failed in BUG-028.

## Scope
**In:**
- A test helper `packages/crew/test/setup/sample.ts` that builds the sample project (`buildSample(dir, dist)`) with a
  child-process timeout of `SAMPLE_BUILD_MS = 600_000`, and exports `SAMPLE_HOOK_MS = 660_000` for the hooks that call it
- `test/view.test.ts` and `test/mcp.test.ts` build the sample project through it, and their sample-project `beforeAll`s use
  `SAMPLE_HOOK_MS` instead of `120_000`

**Out (explicitly not doing):**
- Running hub tests in-process (CHORE-025, the structural fix for the suite's process count)
- Building the sample project once per run in globalSetup: it would add the build to every targeted vitest run, including
  runs that never touch view or mcp
- Changing `maxWorkers`, `hub.suite_slots`, `hub.full_suite` or `suite.ts`: running the suite more serially would make every
  landing slower, and it would do nothing about load from outside the suite
- Load-scaled timeouts (from `os.loadavg()`): load changes during the run, so a limit read at start can still be too short
- `scripts/sample-project.mjs` itself, the other hooks in view.test.ts (30 s / 20 s live-server hooks), and other test files'
  `testTimeout`

## Acceptance criteria
- [ ] AC1 · `packages/crew/test/setup/sample.ts` exports `SAMPLE_BUILD_MS` (600000), `SAMPLE_HOOK_MS` (660000) and
  `buildSample(dir: string, dist: string): void`. The helper runs `scripts/sample-project.mjs dir dist` with
  `execFileSync("node", …, { encoding: "utf8", timeout: SAMPLE_BUILD_MS })`, so a hung build is killed and throws.
- [ ] AC2 · `test/view.test.ts` and `test/mcp.test.ts` call `buildSample` in their first `beforeAll`, and those hooks pass
  `SAMPLE_HOOK_MS` as their timeout. `grep -rn "sample-project.mjs" packages/crew/test` matches only `test/setup/sample.ts`,
  and `grep -n "120_000" packages/crew/test/view.test.ts packages/crew/test/mcp.test.ts` matches nothing.
- [ ] AC3 · `npx vitest run test/view.test.ts test/mcp.test.ts` (after `npm run build`) passes all tests in both files, with
  the same test names and assertions as before. Only the setup lines change.
- [ ] AC4 · Regression (BUG-049): with a synthetic CPU load of 16 busy-loop node processes on the 8-core Mac,
  `npx vitest run test/view.test.ts` passes, and under the same load
  `time node scripts/sample-project.mjs "$(mktemp -d)/habitly" ../../plugins/crew/skills/hub/dist/crew.mjs` takes longer
  than 120 s. The base branch's view.test.ts fails the same run with `Hook timed
  out in 120000ms`. If the machine cannot push the setup past 120 s, QA records the measured time, says so, and records
  AC4 as not reproduced, not as a pass.
- [ ] AC5 · `npm run typecheck` is clean.

## Approach
- **Fix the budget, not the load.** The setup does fixed, deterministic work, and its run time follows the load. A limit
  set from a quiet machine (73 s) fails whenever other agents are busy. The limit is meant to catch a hang, so the child
  process gets the deadline: `execFileSync`'s `timeout` kills a hung `sample-project.mjs`, and the file then fails with a
  clear error. The hook's own limit is that deadline plus 60 s for `export --json` (view) or the MCP `initialize` (mcp).
  600 s is more than 8 times the quiet-machine time, and a real hang still fails within 11 minutes. Today a hang in view's
  synchronous hook is never interrupted at all.
- **One helper, two callers.** `test/setup/sample.ts` sits beside `tmp-root.ts` and `cleanup.ts`. It resolves the script
  with `new URL("../../scripts/sample-project.mjs", import.meta.url).pathname`. view.test.ts passes its `DIST`, and
  mcp.test.ts passes `join(DIST, "crew.mjs")`, as each does today. Nothing else in either file changes.
- No change to `vitest.config.ts`: the global `testTimeout` (120 s) covers tests, not these hooks, and raising it for
  every test would hide slow tests elsewhere.
- No generated files change. Developers run `npm run build` for the bundle these tests drive and discard its output
  (K-2026-10-24-release-builds-the-generated-files-plans).

## Design

## Tasks
- [x] T1: `test/setup/sample.ts` with `buildSample`, `SAMPLE_BUILD_MS` and `SAMPLE_HOOK_MS` → verify: `cd packages/crew && npm run typecheck` (AC1, AC5)
- [x] T2: view.test.ts and mcp.test.ts use the helper and `SAMPLE_HOOK_MS` → verify: `npm run build && npx vitest run test/view.test.ts test/mcp.test.ts`; `grep -rn "sample-project.mjs" test`; `grep -n "120_000" test/view.test.ts test/mcp.test.ts` (AC2, AC3)
- [ ] T3: regression under synthetic load → verify: the AC4 procedure in the Test plan, run once on the branch and once against the base branch's view.test.ts (AC4)

## Test plan
**Targeted checks** (from `packages/crew/`, after `npm ci --prefer-offline` in a fresh worktree and `npm run build`;
discard the build output afterwards):
- AC1, AC5 → `npm run typecheck`, and reading `test/setup/sample.ts`: the exports and the `timeout` option.
- AC2 → `grep -rn "sample-project.mjs" test` (only `test/setup/sample.ts`) and
  `grep -n "120_000" test/view.test.ts test/mcp.test.ts` (no match), plus a check that both first `beforeAll`s end with
  `SAMPLE_HOOK_MS`.
- AC3 → `npx vitest run test/view.test.ts test/mcp.test.ts`: all pass; `git diff <base> -- test/view.test.ts test/mcp.test.ts`
  touches only the import and setup lines.
- AC4 (regression) → start the load with
  `for i in $(seq 16); do node -e 'for(;;){}' & done`, run `npx vitest run test/view.test.ts` and the timed `sample-project.mjs` from AC4, then stop the load with
  `kill %1 … %16` (or `pkill -f "for(;;){}"`). Record the pass/fail and the setup time. Repeat with the base branch's file
  (`git show <base>:packages/crew/test/view.test.ts > test/view.test.ts`, then restore it from
  `git show HEAD:packages/crew/test/view.test.ts`); it should fail with the 120 s hook timeout. Always stop the load
  processes, even when the run fails.

## Rollout & rollback
n/a: these are test-only changes. Once merged, the next `land` runs (P-062, P-064) use the new limit. Roll back by
reverting the plan.

## Risks & open questions
- **A real hang now takes up to 11 minutes to fail,** not 2. A hang here is rare (the script is deterministic) and fails
  with a clear error. Before this change, view's synchronous hook was never interrupted at all.
- **The suite keeps getting slower** as tests are added and parallel work grows, and later a different hook or test may
  hit its limit. CHORE-025 (in-process hub tests) is the structural fix. `crew.mjs suites` shows the trend.
- **AC4 depends on the machine.** If 16 busy loops don't push the setup past 120 s, QA says so, and AC4 is recorded as not
  reproduced, not as a pass.

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-077: Give the sample-project test setups a hang deadline, not a 120 s load limit [in-review] tasks 2/3 — claimed by Arpit Anand (developer:adad9c24955ccc5a8)
- last checkpoint 2026-10-26 15:20 at T3 (36c2774) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- ✗ npm run typecheck (AC 5) — npm error A complete log of this run can be found in: /Users/aanand/.npm/_logs/2026-10-26T15_18_43_927Z-debug-0.log
- ✓ cd packages/crew && npm run typecheck (AC 5)
- ✓ cd packages/crew && grep -c 'SAMPLE_BUILD_MS = 600_000' test/setup/sample.ts && grep -c 'SAMPLE_HOOK_MS = 660_000' test/setup/sample.ts && grep -c 'timeout: SAMPLE_BUILD_MS' test/setup/sample.ts (AC 1)
- ✓ cd packages/crew && test "$(grep -rln 'sample-project.mjs' test)" = test/setup/sample.ts && ! grep -n '120_000' test/view.test.ts test/mcp.test.ts && grep -n -B1 -A8 'buildSample(' test/view.test.ts test/mcp.test.ts (AC 2)
- ✓ Read view.test.ts and mcp.test.ts: both first beforeAll call buildSample and end with SAMPLE_HOOK_MS (view line 19, mcp line 42); no 120_000 left (AC 2) (reported)
- ✓ cd packages/crew && npx vitest run test/view.test.ts test/mcp.test.ts (AC 3)
- ✗ cd packages/crew && for i in $(seq 16); do timeout 400 node -e 'for(;;);' & done; /usr/bin/time -p node scripts/sample-project.mjs /tmp/p077-load/habitly ../../plugins/crew/skills/hub/dist/crew.mjs; kill $(jobs -p) (AC 4) — kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]
- ✗ AC4 NOT RUN: synthetic 16-process load was not completed. My one attempt via checkpoint --run exited 1 before producing usable timing (shell harness error, probably no GNU timeout on macOS; no load established), so the preceding red AC4 entry is a harness failure, not a product failure. Not pass, not reproduced. (AC 4) (reported)
- don't retry: AC4 procedure: 16 node busy loops, then vitest view.test.ts and timed sample-project.mjs — the permission system (dont-ask mode) denied the command that starts the synthetic load; not worked around
- next: T3: regression under synthetic load → verify: the AC4 procedure in the Test plan, run once on the branch and once against the base branch's view.test.ts (AC4)
- evidence: AC1 ✓, AC2 ✓, AC3 ✓, AC4 ✗, AC5 ✓

Latest log:
- 2026-10-26: QA: AC1,2,3,5 verified at 36c2774; AC4 not run (my one load attempt failed in the shell harness, no timing; developer's was permission-denied). Needs a human-run or a corrected load procedure.
- 2026-10-26: Developer: no code fix for the red checks. Both are harness failures, not product failures: AC5's red entry ran npm run typecheck from the worktree root (green from packages/crew); AC4's red entry failed in the shell wrapper (no GNU timeout on macOS, kill $(jobs -p) usage error) before any load or timing. No stray busy-loop processes are running (pgrep). AC4 still needs a run of the Test plan procedure (no timeout binary; stop with pkill -f 'for(;;){}') by someone the permission system lets start the 16-process load, or the PM's call to record it as not reproduced. Not retried here: the earlier developer attempt was denied by the permission system.
- 2026-10-26: PM: AC4 accepted as not reproduced (harness/permission limit; plan risks allow). No human run requested. Red AC5 (worktree root) and AC4 wrapper entries are harness failures, not product failures.

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-077-give-the-sample-project-test-setups
- 2026-10-26: status in-progress → in-review — T1, T2 done and checked; T3 (AC4 synthetic-load regression) was not run: the permission system denied starting the busy-loop load, so QA runs the AC4 procedure
- 2026-10-26: QA: AC1,2,3,5 verified at 36c2774; AC4 not run (my one load attempt failed in the shell harness, no timing; developer's was permission-denied). Needs a human-run or a corrected load procedure.
- 2026-10-26: Developer: no code fix for the red checks. Both are harness failures, not product failures: AC5's red entry ran npm run typecheck from the worktree root (green from packages/crew); AC4's red entry failed in the shell wrapper (no GNU timeout on macOS, kill $(jobs -p) usage error) before any load or timing. No stray busy-loop processes are running (pgrep). AC4 still needs a run of the Test plan procedure (no timeout binary; stop with pkill -f 'for(;;){}') by someone the permission system lets start the 16-process load, or the PM's call to record it as not reproduced. Not retried here: the earlier developer attempt was denied by the permission system.
- 2026-10-26: PM: AC4 accepted as not reproduced (harness/permission limit; plan risks allow). No human run requested. Red AC5 (worktree root) and AC4 wrapper entries are harness failures, not product failures.
- 2026-10-26: BUG-052: hub has no not-reproduced result; PM-accepted AC4 stays red
- 2026-10-27: PM: AC1-3,5 accepted on QA evidence (36c2774). AC4 waived as not reproduced (Q-ddf44d). move accepted refused by gates: unchecked T3 and AC4 latest check fail; no non-force waive path (BUG-052). Needs human decision on --force.
- 2026-10-28: status in-review → accepted (approved by Arpit Anand)

## Outcome
Learnings: none
