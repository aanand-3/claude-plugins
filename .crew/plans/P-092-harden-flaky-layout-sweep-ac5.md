---
id: P-092
title: Harden flaky layout-sweep AC5 and playbook-home setup
goal: G-007
items: BUG-057
touches: packages/crew/src/tools/design/layout_sweep.ts, packages/crew/test/tools/layout-sweep.test.ts, packages/crew/test/hub/e2e/playbook-home.test.ts
depends_on:
status: ready
branch: plan/P-092-harden-flaky-layout-sweep-ac5
pr:
created: 2026-10-28
started:
completed:
assignee: developer
---

# P-092: Harden flaky layout-sweep AC5 and playbook-home setup

## Context
P0 per the Director (Q-9b0ef6): main's full suite fails on two timing-sensitive tests, so no plan can land. Fixes BUG-057
(layout-sweep AC5; playbook-home's 10 s beforeEach limit). Related: Q-51ab50, Q-a92aeb, BUG-039/P-086, BUG-049/P-077.
The mcp/view 120 s beforeAll timeouts are P-077's.

**layout-sweep AC5: the cause is in the sweep, not the test.** AC5 failed 3 of 3 times on 2026-10-28 (both P-062 land runs
and an isolated 4-file run next to mcp/view): the first pass (375 px light) either has no `#/board` finding (11 findings,
not 12) or labels it `#/board:backlog`. The Architect reproduced it with main's built `layout_sweep.mjs` on a sandbox like
the test's (`--widths 375,1440 --themes light,dark`): 3 of 3 clean at idle, 2 of 3 failing under 16 busy-loop node
processes on the 8-core Mac, once with each symptom. A probe that logs the page at each scan shows why: `settle()` in
`src/tools/design/layout_sweep.ts` counts the page as settled when the root's `innerHTML` length stays the same for 3
polls 100 ms apart, and the app's loading skeleton (`<div class="fullpage" aria-busy="true">`, 117 characters, shown until
the UI's own `fetch("api/graph")` answers) is exactly that. Under load the fetch takes longer than the sweep needs to walk
`overview, tree, graph, board`, so those routes are scanned on the skeleton (no findings). When the data lands during
`board:backlog`'s `settle`, the Backlog tab click has already run against the skeleton (`?.click()` on nothing) and the
plans board is scanned under the `board:backlog` label. Later passes are faster because the hub server is warm. Waiting in
the test cannot help: the test only sees the sweep's output. So the sweep must not scan a page that is still loading, and
must only scan `board:backlog` once the Backlog tab is selected.

**playbook-home: the hook limit is the 10 s default.** The `beforeEach` runs about ten synchronous child processes (git,
`crew.mjs init`, `agents`, `new-plan` with a plan worktree): about 2.5 s per test at idle, past 10 s under the full suite.
As in P-077, the hook is synchronous, so vitest cannot interrupt it and the limit catches no hang: each child already has
`Repo.run`'s 60 s `spawnSync` timeout, which is the real hang deadline. The limit only fails setups that finish slowly.

## Scope
**In:**
- `layout_sweep.ts`: the sweep waits until the hub UI has loaded before it scans a route (no `[aria-busy="true"]` in the
  page), with a deadline; a page that shows the UI's load error ends the sweep with exit 2; `board:backlog` is scanned
  only once its Backlog tab is selected.
- `layout-sweep.test.ts`: two new cases that drive the sweep over `--url` through an in-test `node:http` proxy to a real
  `crew.mjs ui`: one delays the browser's `api/graph` (regression for BUG-057), one answers it with 500 (load error).
  The existing three cases stay as they are.
- `playbook-home.test.ts`: an explicit hook limit on `beforeEach`, with the P-077 reasoning in a comment.

**Out (explicitly not doing):**
- mcp.test.ts / view.test.ts timeouts (P-077); P-086's CSS fix and its test changes.
- `layout_scan.ts` (the in-page check is right; the timing around it is not), `vitest.config.ts` (no global
  `hookTimeout`), the UI (`packages/crew/ui/**`): no new markers, the sweep uses what the UI already renders.
- Build outputs (`plugins/crew/skills/design/scripts/layout_sweep.mjs`, hub dist): Release builds them
  (K-2026-10-24-release-builds-the-generated-files-plans). The developer builds only to run the tests, which drive the
  bundle.
- Requiring app-specific markers for every route (nav `aria-current`, doc titles). That would break stub pages served
  over `--url`, such as P-086's planned AC4 sideways-scroll stub, and the probe shows the skeleton is the whole cause.

## Acceptance criteria
- [ ] AC1 (BUG-057 regression): a new `layout-sweep.test.ts` case serves the planted sandbox (the AC5 plant) through an
      in-test proxy that delays responses to `GET /api/graph` from the browser (user-agent contains `HeadlessChrome`) by
      4000 ms, and runs the sweep with `--url <proxy> --widths 375 --themes light,dark`. It exits 1, prints
      `375px light #/board: overflow: div.doccard__title` and `375px dark #/board: overflow: div.doccard__title` lines,
      and prints no line containing `#/board:backlog:`. With the base branch's `layout_sweep.ts` built, the case fails.
- [ ] AC2 (load error): a new case whose proxy answers the browser's `GET /api/graph` with 500 gets exit 2 from the sweep,
      a stderr line starting `layout_sweep: ` that contains `The hub server answered 500`, and no `clean` in stdout,
      within the test's 120 s limit. (On the base branch the same run scans the error page and does not exit 2.)
- [ ] AC3: a page that never stops loading ends the sweep with exit 2 and a message naming the route and the deadline
      (`the hub UI is still loading #/<route> after <n> s`); the deadline is one named constant in `layout_sweep.ts`
      of at least 60 s. Checked by reading the diff (no test: it would take a minute).
- [ ] AC4: `board:backlog` is scanned only with the Backlog tab selected: after the click, the sweep waits (within the
      same deadline) until a `[role=tab][aria-selected=true]` whose text matches /backlog/i exists, and ends with exit 2
      if a Backlog tab exists but never becomes selected. A page with no Backlog tab at all is scanned as it is (so stub
      pages over `--url` still sweep). Covered by AC1's no-`#/board:backlog:` assertion and by reading the diff.
- [ ] AC5: the existing cases (planted overflow AC5, clean AC6, no browser AC6) pass unchanged: `git diff <base> --
      packages/crew/test/tools/layout-sweep.test.ts` only adds lines (plus imports). If P-086 has landed first and its
      stub-page case is on the base, that case passes too.
- [ ] AC6 (load): with 16 busy-loop node processes running, `npx vitest run test/tools/layout-sweep.test.ts` passes 3
      times in a row on the branch. Recorded in the Progress log with the base run for comparison (the planted AC5 case
      failed 2 of 3 under this load on main; if the base does not fail in the recorded runs, say "not reproduced").
- [ ] AC7: `playbook-home.test.ts`'s `beforeEach` has an explicit limit from a named constant of 600 000 ms, with a
      comment saying the hook is synchronous, so the limit catches no hang (each child's 60 s `Repo.run` timeout does)
      and must only not fail a slow setup. The file passes, and passes under the AC6 load.
- [ ] AC8: `npm run typecheck` is clean.

## Approach
- In `layout_sweep.ts`, add a wait (e.g. `loaded(page, route)`) that polls every 100 ms until the page has no
  `[aria-busy="true"]` element, up to `LOAD_TIMEOUT_MS` (60 000). Before polling ends, if the page shows the UI's load
  error (a `.fullpage` without `aria-busy`, whose `h1`/`p` text the UI renders on a failed load), throw `CannotRun` with
  that text. On the deadline throw `CannotRun("the hub UI is still loading #/<route> after 60 s")`. `CannotRun` already
  maps to exit 2 and `layout_sweep: <message>` on stderr; the browser is closed by the existing `finally`.
- Call it after the per-pass `Page.navigate` (before the theme check, so the check reads the loaded page) and in
  `show()` after the hash change, before `settle()`. Keep `settle()` as it is: after the load wait it measures the real
  view.
- In `show()` for `board:backlog`: after `loaded`, click the Backlog tab if one exists, then poll until it is selected
  (same deadline, `CannotRun` naming `#/board:backlog` on timeout); skip the wait when the page has no Backlog tab.
- Tests (AC1, AC2): an async helper in the test file that starts `crew.mjs ui --no-open --port 0` in the sandbox with
  `spawn` (cwd `repo.path`, env `repo.env`, the hub at `plugins/crew/skills/hub/dist/crew.mjs` via the test helpers'
  paths), reads `Hub UI at <url>` from stdout, starts a `node:http` proxy on port 0 that forwards every request to that
  URL (pipe request and response, so `api/events` streams) and applies the case's rule to browser `GET /api/graph`
  requests, then runs the sweep with `spawn` (not `repo.run`: `spawnSync` would block the proxy in this process) and
  resolves with code, stdout and stderr. Close the proxy and kill the hub in `finally`. The sweep's own `fetch` of
  `api/graph` (Node, no `HeadlessChrome` user-agent) passes through undelayed. Both cases use `withBrowser`.
- Assert only on `#/board` lines in AC1, not on `#/doc/P-001` lines: P-086 changes what the doc page reports, and keeps
  `div.doccard__title` on `#/board` as the planted overflow.
- playbook-home: `const SETUP_HOOK_MS = 600_000;` and `beforeEach(() => { … }, SETUP_HOOK_MS);` with the comment.

## Design

## Tasks
- [ ] T1: the load wait, load-error exit and Backlog-tab wait in `layout_sweep.ts` → verify: `cd packages/crew && npm run
      typecheck`; read the diff for AC3/AC4 (AC3, AC4, AC8)
- [ ] T2: the two proxy cases in `layout-sweep.test.ts` → verify: `npm run build && npx vitest run
      test/tools/layout-sweep.test.ts` passes all five cases; then write the base `layout_sweep.ts` from
      `git show <base>:packages/crew/src/tools/design/layout_sweep.ts`, `npm run build`, rerun: AC1 and AC2 fail; restore
      from `git show HEAD:…` (or the working file) and `npm run build` again (AC1, AC2, AC5)
- [ ] T3: the hook limit in `playbook-home.test.ts` → verify: `npx vitest run test/hub/e2e/playbook-home.test.ts`;
      `grep -n "SETUP_HOOK_MS" test/hub/e2e/playbook-home.test.ts` (AC7)
- [ ] T4: load regression → verify: the AC6 procedure in the Test plan on the branch (3 runs) and once on the base
      build, results in the Progress log (AC6, AC7)

## Test plan
**Targeted checks** (from `packages/crew`, after `npm ci --prefer-offline` in a fresh worktree and `npm run build`; the
tests drive the built bundle, so rebuild after every source change and after restoring a base copy):
- AC1, AC2, AC5 → `npx vitest run test/tools/layout-sweep.test.ts` (5 cases pass; none skipped on the Mac, which has
  Chrome); the base-branch swap in T2 shows AC1 and AC2 fail without the fix.
- AC3, AC4 → read `git diff <base> -- packages/crew/src/tools/design/layout_sweep.ts`: one deadline constant ≥ 60 000,
  the message text, the tab wait and its no-tab skip.
- AC5 → `git diff <base> -- packages/crew/test/tools/layout-sweep.test.ts` shows no removed lines in the existing cases.
- AC6, AC7 (load) → start `for i in $(seq 16); do node -e 'for(;;){}' & done`, run
  `npx vitest run test/tools/layout-sweep.test.ts test/hub/e2e/playbook-home.test.ts` 3 times, then stop the load with
  `kill $(jobs -p)` (or `pkill -f "for(;;){}"`). All pass on the branch; note the base result for comparison.
- AC7 → `npx vitest run test/hub/e2e/playbook-home.test.ts`; `grep -n "SETUP_HOOK_MS"`.
- AC8 → `npm run typecheck`.
The full suite is Release's, before the merge.

## Rollout & rollback
Test and dev-tool change only; no runtime or data change. Rollback: revert the plan's commit. A sweep run against a hub
that loads slowly now waits up to 60 s per route instead of reporting a clean pass on the skeleton.

## Risks & open questions
- P-086 (in progress) also edits `layout-sweep.test.ts` (a `hub.shared` path): it changes the planted case's doc-page
  expectations and adds a stub-page case over `--url`. P-092 adds cases and edits none, so the merge is additive; the
  second to land rebases. P-092's load wait accepts a stub page (no `aria-busy`, no Backlog tab), so P-086's stub case
  keeps working.
- The AC6 load regression depends on the machine; a base run that does not fail is recorded as "not reproduced", not as
  a pass. AC1 is the deterministic regression.
- If the 4000 ms delay is not enough to make AC1 fail on the base build, raise it (the base must fail) and say so in the
  Progress log.

## Handoff

## Progress log
- 2026-10-28 architect: reproduced with main's built sweep on an AC5-style sandbox: 3/3 clean at idle; under 16 busy
  loops 2/3 failed (`375px light #/board:backlog: overflow…` with 11 findings; no 375px light board finding with 11
  findings). Probe at 375 px light under load: every route through `board` was scanned with `[aria-busy=true]` and a
  117-character root; `board:backlog` scanned the plans board when the data arrived mid-settle.
- 2026-10-28: status draft → ready
- 2026-10-28: assigned to the developer role

## Outcome
