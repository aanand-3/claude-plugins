---
id: P-073
title: Breakdown lines split only at a dash and take a type prefix
goal:
items: BUG-045
touches: packages/crew/src/hub/commands/work/backlog.ts, packages/crew/test/hub/e2e/items.test.ts, plugins/crew/skills/hub/templates/goal.md, plugins/crew/skills/hub/references/writing-guide.md
depends_on:
status: ready
branch: plan/P-073-breakdown-lines-split-only-at-a-dash
pr:
created: 2026-10-26
started:
completed:
assignee: developer
---

# P-073: Breakdown lines split only at a dash and take a type prefix

## Context
BUG-045: `new-goal` turns each Breakdown line into an item, but `itemFromCandidate` in
`packages/crew/src/hub/commands/work/backlog.ts` splits the line with `/\s+[—–-]\s+|:\s/`. The leftmost match wins, so
in `SPIKE: Hook facts for runner-only launches — answers the questions` the `: ` comes first and the item is titled
"SPIKE" (G-009 created FEAT-060 this way; FEAT-061/062 got summaries starting after a colon inside the description).
The type is also hard-coded to FEAT, so a Breakdown line cannot create a spike or a chore. Still reproducible on main:
the regex and the `createItem(store, "FEAT", …)` call are unchanged.

## Scope
**In:**
- Split a Breakdown line into title and description only at a spaced dash (` — `, ` – `, ` - `); a colon never splits.
- A leading type prefix `FEAT: `, `CHORE: ` or `SPIKE: ` (uppercase, colon, space) sets the item type and is dropped
  from the title; no prefix still means FEAT.
- The goal's Breakdown line is rewritten as `- <ID>: <line without the prefix>`.
- An item created from a Breakdown line whose triage gate fails (a spike without Question and Timebox) stays `new`, and
  `new-goal` prints `note: <ID> stays new until triaged — <problems>` for it.
- The goal template's Breakdown comment and the writing guide's Breakdown row describe the prefix and the dash rule.

**Out (explicitly not doing):**
- A `BUG: ` prefix: a bug needs a full report at capture (`new-item bug --from`), then is listed in the Breakdown by
  ID. `BUG: ` is not a prefix and stays part of a FEAT title.
- Changing the `new-goal` help line (the registry test freezes pre-split help lines) or `planning.ts`.
- Fixing FEAT-060/061/062 (already rejected as duplicates).

## Acceptance criteria
- [ ] AC1: Regression: a Breakdown line `SPIKE: Hook facts for runner-only launches — answers the questions` creates
  SPIKE-001 titled `Hook facts for runner-only launches` with `answers the questions` as its Summary, status `new`, goal
  linked, and the goal's line reads `- SPIKE-001: Hook facts for runner-only launches — answers the questions`. This test
  fails on main.
- [ ] AC2: A line `Launch policy — the launch: runner|any key` creates a FEAT titled `Launch policy` whose Summary is
  `the launch: runner|any key` (a colon in the description does not move the split).
- [ ] AC3: A line with a colon and no spaced dash (`Auth: SSO login`) creates a FEAT titled `Auth: SSO login`.
- [ ] AC4: A line `CHORE: Bump deps — refresh the lockfile` creates CHORE-001 titled `Bump deps`, triaged at the goal's
  priority.
- [ ] AC5: `new-goal` prints a `stays new until triaged` note naming the spike from AC1.
- [ ] AC6: The existing `a goal's breakdown becomes triaged items` test and the goal-links tests still pass unchanged.
- [ ] AC7: `plugins/crew/skills/hub/templates/goal.md` and `plugins/crew/skills/hub/references/writing-guide.md` state
  the dash rule and the FEAT/CHORE/SPIKE prefix.

## Approach
In `itemFromCandidate`: match `^(FEAT|CHORE|SPIKE):\s+` first and strip it (type from the match, else FEAT); then split
the rest at the first `/\s+[—–-]\s+/` only. Pass the type to `createItem`. `breakdownToItems` writes back
`- ${it.id}: ${rest}` where `rest` is the line without the prefix. When the triage gate fails, `store.say` the same
note wording `newItem` uses. The `~~` skip and the `^(FEAT|BUG|CHORE|SPIKE)-\d+` existing-ID link run before this and
are unchanged (`SPIKE: …` does not match `SPIKE-\d+`). Update the module's header comment and the
`breakdownToItems`/`itemFromCandidate` doc comments. backlog.ts stays under 300 lines.

## Design

## Tasks
- [ ] T1: Regression tests for AC1-AC5 in `packages/crew/test/hub/e2e/items.test.ts` (one goal draft with the four lines), red on main → verify: `cd packages/crew && npx vitest run test/hub/e2e/items.test.ts -t breakdown` fails before T2
- [ ] T2: Prefix and dash-only split in `itemFromCandidate`, type passed to `createItem`, prefix dropped in the rewritten line, stays-new note in `backlog.ts` → verify: `cd packages/crew && npx vitest run test/hub/e2e/items.test.ts test/hub/e2e/goal-links.test.ts`
- [ ] T3: Describe the dash rule and the FEAT/CHORE/SPIKE prefix in the goal template's Breakdown comment and the writing guide's Breakdown row → verify: `grep -n "SPIKE:" plugins/crew/skills/hub/templates/goal.md plugins/crew/skills/hub/references/writing-guide.md` shows both

## Test plan
**Targeted checks:**
- `cd packages/crew && npx vitest run test/hub/e2e/items.test.ts` — AC1 (regression, fails before the fix), AC2, AC3, AC4, AC5, AC6
- `cd packages/crew && npx vitest run test/hub/e2e/goal-links.test.ts` — AC6
- `grep -n "SPIKE:" plugins/crew/skills/hub/templates/goal.md plugins/crew/skills/hub/references/writing-guide.md` — AC7

## Rollout & rollback
n/a — hub-internal parsing change; only goals created after the fix are affected. Back out by reverting the commit.

## Risks & open questions
- A title that legitimately starts with `FEAT: `/`CHORE: `/`SPIKE: ` loses that word; acceptable, it is the type.
- A line using ` - ` inside its title (e.g. `Sign-in - ...` is fine; `A - B - C`) splits at the first spaced dash, as today.

## Handoff

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-27: assigned to the developer role

## Outcome
