---
id: P-057
title: Overlap check at triage
goal: G-007
items: FEAT-049
touches: packages/crew/src/hub/commands/work/overlap.ts, packages/crew/src/hub/commands/work/backlog.ts, packages/crew/src/hub/commands/work/backlog.reg.ts, plugins/crew/skills/hub/agents/pm.md, plugins/crew/skills/hub/references/model.md, plugins/crew/docs/reference.md, packages/crew/test/overlap.test.ts, packages/crew/test/hub/e2e/overlap.test.ts, packages/crew/test/mcp.test.ts, packages/crew/test/hub/registry.test.ts
depends_on: P-055
status: in-progress
branch: plan/P-057-overlap-check-at-triage
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
---

# P-057: Overlap check at triage

## Context
FEAT-049 (G-007). Triage today gives the PM no help spotting duplicates or conflicts with plans in flight. The hub can list overlap candidates mechanically at triage so the PM decides, and the architect is pulled in only when the hub flags a technical question. Builds on the triage rules of P-055 (Triage owns goal links), so it depends on that plan.

## Scope
**In:**
- `triage <ID>` prints overlap candidates: open items with similar titles, and in-flight plans whose `touches` cover paths the item names.
- Candidates are computed by the hub with no model call.
- The PM acts with the existing paths (reject duplicate, merge note, triage); nothing changes automatically.
- The hub flags a technical question for the architect only for overlap with an in-progress plan or an unclear cause.
- An item overlapping an in-flight plan becomes a dependent plan or a note on that plan, never a mid-flight scope change.

**Out (explicitly not doing):**
- Automatic merging, rejecting or re-planning.
- Semantic or model-based similarity.

## Acceptance criteria
- [ ] AC1 · `overlaps FEAT-###` (CLI, `--json`; MCP tool `overlaps`) lists the candidates for an item, read-only:
  - **similar items:** open items (not in `ITEM_CLOSED`, not itself) whose title is similar (see Approach), best first, at most 5;
  - **plans in flight:** plans in `ready`, `in-progress`, `blocked`, `in-review` or `accepted` whose `touches` cover a path the item names, each with the matching paths.
  - With none it prints `no overlap candidates for FEAT-###`.
- [ ] AC2 · `triage FEAT-### …` prints the same candidate block before its own output, for new and re-triaged items (not with `--reject`). It still triages exactly as P-055 specifies. Neither `overlaps` nor triage changes any item or plan file because of a candidate; a test checks the plan file and the item's other fields are unchanged.
- [ ] AC3 · Candidates are computed from the documents only: no network, no model, no subprocess besides git (a test runs with no network and the `claude` binary absent from PATH).
- [ ] AC4 · Architect flag. The block ends with `technical question → architect: <why>` only when (a) a matching plan is `in-progress`, `in-review` or `accepted` (its code is being built or landed), or (b) the item's paths match two or more plans in flight (unclear which one causes it). The flag suggests `ask FEAT-### --to architect "<why>"` and asks nothing itself. No flag for title-only matches or a match with a `ready`/`blocked` plan alone. `overlaps --json` has `architect: { why } | null`.
- [ ] AC5 · No mid-flight scope change. For each plan in flight the block suggests only the two allowed outcomes: a dependent plan (`new-plan "<title>" --items FEAT-### --depends P-###`) or a note on the plan (`log P-### "FEAT-### overlaps: …"`, then `triage FEAT-### --reject duplicate --note "noted on P-###"` if it adds nothing). It never suggests editing the plan or adding the item to it. A test checks that `new-plan --items` still refuses an item already in another plan, and that the plan's `items:` and `touches:` are unchanged after triage.
- [ ] AC6 · Regression tests for AC1–AC5 in `test/hub/e2e/overlap.test.ts`; a unit table for the title measure and path extraction.

## Approach
- **Module `commands/work/overlap.ts`** (new, about 100 lines): `overlapCandidates(store, item)` returns `{ items, plans, architect }`, plus `overlapLines(...)` for text. `overlaps` (CLI `pos: ["id"]`, `flag: ["json"]`, usage line `  overlaps ID [--json]                          similar open items and plans in flight whose touches cover the item's paths (PM, at triage)`, MCP tool `overlaps` with `id`) is registered in `backlog.reg.ts` beside `triage`, so `commands/index.ts` is unchanged. It is read-only, so no role gate.
- **Title similarity:**
  - tokens are lower-cased words of 3 or more letters, minus a small stop list (`the and for with from into when does not`) and the item-type words (`bug feat chore spike`);
  - the measure is Jaccard on the token sets, and a match needs Jaccard ≥ 0.5 **and** at least 2 shared tokens (so one-word titles never match on one word);
  - the threshold is one exported constant, so it can be tuned without touching the logic.
- **Paths an item names:** from the item body, backticked spans and bare words that contain a `/` or end in a file extension (`.ts .tsx .mjs .js .json .md .yaml .yml .css`), trimmed of punctuation and `:line` suffixes. A path matches a plan when `globsOverlap(path, touch)` holds for one of its `touches` (core/memory/knowledge.ts, the same overlap `footprint.ts` uses).
- **Triage (backlog.ts).** On top of P-055's `triage` (origin, suggestion, `relink`): before the gate, `store.say(...overlapLines(...))` when there is any candidate. The reject path skips it.
- **Docs and templates:**
  - `npm run build` regenerates `plugins/crew/docs/reference.md` (the `overlaps` command and tool) per K-2026-10-26-add-plugins-crew-docs-reference-md;
  - `pm.md` triage step: run `overlaps` / read triage's block, then reject as duplicate, note on the plan, open a dependent plan, or triage; `ask` the Architect when flagged;
  - `references/model.md`: one paragraph.
- Depends on P-055 (triage, backlog.ts, backlog.reg.ts, pm.md, model.md); built on its merged code.

## Tasks
- [ ] T1: Title tokens, the measure, path extraction (pure helpers in overlap.ts) → verify: `cd packages/crew && npx vitest run test/overlap.test.ts` (unit table: similar and dissimilar titles, one-word titles, paths with `:line`, backticks, extensions) (AC1, AC6)
- [ ] T2: `overlapCandidates`, the architect flag, `overlaps` command and MCP tool; `overlaps` in `test/mcp.test.ts`'s tool list → verify: `npm run build && npx vitest run test/hub/e2e/overlap.test.ts -t "overlaps" test/mcp.test.ts test/hub/registry.test.ts` (AC1, AC3, AC4)
- [ ] T3: Triage prints the block; the no-change and no-mid-flight checks → verify: `npx vitest run test/hub/e2e/overlap.test.ts -t "triage"` (AC2, AC5)
- [ ] T4: Docs and PM template → verify: `npx vitest run test/docs.test.ts test/hub/e2e/agents.test.ts`; read pm.md against AC4/AC5

## Test plan
**Targeted checks** (from `packages/crew/`; `npm run build` first, then `git checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md`):
- AC1, AC3, AC4 → `npx vitest run test/hub/e2e/overlap.test.ts -t "overlaps"`; `npx vitest run test/overlap.test.ts`
- AC2, AC5 → `npx vitest run test/hub/e2e/overlap.test.ts -t "triage"`
- AC6 → both files above; `npx vitest run test/mcp.test.ts test/hub/registry.test.ts test/docs.test.ts`; `npm run typecheck`

## Rollout & rollback
Ships in the bundle; reaches this repo through refresh-bin. The PM template text reaches this repo with the approved post-merge template refresh (the executive re-vendors pm.md, runs agents, and starts a fresh session). Rollback: revert the commit; nothing is stored.

## Risks & open questions
- Depends on P-055; both touch triage.
- Title similarity may be noisy. Mitigation: Jaccard ≥ 0.5 with 2 or more shared tokens, top 5 only, threshold in one constant; it only informs the PM.
- Items that name no paths can't match plans; the PM still sees title matches. Encouraging paths in bug reports is the writing guide's job, out of scope.

## Handoff

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-057-overlap-check-at-triage

## Outcome
