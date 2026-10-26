---
id: P-066
title: Runner lock and idle mode
goal:
items: FEAT-059
touches: packages/crew/src/hub/core/lock.ts, packages/crew/src/hub/commands/work/suite.ts, packages/crew/src/hub/commands/team/runner.ts, packages/crew/src/hub/commands/team/runnerlock.ts, packages/crew/src/hub/commands/team/autonomy.ts, packages/crew/src/hub/commands/team/autonomy.reg.ts, packages/crew/src/hub/commands/views/reports.ts, packages/crew/src/hub/registry.ts, packages/crew/src/hub/cli.ts, packages/crew/src/hub/main.ts, plugins/crew/skills/team/SKILL.md, packages/crew/test/hub/lock.test.ts, packages/crew/test/hub/e2e/runner.test.ts
depends_on:
status: in-progress
branch: plan/P-066-runner-lock-and-idle-mode
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
---

# P-066: Runner lock and idle mode

## Context
G-007 AC5 ("answer from the inbox and the next pass continues") fails today: `run --until-done`
(packages/crew/src/hub/commands/team/runner.ts, P-034) exits on a pause, an empty dispatch and a missing approved goal,
so a later answer, approval, `ask` or `resume` reaches no one until a human restarts it. Nothing stops two runners on
one clone either. FEAT-059 gives the runner a single-instance lock and an idle mode. This is step 4 ("Plan A") of
.crew/drafts/yes-pm-logs-them-recursive-sparkle.md. FEAT-063 (expedite, ui runner panel) and FEAT-064 (runner-only
launches, which reads this plan's lock and per-pass token) build on it.

Binding knowledge: K-2026-10-25-full-suites-run-through-the-hubs-suite (slot locks in the git common dir, stale only when
the holder pid is dead on this host), K-2026-10-23-every-module-stays-under-300-lines (and src/core never imports
src/commands), K-2026-10-25-each-command-registers-its-cli-spec-help, K-2026-10-25-a-plan-that-adds-a-hub-command-or-mcp
(registry.test.ts), K-2026-10-25-run-check-json-can-print-a-second-line, K-2026-10-24-release-builds-the-generated-files-plans,
K-2026-10-25-unattended-runs-use-claude-p-permission.

## Scope
**In:**
- A shared lock module `packages/crew/src/hub/core/lock.ts`, extracted from `commands/work/suite.ts`: create-exclusive
  write (`wx`), holder read, stale check, atomic take-over of a stale file, release by token. `suite.ts` uses it with
  unchanged behaviour (its waiting loop stays in suite.ts).
- The runner lock: one try (no waiting) on `<git common dir>/crew/runner/lock`. The holder records pid, the process's
  start time (`ps -o lstart= -p <pid>`), a stable machine id (`/etc/machine-id` on Linux, `IOPlatformUUID` from
  `ioreg -rd1 -c IOPlatformExpertDevice` on macOS, else the hostname), the run start time and the checkout path.
  Stale = same machine id and (pid gone, or the pid's start time differs from the recorded one: pid reused after a reboot).
  A second runner refuses (exit 1) and names the holder: pid, since when, checkout.
- `run --unlock`: removes the runner lock when its holder is not a live process on this machine; otherwise refuses and
  names the live holder. A crew agent can't run it (same check as `--until-done`).
- The runner refuses to start: from a crew agent (as today); from a Claude Code tool call (`CLAUDECODE` set in its
  environment); outside the main checkout (a linked worktree: its git dir differs from the common dir), naming the
  main checkout's path.
- The loop becomes async: each pass is spawned with `child_process.spawn` (shell, stdio inherit, cwd root). SIGINT,
  SIGTERM and SIGHUP are forwarded to the running pass; the runner waits for it (a second signal kills it), records a
  runner `report` with `stopped: "interrupted"`, notifies `stopped`, releases the lock and exits 130. Every exit path
  (stop, preflight after locking, an exception) releases the lock.
- A heartbeat in `<git common dir>/crew/runner/state.json`, written at each pass start and end and each idle re-check:
  pid, run start, pass number, `state` (`running` | `idle`), idle reason, time of the last progress (a pass with
  progress > 0), the current pass token, `updated`.
- Idle mode: when `runState` says stop or dispatch is empty, the runner does not exit. It prints `IDLE  <reason>`,
  records one runner `report` `{ source: "runner", idle: <reason> }` and notifies `stopped` once per distinct reason in
  this run (key: run start + reason), then re-checks on a ledger change (`fs.watch` on the ledger's directory, debounced)
  or on a backoff timer (2 s doubling to 60 s, reset on wake). Its own report and notify writes don't count as a change
  that ends idling: a re-check only starts a pass when `runState` goes and dispatch has entries. On wake it prints
  `WAKE` and the no-progress counter resets. It exits only on a signal, `--max-passes`, or 2 passes in a row with no
  progress (exit 1, as today).
- Each pass runs with `CREW_RUNNER=<token>` (random, new for every pass) in its environment; the token is in state.json.
- `run --check` prints a `RUNNER` line: `RUNNER  running (pid N), pass N, <state>[: reason], last progress <age> ago` or
  `RUNNER  not running: start it from a terminal at the project root: node .crew/bin/crew.mjs run --until-done`.
  `run --check --json` gains a `runner` object (running, pid, pass, state, reason, last_progress; never the token). The
  STOP/GO lines and the exit code are unchanged.
- `status` shows the same runner line as a `**Runner:**` line right after its header (before the pause line).
- Preflight warns (never fails) when the pass command's first word is `claude`, it has neither `--permission-mode` nor
  `--dangerously-skip-permissions`, and `.claude/settings.json` has no `permissions.defaultMode`.
- The CLI runs an async command: a command's `run` may return `Promise<number>`; `cli.ts` `main` returns it and
  `main.ts` sets `process.exitCode` when it resolves. Every other command stays synchronous and unchanged.
- `plugins/crew/skills/team/SKILL.md` "Unattended": the lock, `--unlock`, idle mode, Ctrl-C, the RUNNER line, the
  permission-mode warning.

**Out (explicitly not doing):**
- Runner-only launches, the guard reading the lock or the token, doctor's runner report (FEAT-064).
- `expedite`, ui actions and the ui runner panel, new notify kinds (FEAT-063). Idle reuses the `stopped` kind.
- A "why" block in `status` beyond the runner line.
- Denying `CREW_RUNNER=` in agents' commands (P-065 / the identity fix).
- Changing the default pass command or `MAX_PASSES`; Windows process start time (the machine-id/start-time probes fall
  back to "unknown", which is then compared like the suite: pid liveness only).
- New ledger event types (runner reports stay `report` with `source: "runner"`).

## Acceptance criteria
- [ ] AC1: With a live runner holding the lock, a second `run --until-done` exits 1 without running a pass and names the
  holder's pid; after the holder is killed (SIGKILL, lock file left behind), a new runner takes the lock and runs.
- [ ] AC2: A lock file whose pid is alive but whose recorded process start time differs (pid reused after a reboot) is
  taken over by a new runner; one on another machine id is not.
- [ ] AC3: `run --unlock` removes a dead holder's lock and refuses (exit 1, naming the pid) while the holder is alive.
- [ ] AC4: The runner refuses (exit 1, nothing run, no lock left) when `CLAUDECODE` is set, from a linked worktree
  (naming the main checkout), and from a crew agent (existing AC9 test still passes).
- [ ] AC5: SIGINT during a pass: the pass process receives it, the ledger gets a runner report with
  `stopped: "interrupted"`, the lock file is gone, exit 130. SIGTERM and SIGHUP do the same.
- [ ] AC6: With nothing to dispatch, the runner prints `IDLE`, records one idle report and stays alive; an
  `ask --to pm "…"` from another process then starts a pass without a restart.
- [ ] AC7: `pause` makes a running runner idle (not exit); `resume --team` wakes it and passes run again.
- [ ] AC8: Each pass sees a `CREW_RUNNER` token in its environment, different on every pass, equal to state.json's token
  during that pass.
- [ ] AC9: `run --check` and `status` show `running … pass N` while a runner runs and `not running: start it … run
  --until-done` when none does; `run --check --json` has a `runner` object without the token.
- [ ] AC10: Preflight warns about a `claude` pass command without a permission mode, and not when one is given.
- [ ] AC11: `suite` still takes, waits for and frees slots as before (suite.test.ts passes unchanged) on the extracted
  lock module; the extracted module has unit tests for create, stale take-over (dead pid, reused pid) and token release.
- [ ] AC12: The no-progress (2 passes) and `--max-passes` exits keep their exit 1 and STOP lines; `typecheck` passes and
  every touched module stays under 300 lines.

## Approach
- `core/lock.ts` (no imports from commands): `Holder` = `{ token, pid, host, machine?, pid_started?, ...extra }`;
  `tryCreate(file, holder)`, `readHolder(file)`, `isStale(file)`, `takeOverIfStale(file, token)`, `release(file, token)`,
  `processStart(pid)`, `machineId()`. Suite holders gain `machine`/`pid_started` too; when both are recorded they decide
  staleness, else the old host + pid rule applies (keeps old suite lock files readable).
- Runner lock and state helpers live in a new `commands/team/runnerlock.ts` (acquire, release, readRunner for
  `status`/`run --check`, writeState) so runner.ts and autonomy.ts stay under 300 lines; `views/reports.ts` imports
  `readRunner` from it.
- `untilDone` becomes `async` and returns `Promise<number>`; the lock is taken after the agent/CLAUDECODE/worktree
  refusals and after preflight passes, and released in a `finally` plus the signal handler. Each pass still works on a
  fresh `Store.open(root)` and flushes before the pass is spawned.
- Idle wait: one promise that resolves on the first of a debounced `fs.watch` event, the backoff timer, or a signal;
  the watcher and timer are closed on resolve so the process can exit.
- Tests can't run `claude`: they pass `--command` (node scripts) and drive the runner as a background child process
  (`spawn` the built hub, read stdout lines until a pattern, then signal it). `runner.test.ts` deletes `CLAUDECODE` from
  `repo.env` in `beforeEach` (the developer's own session sets it), and the existing AC4 and AC7 tests change from
  "exits on pause" to "idles on pause".
- The `run [--check] [--json]` usage line stays byte-identical (registry.test.ts); `--unlock` goes on the `--until-done`
  line.

## Design

## Tasks
- [ ] T1: Extract `core/lock.ts` from suite.ts (with `processStart`, `machineId`); suite.ts uses it; add `test/hub/lock.test.ts` → verify: `npx vitest run test/hub/lock.test.ts test/hub/e2e/suite.test.ts` green (AC11).
- [ ] T2: `commands/team/runnerlock.ts` (acquire or refuse naming the holder, stale take-over, `--unlock`, state.json), the CLAUDECODE and linked-worktree refusals in runner.ts, `--unlock` in autonomy.reg.ts → verify: runner.test.ts cases for AC1–AC4 green.
- [ ] T3: Async CLI path (registry run type, cli.ts `main`, main.ts) and async `untilDone` with `spawn`, signal forwarding, `stopped: "interrupted"`, lock release on every exit, per-pass `CREW_RUNNER` → verify: AC5 and AC8 cases green; the existing no-progress and max-passes cases green (AC12).
- [ ] T4: Idle mode (report once per reason, notify `stopped` once per reason, watch + backoff, WAKE, counter reset); the old AC4/AC7 tests rewritten to idle then SIGINT → verify: AC6 and AC7 cases green.
- [ ] T5: RUNNER line in `run --check` (text and JSON), the `**Runner:**` line in `status`, the permission-mode preflight warning → verify: AC9 and AC10 cases green; team-2.test.ts and registry.test.ts green.
- [ ] T6: SKILL "Unattended" rewritten for lock, unlock, idle, Ctrl-C, RUNNER line and the warning → verify: the section names `--unlock`, idle mode and the RUNNER line; `npm run typecheck` passes; `wc -l` of every touched src module < 300 (AC12).

## Test plan
**Targeted checks** (in packages/crew of the plan worktree, after `npm ci --prefer-offline` and `npm run build`, since
the e2e tests run the built hub):
- `npx vitest run test/hub/lock.test.ts` — AC2, AC11 (unit: create, stale by dead pid, stale by reused pid start time,
  other machine not stale, release only by token).
- `npx vitest run test/hub/e2e/suite.test.ts` — AC11 (suite unchanged on the extracted module).
- `npx vitest run test/hub/e2e/runner.test.ts` — AC1, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC12 (background runner
  driven by node pass scripts; each test kills its runner in `afterEach`).
- `npx vitest run test/hub/e2e/team-2.test.ts test/hub/registry.test.ts` — `run`/`run --check` output and the help
  lines stay compatible (AC9, AC12).
- `npm run typecheck` and `wc -l` on the touched src modules — AC12.

## Rollout & rollback
After the merge Release refreshes `.crew/bin`; the human stops any runner they have (Ctrl-C), then starts one in a
terminal at the main checkout. Lock and state live in `<git common dir>/crew/runner/`, outside the tree: nothing to
commit or migrate. Rollback: revert the squash commit and refresh `.crew/bin`; a leftover `crew/runner/` folder is
ignored by the old runner and can be deleted.

## Risks & open questions
- `CLAUDECODE` is the signal for "inside a Claude Code tool call"; if Claude Code stops setting it, that refusal
  silently stops working (the agent-role refusal still holds for crew agents).
- With idle mode the runner lives long, so the default 20-pass limit ends a busy day's run early; changing the default
  is left to a follow-up if it bites.
- `fs.watch` can miss events on some file systems; the 60 s backoff cap bounds the delay.
- Signal timing in e2e tests can be flaky: tests wait for printed lines (`PASS`, `IDLE`) before signalling, never on
  sleeps alone.

## Handoff

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-066-runner-lock-and-idle-mode

## Outcome
