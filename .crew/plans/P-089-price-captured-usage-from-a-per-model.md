---
id: P-089
title: Price captured usage from a per-model table in config.yaml
goal:
items: CHORE-004
touches: packages/crew/src/hub/core/team/prices.ts, packages/crew/src/hub/commands/team/autonomy.ts, .crew/config.yaml, plugins/crew/skills/hub/references/model.md, plugins/crew/skills/hub/SKILL.md, packages/crew/test/hub/prices.test.ts, packages/crew/test/hub/e2e/activity.test.ts
depends_on:
status: in-progress
branch: plan/P-089-price-captured-usage-from-a-per-model
pr:
created: 2026-10-28
started: 2026-10-28
completed:
assignee: developer
---

# P-089: Price captured usage from a per-model table in config.yaml

## Context
CHORE-004 (G-003): the SubagentStop hook `usage --hook` (`usageHook` in packages/crew/src/hub/commands/team/autonomy.ts) records each
crew agent's tokens from its transcript, always with `cost: 0`. The hub has no price table, so `budgets.run.max_cost` and
`budgets.project.max_cost` never bite from captured usage, and the UI (FEAT-023) can only show tokens. The PM's direction
(2026-10-24, on the item): derive $ cost from tokens with a per-model price table configurable in `.crew/config.yaml`; the UI
shows $ once cost > 0.

## Scope
**In:**
- A `prices:` top-level block in `.crew/config.yaml`: one line per model id, a flow map of USD per million tokens, e.g.
  `claude-opus-5-5: { input: 4, output: 20, cache_read: 0.2 }`. `input` and `output` are required; `cache_write` defaults to
  1.25 x input and `cache_read` to 0.1 x input. An entry without a number for `input` or `output` is ignored.
- A new module `packages/crew/src/hub/core/team/prices.ts`: `readPrices(configText)` parses the block (reusing `yamlBlock`
  from core/store.ts) and `messageCost(model, usage, prices)` prices one assistant message's usage.
- `transcriptUsage(text, prices?)` also returns `cost`: the sum over messages, each priced by its own `model`
  (input_tokens x input + cache_creation_input_tokens x cache_write + cache_read_input_tokens x cache_read + output_tokens x
  output, / 1e6), rounded to 6 decimals. A message whose model has no price adds 0.
- `usageHook` reads the prices from the main checkout's `.crew/config.yaml` (`store.dir`) and records the computed cost
  instead of `cost: 0`. The transcript event stays a cumulative snapshot; `countedUsage` already diffs `cost`, so nothing
  changes in core/memory/ledger.ts.
- This repo's `.crew/config.yaml` gets a `prices:` block for the models its agents run (from Anthropic's published
  first-party rates, as cached 2026-10-06): claude-opus-5-5 {input 4, output 20, cache_read 0.2}, claude-sonnet-5-5
  {input 2, output 10, cache_read 0.2}, claude-haiku-5-5 {input 0.1, output 0.5}, claude-fable-5-1 {input 10, output 50,
  cache_read 0.25}, with a comment naming the unit and where the rates come from.
- Docs: `plugins/crew/skills/hub/references/model.md` documents the `prices:` block next to the other config.yaml keys;
  `plugins/crew/skills/hub/SKILL.md` drops "Nothing records it automatically yet" (line ~99) and says the usage hook records
  tokens and, with a `prices:` block, their cost.

**Out (explicitly not doing):**
- The main session's own usage (no SubagentStop for it): a separate follow-up.
- Shipping a built-in default price table in code or the discover config template (rates change; the project owns them).
- Pricing manual `usage --tokens-in/--tokens-out` records (they keep taking `--cost` as given).
- UI changes (FEAT-023 already shows $ once cost > 0), long-context or fast-mode rates, 1h cache-write rates.

## Acceptance criteria
- [ ] AC1: `readPrices` returns, for a config with a `prices:` block, one entry per well-formed model line with `input`,
  `output`, `cache_write` (default 1.25 x input) and `cache_read` (default 0.1 x input); lines missing a numeric `input` or
  `output` are left out; no block or no config gives an empty table. (unit test)
- [ ] AC2: `transcriptUsage(text, prices)` returns `cost` equal to the hand-computed sum for a transcript with two messages on
  different priced models that use all four token kinds, counting each message id once (last record wins, as for tokens);
  a message on an unpriced model adds 0; without `prices` the cost is 0 and the token fields are unchanged from today. (unit test)
- [ ] AC3: model matching ignores a trailing `[...]` context suffix and a `-YYYYMMDD` date suffix (`claude-opus-5-5[1m]` and
  `claude-opus-5-5-20261001` price as `claude-opus-5-5`), and is otherwise exact: with only `claude-opus-5` in the table,
  `claude-opus-5-5` is unpriced. (unit test)
- [ ] AC4: `crew.mjs usage --hook` in a repo whose `.crew/config.yaml` has a `prices:` block records a `usage` event with the
  computed `cost` (> 0) and `source: "transcript"`; without the block it records `cost: 0` as before. (e2e, activity.test.ts)
- [ ] AC5: with `budgets.project.max_cost` in the policy set below the computed cost, after one `usage --hook` call
  `crew.mjs run --check` exits 1 and prints a `budget: project cost` reason (the existing over-budget path now fires from
  captured usage). (e2e, activity.test.ts)
- [ ] AC6: this repo's `.crew/config.yaml` parses with `readPrices` to the four models listed in Scope, and `model.md` and
  `SKILL.md` say what Scope says. (unit test reading the real file + review)

## Approach
- New pure module core/team/prices.ts keeps the logic out of autonomy.ts (only the call site changes there) and out of
  core/store.ts, which is at 295 of the 300-line module limit and is in P-078's touches.
- `yamlBlock` already captures `key: value` lines of a top-level block; the value of a price line is the flow map text,
  parsed with a small regex for `name: number` pairs. No YAML library.
- Model ids keep `[\w-]` characters, which `yamlBlock` keys allow.
- Overlaps: autonomy.ts is in P-066 and P-080, .crew/config.yaml in P-085 (all accepted, they land first; this plan is a
  P3 chore and waits its turn); test files, model.md and SKILL.md are `hub.shared`.

## Design

## Tasks
- [ ] T1: core/team/prices.ts with `readPrices` and `messageCost` (suffix-stripping exact match), plus packages/crew/test/hub/prices.test.ts for AC1 and AC3 → verify: `cd packages/crew && npx vitest run test/hub/prices.test.ts`
- [ ] T2: `transcriptUsage(text, prices?)` returns `cost`; unit cases for AC2 in prices.test.ts → verify: `cd packages/crew && npx vitest run test/hub/prices.test.ts`
- [ ] T3: `usageHook` reads prices from `join(store.dir, "config.yaml")` and records the cost; e2e cases for AC4 and AC5 in activity.test.ts → verify: `cd packages/crew && npx vitest run test/hub/e2e/activity.test.ts`
- [ ] T4: `prices:` block in .crew/config.yaml, the AC6 case in prices.test.ts (reads the repo's config), model.md and SKILL.md updates → verify: `cd packages/crew && npx vitest run test/hub/prices.test.ts test/docs.test.ts && npm run typecheck`

## Test plan
**Targeted checks:**
- `packages/crew/test/hub/prices.test.ts` (new): AC1, AC2, AC3, AC6.
- `packages/crew/test/hub/e2e/activity.test.ts` (the `usage --hook` describe): AC4, AC5.
- `packages/crew/test/docs.test.ts` and `npm run typecheck`: docs and types stay consistent after T4.
- Review: AC6's doc wording.

## Rollout & rollback
n/a — internal. A project without a `prices:` block behaves as today (cost 0). Back out by reverting the squash commit;
ledger events already recorded keep their costs, which are plain numbers.

## Risks & open questions
- Rates go stale: they are the project's config, commented with their source and date; no code default to drift.
- Claude Code subagent transcripts carry Anthropic first-party model ids; Bedrock/Vertex ids or rates are not covered.
- Captured cost is an estimate (no long-context, fast-mode or 1h cache-write rates); budgets treat it as the real spend.

## Handoff

_Generated 2026-10-28 by `crew.mjs handoff` from the ledger._

- P-089: Price captured usage from a per-model table in config.yaml [in-progress] tasks 0/4 — claimed by Arpit Anand (developer:a3377ac3fc6342bb5)
- last checkpoint 2026-10-28 06:42 at T4 (2183815) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- next: T1: core/team/prices.ts with `readPrices` and `messageCost` (suffix-stripping exact match), plus packages/crew/test/hub/prices.test.ts for AC1 and AC3 → verify: `cd packages/crew && npx vitest run test/hub/prices.test.ts`
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —, AC6 —

Latest log:
- 2026-10-28: status draft → ready
- 2026-10-28: assigned to the developer role
- 2026-10-28: status ready → in-progress — branch plan/P-089-price-captured-usage-from-a-per-model

## Progress log

- 2026-10-28: status draft → ready
- 2026-10-28: assigned to the developer role
- 2026-10-28: status ready → in-progress — branch plan/P-089-price-captured-usage-from-a-per-model

## Outcome
