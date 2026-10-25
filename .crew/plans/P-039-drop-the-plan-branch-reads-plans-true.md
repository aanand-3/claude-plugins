---
id: P-039
title: Drop the plan-branch reads (plans(true))
goal: G-007
items: CHORE-018, BUG-026
touches: packages/crew/src/hub/core/store.ts, packages/crew/src/hub/commands/memory/knowledge.ts, packages/crew/src/hub/commands/memory/context.ts, packages/crew/src/hub/commands/work/planning.ts, packages/crew/src/hub/commands/work/workflow.ts, packages/crew/src/hub/commands/work/release.ts, packages/crew/src/hub/commands/work/execution.ts, packages/crew/src/hub/commands/work/goals.ts, packages/crew/src/hub/commands/team/team.ts, packages/crew/src/hub/commands/team/roles.ts, packages/crew/src/hub/commands/views/reports.ts, packages/crew/src/hub/commands/views/advisor.ts, packages/crew/src/hub/commands/views/graph.ts, packages/crew/src/hub/commands/views/checks.ts, packages/crew/test/hub/e2e/worktrees.test.ts, packages/crew/test/hub-worktrees.test.ts, packages/crew/test/hub/e2e/branch-copies.test.ts
depends_on: P-029, P-038
status: in-review
branch: plan/P-039-drop-the-plan-branch-reads-plans-true
pr:
created: 2026-10-25
started: 2026-10-25
completed:
assignee: developer
---

# P-039: Drop the plan-branch reads (plans(true))

## Context
Code part of CHORE-018, and the fix for BUG-026 (`context`, `resume` and `status` show an open plan's stale `plan/*` branch copy). The hub-only parts were done by the PM on 2026-10-25: `migrate --gather` found nothing to gather; BUG-015 and SPIKE-003 were already closed as duplicates; the two overlay-era knowledge entries were superseded by K-2026-10-25-plan-status-lives-in-the-main-checkout and K-2026-10-25-hub-writes-are-committed-on-the-base.

`Store.plans(true)` (store.ts `branchPlans`) still overlays the plan file committed on each `plan/*` branch over the main checkout's copy, unless main already closed the plan. It existed for plans specced on their branch before hub state had one home (P-026). Fifteen call sites use it: `status`, `staff`, `context`, `next`, `check`, `merge-order`, `export`/`ui`, `recall --plan`, `checkpoint`/`resume`, `start` and `new-plan`.

**No legacy branch needs it (checked 2026-10-25).** Of the 17 `plan/*` branches (16 local, `origin/plan/P-023-…`), only `origin/plan/P-023` holds its own plan file, and P-023 is done on main, so it is ignored. Every other branch was cut by `new-plan` before its plan file was written. Q-d4e060's P-002/P-003 live on `claude/crew-bug-001-9d4b01`, which isn't a `plan/*` branch, so `branchPlans` never saw them.

**It is now a hazard.** A plan branch that takes in the base, by `git merge --ff-only main` before `start` (K-2026-10-25-a-plan-worktree-cut-before-its-depends) or by the merge queue's update and fast-forward (P-032), gets its own plan file from main. From then on `plans(true)` reads that copy, which goes stale at the next hub commit, instead of main's. So `status`, `staff`, `merge-order` and `context` show an old status or old tasks for a live plan.

**Only with plan worktrees (Q-16112d, 2026-10-25).** With `hub.plan_worktrees: false` (the default, and every other project's mode) `start` switches the checkout to the plan branch, and the plan's status, ticks and log are committed there; back on the base, `plans(true)` is the only way `status`, `context`, `check` and the views see that progress (`test/hub/e2e/context.test.ts` "overlapping plans warn and drift is flagged", the `test/view.test.ts` graph cases on `scripts/sample-project.mjs`). Dropping it there would show every in-progress plan as `ready` on main, and the one-home model (commits on the base) needs worktrees. So the branch overlay stays in that mode and goes only when `plan_worktrees` is on, where the main checkout is the plan's one home and a branch copy is always stale.

`check`'s `lostPlans` hint (CHORE-014 item 4) reads plan branches too and tells a remote-only branch its "uncommitted work is gone". That's wrong: the work is committed on the remote.

`start`'s overlap warning still fires on overlaps P-029 made non-blocking (`hub.shared`), and it suggests `depends_on`. P-029 left it to this plan (workflow.ts).

## Scope
**In:**
- `Store.plans(includeBranches)` overlays branch copies only when `hub.plan_worktrees` is false: with plan worktrees, `plans(true)` is `plans()` (the main checkout only), and `branchPlans` is never called. The parameter and the call sites stay as on main (`plans(true)` where they read live state); without plan worktrees nothing changes.
- `start`'s legacy path in plan-worktree mode (a plan with no worktree whose branch holds a different copy of the plan: "took the plan from <branch>") goes. Main's copy is the plan, and `start` still opens the worktree on the existing branch.
- Code that handles branch copies stays, because the default mode still reaches it: `handoff`'s "lives on <ref>" refusal (execution.ts), `status`'s "(live on `<ref>`)" suffix (reports.ts), move's `doc.source === "worktree"` condition (workflow.ts) and `check`'s `Snapshot.allPlans` (checks.ts). With plan worktrees they see only main-checkout documents.
- `check`'s `lostPlans` hints a local `plan/*` branch with no plan in main and no worktree, as today. A branch that exists only on origin gets its own hint: "P-###: only origin/<branch> has it and the main checkout has no plan file: fetch it and bring the plan home (`migrate --gather` from a checkout of it)". No "work is gone" text for it.
- `start`'s overlap warning passes `sharedGlobs(store)` (P-029's footprint.ts) to `overlapping`, so it ignores shared overlaps, and says "expect conflicts at release; narrow touches or list the file in hub.shared" instead of "add depends_on".
- The other `overlapping` callers P-029 left (follow-up from its review): `context`'s overlap list (context.ts) and the role advice in roles.ts (the "sequence them or split the work" and "add depends_on or narrow touches" lines) also pass `sharedGlobs(store)`, and roles.ts's advice says to narrow touches or list the file in hub.shared, never to add depends_on.

**Out (explicitly not doing):**
- Branch-per-plan projects (`hub.plan_worktrees: false`): `plans(true)` keeps reading their plan branches; `context.test.ts`, `view.test.ts` and `scripts/sample-project.mjs` don't change.
- `nextId` keeps scanning every ref and worktree: ID uniqueness across unmerged branches is still needed.
- `git.planBranches`, `git.lsTree` and `git.show` stay in git.ts (P-028's file); if `show` loses its last caller, say so in the Outcome instead of deleting it.
- Q-d4e060 / Q-67af6f (P-002/P-003 on a non-plan branch): the executive's call.

## Acceptance criteria
- [ ] AC1 · Regression test: in a throwaway repo with plan worktrees, fast-forward a ready plan's branch to main so it carries `.crew/plans/P-001-….md` (status `ready`), then `start P-001` in the main checkout (main's copy says `in-progress`). Now `status`, `staff --json`, `context P-001`, `export --json` and `merge-order` report main's status and tasks, never the branch copy's. On today's code at least `status` shows the stale `ready`.
- [ ] AC2 · With `hub.plan_worktrees: true`, `Store.plans(true)` never calls `branchPlans` (a case in branch-copies.test.ts: a `plan/*` branch with a different committed plan file, `status`/`context` show main's copy with no "(live on"); with it false, the same setup still shows the branch copy (`-t mode`). `npm run typecheck` passes.
- [ ] AC3 · `start P-001` for a plan whose branch exists with a different committed plan file and no worktree opens the worktree on that branch, keeps main's plan file unchanged, and prints no "took the plan from".
- [ ] AC4 · `check` with a local `plan/P-009-x` branch (no plan in main, no worktree) prints the "worktree was removed" hint as today. With only `origin/plan/P-009-x` (no local branch), it prints the origin-only hint and not the "uncommitted work is gone" text.
- [ ] AC5 · `start` of a plan whose touches overlap an in-progress plan only on `hub.shared` touches prints no overlap warning. With a real overlap, the warning doesn't mention depends_on. The same holds for `context P-###`'s overlap list and `next --role architect`/`--role director`'s overlap advice (roles.ts): no shared-only overlap is listed, and no line suggests depends_on.
- [ ] AC6 · The existing suites that cover the changed call sites pass: `test/hub/e2e/worktrees.test.ts` (with the "start keeps an existing branch's progress" case rewritten to AC3's expectation), `test/hub-worktrees.test.ts`, `test/hub/e2e/team.test.ts`, `test/hub/e2e/context.test.ts`, `test/hub/e2e/basics.test.ts`, `test/view.test.ts`.
- [ ] AC7 · Regression test for BUG-026: in the same setup, with main's copy of P-001 also carrying an amended criterion and a checked task that the branch copy lacks, `context P-001` and `resume P-001` from the main checkout show main's status (`in-progress`), main's criteria text and main's task progress, and none of the branch copy's. `status` doesn't print "(live on". On today's code `context` shows the branch copy.
- [ ] AC8 · The default mode is unchanged: `test/hub/e2e/context.test.ts` and `test/view.test.ts` pass with no edits to them or to `scripts/sample-project.mjs`, and `status` in a branch-per-plan repo with a started plan still shows its branch's status with "(live on".

## Approach
- store.ts: in `plans()`, overlay only `if (includeBranches && !this.settings().plan_worktrees)`; update the doc comment (branch copies are read only in branch-per-plan mode). `branchPlans` stays.
- Call sites keep `store.plans(true)` as on main: revert T2's `plans(true)` → `plans()` edits (one token each) and T4's removal of `allPlans`, of the `source` handling in execution.ts/reports.ts and of move's `source === "worktree"` condition.
- workflow.ts `start`: in the `shared` branch, remove the `live`/"took the plan from" block; keep `openPlanWorktree(store, doc.id, branch)`. The overlap warning: `overlapping(doc, store.plans(true), sharedGlobs(store))` with the new text.
- checks.ts: `Snapshot` keeps `allPlans`; `lostPlans` tells local and origin-only branches apart (`b.startsWith("origin/")` and no local `plan/…` of the same plan).
- execution.ts and reports.ts: no change beyond main.
- **Reuse:** `sharedGlobs`/`overlapping` (P-029), the worktree helpers in `test/hub/e2e/worktrees.test.ts`.
- Depends on P-029 for code: `start`'s warning calls P-029's `sharedGlobs` and its shared-aware `overlapping`. It also overlaps P-029 on team.ts and checks.ts.

## Tasks
- [x] T1: `test/hub/e2e/branch-copies.test.ts` with AC1, AC3, AC4, AC5 and AC7, failing on today's code for AC1, AC3 and AC7 → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/branch-copies.test.ts` (fails before the change)
- [x] T2: store.ts gates the overlay on `!plan_worktrees`; call sites back to `plans(true)` → verify: `npm run typecheck`; `npm run build && npx vitest run test/hub/e2e/branch-copies.test.ts -t "stale|mode"` (AC1, AC2, AC7)
- [x] T3: `start` without the branch-copy path, with the shared-aware warning; `move`'s handoff condition; the "start keeps an existing branch's progress" case rewritten → verify: `npx vitest run test/hub/e2e/branch-copies.test.ts -t start test/hub/e2e/worktrees.test.ts` (AC3, AC5)
- [x] T4: checks.ts `lostPlans` (keeps `allPlans`); execution.ts, reports.ts and workflow.ts `move` as on main → verify: `npx vitest run test/hub/e2e/branch-copies.test.ts -t lost test/hub/e2e/context.test.ts test/view.test.ts` (AC4, AC8)
- [x] T5: the covering suites → verify: `npx vitest run test/hub-worktrees.test.ts test/hub/e2e/team.test.ts test/hub/e2e/context.test.ts test/hub/e2e/basics.test.ts test/view.test.ts`; `wc -l` of each touched module under 300 (AC6)

## Test plan
**Targeted checks** (from `packages/crew/`, after `npm run build`):
- Regression test: `test/hub/e2e/branch-copies.test.ts -t stale` (AC1) fails before the change (status reads the branch copy) and passes after.
- Regression test: `test/hub/e2e/branch-copies.test.ts -t stale` (AC7, BUG-026) fails before the change (`context` shows the branch copy's status, criteria and tasks) and passes after.
- AC1, AC3, AC4, AC5, AC7 → `npx vitest run test/hub/e2e/branch-copies.test.ts`
- AC2 → `npx vitest run test/hub/e2e/branch-copies.test.ts -t mode`; `npm run typecheck`
- AC8 → `npx vitest run test/hub/e2e/context.test.ts test/view.test.ts` (unchanged files)
- AC6 → `npx vitest run test/hub/e2e/worktrees.test.ts test/hub-worktrees.test.ts test/hub/e2e/team.test.ts test/hub/e2e/context.test.ts test/hub/e2e/basics.test.ts test/view.test.ts`

## Rollout & rollback
- Takes effect in this repo once `.crew/bin/crew.mjs` is refreshed (P-024 / the human). Nothing to migrate: no branch copy is live today (see Context).
- Rollback: revert the plan's commit.

## Risks & open questions
- A project still on a pre-P-026 layout (plans committed only on their branches): `check`'s `lostPlans` hint names each such branch, and `migrate --gather` from a checkout of it brings the plan home. Nothing reads it silently any more.
- The widest touches of Wave 1 (fifteen call sites). It overlaps P-024 (release.ts), P-027 (reports.ts), P-028 (execution.ts, workflow.ts), P-029 (team.ts, checks.ts), P-037 (store.ts) and P-038 (planning.ts), so staffing runs it after them.
- P-038 (sparse plan worktrees, done, not merged when this was written) changes planning.ts (`openPlanWorktree` checks out with `--no-checkout` and a sparse pattern) and one assertion each in `test/hub/e2e/worktrees.test.ts` and `test/hub-worktrees.test.ts`. Re-checked 2026-10-25: none of it touches the `plans(true)` lines (planning.ts `known`/`plans` in `newPlan`'s helpers) or the "start keeps an existing branch's progress" case, and planning.ts stays under 300 lines (193 on P-038's branch). So P-039 now `depends_on` P-038: its worktree takes in the base after P-038 lands (`git merge --ff-only main` before `start`). In a sparse worktree the branch still commits the plan file, so AC1/AC3/AC7 set up the branch copy by commit, not by reading the worktree's files. The edits are one token per call site, so merge conflicts are unlikely. P-032 waits for it (land merges the base into plan branches).

## Handoff

_Generated 2026-10-25 by `crew.mjs handoff` from the ledger._

- P-039: Drop the plan-branch reads (plans(true)) [in-review] tasks 5/5 — claimed by Arpit Anand (developer:aa36891f95c4f8d92)
- last checkpoint 2026-10-25 11:15 at T5 (4d4c5e2) by Arpit Anand; since then 0 commit(s), 2 uncommitted file(s): plugins/crew/skills/hub/dist/crew.mjs, plugins/crew/skills/hub/dist/mcp.mjs
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —, AC6 —, AC7 —, AC8 —

Latest log:
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-039-drop-the-plan-branch-reads-plans-true
- 2026-10-25: Architect (Q-16112d): branch reads go only with plan worktrees. Without them (the default mode, other projects) a started plan's hub state is committed on its branch, so `plans(true)` stays and `branchPlans` is gated on `!plan_worktrees`; call sites, `allPlans` and the `source` handling stay as on main. T2 and T4 reopened, AC2 rewritten, AC8 added. Touches unchanged.

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-25: Architect: scope += P-029 review follow-up: context.ts and roles.ts pass hub.shared to overlapping; roles.ts advice no longer suggests depends_on (AC5 extended). Both files were already in touches.
- 2026-10-25: Architect (Q-60f72b): items += BUG-026 (this plan removes its cause, `plans(true)`); AC7 added as its regression test (`context`/`resume` show main's status, criteria and tasks; AC1 checked status but not criteria or `resume`). depends_on += P-038: it changes planning.ts and two of the suites here; re-checked, no conflict with this plan's edits.
- 2026-10-25: Architect (Q-60f72b): BUG-026 linked; AC7 regression added; depends_on += P-038 after re-check of its planning.ts and test edits
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-039-drop-the-plan-branch-reads-plans-true
- 2026-10-25: Architect (Q-16112d): branch reads go only with plan worktrees. Without them (the default mode, other projects) a started plan's hub state is committed on its branch, so `plans(true)` stays and `branchPlans` is gated on `!plan_worktrees`; call sites, `allPlans` and the `source` handling stay as on main. T2 and T4 reopened, AC2 rewritten, AC8 added. Touches unchanged.
- 2026-10-25: status in-progress → in-review
- 2026-10-25: Architect: approved at 4d4c5e2 (targeted suites pass; view.test.ts timed out under parallel load, passes alone). K-2026-10-25-plan-branch-reads-store-plans-true-apply supersedes the duplicate K-2026-10-25-no-keep-branch-reads-when-hub-plan.

## Outcome
With plan worktrees, `Store.plans(true)` reads only the main checkout. In branch-per-plan mode (the default), it still overlays branch copies (Q-16112d). `start` no longer takes a branch copy home, and its overlap warning (like `context`'s list and the advice in roles.ts) ignores `hub.shared` and never suggests depends_on. `check` gives an origin-only plan branch its own hint. `git.show` keeps its caller (`branchPlans`). `GraphDoc.source` (graph-types.ts, outside touches) is always "worktree" in plan-worktree mode.
Learnings: K-2026-10-25-without-hub-plan-worktrees-the-default
