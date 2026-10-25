---
id: P-022
title: Slugs drop apostrophes instead of splitting on them
goal: G-001
items: BUG-001
touches: packages/crew/src/hub/core/text.ts, packages/crew/test/text.test.ts, packages/crew/test/hub/e2e/items.test.ts, plugins/crew/skills/hub/dist/crew.mjs, plugins/crew/skills/hub/dist/mcp.mjs
depends_on: P-020
status: done
branch: plan/P-022-slugs-drop-apostrophes-instead
pr:
created: 2026-10-24
started: 2026-10-25
completed: 2026-10-25
assignee: developer
---

# P-022: Slugs drop apostrophes instead of splitting on them

## Context
BUG-001 (P3/S4, under G-001): `slugify` in `packages/crew/src/hub/core/text.ts` turns an apostrophe into a separator, so
"the team's first job" becomes `the-team-s-first-job`. It shows up in item, plan and knowledge (K-…) file names and IDs.
Cosmetic, but every new ID made from a possessive or contraction reads oddly.

## Scope
**In:**
- `slugify` drops apostrophes (ASCII `'` and typographic `’`) inside words instead of splitting on them:
  "the team's first job" → `the-teams-first-job`, "don't" → `dont`.
- A regression test for the cases above.

**Out (explicitly not doing):**
- Renaming existing items, plans or knowledge entries whose slugs already carry `-s-` fragments.
- Any other change to slug rules (length, unicode transliteration, stop words).

## Acceptance criteria
- [ ] AC1 · `slugify("the team's first job")` and `slugify("the team’s first job")` (U+2019) both return
  `the-teams-first-job`; `slugify("don't stop")` returns `dont-stop`; `slugify("rock 'n' roll")` returns `rock-n-roll`.
- [ ] AC2 · `new-item feat "Kickoff as the team's first job" --why x` (run through the built `dist/crew.mjs` against a
  throwaway repo) creates an item file ending `-kickoff-as-the-teams-first-job.md`.
- [ ] AC3 · Every existing case in `packages/crew/test/text.test.ts` passes unchanged (no edits to existing expectations).
- [ ] AC4 · `plugins/crew/skills/hub/dist/crew.mjs` and `dist/mcp.mjs` are rebuilt from the changed source and committed
  with it (the e2e in T3 runs the rebuilt `dist/crew.mjs`; `git diff` shows the apostrophe strip in both bundles).

## Approach
In `slugify`, after `toLowerCase()`, remove ASCII `'` and typographic `’` (U+2019) with `.replace(/['’]/g, "")`, then
apply the existing `[^a-z0-9]+` → `-` replacement. Nothing else in the function changes (40-char limit, stop-word trim,
`untitled` fallback). Callers (`backlog.ts`, `planning.ts`, `knowledge.ts`, `workflow.ts`) need no change.

Migration: none. Slugs are only ever computed when a doc is created; existing files are found by ID prefix, and every
plan stores its `branch` in frontmatter (the `workflow.ts:150` fallback recomputes a branch only when that field is
empty, and no plan has both an empty branch and an apostrophe in its title). Existing names with `-s-` fragments
(FEAT-012, BUG-010, BUG-012, CHORE-012, K-2026-10-23-…-agent-s-identity, K-2026-10-23-read-a-plan-s-…) keep their
names; renaming them would break K-IDs cited in other docs and is out of scope.

## Tasks
- [x] T1: Add the AC1 cases as a regression test (new `it` in the `slugify` block of `packages/crew/test/text.test.ts`) → verify: `npx vitest run test/text.test.ts` fails on them before the fix.
- [x] T2: Strip apostrophes in `slugify` (`packages/crew/src/hub/core/text.ts`) → verify: `npx vitest run test/text.test.ts` passes, all old cases included (AC1, AC3).
- [x] T3: Add an e2e regression test to `packages/crew/test/hub/e2e/items.test.ts` for `new-item feat "Kickoff as the team's first job"` → verify: `npx vitest run test/hub/e2e/items.test.ts` finds `…-kickoff-as-the-teams-first-job.md` (AC2).
- [x] T4: Rebuild bundles with `npm run build` in `packages/crew`, keeping only `dist/crew.mjs` and `dist/mcp.mjs` changes → verify: `git diff --stat main` lists only files in touches and T3's e2e passes on the new bundle (AC4).

## Test plan
**Targeted checks** (from `packages/crew`; regression tests from T1 and T3):
- AC1, AC3: `npx vitest run test/text.test.ts`
- AC2, AC4: `npm run build && npx vitest run test/hub/e2e/items.test.ts`
- `npm run typecheck`

## Rollout & rollback
Internal naming helper; existing files are not renamed. Rollback: revert the commit (source and bundles together).
**Release (2026-10-25):** P-022 ships under the convention it was specced with, as K-2026-10-24-release-builds-the-generated-files-plans
allows for P-020/P-021/P-022. The branch's `dist/crew.mjs` and `dist/mcp.mjs` were rebuilt on main 78a3edf and differ from
it only in `slugify`. Release keeps them in the plan's commit. If main moves before merge, bring the branch up to main and
rebuild with `npm run build` in `packages/crew` (do not hand-merge the bundles), then check `git diff --exit-code -- plugins/crew/skills` after the build.
**Needs the human after merge:** `.crew/bin/crew.mjs` (this repo's own hub) is a protected path agents cannot write, so
the fix reaches this repo's IDs only when the human copies `plugins/crew/skills/hub/dist/crew.mjs` over
`.crew/bin/crew.mjs`. Until then, new IDs made here keep the old `-s-` rule. Not a blocker for merging.

## Risks & open questions
- Scheduling (decided): honest touches need `packages/crew/test/**` and `plugins/crew/skills/hub/dist/**` files, which
  overlap P-020 (in review, claimed by another run). P-022 depends on P-020 instead of narrowing touches: skipping the
  bundle rebuild would break the "rebuild the bundles and commit them with the source" convention, and the dist bundles
  conflict on any concurrent rebuild. P-020 is already in review, so the wait is short; P-022 rebases on it and rebuilds.
- Other quote-like characters (`‘`, `ʼ`, backtick) still split words; out of scope unless a real title shows them.

## Handoff

_Generated 2026-10-25 by `crew.mjs handoff` from the ledger._

- P-022: Slugs drop apostrophes instead of splitting on them [in-review] tasks 4/4 — claimed by Arpit Anand (developer:a329719b109395ade)
- last checkpoint 2026-10-24 18:38 at T4 (78a3edf) by Arpit Anand; since then 0 commit(s), 8 uncommitted file(s): .crew/items/BUG-001-slugs-keep-apostrophe-fragments-team-s.md, packages/crew/src/hub/core/text.ts, packages/crew/test/hub/e2e/items.test.ts, packages/crew/test/text.test.ts, plugins/crew/skills/hub/dist/crew.mjs, plugins/crew/skills/hub/dist/mcp.mjs, .crew/knowledge/K-2026-10-25-a-plan-worktree-cut-before-its-depends.md, .crew/plans/P-022-slugs-drop-apostrophes-instead.md
- evidence: AC1 —, AC2 —, AC3 —, AC4 —

Latest log:
- 2026-10-24: Director: specced and ready; waits on P-020 (in review, owned by another run). Next: when P-020 is done, PM assigns P-022 to developer, then developer → QA → review → PM done → Release. After merge the human copies dist/crew.mjs --as director --run-id director:a0e02b8b995832324 over protected .crew/bin/crew.mjs.
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-022-slugs-drop-apostrophes-instead

## Progress log

- 2026-10-24: status draft → ready
- 2026-10-24: Director: specced and ready; waits on P-020 (in review, owned by another run). Next: when P-020 is done, PM assigns P-022 to developer, then developer → QA → review → PM done → Release. After merge the human copies dist/crew.mjs --as director --run-id director:a0e02b8b995832324 over protected .crew/bin/crew.mjs.
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-022-slugs-drop-apostrophes-instead
- 2026-10-25: status in-progress → in-review
- 2026-10-25: QA: AC1-AC4 verified by checks; typecheck passes; no bugs. AC4 commit step pending (changes uncommitted on branch). Protected .crew/bin/crew.mjs --as qa --run-id qa:a13bbd5ae41d54ec2 not refreshed — not required by any AC.
- 2026-10-25: status in-review → done
- 2026-10-25: merged: squash fc812e2 on local main (branch commit 232d8b4); full_suite pass 37 files/273 tests, skills diff clean; not pushed. Human: copy plugins/crew/skills/hub/dist/crew.mjs --as release --run-id release:a7fad5de026157928 over .crew/bin/crew.mjs --as release --run-id release:a7fad5de026157928

## Outcome

Learnings: K-2026-10-25-a-plan-worktree-cut-before-its-depends
