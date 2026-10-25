---
id: P-041
title: Test suite removes its temp dirs
goal: G-007
items: BUG-025
touches: packages/crew/test/helpers/**, packages/crew/test/setup/**, packages/crew/vitest.config.ts
depends_on:
status: in-review
branch: plan/P-041-test-suite-removes-its-temp-dirs
pr:
created: 2026-10-25
started: 2026-10-25
completed:
assignee: developer
---

# P-041: Test suite removes its temp dirs

## Context
BUG-025 (S1, P1, goal G-007): the crew test suite creates mkdtemp dirs and never removes them. Repo.create
(packages/crew/test/helpers/repo.ts:36, prefix crew-tools-*) makes one real git repo per test; other tests make
hub-*, crew-later-*, wada-*, research-* dirs. On 2026-10-25 the macOS temp dir held 7,000+ of them (~19 GB), the
disk hit ENOSPC and the whole team stopped (P-028's full suite, P-024, P-038). Parallel plans multiply the leak.
Autonomous parallel delivery (G-007) cannot run while one suite run can fill the disk.

## Scope
**In:**
- The test helpers (packages/crew/test/helpers/**) remove every temp dir they create.
- A vitest setup/teardown (new file under packages/crew/test/setup/, wired in packages/crew/vitest.config.ts if
  needed) that removes the temp dirs created during the run.
- The individual test files that call mkdtemp directly route through the teardown (the run-scoped temp root in
  Approach), so none of them is edited; in particular packages/crew/test/view.test.ts stays P-029's.

**Out (explicitly not doing):**
- Any product code (packages/crew/src/**, plugins/**). If a crew-git-* dir comes from product code, capture a
  separate item instead of fixing it here.
- packages/crew/test/hub/e2e/sparse-worktrees.test.ts (P-024) and packages/crew/test/hub/refresh-bin.test.ts
  (P-038): the shared teardown must cover them without editing them.
- Deleting the leftovers already on the machine (a one-off manual cleanup, not this plan).

## Acceptance criteria
- [ ] After a full suite run of packages/crew, no new crew-tools-*, hub-*, crew-later-* or crew-git-* dirs remain
      in os.tmpdir() (count before vs after the run is equal).
- [ ] Repo.create's dirs are removed when the test that made them ends (or at the latest when its file ends), so a
      single file's run leaves nothing behind.
- [ ] A regression test fails if a helper-created temp dir survives teardown.
- [ ] No file under packages/crew/src/** or plugins/** changes, and the plan touches neither P-024's nor P-038's files.

## Approach
<!-- Architect -->
Two layers, both test-only:

1. **Run-scoped temp root (vitest `globalSetup`)** — new `packages/crew/test/setup/tmp-root.ts`, wired as
   `test.globalSetup` in `packages/crew/vitest.config.ts`. Before any worker starts it makes
   `<os.tmpdir()>/crew-test-run-<pid>-XXXXXX` and sets `process.env.TMPDIR` (and `TMP`, `TEMP`) to it; its returned
   teardown `rmSync`s that root (`recursive, force, maxRetries: 3`) and restores the variables. Workers (forks and
   threads) and every child process inherit the variable, so **every** `os.tmpdir()`/mkdtemp in the run lands under the
   root: Repo.create's crew-tools-*, the hub-* dirs (hub-view-, hub-mcp-, hub-lock-, hub-design-, hub-graph-,
   hub-legacy-, hub-activity-), crew-later-*, research-*, wada-*, guard.test.ts's side-*, build.mjs's hub-ui-* (product
   build code, not edited), and the test files of P-024/P-038, which this plan never touches. Verified with vitest 5.0.5
   in a scratch project: `process.env.TMPDIR` set in globalSetup reaches `os.tmpdir()` in fork and thread workers and in
   their `execFileSync` children. It also runs for a single-file run (`vitest run test/x.test.ts`).
   - **Interrupted runs**: a killed vitest never runs teardown, so setup first sweeps sibling `crew-test-run-<pid>-*`
     roots whose pid is no longer alive (`process.kill(pid, 0)` throws ESRCH); roots of live pids (parallel plans'
     runs) are left alone. It touches nothing but `crew-test-run-*`, so the legacy leftovers stay out of scope.
   - The module exports its pieces as plain functions taking a base dir (`createRunRoot(base)`, `sweepStale(base)`)
     plus the vitest default export, so the regression test drives them directly instead of nesting vitest.

2. **Per-test removal in the helper** — `packages/crew/test/helpers/repo.ts` keeps a module-level list of the dirs it
   made. `Repo.create` records its path (test scope); a new exported `tempDir(prefix)` mkdtemps under `os.tmpdir()` and
   records it with file scope (for later use; no existing file is migrated to it). A new `setupFiles` entry,
   `packages/crew/test/setup/cleanup.ts`, registers `afterEach` (removes every test-scoped dir plus its `<path>-*`
   siblings — `orgPlaybook` in test/hub/e2e/sections.ts makes `<repo>-playbook` next to the repo) and `afterAll`
   (removes file-scoped dirs). Every Repo.create call today is in a beforeEach or a test body (none in beforeAll or at
   module level), so per-test removal is safe. setupFiles hooks are registered first and vitest's default
   `sequence.hooks: 'stack'` runs after-hooks in reverse, so a file's own afterEach (live-ui.test.ts kills its
   servers) runs before the dir is removed.

Decisions:
- **crew-git-\* origin**: test code, not product code. `git log -S crew-git-` shows a
  `mkdtempSync(join(tmpdir(), "crew-git-"))` in packages/crew/test/hub-worktrees.test.ts (added in d73e417, P-018);
  main no longer has it, but older plan worktrees/branches (e.g. P-021, P-025) still do, and their suite runs made those
  dirs. No separate item: those branches get this teardown when they rebase, and layer 1 covers any prefix.
- **wada-\*/research-\***: covered by layer 1 without editing tools/design.test.ts or tools/research.test.ts.
- **Keep on failure**: not implemented. Dirs are removed whether a test passes or fails; to inspect one, rerun the
  single test with a temporary log of `repo.path` and a breakpoint. A knob nobody has asked for is not worth the risk
  of a forgotten env var refilling the disk.
- No product code changes (src/**, plugins/**, build.mjs), and no edits to the individual test files (view.test.ts
  stays P-029's).

## Tasks
<!-- Architect -->
- [x] T1: Add the run-scoped temp root and wire it as globalSetup → verify: `npx vitest run test/setup` passes and afterwards `ls -d "$TMPDIR"/crew-test-run-*` lists no root with that run's pid.
      `test/setup/tmp-root.ts` exports createRunRoot(base), sweepStale(base) and the default globalSetup returning
      the teardown; `globalSetup` added in vitest.config.ts.
- [x] T2: Track the helper's dirs and remove them per test / per file → verify: the T3 test passes, and `npx vitest run test/hub/e2e/playbook-home.test.ts test/hub/e2e/live-ui.test.ts` passes.
      helpers/repo.ts: Repo.create test-scoped, new `tempDir(prefix)` file-scoped; `test/setup/cleanup.ts` as a
      `setupFiles` entry (afterEach + afterAll, removing `<path>-*` siblings too).
- [x] T3: Regression test `test/setup/tmp-cleanup.test.ts` → verify: it passes with T1–T2, and fails with cleanup.ts's afterEach body or the teardown's rmSync commented out (checked once by the developer, noted in the progress log).
      Cases: (a) `os.tmpdir()` is inside a `crew-test-run-` root; (b) a Repo.create dir and its `-playbook`
      sibling made in one test are gone in the next test of the file; (c) a `tempDir()` dir survives across tests of
      the file; (d) `createRunRoot` + its teardown on a scratch base leaves the base empty; (e) `sweepStale` removes a
      root named with a dead pid (an exited child's) and keeps one named with `process.pid`.
- [x] T4: Typecheck the new files → verify: `npm run typecheck` in packages/crew passes (tsconfig already includes test/ and vitest.config.ts).

## Test plan
<!-- Architect -->
**Targeted checks** (one sequential run each; none needs repeated or parallel full-suite runs):
- AC1, AC2, AC3: `npx vitest run test/setup` (the T3 regression test, cases a–e).
- AC1 across the prefixes: count, run once, count again —
  `ls -d "$TMPDIR"/{crew-tools,hub,crew-later,crew-git,research,wada,side,crew-test-run}-* 2>/dev/null | wc -l`
  before and after `npx vitest run test/setup test/hub-worktrees.test.ts test/ledger.test.ts test/codegraph.test.ts
  test/tools/research.test.ts test/tools/design.test.ts test/hub/e2e/guard.test.ts test/hub/e2e/playbook-home.test.ts`
  (exercises crew-tools, -playbook, crew-later, hub-lock, hub-graph, research, wada, side); the counts are equal.
  Another plan's suite running on old code at the same time can add dirs, so QA instead may touch a marker file before
  the run and check `find "$TMPDIR" -maxdepth 1 -newer <marker> \( -name 'crew-*' -o -name 'hub-*' -o -name 'research-*' -o -name 'wada-*' \)`
  lists nothing from this run (the run root's pid is in its name).
- AC2 (single file): `npx vitest run test/hub/e2e/basics.test.ts` with the same before/after count — equal.
- AC4: `git diff --name-only <base>` in the worktree lists only paths under test/helpers/, test/setup/ and
  vitest.config.ts.
- Guard under the redirect: `npx vitest run test/hub/e2e/guard.test.ts` passes (its tmpdir and side-* cases resolve
  inside the run root, in both the test and the hub child).
- Typecheck: `npm run typecheck`.
The full-suite before/after count of AC1 is read from Release's one full run before merge.

## Rollout & rollback
n/a — test-only change; revert the commit to back out.

## Risks & open questions
- Resolved: crew-git-* came from test code on older branches (see Approach); wada-*/research-* are covered by the run
  root; keep-on-failure is not implemented.
- A detached process a test leaves running could write into a removed dir; rmSync uses `force` and `maxRetries`, and
  live-ui's own afterEach kills its servers first.
- Branches cut before this plan merges still leak until they rebase onto it.

## Handoff

_Generated 2026-10-25 by `crew.mjs handoff` from the ledger._

- P-041: Test suite removes its temp dirs [in-review] tasks 4/4 — claimed by Arpit Anand (developer:a9a5a728521f0b44d)
- last checkpoint 2026-10-25 08:45 at T4 (d3eceaf) by Arpit Anand; since then 0 commit(s), 3 uncommitted file(s): packages/crew/test/helpers/repo.ts, packages/crew/vitest.config.ts, packages/crew/test/setup/
- evidence: AC1 —, AC2 —, AC3 —, AC4 —

Latest log:
- 2026-10-25: status draft → ready
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-041-test-suite-removes-its-temp-dirs

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-041-test-suite-removes-its-temp-dirs
- 2026-10-25: status in-progress → in-review
- 2026-10-25: T3 mutation check (developer, once): cleanup.ts afterEach body commented out -> case (b) fails; tmp-root teardown rmSync commented out -> case (d) fails, (e) cascades. Both restored; the mutated run's leftover root was swept by the next run.

## Outcome
Run-scoped temp root: test/setup/tmp-root.ts (globalSetup) points TMPDIR/TMP/TEMP at crew-test-run-<pid>-* and removes it on teardown, sweeping roots of dead pids first. test/helpers/repo.ts tracks Repo.create (per test) and tempDir() (per file) dirs; test/setup/cleanup.ts (setupFiles) removes them with their <path>-* siblings. Regression test test/setup/tmp-cleanup.test.ts (cases a-e). Awaiting QA.
Learnings: K-2026-10-25-a-vitest-run-killed-before-teardown
