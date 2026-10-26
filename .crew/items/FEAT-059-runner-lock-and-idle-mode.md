---
id: FEAT-059
type: feat
title: Runner lock and idle mode
status: triaged
priority: P1
goal:
plan:
created: 2026-10-26
closed:
---

# FEAT-059: Runner lock and idle mode

## Summary
Give the local runner a single-instance lock and an idle mode. Today `run --until-done` exits on pause, on an empty dispatch and on a missing approved goal, so later human actions (answers, approvals, asks, resume) reach no one. G-007 AC5 ("answer from the inbox and the next pass continues") fails today for this reason.

Scope (draft step 4): a try-once lock in `<git common dir>/crew/runner/` (pid, process start time, stable machine id; a second runner refuses and names the holder; `run --unlock` clears a stuck lock; refuse outside the main checkout or from a Claude tool call); async pass spawning with SIGINT/SIGTERM/SIGHUP forwarding that records "stopped: interrupted" and releases the lock; a heartbeat (pass number, start time, age of last progress); idle mode (on a stop condition or empty dispatch: record the reason, notify once, re-check with backoff or on ledger change; exit only on Ctrl-C, pass limit or no progress); `CREW_RUNNER=<token>` rotated per pass; `status`, a "why" block and `run --check` show runner state and the start command; preflight warns when the pass command has no permission mode. Touches `runner.ts`, a shared lock module extracted from `commands/work/suite.ts`, `autonomy.ts`, the status view, SKILL "Unattended".

## User story
As the human, I want one runner that stays up and idles when there is nothing to do, so that pause, approvals and asks reach it without restarting.

## Acceptance criteria
- [ ] A second runner refuses and names the holder; after the holder is killed or a reboot (pid reused), a new runner takes the lock.
- [ ] Ctrl-C records "interrupted" and frees the lock.
- [ ] With nothing to do the runner idles and dispatches a new `ask` without a restart; `pause` keeps it alive.
- [ ] `status` and `run --check` show whether the runner is running.

## Notes
Goal G-007 (AC5). Source draft: .crew/drafts/yes-pm-logs-them-recursive-sparkle.md step 4 ("Plan A").
- 2026-10-26: goal hint G-007 (by Arpit Anand)
- 2026-10-26: status new → triaged — priority P1
