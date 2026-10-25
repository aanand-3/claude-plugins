---
id: P-043
title: Serialize and cap the full suite under parallel plans
goal: G-007
items: BUG-028
touches: packages/crew/src/hub/commands/work/suite.ts, packages/crew/src/hub/commands/work/suite.reg.ts, packages/crew/src/hub/commands/index.ts, packages/crew/vitest.config.ts, packages/crew/test/hub/e2e/suite.test.ts, packages/crew/test/hub/registry.test.ts, packages/crew/test/mcp.test.ts, plugins/crew/skills/hub/agents/release.md, plugins/crew/skills/hub/SKILL.md, plugins/crew/skills/hub/references/model.md
depends_on:
status: done
branch: plan/P-043-serialize-and-cap-the-full-suite-under
pr:
created: 2026-10-25
started: 2026-10-25
completed: 2026-10-25
assignee: developer
---

# P-043: Serialize and cap the full suite under parallel plans

## Context
BUG-028 (G-007): with several plans running, the full vitest run times out in test/mcp.test.ts beforeAll at load 50-100; Release merged P-033 without one green full run. Executive decision: serialize full suites with a hub lock, cap vitest workers, record durations. Converting tests to in-process is CHORE-025, out of scope here. Architect to refine the spec.

## Scope
**In:**
- A new hub command `suite [--ref P-###]` that runs `hub.full_suite` from `.crew/config.yaml` in the current checkout, only after taking one of `hub.suite_slots` slot locks (default 1) shared by every worktree of the repository, and exits with the suite's exit code
- A record of each run (queue wait and run time) in `suites.jsonl` beside the ledger in the git common dir's `crew/` folder, read with a new `suites [--limit 20] [--json]` command and MCP tool
- vitest `maxWorkers: "50%"` in `packages/crew/vitest.config.ts`
- release.md, the hub SKILL.md and references/model.md say Release runs the full suite with `crew.mjs suite`

**Out (explicitly not doing):**
- Converting hub tests to run in-process (CHORE-025)
- Cheaper beforeAll fixtures
- `land` (P-032) using the slots: P-032 depends on this plan and calls `runSuite` from it
- Changing `.crew/config.yaml`: the default of 1 slot is what this repo wants

## Acceptance criteria
- [ ] AC1 · With `hub.suite_slots` unset, a second `suite` started while one runs waits (it prints `suite: waiting for a slot` with the holder's run, ref and start time to stderr, once) and starts only after the first ends.
- [ ] AC2 · With `hub.suite_slots: 2`, two `suite` runs overlap; a third waits.
- [ ] AC3 · `packages/crew/vitest.config.ts` sets `maxWorkers: "50%"`.
- [ ] AC4 · Each finished run appends one record (ts, ref, run, worktree, slot, wait_ms, run_ms, exit); `suites --json` lists them newest first, `--limit` cuts them, the text form prints one line per run with wait and duration in seconds; the MCP tool `suites` returns the same.
- [ ] AC5 · A slot file left by a dead process (its pid no longer running on this host) does not block: the next `suite` takes the slot over at once and runs.
- [ ] AC6 · `suite` exits with the suite command's exit code (a failing suite exits non-zero and is still recorded with its exit code). With no `hub.full_suite` it fails with `No hub.full_suite in .crew/config.yaml.`; with `hub.suite_slots` not a whole number of at least 1 it fails with `hub.suite_slots: expected a whole number of at least 1`. Neither failure takes a slot or writes a record.
- [ ] AC7 · release.md steps 2 and 3 run the full suite as `node .crew/bin/crew.mjs suite --ref P-###` (in the background, so a tool timeout doesn't kill it) and say never to run `hub.full_suite` directly; the hub SKILL.md and model.md name `suite` and the `suite_slots` setting.
- [ ] AC8 · Registration and sizes: `suite` and `suites` appear in `help`; the pre-existing commands and tools are unchanged (`registry.test.ts`); `mcp.test.ts`'s tool list includes `suites`; `npm run typecheck` is clean; each suite module stays under 300 lines.

## Approach
- **One module, `commands/work/suite.ts`** (plus `suite.reg.ts` and one line in `commands/index.ts`). It exports `runSuite(store, { cwd, ref }): { exit, waitMs, runMs }` so P-032's `land` can call it, and the CLI wrappers `suiteCmd` and `suitesCmd`.
- **Settings.** Read `full_suite` and `suite_slots` with `yamlBlock(...)` over `store.dir`'s `config.yaml`, block `hub` (store.ts already exports `yamlBlock`; store.ts is not touched). `store.dir` is the main checkout's `.crew/`, so a worktree uses main's config (gotcha K-2026-10-25-a-plans-edit-to-crew-config-yaml).
- **Slots.** A `suite` folder in the git common dir's `crew/` folder (`git.commonDir(ws.root)`, as `Ledger.at` does, so all worktrees share it; `.crew/suite/` outside git). Slot `i` is the file `slot-<i>.lock`, created with `writeFileSync` flag `wx`, holding JSON `{ token, pid, host, run, ref, worktree, started }` (`run` from `whoAmI`). Try slots 0..n-1; when all are held, check each for staleness, then wait 1 s (`Atomics.wait`, as `acquireLock` does) and retry, with no deadline. Print the waiting line once.
- **Stale means a dead holder,** not age (a suite takes minutes, so the ledger's 30 s mtime rule is wrong here): same `host` as `os.hostname()` and `process.kill(pid, 0)` throws `ESRCH`. Unparseable content counts as stale only when the file is older than 60 s (a writer between create and write). Take over by renaming the file aside and checking that the moved content is what was inspected (the race guard of `takeOverIfStale` in ledger.ts, written again here since ledger.ts is not in touches). The holder pid is the `crew.mjs` process, which stays alive for the whole `spawnSync`.
- **Run.** `spawnSync(full_suite, { shell: true, cwd, stdio: "inherit" })`, no timeout. Release the slot in `finally`, only if the file still holds our token.
- **Record.** After the run, append one JSON line to `suites.jsonl` (start on a fresh line if the last one is torn, as the ledger does). Not a ledger event: ledger.ts stays untouched (it is in P-025's touches) and suite runs are not plan state.
- **Docs.** release.md: steps 2 and 3 say `node .crew/bin/crew.mjs suite --ref P-###` run in the background, then read its exit; never `hub.full_suite` by hand. The hub SKILL.md's "Before merging" sentence and model.md's `full_suite` row name `suite`; model.md gets a `suite_slots` row (default 1).
- **vitest.** `maxWorkers: "50%"` under `test` in vitest.config.ts, with a comment naming BUG-028.
- Generated files (`plugins/crew/skills/hub/dist/**`, `references/commands.md`): Release builds them. Developers run `npm run build` for the e2e tests and discard its output.

## Tasks
- [x] T1: `runSuite` with slots, stale takeover and the record; the `suite` CLI → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/suite.test.ts -t "slot|stale|exit"` (AC1, AC2, AC5, AC6)
- [x] T2: `suites` CLI and MCP tool; registration → verify: `npx vitest run test/hub/e2e/suite.test.ts -t record test/hub/registry.test.ts test/mcp.test.ts` (AC4, AC8)
- [x] T3: vitest `maxWorkers: "50%"` → verify: `grep -n 'maxWorkers: "50%"' packages/crew/vitest.config.ts` (AC3)
- [x] T4: release.md, SKILL.md, model.md → verify: `grep -n "crew.mjs suite" plugins/crew/skills/hub/agents/release.md plugins/crew/skills/hub/SKILL.md`; `grep -n suite_slots plugins/crew/skills/hub/references/model.md`; `npx vitest run test/plugin` (AC7)
- [x] T5: types and size → verify: `npm run typecheck`; `wc -l src/hub/commands/work/suite*.ts` each under 300 (AC8)

## Test plan
**Targeted checks** (from `packages/crew/`, after `npm run build`; `test/hub/e2e/suite.test.ts` (new) drives `dist/crew.mjs` in throwaway repos with `hub.full_suite` set to small shell commands; discard the build output afterwards):
- AC1 → `-t slot` (the regression test for BUG-028: two full suites no longer run at once): full_suite appends `s` to `runs.log`, sleeps 3 s, appends `e`; start one `suite` in the background, a second 0.5 s later; `runs.log` reads `s e s e`, the second's stderr has the waiting line, and its record's wait_ms is over 1000.
- AC2 → `-t slot` too: the same with `suite_slots: 2` in config; `runs.log` starts `s s`.
- AC4 → `-t record`: two runs, then `suites --json` (two records, newest first, all fields), `--limit 1`, the text form, and the MCP tool through `mcpCall` (test/hub/e2e/sections.ts).
- AC5 → `-t stale`: write `slot-0.lock` holding the pid of a child that has exited and this host; `suite` runs at once (wait_ms under 1000) and the slot file is gone afterwards.
- AC6 → `-t exit`: full_suite `exit 3` gives exit 3 and a record with exit 3; no full_suite, and `suite_slots: 0`, give the two messages, no record and no slot file.
- AC3 → T3's grep.
- AC7 → T4's greps and `npx vitest run test/plugin`.
- AC8 → `npx vitest run test/hub/registry.test.ts test/mcp.test.ts`; `npm run typecheck`; T5's `wc -l`.

## Rollout & rollback
Ships with the next `.crew/bin` refresh; until Release runs `crew.mjs suite`, nothing changes. Roll back by reverting the plan; the `suite` folder and `suites.jsonl` in the git common dir can be deleted.

## Risks & open questions
- **Queued forever.** A live but hung suite holds its slot. The waiting line names its run and start time so the Director can stop it. No deadline: a deadline would bring back merging on partial passes.
- **Agent tool timeouts.** A queued `suite` in a foreground Bash call can hit the 10-minute cap, so release.md says to run it in the background. A killed `crew.mjs` frees its slot (dead pid); its child shell may finish on its own.
- **maxWorkers 50% slows a lone run** on a machine that could take more; the durations in `suites` show whether to raise it.
- **Lock location:** decided — the git common dir, like the ledger, so every worktree shares it.
- P-032 (`land`) runs `hub.full_suite` in its step 5; it now depends on this plan and calls `runSuite`.

## Handoff

_Generated 2026-10-25 by `crew.mjs handoff` from the ledger._

- P-043: Serialize and cap the full suite under parallel plans [in-review] tasks 5/5 — claimed by Arpit Anand (developer:a1faaed4e6c15f0b2)
- last checkpoint 2026-10-25 13:27 at T5 (b656a0d) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —, AC6 —, AC7 —, AC8 —

Latest log:
- 2026-10-25: status in-progress → in-review
- 2026-10-25: review: changes requested — packages/crew/test/hub/registry.test.ts goes against the binding decision K-2026-10-25-approved-with-one-change-do-not-edit: the new ADDED list (lines 19-21, 56-57, 87) makes every later command-adding plan edit this file again, and it collides with P-031 (in review), which rewrites the same assertions. Replace it with the decision's form: inventory() restricted to BEFORE's keys compared with BEFORE (cli and tools), and BEFORE's command and tool names a subset of REGISTRY.from's and of COMMANDS (expect.arrayContaining), with no list of added names; registry-before.json stays untouched. Minor, same pass: in plugins/crew/skills/hub/agents/release.md step 2, rewrap the 'Never run hub.full_suite directly. This is the only place...' line to the file's ~120-column width. Everything else (suite.ts, suite.reg.ts, index.ts, suite.test.ts, mcp.test.ts, vitest.config.ts, SKILL.md, model.md) matches the spec: targeted tests (suite, registry, mcp, test/plugin) pass, typecheck clean, suite.ts 185 lines.
- 2026-10-25: status in-review → in-progress — changes requested: packages/crew/test/hub/registry.test.ts goes against the binding decision K-2026-10-25-approved-with-one-change-do-not-edit: the new ADDED list (lines 19-21, 56-57, 87) makes every later command-adding plan edit this file again, and it collides with P-031 (in review), which rewrites the same assertions. Replace it with the decision's form: inventory() restricted to BEFORE's keys compared with BEFORE (cli and tools), and BEFORE's command and tool names a subset of REGISTRY.from's and of COMMANDS (expect.arrayContaining), with no list of added names; registry-before.json stays untouched. Minor, same pass: in plugins/crew/skills/hub/agents/release.md step 2, rewrap the 'Never run hub.full_suite directly. This is the only place...' line to the file's ~120-column width. Everything else (suite.ts, suite.reg.ts, index.ts, suite.test.ts, mcp.test.ts, vitest.config.ts, SKILL.md, model.md) matches the spec: targeted tests (suite, registry, mcp, test/plugin) pass, typecheck clean, suite.ts 185 lines.

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-043-serialize-and-cap-the-full-suite-under
- 2026-10-25: status in-progress → in-review
- 2026-10-25: review: changes requested — packages/crew/test/hub/registry.test.ts goes against the binding decision K-2026-10-25-approved-with-one-change-do-not-edit: the new ADDED list (lines 19-21, 56-57, 87) makes every later command-adding plan edit this file again, and it collides with P-031 (in review), which rewrites the same assertions. Replace it with the decision's form: inventory() restricted to BEFORE's keys compared with BEFORE (cli and tools), and BEFORE's command and tool names a subset of REGISTRY.from's and of COMMANDS (expect.arrayContaining), with no list of added names; registry-before.json stays untouched. Minor, same pass: in plugins/crew/skills/hub/agents/release.md step 2, rewrap the 'Never run hub.full_suite directly. This is the only place...' line to the file's ~120-column width. Everything else (suite.ts, suite.reg.ts, index.ts, suite.test.ts, mcp.test.ts, vitest.config.ts, SKILL.md, model.md) matches the spec: targeted tests (suite, registry, mcp, test/plugin) pass, typecheck clean, suite.ts 185 lines.
- 2026-10-25: status in-review → in-progress — changes requested: packages/crew/test/hub/registry.test.ts goes against the binding decision K-2026-10-25-approved-with-one-change-do-not-edit: the new ADDED list (lines 19-21, 56-57, 87) makes every later command-adding plan edit this file again, and it collides with P-031 (in review), which rewrites the same assertions. Replace it with the decision's form: inventory() restricted to BEFORE's keys compared with BEFORE (cli and tools), and BEFORE's command and tool names a subset of REGISTRY.from's and of COMMANDS (expect.arrayContaining), with no list of added names; registry-before.json stays untouched. Minor, same pass: in plugins/crew/skills/hub/agents/release.md step 2, rewrap the 'Never run hub.full_suite directly. This is the only place...' line to the file's ~120-column width. Everything else (suite.ts, suite.reg.ts, index.ts, suite.test.ts, mcp.test.ts, vitest.config.ts, SKILL.md, model.md) matches the spec: targeted tests (suite, registry, mcp, test/plugin) pass, typecheck clean, suite.ts 185 lines.
- 2026-10-25: status in-progress → in-review
- 2026-10-25: status in-review → done
- 2026-10-25: merged to main 17cd337; full suite green, refresh-bin ok

## Outcome
New `suite [--ref P-###]` command (`commands/work/suite.ts`, exporting `runSuite` for P-032) runs `hub.full_suite` under one of `hub.suite_slots` slot files in the git common dir's `crew/suite/` (shared by every worktree), waits with one stderr line naming the holders, takes over a dead holder's slot (same host, ESRCH), exits with the suite's code and appends a record to `crew/suites.jsonl`; `suites [--limit] [--json]` and the MCP tool `suites` read them newest first. vitest runs at `maxWorkers: "50%"`; release.md, SKILL.md and model.md send Release through `crew.mjs suite`. registry.test.ts compares only registry-before.json's commands and tools (inventory picked to BEFORE's keys; BEFORE's names a subset of REGISTRY.from and COMMANDS), per K-2026-10-25-approved-with-one-change-do-not-edit and in the same form as P-031, so later plans that add commands don't edit it.
Learnings: K-2026-10-25-the-crew-guard-rewrites-every-crew-mjs
