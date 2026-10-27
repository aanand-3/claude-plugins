---
id: P-075
title: Numbered acceptance criteria are parsed as criteria
goal:
items: BUG-047
touches: packages/crew/src/hub/core/work/doc.ts, packages/crew/src/hub/commands/work/execution.ts, packages/crew/test/doc.test.ts, packages/crew/test/hub/e2e/execution.test.ts
depends_on:
status: in-progress
branch: plan/P-075-numbered-acceptance-criteria-are-parsed
pr:
created: 2026-10-26
started: 2026-10-27
completed:
assignee: developer
---

# P-075: Numbered acceptance criteria are parsed as criteria

## Context
BUG-047 (found on P-060): a plan whose `## Acceptance criteria` is a numbered list (`1. **Title.** …`, wrapped lines
indented, some items holding nested `- ` bullets) is not parsed as such. `criteria()` in
`packages/crew/src/hub/commands/work/execution.ts` takes `Doc.checklist("Acceptance criteria")` (`- [ ]` lines) and
falls back to `Doc.bullets()`, which trims every line and keeps those starting `- `. Numbered items are ignored, so
the nested bullets become AC1..ACn: P-060 (8 numbered criteria, 6 nested bullets under items 4 and 6) shows 6
criteria in `context`/`resume`, `checkpoint --ac 7` is refused, `--ac all` covers 6, and evidence recorded as AC4
attaches to a sub-bullet's text. Reproduced by reading the code on main (2026-10-26); not a duplicate (`overlaps
BUG-047` lists no similar item). Goals read their criteria through the same `criteria()` (`commands/work/goals.ts`),
so goal criteria benefit too.

## Scope
**In:**
- A new `Doc.numbered(name)` in `packages/crew/src/hub/core/work/doc.ts`: the section's top-level numbered items, one
  string per item, in order.
- `criteria()` in `execution.ts`: checklist lines first; else top-level numbered items; else bullets (today's
  fallback, unchanged).
- Regression tests in `test/doc.test.ts` and `test/hub/e2e/execution.test.ts`.

**Out (explicitly not doing):**
- Changing `bullets()` or `checklist()` (other callers, e.g. a goal's `## Breakdown`, keep their behaviour).
- Folding a numbered item's continuation lines or nested bullets into its criterion text (the criterion is the first
  line, as a checklist criterion is today).
- Re-keying evidence already recorded on P-060 or any other plan.

## Acceptance criteria
- [ ] AC1 · `Doc.numbered(name)` returns the text after `N. ` or `N) ` for each line of the section that starts at column 0 with digits followed by `.` or `)` and a space, trimmed; indented lines (continuations, nested bullets, nested numbered items), HTML comments and an empty template line `1.` are not items. A unit test in `test/doc.test.ts` with a P-060-shaped section (3 numbered items, wrapped continuation lines, 2 nested `- ` bullets under item 2, one indented `   1.` sub-item) gets exactly the 3 top-level texts.
- [ ] AC2 · `criteria(plan)` returns the checklist when the section has `- [ ]`/`- [x]` lines; otherwise the numbered items when there are any; otherwise the `- ` bullets. A unit test covers all three section shapes (and a checklist section that also contains a numbered line still yields only the checklist).
- [ ] AC3 · Regression (end to end): for a started plan whose Acceptance criteria are 3 numbered items, item 2 with two nested `- ` bullets, `checkpoint --run true --ac 3` exits 0, `checkpoint --run true --ac 4` fails with `--ac: the plan has acceptance criteria 1–3`, and `resume` prints `evidence:` with AC1..AC3 only (AC3 ✓). The test fails on main (where `--ac 3` is refused: only the 2 nested bullets count).
- [ ] AC4 · Existing behaviour holds: the current tests in `test/doc.test.ts` and `test/hub/e2e/execution.test.ts` (checklist criteria) pass unchanged; `doc.ts` and `execution.ts` stay under 300 lines; `npm run typecheck` passes.

## Approach
- `numbered(name)`: like `bullets()`, over `stripComments(this.section(name))`, but without trimming the line before
  matching: `/^\d+[.)]\s+(\S.*)$/`, item text `m[1].trim()`. The column-0 anchor is what keeps nested items (indented
  ≥ 2 spaces, as Markdown requires under a numbered item) out; no indentation tracking needed.
- `criteria()` becomes three steps: checklist, numbered, bullets. One line changed plus one added; `acPrint`, `parseAc`
  and `evidence()` are untouched, so evidence keyed by text fingerprint keeps matching for checklist plans.
- Overlap: P-072 (in progress) also touches `execution.ts`, in `recovery()` only; this plan changes `criteria()`
  (lines 26-30). Different functions, so no dependency; whichever lands second rebases trivially.

## Design

## Tasks
- [ ] T1: Add `Doc.numbered(name)` to `packages/crew/src/hub/core/work/doc.ts` plus its unit test (AC1) in `test/doc.test.ts` → verify: `npx vitest run test/doc.test.ts` passes.
- [ ] T2: Make `criteria()` in `execution.ts` fall back checklist → numbered → bullets, with the AC2 unit test (export `criteria` is already public; test it in `test/doc.test.ts` or a `describe` in the e2e file) → verify: `npx vitest run test/doc.test.ts -t "criteria"` passes.
- [ ] T3: Add the AC3 regression case to `test/hub/e2e/execution.test.ts` (rewrite the started plan's Acceptance criteria to the numbered shape with `write(p, …)`) → verify: `npx vitest run test/hub/e2e/execution.test.ts` passes, and the new case fails against main's `execution.ts` (written from `git show main:packages/crew/src/hub/commands/work/execution.ts`, then restored).
- [ ] T4: Typecheck and size check (AC4) → verify: `npm run typecheck` passes in packages/crew and `wc -l` shows both modules under 300 lines.

## Test plan
**Targeted checks:**
- AC1, AC2: `npx vitest run test/doc.test.ts` (in packages/crew).
- AC3: `npx vitest run test/hub/e2e/execution.test.ts -t "numbered"` — the regression test; fails before the fix, passes after.
- AC4: `npx vitest run test/doc.test.ts test/hub/e2e/execution.test.ts`, `npm run typecheck`, `wc -l src/hub/core/work/doc.ts src/hub/commands/work/execution.ts`.

## Rollout & rollback
n/a — internal parsing change in the hub; ships with the next `.crew/bin` refresh. Rollback: revert the commit.
Plans in flight with numbered criteria (P-060) will show their full criteria count after the refresh; evidence
recorded earlier against a nested bullet's text no longer matches a criterion and must be re-recorded.

## Risks & open questions
- A plan that mixes a numbered list and top-level `- ` bullets in Acceptance criteria now gets only the numbered items
  (bullets were the criteria before). No plan in `.crew/plans/` is known to do that intentionally; checklist plans
  are unaffected.

## Handoff

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: Overlaps P-072 (in-progress) on packages/crew/src/hub/commands/work/execution.ts: P-072 changes recovery(), this plan changes criteria() only; no dependency, the later one rebases.
- 2026-10-27: assigned to the developer role
- 2026-10-27: status ready → in-progress — branch plan/P-075-numbered-acceptance-criteria-are-parsed

## Outcome
