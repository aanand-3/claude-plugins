---
id: P-049
title: Usage counts a resumed run once
goal: G-007
items: BUG-027
touches: packages/crew/src/hub/core/memory/ledger.ts, packages/crew/src/hub/core/memory/activity.ts, packages/crew/test/ledger.test.ts, packages/crew/test/activity.test.ts, packages/crew/test/hub/e2e/team-2.test.ts
depends_on:
status: in-review
branch: plan/P-049-usage-counts-a-resumed-run-once
pr:
created: 2026-10-25
started: 2026-10-26
completed:
assignee: developer
---

# P-049: Usage counts a resumed run once

## Context
BUG-027 (G-007, P1 S2). `usage --hook` (commands/team/autonomy.ts:148, the SubagentStop hook) records `transcriptUsage` of the whole transcript at every stop, with `source: "transcript"`. A resumed run (the Director, reused architects and developers) stops many times, so its events are cumulative snapshots: each one repeats everything before it. `Ledger.spend()` (core/memory/ledger.ts:104) and `liveRuns`' per-run `tokens` (core/memory/activity.ts:182) add them up. On 2026-10-25 director:afc95553afc679059 had 37 usage events whose latest was about 0.98M in, but the sums reported 27M in. `budgetProblems` (workflow.ts) reads `spend()`, so `budgets.*` can stop the team early, and per-role and per-plan spend are overstated.

**Decision (Architect): count deltas at read time; the hook is unchanged.** Each transcript event stays a snapshot of the run's transcript so far. Readers count, for each `source: "transcript"` event, what it adds over the run's previous transcript event. Why read time, not a delta recorded by the hook:
- the 355 usage events already in this repo's ledger (all `source: "transcript"`, none decreasing within a run as of 2026-10-25) are corrected without migrating the append-only ledger;
- a snapshot is self-describing: a lost or torn event costs nothing, where a lost delta would be undercounted forever;
- autonomy.ts stays out of this plan (P-047 edits it; P-034 is next to it).
Manual `usage --tokens-in …` events (no `source`) are increments as today and are summed as they are.

## Scope
**In:**
- `countedUsage(events)` in core/memory/ledger.ts (exported, pure): the usage events of `events`, in order, with `tokens_in`, `tokens_out`, `cost` and `cache_read` replaced by what each one counts:
  - an event without `source: "transcript"`: its own values;
  - a transcript event: its values minus those of the previous transcript event of the same `run` (none before it: its own values). If any of `tokens_in`, `tokens_out` or `cache_read` is lower than in the previous one (a new transcript under the same run), it counts its own values in full.
  - Other fields (`ref`, `run`, `role`, `actor`, `ts`) are kept, so attribution stays per event: a delta goes to that event's `ref`, or is split over the run's refs as today.
- `spend()` iterates `countedUsage(events)` instead of the raw usage events. Run counting (`runs`) is unchanged.
- `liveRuns`' `tokens` sums `countedUsage(mine)` (the run's own events): the run's latest snapshot plus its manual increments.
- Regression tests: unit tests in test/ledger.test.ts and test/activity.test.ts, and an e2e case in test/hub/e2e/team-2.test.ts beside "usage is captured from each agent's transcript": two SubagentStop hooks of one run with a growing transcript.

**Out (explicitly not doing):**
- Changing `usage --hook`, the event shape, or rewriting ledger events already recorded.
- `ledger --type usage` still prints each event as recorded (the snapshot), not its delta.
- Reworking budgets, cost estimation from tokens, or `transcriptUsage`.

## Acceptance criteria
- [ ] AC1 · `spend()` over three transcript usage events of one run (100/10, 250/30, 400/40 in/out, refs null, P-1, P-1) reports `tokensIn` 400 and `tokensOut` 40; `byRef["P-1"].tokens` is 330 (the deltas 170 and 160) and the first event's 110 goes to `unattributed` (the run touched nothing else); `byRole` counts 440 tokens and 1 run.
- [ ] AC2 · A manual usage event (no `source`) of the same run, between them, is added in full (AC1's totals plus its tokens); two transcript runs are counted separately (each its own latest snapshot).
- [ ] AC3 · A transcript event whose `tokens_in` is lower than the previous one of its run counts in full (a new transcript), not as a negative delta.
- [ ] AC4 · `liveRuns` for a run with transcript usage events 100/20 then 300/50 reports `tokens: 350`, not 470.
- [ ] AC5 · End to end (regression; fails on main): with `budgets: { project: { max_tokens: 1 } }` (so the line always prints), two `usage --hook` calls for the same agent (`agent_id` x9) where the second transcript extends the first (TRANSCRIPT, then TRANSCRIPT plus one more assistant message) record two usage events, and `run --check` reports `project tokens: <the second snapshot's in+out> used of 1`, not the sum of both snapshots.
- [ ] AC6 · `npm run typecheck` passes; ledger.ts and activity.ts stay under 300 lines; the existing spend, liveRuns and usage tests pass unchanged.

## Approach
- ledger.ts: `countedUsage` keeps a `Map<run, LedgerEvent>` of the last transcript event per run and returns shallow copies with the counted numbers (`Number(x) || 0` as `spend` does). `spend()` replaces `if (ev.type !== "usage") continue` over `events` with a loop over `countedUsage(events)`; the `touched` map still comes from all events.
- activity.ts already imports from `./ledger.js`; `tokens` becomes `usage.length ? countedUsage(mine).reduce(…) : null` (it keeps `null` when the run has no usage).
- Tests: `usage(run, tokens, { source: "transcript", … })` with the existing helpers in ledger.test.ts; `led("usage", …, { source: "transcript" })` in activity.test.ts; the e2e case reuses team-2's `TRANSCRIPT`, `agent`, `events` and the hook payload, with a second transcript file.

## Tasks
- [ ] T1: regression tests first (AC1–AC5), failing on the current code → verify: `cd packages/crew && npx vitest run test/ledger.test.ts test/activity.test.ts` fails on the new cases; after `npm run build`, `npx vitest run test/hub/e2e/team-2.test.ts -t "resumed"` fails
- [ ] T2: `countedUsage` and `spend()` in ledger.ts → verify: `npx vitest run test/ledger.test.ts` (AC1–AC3)
- [ ] T3: `liveRuns` tokens in activity.ts → verify: `npx vitest run test/activity.test.ts -t liveRuns` (AC4)
- [ ] T4: end to end and types → verify: `npm run build && npx vitest run test/hub/e2e/team-2.test.ts -t "usage|resumed"`; `npm run typecheck`; `wc -l src/hub/core/memory/ledger.ts src/hub/core/memory/activity.ts` each under 300 (AC5, AC6)

## Test plan
**Targeted checks** (from `packages/crew/`; the e2e file drives the built `dist/crew.mjs`: `npm run build` first, then discard the generated output, which Release builds):
- AC1, AC2, AC3 → `npx vitest run test/ledger.test.ts` (new cases in `describe("spend")`)
- AC4 → `npx vitest run test/activity.test.ts -t liveRuns`
- AC5 (regression) → `npx vitest run test/hub/e2e/team-2.test.ts -t "resumed"`; it fails against main's ledger.ts (write it from `git show main:packages/crew/src/hub/core/memory/ledger.ts` into the worktree, rebuild, run, restore from `git show HEAD:…`)
- AC6 → `npm run typecheck`; T4's `wc -l`; `npx vitest run test/ledger.test.ts test/activity.test.ts test/hub/e2e/team-2.test.ts`

## Rollout & rollback
n/a — internal; ships in the bundle (Release builds it) and reaches this repo through `refresh-bin`. Existing ledgers are read correctly from then on; nothing is migrated. Rollback: revert the commit (the sums overcount again).

## Risks & open questions
- A run whose transcript is compacted or rewritten so that a counter drops is counted in full from that event (AC3): a possible overcount of what came before, never an undercount.
- Overlap, for staffing only: ledger.ts with P-025 (ready). The test files are `hub.shared`. No dependency.

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-049: Usage counts a resumed run once [in-review] tasks 0/4 — claimed by Arpit Anand (developer:ac88522a5fe146410)
- last checkpoint 2026-10-25 19:52 at T4 (a8f88a5) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- next: T1: regression tests first (AC1–AC5), failing on the current code → verify: `cd packages/crew && npx vitest run test/ledger.test.ts test/activity.test.ts` fails on the new cases; after `npm run build`, `npx vitest run test/hub/e2e/team-2.test.ts -t "resumed"` fails
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —, AC6 —

Latest log:
- 2026-10-25: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-049-usage-counts-a-resumed-run-once

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-049-usage-counts-a-resumed-run-once
- 2026-10-26: status in-progress → in-review

## Outcome
`countedUsage(events)` (exported, pure) in core/memory/ledger.ts returns the usage events in order with `tokens_in`, `tokens_out`, `cost` and `cache_read` replaced by what each adds: a `source: "transcript"` event adds its delta over the run's previous transcript event (in full when it is the first, or when `tokens_in`, `tokens_out` or `cache_read` dropped); any other usage event counts as recorded. `spend()` iterates it (attribution and run counting unchanged); `liveRuns` sums it for a run's `tokens`. The hook and recorded events are unchanged. Regression tests: 3 new `spend` cases in test/ledger.test.ts, 1 `liveRuns` case in test/activity.test.ts, and "usage of a resumed run counts its latest transcript once" in test/hub/e2e/team-2.test.ts (on the old code it reports 453 = 213 + 240). Awaiting QA.
Learnings: K-2026-10-26-a-fresh-plan-worktree-has-no-packages
