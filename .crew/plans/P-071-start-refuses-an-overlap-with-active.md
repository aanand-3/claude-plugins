---
id: P-071
title: start refuses an overlap with active work, as staff does
goal:
items: FEAT-069
touches: packages/crew/src/hub/core/work/footprint.ts, packages/crew/src/hub/commands/work/workflow.ts, packages/crew/src/hub/commands/team/team.ts, packages/crew/scripts/sample-project.mjs, plugins/crew/skills/hub/SKILL.md, plugins/crew/skills/hub/references/model.md, packages/crew/test/hub/e2e/context.test.ts, packages/crew/test/hub/e2e/branch-copies.test.ts, packages/crew/test/hub/e2e/start-overlap.test.ts, packages/crew/test/hub/e2e/sections.ts, packages/crew/test/hub/e2e/basics.test.ts, packages/crew/test/hub/e2e/ledger.test.ts, packages/crew/test/hub/e2e/policy.test.ts, packages/crew/test/hub/e2e/land.test.ts, packages/crew/test/hub/e2e/land-helpers.ts, packages/crew/test/hub/e2e/team-helpers.ts
depends_on:
status: in-progress
branch: plan/P-071-start-refuses-an-overlap-with-active
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
---

# P-071: start refuses an overlap with active work, as staff does

## Context
FEAT-069 is what is left of FEAT-021 / P-003, which were specced on the unmerged branch `claude/crew-bug-001-9d4b01`
(b131393) and are not coming to main (Q-d1e1c6, Q-0baafa). Main already covers the rest of FEAT-021: generated files are
marked `linguist-generated` in `.gitattributes` and kept out of touches, Release rebuilds them (`hub.build`), and
`hub.shared` stops overlaps on registries, docs and tests from blocking.

The gap: `staff` (`packages/crew/src/hub/commands/team/team.ts`, `staffing()`) makes a ready plan wait when its touches
overlap an in-progress, blocked or in-review plan on a path outside `hub.shared` (`blockingGlobs` in
`core/work/footprint.ts`), but `start` (`commands/work/workflow.ts`) only prints
`warning: P-002 overlaps P-001 (in progress) …` and starts it anyway. A direct `start` (a human, or an agent not routed
by `dispatch`) therefore puts two overlapping plans in flight, which K-2026-10-23-parallelism-comes-from-decomposition-one
rules out. Decision K-2026-10-26-start-refuses-an-overlap (re-recorded on main from the branch's K-2026-10-24 entry): `start` refuses such an
overlap unless `--force`, using the same overlap function as `staff`, so both give the same verdict.

Binding knowledge: K-2026-10-23-refuse-before-git-side-effects-start (refuse before any branch or worktree is made),
K-2026-10-23-every-module-stays-under-300-lines (`workflow.ts` is at 287 lines),
K-2026-10-26-packages-crew-scripts-sample-project-mjs (the sample project starts plans; it must keep building).

## Scope
**In:**
- One function in `core/work/footprint.ts` that says which active plans block a plan: the plans whose status is
  in-progress, blocked or in-review (ledger-aware, exactly as `staffing()` computes it today: a claim means in-progress,
  else the ledger's last status, else the file's) and that share a non-`hub.shared` touch with it (`blockingGlobs`).
  `staffing()` uses it for its `overlaps P-### on its touches` verdict against active plans; `start` uses it to refuse.
- `start` refuses (non-zero exit, nothing written: no branch, no claim, no status change, no ledger event) a plan that
  this function says is blocked, naming each blocking plan, its status and the globs, and saying `--force` starts it
  anyway. The refusal sits in `checkStartable` (so it is skipped by `--force` and by a takeover, like the other
  start checks), before any branch or worktree is made.
- `start --force` keeps today's warning.
- `packages/crew/scripts/sample-project.mjs`: its `start P-008` (which overlaps P-006 on `src/checkins/**` by design)
  passes `--force`, so the sample keeps its overlapping pair.
- Docs: `plugins/crew/skills/hub/SKILL.md` (Footprints: `start` refuses, not warns) and
  `plugins/crew/skills/hub/references/model.md` (Size, dependencies and WIP: the start rule).

**Out (explicitly not doing):**
- Overlaps with `accepted` or `ready` plans: unchanged (`staff` does not wait on them; `start` keeps the warning for
  accepted plans and says nothing for ready ones).
- `staff`'s check among the plans it proposes together (`out.start`) and its other verdicts.
- `check`, `context` and the `next` hints (unchanged; they already report overlaps).
- Generated paths (main handles them with `.gitattributes`, see Context).

## Acceptance criteria
- [ ] AC1: Without plan worktrees: two ready plans with touches `src/auth/**` and `src/auth/session.py`; P-001 started by run a; `start P-002` by run b exits non-zero, its output names P-001, `src/auth/**` and `--force`; afterwards `git branch --list 'plan/P-002*'` is empty, P-002's status is still ready and `ledger --ref P-002` has no claim (vitest `test/hub/e2e/context.test.ts`, the "overlapping plans" case).
- [ ] AC2: `start P-002 --force` then exits 0 with the existing overlap warning, and `check` still reports the overlap (same case).
- [ ] AC3: With plan worktrees and `hub.shared: [src/cli.ts]`: a plan overlapping a started plan only on `src/cli.ts` starts without `--force` and without warning; a plan overlapping it on `src/one.ts` is refused without `--force` (status ready, no claim) and starts with it (vitest `test/hub/e2e/branch-copies.test.ts`, the "no overlap warning on shared touches" case).
- [ ] AC4: `staff` and `start` agree: for a ready plan overlapping another plan on a non-shared path, with the other plan in-progress, blocked and in-review in turn, `staff --json` lists the ready plan under `waiting` with `overlaps P-### on its touches` and `start` refuses it; with the other plan ready (neither started), `staff --json` lists P-001 under `start` and P-002 under `waiting` with `overlaps P-001 on its touches` (its unchanged check among the plans it proposes together), and `start P-002` without `--force` still succeeds, since `start` refuses only on in-progress, blocked or in-review plans (vitest, new `test/hub/e2e/start-overlap.test.ts`).
- [ ] AC5: Every existing hub test that starts plans still passes, the sample project still builds (`test/view.test.ts`), each touched module stays ≤ 300 lines (`test/structure.test.ts`), and `npm run typecheck` in `packages/crew` passes.
- [ ] AC6: `plugins/crew/skills/hub/SKILL.md` no longer says `start` warns on an overlap and says it refuses unless `--force`; `references/model.md` states the rule (grep, see Test plan).

## Approach
- `core/work/footprint.ts`: add the shared function, for example
  `activeOverlaps(store, plan, plans, shared): { id, status, globs }[]`, built on `blockingGlobs` and `ACTIVE`, with the
  ledger-aware status `staffing()` uses (move that status helper here, or have `staffing()` pass its own; either way one
  definition of "active" and one overlap test). Keep it in core (no import from `commands/`).
- `commands/team/team.ts`: `staffing()` calls it for the check against `busy`; the check against plans it is proposing
  in the same pass (`out.start`) stays as it is.
- `commands/work/workflow.ts`: `checkStartable` calls it and `fail`s with one line per blocking plan, e.g.
  `P-002 overlaps P-001 (in-progress) on src/auth/** — wait for it, narrow touches or list the file in hub.shared (--force to start anyway)`.
  The warning loop after it stays (it still serves `--force` and accepted plans). Keep `workflow.ts` ≤ 300 lines:
  the refusal is a few lines; put any formatting in `footprint.ts`.
- `scripts/sample-project.mjs`: `tr("start", "P-008", "--force")`.
- Tests: update the two existing cases (AC1–AC3), add `start-overlap.test.ts` (AC4) with the e2e helpers as they are.
  Any other existing test that turns out to start an overlapping plan without `--force` gets `--force` (or narrower
  touches) and the developer logs the extra touch. After merging main (Q-8fbcfd): `started()` now lives in
  `land-helpers.ts`, which carries the `--force` change instead of `land.test.ts`; any other test or e2e helper under
  `packages/crew/test/` that fails only because start now refuses the overlap is fixed the same way and logged, no
  question needed; ask only if the fix would change what a test asserts or touch a non-test file.

## Design

## Tasks
- [x] T1: Write `packages/crew/test/hub/e2e/start-overlap.test.ts` (AC4) and update the overlap cases in `test/hub/e2e/context.test.ts` (AC1, AC2) and `test/hub/e2e/branch-copies.test.ts` (AC3) to expect the refusal → verify: `cd packages/crew && npx vitest run test/hub/e2e/start-overlap.test.ts test/hub/e2e/context.test.ts test/hub/e2e/branch-copies.test.ts` fails on the refusal assertions before T2.
- [x] T2: Add the shared active-overlap function to `core/work/footprint.ts`, use it in `staffing()` (`commands/team/team.ts`) and make `checkStartable` (`commands/work/workflow.ts`) refuse with it → verify: `cd packages/crew && npm run typecheck && npx vitest run test/hub/e2e/start-overlap.test.ts test/hub/e2e/context.test.ts test/hub/e2e/branch-copies.test.ts test/hub/e2e/shared-touches.test.ts test/hub/e2e/team.test.ts test/structure.test.ts` passes.
- [x] T3: Pass `--force` to the sample project's `start P-008` in `packages/crew/scripts/sample-project.mjs`, and fix the start-calling tests that now hit the refusal (Q-2665c8): the WIP / budget tests in `basics.test.ts`, `ledger.test.ts` and `policy.test.ts` give their second plan distinct touches (an optional touches argument on `readyPlan` in `sections.ts`), since they test WIP and budgets, not overlap; `land.test.ts`'s `started()` always passes `--force`, with a comment that its plans overlap on `src/cli.ts` by design → verify: `cd packages/crew && npx vitest run test/view.test.ts test/hub/e2e test/hub-worktrees.test.ts test/hub/squash-merge.test.ts test/hub/generated-drift.test.ts` passes (AC5).
- [x] T4: Update `plugins/crew/skills/hub/SKILL.md` (Footprints) and `plugins/crew/skills/hub/references/model.md` (Size, dependencies and WIP) → verify: `grep -n "start" plugins/crew/skills/hub/SKILL.md` shows the refusal and `--force` and no "start warns"; `grep -n "overlap" plugins/crew/skills/hub/references/model.md` shows the start rule; `cd packages/crew && npx vitest run test/plugin/contents.test.ts` passes (AC6).

## Test plan
**Targeted checks** (from `packages/crew`, vitest):
- AC1, AC2: `npx vitest run test/hub/e2e/context.test.ts` — the "overlapping plans" case: refused start (non-zero, names P-001, `src/auth/**`, `--force`; no `plan/P-002*` branch; P-002 still ready; no claim in `ledger --ref P-002`), then `start P-002 --force` exits 0 with the warning and `check` reports the overlap.
- AC3: `npx vitest run test/hub/e2e/branch-copies.test.ts` — the shared-touches case: P-002 (shared-only overlap) starts with no "overlaps"; P-003 without `--force` is refused (ready, no claim), with `--force` exits 0 and prints the warning naming `hub.shared`.
- AC4: `npx vitest run test/hub/e2e/start-overlap.test.ts` — for the other plan in-progress, blocked, in-review: `staff --json` waiting reason `overlaps P-001 on its touches` and `start` refused; for it ready: `staff --json` proposes P-001 under start and P-002 waits on `overlaps P-001 on its touches`, and `start P-002` (no `--force`) exits 0.
- AC5: `npm run typecheck`; `npx vitest run test/structure.test.ts test/view.test.ts test/hub/e2e test/hub-worktrees.test.ts test/hub/squash-merge.test.ts test/hub/generated-drift.test.ts` (every test file that runs `start`).
- AC6: the two greps in T4 (from the repo root) and `npx vitest run test/plugin/contents.test.ts`.

## Rollout & rollback
Behaviour change in the hub: `start` now refuses an overlap with in-progress, blocked or in-review work that it used to
only warn about; `--force` restores the old behaviour per start. Call it out in the plan's outcome. The team flow is not
affected (`dispatch` only offers plans `staff` lets start). After merge the executive's session refreshes `.crew/bin`
on main as usual (K-2026-10-25-claude-codes-auto-mode-permission-check).
Rollback: revert the plan's commit and rebuild.

## Risks & open questions
- `workflow.ts` is at 287 lines and P-067 (in progress) and P-068 (ready) also edit it: `staff` will hold this plan until
  they are done (a real overlap, not a dependency). Rebase on them; if the file would pass 300 lines, move start's
  refusal formatting into `footprint.ts`.
- Some existing e2e test may start an overlapping pair without `--force`; T3 finds and fixes it (tests are `hub.shared`).

## Handoff

_Generated 2026-10-27 by `crew.mjs handoff` from the ledger._

- P-071: start refuses an overlap with active work, as staff does [in-review] tasks 4/4 — claimed by Arpit Anand (developer:a67a70d59d74e9720)
- last checkpoint 2026-10-27 07:45 at T3 (dd4fb79) by Arpit Anand; since then 0 commit(s), 2 uncommitted file(s): plugins/crew/skills/hub/dist/crew.mjs, plugins/crew/skills/hub/dist/mcp.mjs
- ✓ cd packages/crew && npm run typecheck && npx vitest run test/view.test.ts test/hub/e2e test/hub-worktrees.test.ts test/hub/squash-merge.test.ts test/hub/generated-drift.test.ts test/structure.test.ts test/plugin/contents.test.ts (reported)
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —, AC6 —

Latest log:
- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-071-start-refuses-an-overlap-with-active

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-071-start-refuses-an-overlap-with-active
- 2026-10-27: status in-progress → in-review — T1-T4 done: start refuses an overlap with in-progress/blocked/in-review plans outside hub.shared (activeOverlaps in footprint.ts, shared with staff) unless --force; tests, sample project and docs updated; typecheck and the AC5 suite pass locally
- 2026-10-27: status in-review → accepted
- 2026-10-28: status accepted → in-progress — land: merging main conflicts in packages/crew/test/hub/e2e/land.test.ts

## Outcome
Behaviour change: `start` now refuses (non-zero, nothing written) a plan whose touches overlap an in-progress, blocked or
in-review plan outside `hub.shared`, naming each plan, its status and the globs; `--force` starts it anyway with the old
warning. `staff` and `start` share one verdict (`activeOverlaps` and `ledgerStatus` in `core/work/footprint.ts`). The
sample project's `start P-008` and the start-calling tests that overlapped by accident were adjusted (Q-2665c8).
Learnings: none
