---
id: P-091
title: Capture the main session's token usage from a Stop hook
goal:
items: CHORE-033
touches: packages/crew/src/hub/commands/team/autonomy.ts, packages/crew/src/hub/commands/views/doctor.ts, plugins/crew/skills/guidelines/templates/settings.json, plugins/crew/docs/context-and-memory.md, plugins/crew/skills/hub/SKILL.md, plugins/crew/skills/hub/references/model.md, packages/crew/test/hub/e2e/activity.test.ts, packages/crew/test/hub/prices.test.ts, packages/crew/test/hub/e2e/context.test.ts, packages/crew/test/hub/e2e/doctor.test.ts
depends_on: P-089
status: draft
branch: plan/P-091-capture-the-main-sessions-token-usage
pr:
created: 2026-10-28
started:
completed:
---

# P-091: Capture the main session's token usage from a Stop hook

## Context
CHORE-033 (G-003), split out of CHORE-004 / P-089. `crew.mjs usage --hook` (`usageHook` in
packages/crew/src/hub/commands/team/autonomy.ts) runs only as the SubagentStop hook, so it records each crew agent's tokens
(and, once P-089 lands, their cost from the `prices:` block in `.crew/config.yaml`, K-2026-10-28-captured-usage-is-priced-from-a-prices)
but never the main session's: the team session, the Director's own turns, and each `claude -p` pass the unattended runner starts.
Those tokens never reach the ledger, `spend()` or `budgets.project.*`, so the project budget under-counts what the team spends.

How main-session usage gets captured: Claude Code fires the **Stop** hook at the end of every main-session turn (subagents
fire SubagentStop instead), with `hook_event_name: "Stop"`, `session_id` and `transcript_path` (the main session's JSONL
transcript) on stdin. The same `usage --hook` command is added under `Stop` in the guidelines settings template; when the
payload says `Stop` it reads `transcript_path` and records a cumulative `source: "transcript"` usage snapshot under the run
`executive:<session_id>` (role `executive`: the guard already treats the main session as the executive). Because transcript
events are cumulative snapshots and `countedUsage` counts each as its delta over the run's previous one
(K-2026-10-25-transcript-usage-events-stay-cumulative), one snapshot per turn adds exactly the turn's new tokens and cost, with
no change to core/memory/ledger.ts.

## Scope
**In:**
- `usageHook` branches on `hook_event_name`. For `"Stop"` (and no `agent_type`): read `transcript_path`, compute usage with
  P-089's `transcriptUsage(text, prices)` (prices from the main checkout's `.crew/config.yaml`), and record
  `usage` with `ref: null`, `source: "transcript"`, `tokens_in`, `tokens_out`, `cache_read`, `cost`, `model`, under
  `{ role: "executive", run: "executive:<session_id>" }` (`executive:unknown` without a session id). No `report` event for
  the main session. Then the same project-budget notify as the subagent path.
- Skip a snapshot equal to the run's previous transcript snapshot (same `tokens_in`, `tokens_out`, `cache_read` and `cost`),
  so a turn that added nothing (or a second Stop) writes no ledger event.
- `transcriptUsage` leaves out records with `isSidechain: true`, so subagent turns that a main transcript may carry are
  never counted twice (they are counted by SubagentStop). Subagent transcripts carry no such records, so their counts are
  unchanged.
- The SubagentStop path is unchanged: a payload with `hook_event_name: "SubagentStop"` (or none, as today's tests send it
  with `agent_type`) behaves exactly as now. A `Stop` payload never reads `agent_transcript_path`.
- `plugins/crew/skills/guidelines/templates/settings.json`: the `Stop` group gets a second hook, the same command as
  SubagentStop's (`... node .crew/bin/crew.mjs usage --hook >/dev/null 2>&1; exit 0`), after `checkpoint --auto`.
  Existing projects get it from `/crew:guidelines --refresh` (merge_settings adds a missing command to the event's group).
- `doctor`: a non-required check that `.claude/settings.json` has `crew.mjs usage --hook` under `Stop`
  ("the Stop `crew.mjs usage --hook` (main-session usage)"), warning with the existing HOOKS_FIX.
- Docs: `plugins/crew/docs/context-and-memory.md` (the generated hooks table gains the Stop row's usage command; regenerate
  with `npm run docs`); `plugins/crew/skills/hub/SKILL.md` (the team paragraph: the Stop hook records the main session's
  tokens under `executive:<session id>`); `plugins/crew/skills/hub/references/model.md` where it describes usage events
  (main-session runs are `executive:<session_id>`, counting toward project budgets).

**Out (explicitly not doing):**
- Changing the `usage --hook` help line in workflow.reg.ts: it is pinned by test/hub/registry.test.ts against the frozen
  registry-before.json (K-2026-10-25-approved-with-one-change-do-not-edit); SKILL.md and model.md carry the Stop behaviour.
- Editing this repo's `.claude/settings.json`: it is a protected file the human updates via `/crew:guidelines --refresh`
  after landing (see Rollout).
- Run budgets for the main session: `budgets.run.*` keep applying to the run doing the hub call; the main session's usage
  counts toward `budgets.project.*` and `spend()` totals only.
- Usage of non-crew subagents (SubagentStop with an `agent_type` that maps to no role), SessionEnd, and attributing
  main-session usage to a plan or item.
- Changes to ledger.ts / activity.ts: a usage event under `executive:<session>` has no activity, so `liveRuns` and
  "Running now" are unaffected.

## Acceptance criteria
- [ ] AC1: `usage --hook` with a `Stop` payload (`hook_event_name: "Stop"`, `session_id: "s1"`, `transcript_path` to a
  main transcript with two assistant messages carrying usage) records exactly one `usage` event with `run: "executive:s1"`,
  `role: "executive"`, `ref: null`, `source: "transcript"` and `tokens_in`/`tokens_out`/`cache_read` equal to the
  hand-computed sums, and no `report` event; exit code 0. (e2e, activity.test.ts)
- [ ] AC2: with a `prices:` block in the test repo's `.crew/config.yaml`, that event's `cost` equals the hand-computed
  priced sum (> 0); without it, `cost` is 0. (e2e, activity.test.ts)
- [ ] AC3: two `Stop` calls for the same session, the second after the transcript grew by one message, record two
  cumulative snapshots, and project spend counts the second snapshot only: with `budgets.project.max_tokens` set above the
  second snapshot's tokens but below the sum of both snapshots, `crew.mjs run --check` prints no `budget: project tokens`
  reason; set below the second snapshot, it prints it. (e2e, activity.test.ts)
- [ ] AC4: a third `Stop` call with the transcript unchanged records no new `usage` event. (e2e, activity.test.ts)
- [ ] AC5: `transcriptUsage` leaves out `isSidechain: true` records: a transcript with one main and one sidechain
  assistant message counts the main one only. (unit, prices.test.ts or a transcript case in the file P-089 adds)
- [ ] AC6: the existing SubagentStop cases in activity.test.ts pass unchanged; a `Stop` payload that also carries
  `agent_type: "crew-developer"` and `agent_transcript_path` is recorded under `executive:<session_id>` from
  `transcript_path`, not under the developer's run. (e2e, activity.test.ts)
- [ ] AC7: the guidelines template's `Stop` hooks contain both `checkpoint --auto` (still first) and `crew.mjs usage --hook`
  (context.test.ts); `doctor` warns "the Stop `crew.mjs usage --hook`" when settings lack it and lists no such warning when
  the template's hooks are installed (doctor.test.ts); context-and-memory.md is regenerated (docs.test.ts green).
- [ ] AC8: SKILL.md and model.md say what Scope says about main-session usage. (review)

## Approach
- One command, two hook events: `usage --hook` already owns "usage from a transcript"; the payload's `hook_event_name`
  picks the transcript and the run. No new command, so no registry/MCP test churn
  (K-2026-10-26-adding-an-mcp-tool-or-changing-a-tools).
- Run id `executive:<session_id>`, not `store.ledger.who.run` (`CREW_RUN` or `wt:<worktree>`): two main sessions in one
  worktree would share a `wt:` run and their cumulative snapshots would interleave, so each drop would count in full.
  A session id is stable across a session's turns, which is what the snapshot delta needs. A resumed session with a new id
  starts a new run; its transcript snapshot is counted in full once, which is correct when the resumed transcript is a new
  file and an over-count of the copied history otherwise (see Risks).
- Keep the change in autonomy.ts: a small `sessionUsage(store, h)` beside `usageHook`, sharing the record + notify tail.
  autonomy.ts is at 194 lines plus P-089's call-site change; this stays well under 300.
- Dependency: P-089 (in progress) adds `transcriptUsage(text, prices)` with cost and the prices reader; this plan uses
  them, so `--depends P-089`. Overlaps on autonomy.ts with P-066 and P-080 (accepted) land first; test files, SKILL.md and
  model.md are `hub.shared`.

## Design

## Tasks
- [ ] T1: `transcriptUsage` skips `isSidechain: true` records; unit case for AC5 → verify: `cd packages/crew && npx vitest run test/hub/prices.test.ts`
- [ ] T2: `usageHook` handles `Stop` payloads (run `executive:<session_id>`, no report, unchanged-snapshot skip); e2e cases for AC1-AC4 and AC6 in activity.test.ts → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/activity.test.ts`
- [ ] T3: `Stop` usage hook in the guidelines settings template, doctor's non-required Stop usage check, context.test.ts and doctor.test.ts cases for AC7, `npm run docs` for context-and-memory.md → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/context.test.ts test/hub/e2e/doctor.test.ts test/docs.test.ts`
- [ ] T4: SKILL.md and model.md wording (AC8) → verify: `cd packages/crew && npx vitest run test/docs.test.ts && npm run typecheck`

## Test plan
**Targeted checks:**
- `packages/crew/test/hub/e2e/activity.test.ts` (the `usage --hook` describes; e2e runs the built dist, so `npm run build` first, K-2026-10-26-e2e-tests-drive-the-built-dist-crew-mjs): AC1, AC2, AC3, AC4, AC6.
- `packages/crew/test/hub/prices.test.ts` (from P-089): AC5.
- `packages/crew/test/hub/e2e/context.test.ts` (template Stop hooks) and `packages/crew/test/hub/e2e/doctor.test.ts` (Stop usage warning): AC7.
- `packages/crew/test/docs.test.ts`: context-and-memory.md hooks table current (AC7).
- `npm run typecheck`; review for AC8.

## Rollout & rollback
After landing, the human runs `/crew:guidelines --refresh` in this repo (`.claude/settings.json` is protected) so the Stop
hook gains `usage --hook`; `doctor` warns until then. Until a project adds the hook nothing changes. Back out by reverting
the squash commit and removing the Stop usage hook; usage events already recorded under `executive:*` stay in the ledger
as plain numbers.

## Risks & open questions
- The main transcript is re-read on every turn; a long session's file can be tens of MB. The hook never fails and has
  Claude Code's hook timeout; if it proves slow, a follow-up can read incrementally.
- `claude --resume` / `--continue` may copy history into a new session file with a new id: its first snapshot counts the
  copied history again. Accepted as an estimate (budgets err high, not low); noted in model.md.
- Compaction keeps the same session id; if a compacted transcript's counters drop, the existing "a drop counts in full"
  rule applies.
- Main-session usage has no plan ref, so per-plan spend views don't show it; only project totals and budgets do.

## Handoff

## Progress log

## Outcome
