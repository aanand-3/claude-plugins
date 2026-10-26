---
id: BUG-020
type: bug
title: Usage events repeat a resumed run's earlier tokens, so spend overcounts
status: duplicate
severity: S3
priority: P2
goal: G-003
plan:
created: 2026-10-24
closed: 2026-10-26
---

# BUG-020: Usage events repeat a resumed run's earlier tokens, so spend overcounts

## Summary
The SubagentStop usage hook records the whole subagent transcript's token totals every time the subagent stops. A subagent that is resumed (SendMessage) stops again with a longer transcript, so each later usage event repeats everything before it. `Ledger.spend()` sums the events, so spend for every resumed run is counted several times. P-020's new Spend rows, Spend by agent card and Top plans card show these inflated sums.

## Environment
P-020 worktree at 3baae03; the ledger copy in the P-020 QA sandbox clone (.git/crew/ledger.jsonl there: 49 usage events, 28 runs); hook in `packages/crew/src/hub/commands/team/autonomy.ts` (`usageHook`, `transcriptUsage`).

## Steps to reproduce
1. In a repo with crew usage capture on, start a crew subagent (e.g. QA), let it stop, then resume it with SendMessage and let it stop again.
2. Read the usage events from `.git/crew/ledger.jsonl` (note `crew.mjs ledger --type usage --json` shows only the last 20) and group them by `run`.
3. Compare a run's events with each other and with the Overview's tokens spent.

## Expected
Each run's tokens are counted once: either each usage event records only the delta since the run's previous event, or `spend()` keeps only the latest event per run.

## Actual
Every run with more than one usage event has strictly growing totals (tokens_in/tokens_out), e.g. in the sandbox ledger:
- `qa:adccae42060d501d5`: 111615/29191, 245491/43462, 401856/57765. The run's real total is 459,621 tokens; spend counts 889,380.
- `architect:a627e264f89658a5b`: 225432/51509, 472106/57491, 726884/59657.
- 14 of 28 runs have 2 to 5 events like this.

The Overview's "8.4M tokens spent" (8,358,739) is the sum of all events, so it double- or triple-counts these runs.

## Evidence
`usageHook` reads `agent_transcript_path` in full and `transcriptUsage` sums every assistant message in it, then `store.ledger.record("usage", ...)` appends that total on each stop; no earlier total for the run is subtracted. `Ledger.spend()` (`packages/crew/src/hub/core/memory/ledger.ts:104`) adds every usage event.

## Impact
S3: every spend figure (Overview KPI, Spend by agent, Top plans, doc Spend rows, and token budgets via budgetProblems) is inflated for resumed runs, roughly 2x in this ledger. No workaround in the UI.

## Notes
Predates P-020 (capture came with FEAT-020); P-020 AC7 only asks the UI to match the ledger, which it does. Found by QA while testing P-020.
- 2026-10-24: status new → triaged — priority P2, severity S3
- 2026-10-26: status triaged → duplicate — duplicate of BUG-027 (fixed by P-049, done): countedUsage() in ledger.ts counts each usage event as its delta over the run's previous one; spend() and liveRuns read through it; covered by packages/crew/test/ledger.test.ts
