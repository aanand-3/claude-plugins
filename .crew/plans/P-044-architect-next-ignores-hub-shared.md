---
id: P-044
title: Architect next ignores hub.shared overlaps
goal: G-007
items: BUG-030
touches: packages/crew/test/hub/e2e/shared-touches.test.ts
depends_on:
status: in-progress
branch: plan/P-044-architect-next-ignores-hub-shared
pr:
created: 2026-10-25
started: 2026-10-25
completed:
assignee: developer
---

# P-044: Architect next ignores hub.shared overlaps

## Context
BUG-030 (G-007): the architect's `next` flagged ready plans that meet only on `hub.shared` files as overlapping, though
staffing ignores those overlaps (`footprint.ts` `overlapping(plan, plans, shared)`).

The source fix is already on main: P-039 (commit 8b5c1dc) gave `View` in
`packages/crew/src/hub/commands/team/roles.ts` a `shared` field (`sharedGlobs(store)`) and passes it in both the
director's in-progress overlap rule and the architect's ready overlap rule. `branch-copies.test.ts` (P-039 AC5) covers
it only indirectly (a ready plan against a started one, negative assertions only). What is missing is a focused
regression test for the bug as reported: two **ready** plans meeting only on a `hub.shared` file, with a positive control
so the test cannot pass vacuously. This plan is test-only.

## Scope
**In:**
- A regression test in `packages/crew/test/hub/e2e/shared-touches.test.ts` for `next --role architect`.

**Out (explicitly not doing):**
- Any change to `roles.ts`, `footprint.ts`, `team.ts` or staffing (already correct on main).
- Changing `branch-copies.test.ts`.

## Acceptance criteria
- [ ] AC1: With `hub.shared: [src/cli.ts]` and two ready plans whose touches meet only on `src/cli.ts`,
  `next --role architect` prints no `P-00x overlaps P-00y` line.
- [ ] AC2: In the same test, a third ready plan sharing a non-shared file with one of them is flagged:
  `next --role architect` contains `overlaps` naming that pair and the non-shared file, and the line says
  `narrow touches or list the file in hub.shared` (positive control).
- [ ] AC3: The test fails when the architect rule's shared argument is removed (mutation check below), and passes on the
  unmodified source.
- [ ] AC4: Only `packages/crew/test/hub/e2e/shared-touches.test.ts` changes against the base branch.

## Approach
Add one `it(...)` under the existing "overlap hint" section of `shared-touches.test.ts`, reusing its helpers
(`shared`, `plan`, `ready`, `tr`): `shared("[src/cli.ts]")`; `plan(repo, "One", "src/cli.ts, src/one.ts")`,
`plan(repo, "Two", "src/cli.ts, src/two.ts")`, `plan(repo, "Three", "src/one.ts, src/three.ts")`;
`ready("P-001", "P-002", "P-003")`; then `const out = tr(repo, "next", "--role", "architect").stdout` and assert
`not.toMatch(/P-00[12] overlaps P-00[12] /)` (AC1) and that a line matches `/P-00[13] overlaps P-00[13] \(src\/one\.ts\)/`
and contains `narrow touches or list the file in hub.shared` (AC2). Check the exact output format against
`roles.ts` (architect rule, `${p.id} overlaps ${o.id} (${o.globs.join(", ")}): …`) before asserting. Keep the file under
300 lines.

If the test fails on unmodified source, stop and ask the architect (`ask P-044 --to architect`) instead of editing
`roles.ts` — that would mean the fix on main is incomplete and the plan's touches must change.

## Tasks
- [x] T1: add the regression test → verify: `npx vitest run test/hub/e2e/shared-touches.test.ts` in `packages/crew`
  passes (AC1, AC2).
- [x] T2: mutation check → verify: in the plan worktree, temporarily change the architect rule's
  `overlapping(p, v.plans, v.shared)` (the `v.status("ready")` line) to `overlapping(p, v.plans)` with the Edit tool or
  `node -e` (not `sed -i`), run the test and see it fail on AC1, then `git checkout -- packages/crew/src/hub/commands/team/roles.ts`
  and see it pass again (AC3).
- [x] T3: footprint → verify: `git add -N . && git diff --name-only main` in the worktree lists only the test file, and
  `git diff --quiet main -- packages/crew/src` exits 0 (AC4).

## Test plan
Targeted checks only, in `packages/crew`:
- AC1, AC2: `npx vitest run test/hub/e2e/shared-touches.test.ts`.
- AC3: the T2 mutation run (fails with the argument removed, passes restored).
- AC4: `git diff --name-only main` and `git diff --quiet main -- packages/crew/src`.

## Rollout & rollback
n/a — test-only change; revert the commit to roll back.

## Risks & open questions
- None. `packages/crew/test/**/*.test.ts` is in `hub.shared`, so the touch overlaps with other plans' test files do
  not block staffing.

## Handoff

_Generated 2026-10-25 by `crew.mjs handoff` from the ledger._

- P-044: Architect next ignores hub.shared overlaps [in-progress] tasks 0/3 — claimed by Arpit Anand (developer:a62f33636f74e4a3c)
- last checkpoint 2026-10-25 13:26 at T3 (afdc288) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- next: T1: add the regression test → verify: `npx vitest run test/hub/e2e/shared-touches.test.ts` in `packages/crew`
- evidence: AC1 —, AC2 —, AC3 —, AC4 —

Latest log:
- 2026-10-25: status draft → ready
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-044-architect-next-ignores-hub-shared

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-044-architect-next-ignores-hub-shared

## Outcome
New test in `packages/crew/test/hub/e2e/shared-touches.test.ts`: with `hub.shared: [src/cli.ts]`, `next --role architect` flags no overlap for two ready plans meeting only on `src/cli.ts`, and still flags P-001/P-003 on `src/one.ts` with the narrow-touches hint (positive control). Mutation check: dropping `v.shared` from the architect ready rule and rebuilding the bundle fails the test on AC1; restored and rebuilt it passes (9/9). Only the test file changes against the merge base; `packages/crew/src` identical to main.
Learnings: K-2026-10-25-hub-e2e-tests-tr-hub-in-test-helpers
