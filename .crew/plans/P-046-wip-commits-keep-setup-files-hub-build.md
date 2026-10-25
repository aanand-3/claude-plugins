---
id: P-046
title: WIP commits keep setup files; hub build removes its temp dirs
goal: G-007
items: CHORE-023, CHORE-024
touches: packages/crew/src/hub/core/git.ts, packages/crew/src/hub/commands/work/execution.ts, packages/crew/build.mjs, packages/crew/test/hub/e2e/wip-commits.test.ts, packages/crew/test/dist.test.ts
depends_on:
status: in-progress
branch: plan/P-046-wip-commits-keep-setup-files-hub-build
pr:
created: 2026-10-25
started: 2026-10-25
completed:
assignee: developer
---

# P-046: WIP commits keep setup files; hub build removes its temp dirs

## Context
Two small, independent chores in G-007, grouped to save a plan cycle.
- **CHORE-023** (found re-reviewing P-029): `git.codeChanges` (core/git.ts:106, P-028) drops every path under `.crew/`. A plan's change to `.crew/config.yaml` (P-029's `hub.shared`), `.crew/templates/**` or another setup file is therefore never WIP-committed by `checkpoint` (execution.ts) and is invisible to the review gate (review.ts) after an approval; it reaches main only through Release's commit (the K-2026-10-25 gotcha on `.crew/config.yaml`). Only the hub's own documents must stay out: the state paths the hub commits on the base branch (`STATE_PATHS` / `STATE_RE` in core/work/hubstate.ts: `.crew/plans/`, `items/`, `goals/`, `knowledge/`, `idea.md`), plus the hub's scratch output, `.crew/drafts/` (drafts that `new-*` consume) and `.crew/view/` (`export` output). Everything else under `.crew/` (`config.yaml`, `policy.yaml`, `templates/**`, `bin/**`, `README.md`) is code like any other file.
- **CHORE-024** (found by Release after P-041): `bundlePage` (build.mjs:65) makes a `hub-ui-*` mkdtemp output dir per vite build and never removes it: two per hub build (ui.html, studio.html) left in `os.tmpdir()`. `bundleReference` (build.mjs:55) leaks one `hub-ref-*` dir per build the same way; it is fixed here too, since it is the same defect in the same file.

## Scope
**In:**
- git.ts `codeChanges`: exclude only the hub's documents, the paths matching `^\.crew/((plans|items|goals|knowledge|drafts|view)/|idea\.md$)` (a constant in git.ts, with a comment naming hubstate.ts's `STATE_RE`, which it extends; git.ts does not import hubstate.ts, which imports git.ts). Generated and secret files stay out as today. The doc comments of `codeChanges` and of execution.ts's WIP-commit function (line 161) say so.
- build.mjs: `bundlePage` removes its `outDir` after copying the page out, in a `finally` (also when the vite build throws); `bundleReference` removes its temp dir after importing the module. `rmSync(dir, { recursive: true, force: true })`.
- Tests: wip-commits.test.ts's checkpoint case expects `.crew/config.yaml` in the WIP commit; new cases for `.crew/templates/**`, the excluded hub paths, and the review gate. dist.test.ts's ui, studio and reference cases also check that no new `hub-ui-*` / `hub-ref-*` dir is left in `tmpdir()`.

**Out (explicitly not doing):**
- Anything else in git.ts or build.mjs.
- developer.md line 20 ("`.crew/` and secret files stay out"): it is in P-032's touches and not `hub.shared`; a one-line follow-up after P-032 lands (listed in this plan's Outcome as a follow-up item).
- Changing what the hub commits on the base branch (`commitState`).

## Acceptance criteria
- [ ] AC1 · In a plan worktree (wip-commits.test.ts's `startedInWorktree`), changing `src/auth/signup.py`, `.crew/config.yaml` and `.crew/templates/plan.md` and running `checkpoint P-001 --step T1`: the WIP commit on the plan branch contains exactly those three files; `dist/app.mjs` (generated) and `.env` (secret) stay uncommitted.
- [ ] AC2 · Files under `.crew/drafts/`, `.crew/view/`, `.crew/plans/` (or another state dir) and `.crew/idea.md` written in the plan worktree are not in the WIP commit and are not reported by `review --approve` as uncommitted code.
- [ ] AC3 · After an approving review, a change to `.crew/config.yaml` in the plan's worktree makes the PM's `move P-001 done` (or `accepted`, if P-032 has landed) refuse as an unreviewed change, as a source file does in the BUG-014 case.
- [ ] AC4 · `bundleUi`, `bundleStudio` and `bundleReference` leave no new `hub-ui-*` or `hub-ref-*` entry in `os.tmpdir()` (count before = after), and the bundled `ui.html`, `studio.html` and `commands.md` still equal the committed ones (dist.test.ts).
- [ ] AC5 · `node build.mjs` from `packages/crew/` leaves the number of `hub-ui-*` and `hub-ref-*` dirs in the shell's `os.tmpdir()` unchanged.
- [ ] AC6 · `npm run typecheck` passes; git.ts stays under 300 lines.

## Approach
- git.ts: a `NOT_CODE` regex constant beside `codeChanges`; the filter becomes "not `NOT_CODE` and not a secret".
- build.mjs: `bundlePage` moves the `copyFileSync` inside the `try` and adds `rmSync(outDir, …)` to the `finally` (keeping the `NODE_ENV` restore). `bundleReference`: keep the mkdtemp dir in a variable, then `try { import; write } finally { rmSync(dir, …) }`.
- Tests: in wip-commits.test.ts, change the first checkpoint case's expectations (config.yaml moves from `status(w)` into the commit) and add `it("commits setup files under .crew/ but not the hub's documents")` and `it("the review gate sees a setup file changed after the approval")`, reusing `startedInWorktree`, `inReview` and `ship`. In dist.test.ts, a helper that counts the `hub-ui-` / `hub-ref-` entries of `readdirSync(tmpdir())`, compared around each bundle call.

## Tasks
- [ ] T1: wip-commits tests for AC1–AC3, failing on the current code → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/wip-commits.test.ts` fails on the new expectations
- [ ] T2: `codeChanges` exclusion and the two doc comments → verify: `npm run build && npx vitest run test/hub/e2e/wip-commits.test.ts` (AC1, AC2, AC3)
- [ ] T3: build.mjs temp-dir cleanup and the dist.test.ts checks → verify: `npx vitest run test/dist.test.ts` (AC4); count `hub-ui-*` and `hub-ref-*` in `node -p 'require("os").tmpdir()'` before and after `node build.mjs`: equal (AC5)
- [ ] T4: types and size → verify: `npm run typecheck`; `wc -l src/hub/core/git.ts` under 300 (AC6)

## Test plan
**Targeted checks** (from `packages/crew/`; wip-commits.test.ts drives the built `dist/crew.mjs`: `npm run build` first, then discard the generated output, which Release builds):
- AC1, AC2, AC3 → `npx vitest run test/hub/e2e/wip-commits.test.ts`
- AC4 → `npx vitest run test/dist.test.ts` (after `npm run build`, so the committed-bundle comparisons hold in the worktree)
- AC5 → T3's before/after count around `node build.mjs`
- AC6 → `npm run typecheck`; `wc -l src/hub/core/git.ts`

## Rollout & rollback
n/a — internal. After it ships (Release builds, `refresh-bin`), plans that change `.crew/config.yaml` or templates get them WIP-committed and reviewed, and Release no longer carries `.crew/config.yaml` into the plan's commit by hand. Rollback: revert the commit.

## Risks & open questions
- A plan that writes a stray file into `.crew/` outside the excluded hub paths now has it WIP-committed; that is intended (it becomes reviewable).
- `.crew/bin/**` written by `refresh-bin` in a plan worktree is committed by the next checkpoint or by Release's land step, as Release intends.
- Overlap, for staffing only: build.mjs with P-021 (ready). The test files are `hub.shared`. No dependency.

## Handoff

## Progress log

- 2026-10-25: status draft → ready — Architect: specced (ACs, tasks, test plan, exact touches)
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-046-wip-commits-keep-setup-files-hub-build

## Outcome
