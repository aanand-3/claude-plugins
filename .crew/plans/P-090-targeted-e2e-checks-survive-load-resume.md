---
id: P-090
title: Targeted e2e checks survive load; resume shows the failing line
goal:
items: BUG-055
touches: packages/crew/vitest.config.ts, packages/crew/test/helpers/repo.ts, packages/crew/test/hub/e2e/inbox.test.ts, packages/crew/src/hub/commands/work/check-output.ts, packages/crew/src/hub/commands/work/execution.ts, packages/crew/test/hub/check-output.test.ts, packages/crew/test/setup/timeouts.test.ts, packages/crew/test/hub/e2e/execution.test.ts
depends_on:
status: draft
branch: plan/P-090-targeted-e2e-checks-survive-load-resume
pr:
created: 2026-10-28
started:
completed:
---

# P-090: Targeted e2e checks survive load; resume shows the failing line

## Context
BUG-055 (G-007): targeted e2e checks fail under machine load although the code is fine, and the failure goes back to
developers as "a check failed". It hit P-068, P-074, P-078, P-085 and a P-080 review. The ledger shows three limits that
measure speed rather than catch hangs:
- `Error: Hook timed out in 10000ms` in guard-writes.test.ts's `beforeEach` (Repo.create + init). vitest.config.ts sets
  `testTimeout: 120_000` but no `hookTimeout`, so every `beforeEach`/`beforeAll` without its own limit gets vitest's 10 s default.
- `spawnSync node|git ETIMEDOUT` from `Repo.run` in test/helpers/repo.ts, which kills any child after 60 s (team.test.ts,
  goal-links.test.ts, design-review.test.ts).
- A 30 s per-test override on inbox.test.ts's `ui:` test, below the config's 120 s.

The second part: `recovery()` in commands/work/execution.ts (which both `resume` and `context` use) prints only the last
non-empty line of a failing check's stored output. For vitest that is the decoration `⎯⎯⎯[1/1]⎯`, so agents decided "no
output was recorded" although the ledger had the error line. Two P-068 checks also recorded an empty output with no reason.

Earlier work on the same problem: BUG-028/P-043 (one full suite at a time, maxWorkers 50%) and P-077/BUG-049 (view.test.ts
sample-project setup). K-2026-10-26-specced-as-p-077 set the rule this plan follows: a limit on deterministic test work is
a hang deadline, not a speed bound, because wall time follows load from outside the suite.

## Scope
**In:**
- vitest.config.ts: `testTimeout` and `hookTimeout` both 300 s.
- test/helpers/repo.ts: `Repo.run` kills a child after an exported `SPAWN_TIMEOUT_MS = 300_000`, read from an
  instance field `timeoutMs` that tests may change (like `env`). When the child is killed it throws an Error that names
  the command and says it timed out, instead of the bare `spawnSync node ETIMEDOUT`.
- inbox.test.ts: drop the `30_000` override on the `ui:` test so it uses the config's limit.
- New module `commands/work/check-output.ts`:
  - `failSummary(output)` picks the line(s) worth showing for a failing check.
  - `runOutput(result, limitMs)` builds a `--run` check's output text and appends a timeout line when the check was killed.
- execution.ts calls the new module. Keep this edit small, because P-072, P-075 and P-084 also edit the file:
  - `recovery()` shows `failSummary(v.output)`.
  - It adds one pointer line to the full output when any check fails.
  - `checkpoint --run` records `runOutput(...)`.

**Out (explicitly not doing):**
- Other `30_000` per-test overrides: live-ui.test.ts (P-078 is in review there), view.test.ts (P-077), dist, codegraph and
  upgrade-hints. None of these failed under load in the ledger. Capture them as one follow-up if they ever fail.
- Load-scaled limits, more serialisation of runs, and a load test. Agents can't run a load test (P-077's AC4 had to be waived).
- Storing more output: the 15-line / 2000-char tail in the ledger stays as it is.
- `land`'s own tail of failing output (land.ts).

## Acceptance criteria
- [ ] AC1: `packages/crew/vitest.config.ts` sets `test.testTimeout` and `test.hookTimeout` both to `300_000`. test/setup/timeouts.test.ts imports the config and checks both values.
- [ ] AC2: test/helpers/repo.ts exports `SPAWN_TIMEOUT_MS = 300_000`, and a new `Repo` has `timeoutMs === SPAWN_TIMEOUT_MS`. When a child runs past `timeoutMs`, `Repo.run` throws an Error whose message is `${cmd} ${args[0]}: timed out after ${timeoutMs / 1000} s (killed; a hang or a heavily loaded machine)`. timeouts.test.ts checks this by setting `timeoutMs = 200` and running `node -e "setTimeout(() => {}, 5000)"`, and expects `/node -e: timed out after 0\.2 s/`. A child that finishes in time returns as before.
- [ ] AC3: the `ui:` test in `packages/crew/test/hub/e2e/inbox.test.ts` no longer passes a timeout argument. `grep -c "}, 30_000);" packages/crew/test/hub/e2e/inbox.test.ts` prints `0`, and inbox.test.ts passes.
- [ ] AC4: `failSummary(output)` in check-output.ts follows these rules, each covered by a case in test/hub/check-output.test.ts:
  - (a) It ignores blank lines and decoration lines. A decoration line is one whose trimmed text starts or ends with `⎯`, or consists only of `⎯`, `─`, `-`, `=`, spaces and a `[n/m]` counter.
  - (b) It returns the first line whose trimmed text starts with `FAIL ` and the first other line matching `/\b\w*Error\b|ETIMEDOUT|timed out/`, trimmed and joined with ` · `, or whichever of the two exists.
  - (c) If neither exists, it returns the last non-decoration line.
  - (d) If no line is left, it returns `no output recorded`.
  - (e) The result is capped at 300 characters.

  The fixtures are P-068's two recorded outputs, copied verbatim from the ledger:
  - The hook-timeout output gives `FAIL  test/hub/e2e/guard-writes.test.ts > paths.write binds Bash writes (BUG-033) · Error: Hook timed out in 10000ms.`
  - The ETIMEDOUT output gives `FAIL  test/hub/e2e/team.test.ts > a developer starts only what the PM assigned to it · Error: spawnSync node ETIMEDOUT`.

  The FAIL line is trimmed at its ends only, so the inner double space stays.
- [ ] AC5: `resume P-001` and `context P-001` show `failSummary` of a failing check's output after ` — `. When at least one check is failing, they also show the line `full output: crew.mjs ledger --ref P-001 --type checkpoint --json`. When none is failing, that line is absent. A new case in test/hub/e2e/execution.test.ts runs `checkpoint --run` on a command that prints a vitest-like failure: a FAIL line, an Error line, stack lines, and a closing `⎯⎯[1/1]⎯` line. Both outputs show the FAIL · Error summary and the pointer line, and neither shows `[1/1]`. The existing case "a crashed run resumes from the ledger" still passes unchanged (`— AssertionError: 409 expected`).
- [ ] AC6: `runOutput(result, limitMs)` returns `stdout + stderr`. If the result shows the child was killed (`error.code === "ETIMEDOUT"` or a non-null `signal`), it appends a line `check timed out: killed after <limitMs/1000> s (<signal or code>)`. `checkpoint --run` stores that text, after the existing tail and secret filter. A unit case in check-output.test.ts passes a fake spawnSync result (`status: null, signal: "SIGTERM", error: { code: "ETIMEDOUT" }`, empty stdout and stderr) with `limitMs = 600_000`. It expects that line, and `failSummary` of it to be `check timed out: killed after 600 s (SIGTERM)`.

## Approach
- Limits become hang deadlines (K-2026-10-26-specced-as-p-077). Every limit is 300 s: config test, config hook, and one
  child process. A single git or node call in these tests takes well under a second when the machine is idle, so 300 s
  only trips on a real hang. vitest enforces the limit on synchronous tests and hooks when they return (the 10 s hook failure
  showed that), so a hang still fails, just later. The helper's ETIMEDOUT message says "timed out", so a load or hang
  failure reads differently from an assertion failure.
- `Repo.timeoutMs` is an instance field, like `Repo.env`, so the timeout path can be tested in milliseconds. Don't add a
  per-call parameter.
- The selection logic lives in check-output.ts, a pure module with no store and no git. execution.ts is at 251 lines (the
  structure test caps files at 300) and three other plans edit it, so its diff should be:
  - one import;
  - the `recovery()` render line uses `failSummary`;
  - one `out.push` of the pointer line after the verify loop, when any latest check is failing;
  - the `--run` branch passes `runOutput(r, RUN_TIMEOUT_MS)` to `tail`.
- `context` gets the fix through `recovery()`, so context.ts doesn't change.
- The e2e tests drive the built bundle, so run `cd packages/crew && npm run build` before execution.test.ts.
- Overlaps: execution.ts with P-084 (in progress), P-072 and P-075 (accepted, landing). This plan waits for them to land
  rather than depending on them, because it needs none of their code. If P-084 moves `recovery` into
  commands/work/resume.ts, rebase and apply the same render-line change there. Its touches then gain resume.ts: ask the
  architect to amend the plan. The test files are all hub.shared.

## Design

## Tasks
- [ ] T1: vitest.config.ts: set `testTimeout` and `hookTimeout` to 300_000 and update the config's comment. test/helpers/repo.ts: add `SPAWN_TIMEOUT_MS`, the `timeoutMs` field and the timed-out Error, and update the doc comment on `run`. inbox.test.ts: drop the `30_000`. Add test/setup/timeouts.test.ts. → verify: `cd packages/crew && npx vitest run test/setup/timeouts.test.ts test/hub/e2e/inbox.test.ts test/hub/e2e/guard-writes.test.ts` passes (AC1-3)
- [ ] T2: check-output.ts with `failSummary` and `runOutput`, and test/hub/check-output.test.ts with the P-068 fixtures. → verify: `cd packages/crew && npx vitest run test/hub/check-output.test.ts` passes (AC4, AC6)
- [ ] T3: execution.ts: `recovery()` uses `failSummary` and adds the pointer line, and `checkpoint --run` records `runOutput`. Add the execution.test.ts case. → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/execution.test.ts test/hub/e2e/context.test.ts test/structure.test.ts` passes and `npm run typecheck` is clean (AC5, AC6)

## Test plan
**Targeted checks:**
- AC1, AC2: `npx vitest run test/setup/timeouts.test.ts` (new).
- AC3: `grep -c "}, 30_000);" test/hub/e2e/inbox.test.ts` prints 0, and `npx vitest run test/hub/e2e/inbox.test.ts` passes.
- AC4, AC6: `npx vitest run test/hub/check-output.test.ts` (new; unit; fixtures are the P-068 ledger outputs). This is the
  regression for the "only the last line" half. On the base branch the summary would be `⎯⎯⎯[1/1]⎯`.
- AC5: `npm run build && npx vitest run test/hub/e2e/execution.test.ts test/hub/e2e/context.test.ts` (new case plus the existing ones).
- Unchanged behaviour: `npx vitest run test/hub/e2e/guard-writes.test.ts test/hub/e2e/team.test.ts test/structure.test.ts`, and `npm run typecheck`.
- All of these run from `packages/crew`. Nobody runs a load test: an idle machine can't show the timeout change, so
  AC1-AC2 check the configured limits and the timeout path directly.

## Rollout & rollback
n/a: only the test configuration, a test helper and how a check's output is rendered and recorded change. Back out by
reverting the plan's commit. Ledger entries recorded with the timeout line stay readable by the old code.

## Risks & open questions
- A real hang now takes up to 300 s to fail instead of 60 s or 10 s. That is acceptable: hangs are rare, and false
  failures under load cost a bounce each.
- The first-error rule can pick a non-cause line, e.g. when a test name contains "Error". The FAIL line next to it keeps
  the summary useful, and the full output is one command away (the pointer line).
- Other 30 s overrides (live-ui, view, dist, codegraph, upgrade-hints) stay as they are. If one fails under load, apply
  the same rule to it.

## Handoff

## Progress log

## Outcome
