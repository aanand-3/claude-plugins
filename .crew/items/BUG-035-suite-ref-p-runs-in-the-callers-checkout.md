---
id: BUG-035
type: bug
title: suite --ref P-### runs in the caller's checkout, not the plan's worktree
status: triaged
severity: S2
priority: P1
goal: G-007
plan:
created: 2026-10-26
closed:
---

# BUG-035: suite --ref P-### runs in the caller's checkout, not the plan's worktree

## Summary
2026-10-26 suites.jsonl: P-049's only full suite (21:12Z, exit 0) and P-050's first (21:30Z) ran with worktree = the main checkout, so they tested main, not the plan; Release merged P-049 on that run (b249d20). Its code was later covered by P-034's (21:23Z) and P-050's (21:37Z) green suites run in their worktrees after merging main. suite --ref should run in the plan's worktree (or refuse elsewhere), and the merge gate should only accept a suite whose worktree and sha match the plan branch.

## Environment
Main checkout of this repository (branch main) plus plan worktrees under .claude/worktrees/; hub from packages/crew/src/hub (vendored .crew/bin/crew.mjs). Suite record: .git/crew/suites.jsonl (shared by every worktree). Timestamps below are UTC (2026-10-25Z = the local 2026-10-26 of the filing note).

## Steps to reproduce
1. Have a done plan whose work sits in its worktree (e.g. a P-### under .claude/worktrees/), not yet merged.
2. From the main checkout (cwd = repo root, on main), run `node .crew/bin/crew.mjs suite --ref P-###`.
3. Run `node .crew/bin/crew.mjs suites --json`.

## Expected
`suite --ref P-###` runs `hub.full_suite` in P-###'s worktree (or refuses when called anywhere else), and the record carries enough (worktree and the HEAD sha it tested) for the merge gate to accept only a green suite on the plan branch's current commit.

## Actual
The suite runs in the caller's checkout: the main checkout, i.e. main without the plan's changes. It records `"ref":"P-###"` with `"worktree":"<main checkout>"` and exit 0, which reads as a green suite for the plan. Nothing checks that the worktree belongs to the plan, the record has no sha, and no hub command reads the record before a merge, so Release merges on it.

## Evidence
- packages/crew/src/hub/commands/work/suite.ts:157-162, `suiteCmd()`: `runSuite(store, { cwd: store.ws.root, ref })` — cwd is always the caller's checkout; `--ref` is only a label written to the slot holder and the record.
- suite.ts:131-153, `runSuite()`: `spawnSync(command, { shell: true, cwd })`, then appends `{ts, ref, run, worktree: cwd, slot, wait_ms, run_ms, exit}`; `SuiteRecord` (line 14) has no sha/branch field.
- No hub code consumes `suites()`/`suites.jsonl` (only suite.ts, suite.reg.ts, commands/index.ts and work/setup.ts mention the suite); the merge gate is the Release instructions only: .claude/agents/crew-release.md:15-19 and 28-29 say to run `suite --ref P-###` "in the plan's worktree", which the command neither enforces nor does itself.
- .git/crew/suites.jsonl:
  - 2026-10-25T21:12:30.728Z ref P-049, run release:a0907780ef9d1a0f2, worktree /Users/aanand/Documents/Projects/Personal/claude-plugins (main checkout), run_ms 572559, exit 0 — P-049's only full suite. The same run logged "merged to main as b249d20" at 21:12:48Z (ledger), 18s later.
  - 2026-10-25T21:23:08.768Z ref P-034, worktree .claude/worktrees/P-034-local-runner-run-until-done, exit 0.
  - 2026-10-25T21:30:41.543Z ref P-050, run release:a785c9ba5b8e68318, worktree = main checkout, exit 0.
  - 2026-10-25T21:37:26.704Z ref P-050, same run, worktree .claude/worktrees/P-050-refuse-a-hub-script-held-in-a-shell, exit 0 (the correct run).

## Impact
The full-suite merge gate can pass without testing the plan: P-049 (b249d20) was merged on a suite of main without its changes. It was covered only by luck, since later suites in P-034's (21:23Z) and P-050's (21:37Z) worktrees ran on main after b249d20 and were green. Any Release run that calls `suite` from the main checkout (the natural place, since it merges from there) gives a false green, and `suites` reports it as the plan's. A breaking plan could land on main with a recorded green suite.
Suggested severity S2 (a quality gate silently passes; no workaround inside the hub other than Release remembering the cwd), priority P1.

## Notes
- Fix shape: `suiteCmd` resolves `--ref P-###` to the plan's worktree (as `merge-order`/`context P-###` name it) and runs there, refusing when the plan has no worktree; without `--ref`, keep the caller's checkout. Record the tested `git rev-parse HEAD` (and branch) in `SuiteRecord`.
- Gate: wherever the merge is checked (P-032's `land`, which calls `runSuite`, or a check before Release's squash-merge), accept only a record with that plan's ref, its worktree, the plan branch's current HEAD sha and exit 0.
- Release instructions (crew-release.md step 2/3) can then drop "in the plan's worktree" as a manual precondition.
- Targeted test: `suite --ref P-###` invoked from the main checkout runs with cwd = the plan's worktree and records its sha.
- 2026-10-26: Completed the report against the code: suiteCmd (work/suite.ts:157-162) always runs hub.full_suite in the caller's checkout (store.ws.root); --ref is only a label, the record has no sha, and no hub code reads suites.jsonl before a merge (the gate is crew-release.md prose). suites.jsonl: P-049 21:12:30Z and P-050 21:30:41Z ran in the main checkout; P-049 merged as b249d20 18s later. Suggested S2/P1.
- 2026-10-26: status new → triaged — priority P1, severity S2
