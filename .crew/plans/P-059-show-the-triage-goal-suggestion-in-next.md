---
id: P-059
title: Show the triage goal suggestion in next --role pm
goal: G-007
items: FEAT-051
touches: packages/crew/src/hub/commands/work/backlog.ts, packages/crew/src/hub/commands/team/roles.ts, packages/crew/test/hub/e2e/pm-queue.test.ts
depends_on: P-055
status: in-review
branch: plan/P-059-show-the-triage-goal-suggestion-in-next
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
---

# P-059: Show the triage goal suggestion in next --role pm

## Context
FEAT-051 (G-007, P3, origin P-055). P-055's capture rule keeps a filer's suggested goal in the item's Notes, and the suggestion appears only in `triage`'s output today. The PM's queue (`crew.mjs next --role pm`) should show it next to each item waiting for triage, so the PM can rank and link items without opening each one. Depends on P-055 (accepted, not yet landed), which produces the suggestion. P-021, which also touches `roles.ts`, has landed.

## Scope
**In:**
- `next --role pm` shows each untriaged item's suggested goal when its Notes carry one.
- The text matches what `triage` prints for the same suggestion.

**Out (explicitly not doing):**
- Changing how the filer records the suggestion or how `triage` links goals (P-055).
- Showing the suggestion in any other role's queue.

## Acceptance criteria
- [ ] AC1: `next --role pm` shows each untriaged item's suggested goal when it has one (its origin's goal, else the latest goal hint in its Notes), on both the `triage bug …` and the `triage …` lines.
- [ ] AC2: Items without a suggestion, and items that already have a goal, show nothing extra: their line is unchanged (`triage ID: title`).
- [ ] AC3: The text matches what `triage` prints for the same suggestion: both come from one helper and read `suggested goal: G-### (<reason>)`, with the same reason (`origin P-###'s goal`, `origin ID's goal` or `goal hint`).
- [ ] AC4: A test covers an item with and without a suggestion.

## Approach
Reuse P-055's `suggestedGoal(store, item)` in `commands/work/backlog.ts` rather than duplicating it:
- In `backlog.ts`, export `suggestedGoal` and add one exported formatter, `suggestionText(item: Doc, store: Store): string | null`,
  returning `suggested goal: G-### (<reason>)` for an item with no goal and a suggestion, else null. `triage` prints
  `${suggestionText(...)} — confirm with \`triage ID --goal G-###\` or pick another` through it, so its output stays byte-identical
  (P-055's goal-links tests stay green unchanged).
- In `commands/team/roles.ts`, the two PM triage rules append ` — ${suggestionText}` to the line when it is non-null:
  `triage FEAT-051: Show … — suggested goal: G-007 (origin P-055's goal)`.
- Nothing else changes: no CLI flag, help line, MCP tool or registry entry, so `registry.test.ts`, `mcp.test.ts` and the
  generated blocks in `plugins/crew/docs/*.md` (K-2026-10-26-add-plugins-crew-docs-reference-md) are unaffected and not in
  touches. `dispatch` (its own task strings) and other roles' queues are out of scope.
- The hub e2e tests run the built `plugins/crew/skills/hub/dist/crew.mjs`: build (`npm run build` in packages/crew) before
  running the test; the dist output is Release's to commit (K-2026-10-24-release-builds-the-generated-files-plans).

## Design

## Tasks
- [x] T1: In `backlog.ts`, export `suggestedGoal` and add `suggestionText`; `triage` prints its suggestion through it → verify: `npx vitest run test/hub/e2e/goal-links.test.ts` green with no change to that file (after `npm run build`).
- [x] T2: In `roles.ts`, append the suggestion to both PM triage lines when `suggestionText` returns one → verify: `node <dist>/crew.mjs next --role pm` in a scratch hub shows `— suggested goal: …` on an item with a hint and the bare line on one without.
- [x] T3: Add `test/hub/e2e/pm-queue.test.ts`: a hub with G-001 and P-001; FEAT-001 captured with `--origin P-001`, FEAT-002 with `--goal G-001` (goal hint), FEAT-003 with neither, BUG-001 with `--origin P-001`; `next --role pm` (as pm) contains `triage FEAT-001: … — suggested goal: G-001 (origin P-001's goal)`, `… — suggested goal: G-001 (goal hint)` for FEAT-002, `triage bug BUG-001: … — suggested goal: G-001 (origin P-001's goal)`, and FEAT-003's line ends at its title; the suggestion substring equals the one `triage FEAT-002 --priority P3` prints for the same item → verify: `npx vitest run test/hub/e2e/pm-queue.test.ts` green.

## Test plan
**Targeted checks** (in packages/crew, after `npm run build`):
- `npx vitest run test/hub/e2e/pm-queue.test.ts` — AC1 (origin and hint, bug and feat lines), AC2 (no-suggestion item unchanged), AC3 (same text as triage), AC4.
- `npx vitest run test/hub/e2e/goal-links.test.ts` — AC3: triage's own output unchanged by the refactor.
- `npx vitest run test/hub/e2e/team.test.ts test/hub/e2e/dispatch.test.ts` — AC2: existing PM queue and dispatch lines unchanged.

## Rollout & rollback
n/a — read-only queue text in the hub CLI; ships with the next bundle build. Back out by reverting the plan's commit. The
plan worktree was cut before P-055 landed: fast-forward its branch to main (`git merge --ff-only main`) after P-055 lands
and before `start` (K-2026-10-25-a-plan-worktree-cut-before-its-depends).

## Risks & open questions
- Depends on P-055 landing first: the suggestion format comes from it.

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-059: Show the triage goal suggestion in next --role pm [in-review] tasks 3/3 — claimed by Arpit Anand (developer:a6f625b7a35766451)
- last checkpoint 2026-10-26 10:40 at T3 (b66c720) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- evidence: AC1 —, AC2 —, AC3 —, AC4 —

Latest log:
- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-059-show-the-triage-goal-suggestion-in-next

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-059-show-the-triage-goal-suggestion-in-next
- 2026-10-26: status in-progress → in-review

## Outcome
`backlog.ts` exports `suggestedGoal` and a new `suggestionText(item, store)` (`suggested goal: G-### (<reason>)` or null); `triage` prints its suggestion through it, byte-identical. `roles.ts` appends ` — <suggestionText>` to both PM triage lines (bug and non-bug) when non-null; items without a suggestion or with a goal keep the bare `triage ID: title` line. New `test/hub/e2e/pm-queue.test.ts` covers origin, hint, bug and plain items and checks the text matches triage's. Targeted checks green after build: pm-queue 1/1, goal-links 14/14, team + dispatch green (48/48 with goal-links).
Learnings: none
