---
id: P-076
title: Runner follow-ups: STATUS.md without the runner line, bounded signal wait, output errors
goal:
items: CHORE-031
touches: packages/crew/src/hub/commands/team/runner.ts, packages/crew/src/hub/commands/views/reports.ts, plugins/crew/skills/team/SKILL.md, packages/crew/test/hub/e2e/runner.test.ts
depends_on: P-066
status: ready
branch: plan/P-076-runner-follow-ups-status-md-without
pr:
created: 2026-10-26
started:
completed:
---

# P-076: Runner follow-ups: STATUS.md without the runner line, bounded signal wait, output errors

## Context
CHORE-031 collects two minor points from the P-066 review (runner lock and idle mode, G-007). Both concern code that
exists only on `plan/P-066-runner-lock-and-idle-mode`, so this plan depends on P-066 and is specced against that
branch's code:

1. `status` (packages/crew/src/hub/commands/views/reports.ts) puts the live `**Runner:** running (pid N), pass N, …,
   last progress <age> ago` line into every report, including the `STATUS.md` that `status --write` writes. That file
   is a generated snapshot; the line changes on every regeneration (pid, pass, age), so the file churns for no reason.
2. In `untilDone` (packages/crew/src/hub/commands/team/runner.ts) the first SIGINT/SIGTERM/SIGHUP is forwarded to the
   running pass and the runner waits for the pass to exit; only a second signal kills it (`Interrupt.on`). A pass that
   ignores the forwarded SIGTERM or SIGHUP (sent once by a service manager or a closed terminal) keeps the runner, and
   its lock, alive indefinitely. And when the terminal is closed (SIGHUP), the runner's own writes to stdout (`say`:
   `STOP`, `passes: …`) can fail with EIO (EPIPE on a closed pipe); `process.stdout` has no `error` listener, so the
   error is an uncaught exception that kills the runner before the `finally` frees the lock and before the stop is
   recorded. Neither blocks: a lock left by a dead runner is taken over as stale (P-066 AC1).

Binding knowledge: K-2026-10-26-the-runner-idles-instead-of-exiting (exit only on a signal, `--max-passes` or 2 passes
without progress; exit 130 on a signal), K-2026-10-26-the-runner-lock-is-one-file-in-git,
K-2026-10-23-every-module-stays-under-300-lines (runner.ts is at 264 lines on the P-066 branch),
K-2026-10-26-e2e-tests-drive-the-built-dist-crew-mjs, K-2026-10-26-a-fresh-plan-worktree-has-no-packages,
K-2026-10-24-release-builds-the-generated-files-plans.

## Scope
**In:**
- `status --write` leaves the `**Runner:**` line (and the blank line after it) out of `STATUS.md`. `status` without
  `--write` keeps printing it exactly as P-066 does.
- A grace period for a forwarded signal: when the first signal is forwarded to a running pass, the runner arms a timer
  (`SIGNAL_GRACE_MS = 10_000`, a constant in runner.ts); if the pass has not exited when it fires, the runner kills it
  with SIGKILL. A second signal still kills it at once. The timer is cleared when the pass exits and never keeps the
  process alive (`unref`). Applies to all three forwarded signals (one rule; a human at the terminal can still press
  Ctrl-C twice).
- Output errors don't kill the runner: for the duration of `untilDone`, `process.stdout` and `process.stderr` get an
  `error` listener that swallows the error and marks the output gone; `say` writes nothing once it is gone. Everything
  else on the stop path (the `stopped: "interrupted"` report, the `stopped` notify, releasing the lock, exit 130) still
  happens. The listeners are removed when `untilDone` returns.
- `plugins/crew/skills/team/SKILL.md` "Unattended": the exit bullet says a pass that hasn't exited 10 s after the
  forwarded signal is killed; the "Is it running?" bullet says `status --write` leaves the runner line out of STATUS.md.

**Out (explicitly not doing):**
- Killing the pass's whole process group (spawning the pass detached would move `claude -p` out of the terminal's
  foreground group); the kill targets the spawned shell as P-066 does.
- Making the grace period configurable (no flag, no config key).
- Any change to `run --check`, the RUNNER line text, the lock, state.json or idle mode.
- Other hub commands' handling of stdout errors.

## Acceptance criteria
- [ ] AC1: While a runner runs, `status` prints the `**Runner:** running (pid N)…` line and `status --write` writes a
  `.crew/STATUS.md` with no line starting `**Runner:**`; with no runner, `STATUS.md` also has no `**Runner:**` line.
- [ ] AC2: A pass that ignores SIGTERM (its handler only records it and keeps running): after one SIGTERM to the runner,
  the runner exits 130 within the grace period plus a margin (under 20 s), with a runner report `stopped: "interrupted"`
  and no lock file left; the same holds for SIGHUP.
- [ ] AC3: The P-066 signal cases (a pass that exits on the forwarded SIGINT/SIGTERM/SIGHUP: exit 130, `got-<SIG>` file,
  report, lock gone) still pass unchanged.
- [ ] AC4: A runner whose stdout reader has gone away (the test destroys its end of the stdout pipe while the runner
  idles) and that then gets SIGHUP exits 130, records `stopped: "interrupted"` in the ledger and leaves no lock file
  (before the fix it dies on the write error and leaves the lock).
- [ ] AC5: `npm run typecheck` passes and runner.ts and reports.ts stay under 300 lines.

## Approach
- reports.ts: build the header without the runner line when `write` is true:
  `...(write ? [] : [`**Runner:** ${runnerLine(readRunner(store))}`, ""])`. `readRunner` is then not called on write.
- runner.ts `Interrupt`: on the first signal, after `this.child?.kill(sig)`, set
  `this.grace = setTimeout(() => this.child?.kill("SIGKILL"), SIGNAL_GRACE_MS).unref()` when a child is running;
  `runPass`'s `done` clears it. A signal that arrives while idle has no child, so nothing is armed.
- runner.ts output: a module-level `let quiet = false`; `say` returns early when `quiet`. In `untilDone`, after the
  lock is taken, add `const gone = () => { quiet = true; }` as an `error` listener on `process.stdout` and
  `process.stderr`, removed in the `finally` next to `int.close()`. (Preflight output comes before the lock, so a
  failure there frees nothing; leave it as is.)
- Tests (runner.test.ts, new cases beside "signals (P-066 AC5)"): a pass script that handles SIGTERM/SIGHUP by writing
  `got-<SIG>` and keeps running; assert exit 130 within 20 s (raise the case timeout to 30 s). For AC4, start `bg()`
  on `nothingToDo()`, wait for `IDLE`, call `r.p.stdout.destroy()`, send SIGHUP, assert exit 130, the report and the
  lock file gone. For AC1, use `nothingToDo()` + `bg()`, wait for `IDLE`, run `status` and `status --write`, read
  `.crew/STATUS.md`. Write the failing tests first and confirm AC2 and AC4 fail against the P-066 code.

## Design

## Tasks
- [ ] T1: `status --write` leaves out the runner line; runner.test.ts case for AC1 → verify:
  `npx vitest run test/hub/e2e/runner.test.ts -t "STATUS.md"` green (AC1), and the existing `status` assertions in
  runner.test.ts and `test/hub/e2e/idea.test.ts` (`status --write`) still green.
- [ ] T2: Grace timer in `Interrupt` (SIGKILL after `SIGNAL_GRACE_MS`) → verify: new runner.test.ts cases for SIGTERM
  and SIGHUP with a pass that ignores them green, and the P-066 "signals" cases green (AC2, AC3).
- [ ] T3: `error` listeners on stdout/stderr and a quiet `say` in `untilDone` → verify: a new runner.test.ts case for
  AC4 fails before the change and passes after (AC4).
- [ ] T4: SKILL "Unattended" bullets (grace kill, STATUS.md without runner line) → verify: the exit bullet names the
  10 s kill and the "Is it running?" bullet names `status --write`; `npm run typecheck` passes; `wc -l` of runner.ts
  and reports.ts < 300 (AC5).

## Test plan
**Targeted checks** (in packages/crew of the plan worktree, after `npm ci --prefer-offline` and `npm run build`, since
the e2e tests run the built hub; rebuild after each source edit):
- `npx vitest run test/hub/e2e/runner.test.ts` — AC1 (STATUS.md case), AC2 (grace cases), AC3 (P-066 signal cases),
  AC4 (closed stdout case); the rest of the file guards the loop, idle mode and the lock.
- `npx vitest run test/hub/e2e/idea.test.ts` — `status --write` still writes `# Status — …` (AC1).
- `npm run typecheck` and `wc -l src/hub/commands/team/runner.ts src/hub/commands/views/reports.ts` — AC5.

## Rollout & rollback
n/a — internal runner and report change. After the merge Release refreshes `.crew/bin`; a running runner keeps the
old code until the human restarts it. Rollback: revert the squash commit and refresh `.crew/bin`.

## Risks & open questions
- The SIGKILL hits the shell `spawn` started; if the shell forked the pass instead of exec-ing it, the pass itself can
  outlive the runner (same as P-066's second-signal kill). The runner still records the stop and frees the lock.
- 10 s may cut short a `claude -p` pass that is writing its transcript on SIGTERM; it only applies after the pass has
  already been asked to stop.
- Whether EPIPE on a destroyed pipe surfaces as an `error` event on every platform the tests run on; T3 requires the
  AC4 case to fail before the fix, which shows the test reaches the path.

## Handoff

## Progress log

- 2026-10-26: status draft → ready

## Outcome
