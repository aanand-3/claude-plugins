---
id: BUG-034
type: bug
title: A stopped agent's run stays live for 24h and keeps a director dispatch entry
status: done
severity: S3
priority: P2
goal: G-007
plan: P-053
created: 2026-10-26
closed: 2026-10-26
---

# BUG-034: A stopped agent's run stays live for 24h and keeps a director dispatch entry

## Summary
2026-10-26: the session stopped QA run qa:af405bc1f1c24a473 (P-034) with TaskStop; SubagentStop never fired, so no usage/report event closed it. liveRuns() (core/memory/activity.ts) keeps it live for 24h, and dispatch keeps routing 'run ... idle: resume or reassign' to the director though P-034 is done and merged (4a124be). No hub command ends another run. Fix ideas: dispatch skips idle runs whose plan is done/merged, or a command to mark a run stopped.

## Environment
Main checkout, branch main at fa6a9db; hub from packages/crew/src/hub (vendored .crew/bin/crew.mjs). Feed: .git/crew/activity.jsonl; ledger: .git/crew/ledger.jsonl. Timestamps below are UTC (2026-10-25Z = the local 2026-10-26 of the filing note).

## Steps to reproduce
1. Launch a crew agent on a plan (e.g. crew-qa on P-034) and let it make hub calls, so the PostToolUse hook writes activity rows for its run.
2. Stop it from the session with TaskStop before it finishes. SubagentStop does not fire, so no `usage` event (and no `report`) is written for that run.
3. Wait more than `limits.idle_minutes` (default IDLE_MINUTES = 20).
4. Finish the plan through other runs (PM moves it to done, Release merges it).
5. Run `node .crew/bin/crew.mjs dispatch`.

## Expected
A run that was stopped, or whose plan is done/merged, is not listed as live and produces no Director dispatch entry; or the Director/PM has a hub command to mark the run ended.

## Actual
Dispatch's first line is `DISPATCH  director  P-034  run qa:af405bc1f1c24a473 on P-034 idle for 53 min: resume or reassign` (checked 2026-10-25T21:39Z), and it stays until 24h after the run's last activity (2026-10-25T20:46:14Z, so until about 2026-10-26T20:46Z), with the minute count growing. No hub command closes another run's liveness, so the Director can only ignore it.

## Evidence
- packages/crew/src/hub/core/memory/activity.ts:161-185, `liveRuns()`: a run is live when its last activity row is within DAY_MS (24h) and the ledger has no `usage`/`report` (STOPS) event of that same run after it. Plan status is never consulted; the only exits are the 24h window or a STOPS event from the run itself.
- packages/crew/src/hub/commands/team/activity.ts:31, `running()` feeds `liveRuns()`; packages/crew/src/hub/commands/team/dispatch.ts:68-69 (row 2, Director exceptions) maps every `idle` run to `run <run> on <ref> idle for <n> min: resume or reassign` with no check of the ref's status.
- .git/crew/activity.jsonl: 12 rows for qa:af405bc1f1c24a473, last at 2026-10-25T20:46:14.304Z (`crew.mjs checkpoint`, ref P-034).
- .git/crew/ledger.jsonl: 9 events of qa:af405bc1f1c24a473, all `checkpoint` (last 20:46:13.974Z); no `usage` or `report` for that run.
- P-034 was finished by other runs: QA qa:a66844af00066dee9 checkpoint at 21:02:59Z, pm move in-review -> done and release at 21:03:51Z, Release log "merged to main as 4a124be" at 21:23:30Z.
- Director run director:a778aa760f9b59adc reported at 21:24:54Z that the run "is finished, not stuck", that it found no hub command to end it, and that dispatch still listed the entry.

## Impact
False Director work for up to 24h per stopped run: every dispatch shows a "resume or reassign" entry that cannot be acted on, and a Director agent launched for it spends a run concluding there is nothing to do (it happened once already). It takes one of the `budgets.max_agents` dispatch slots ahead of real work (today it sits above P-032's continue entry). The running-runs view (`runningLines()`, commands/team/activity.ts:40) also shows the run as live. No data loss, and it clears itself after 24h.
Suggested severity S3 (wrong routing, workaround is to ignore it), priority P2.

## Notes
- Any stop path that skips SubagentStop hits this (TaskStop, a crashed or killed session), not just QA.
- Fix options, smallest first: (a) in dispatch row 2 (or in `liveRuns()`), skip idle runs whose ref is a plan in done/cancelled or already merged; (b) a hub command for the Director, e.g. `crew.mjs end-run <run>`, that writes a stop event (a `report`/new `stop` type) the run's liveness honours; (c) have the session's TaskStop path write the stop event. (a) fixes this case; (b) covers runs with no ref or a ref still open.
- A test for `liveRuns()`/dispatch: activity for run X on a done plan, no STOPS event, idle > idle_minutes -> no Director entry.
- 2026-10-26: Completed the report against the code: liveRuns() (core/memory/activity.ts:161-185) ends a run only after 24h or a usage/report event from that run, never checks plan status; dispatch.ts:68-69 turns every idle run into a director entry. qa:af405bc1f1c24a473: last activity 2026-10-25T20:46:14Z, 9 checkpoints, no usage/report; P-034 done 21:03Z, merged 4a124be; dispatch still lists it (53 min at 21:39Z). Suggested S3/P2.
- 2026-10-26: status new → triaged — priority P2, severity S3
- 2026-10-26: status triaged → done — delivered by P-053
