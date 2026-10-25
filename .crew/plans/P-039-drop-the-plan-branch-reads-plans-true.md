---
id: P-039
title: Drop the plan-branch reads (plans(true))
goal: G-007
items: CHORE-018
touches: packages/crew/src/hub/core/store.ts, packages/crew/src/hub/commands/memory/knowledge.ts, packages/crew/src/hub/commands/memory/context.ts, packages/crew/src/hub/commands/work/planning.ts, packages/crew/src/hub/commands/work/workflow.ts, packages/crew/src/hub/commands/work/release.ts, packages/crew/src/hub/commands/work/execution.ts, packages/crew/src/hub/commands/work/goals.ts, packages/crew/src/hub/commands/team/team.ts, packages/crew/src/hub/commands/team/roles.ts, packages/crew/src/hub/commands/views/reports.ts, packages/crew/src/hub/commands/views/advisor.ts, packages/crew/src/hub/commands/views/graph.ts, packages/crew/src/hub/commands/views/checks.ts, packages/crew/test/hub/e2e/worktrees.test.ts, packages/crew/test/hub-worktrees.test.ts, packages/crew/test/hub/e2e/branch-copies.test.ts
depends_on: P-029
status: draft
branch: plan/P-039-drop-the-plan-branch-reads-plans-true
pr:
created: 2026-10-25
started:
completed:
---

# P-039: Drop the plan-branch reads (plans(true))

## Context
Code part of CHORE-018. The hub-only parts were done by the PM on 2026-10-25: `migrate --gather` found nothing to gather; BUG-015 and SPIKE-003 were already closed as duplicates; K-2026-10-23-a-plan-file-on-main-can-lag-its-branch and K-2026-10-23-commit-hub-changes-before-staffing were superseded by K-2026-10-25-plan-status-lives-in-the-main-checkout and K-2026-10-25-hub-writes-are-committed-on-the-base.

`Store.plans(true)` (store.ts `branchPlans`) still overlays the plan file committed on each `plan/*` branch over the main checkout's copy, unless main already closed the plan. It existed for plans specced on their branch before hub state had one home (P-026). Fifteen call sites use it: `status`, `staff`, `context`, `next`, `check`, `merge-order`, `export`/`ui`, `recall --plan`, `checkpoint`/`resume`, `start` and `new-plan`.

**No legacy branch needs it (checked 2026-10-25).** Of the 17 `plan/*` branches (16 local, `origin/plan/P-023-…`), only `origin/plan/P-023` holds its own plan file, and P-023 is done on main, so it is ignored. Every other branch was cut by `new-plan` before its plan file was written. Q-d4e060's P-002/P-003 live on `claude/crew-bug-001-9d4b01`, which isn't a `plan/*` branch, so `branchPlans` never saw them.

**It is now a hazard.** A plan branch that takes in the base, by `git merge --ff-only main` before `start` (K-2026-10-25-a-plan-worktree-cut-before-its-depends) or by the merge queue's update and fast-forward (P-032), gets its own plan file from main. From then on `plans(true)` reads that copy, which goes stale at the next hub commit, instead of main's. So `status`, `staff`, `merge-order` and `context` show an old status or old tasks for a live plan.

`check`'s `lostPlans` hint (CHORE-014 item 4) reads plan branches too and tells a remote-only branch its "uncommitted work is gone". That's wrong: the work is committed on the remote.

`start`'s overlap warning still fires on overlaps P-029 made non-blocking (`hub.shared`), and it suggests `depends_on`. P-029 left it to this plan (workflow.ts).

## Scope
**In:**
- `Store.plans()` reads the main checkout only; `branchPlans` and the `includeBranches` parameter go. Every call site calls `plans()`.
- `start`'s legacy path (a plan with no worktree whose branch holds a different copy of the plan: "took the plan from <branch>") goes. Main's copy is the plan, and `start` still opens the worktree on the existing branch.
- Code that only branch copies could reach goes too: `handoff`'s "lives on <ref>" refusal (execution.ts), `status`'s "(live on `<ref>`)" suffix (reports.ts), and move's `doc.source === "worktree"` condition on writing the handoff (workflow.ts). Everything left is a main-checkout document.
- `check`'s `Snapshot.allPlans` goes (`plans` only). `lostPlans` hints a local `plan/*` branch with no plan in main and no worktree, as today. A branch that exists only on origin gets its own hint: "P-###: only origin/<branch> has it and the main checkout has no plan file: fetch it and bring the plan home (`migrate --gather` from a checkout of it)". No "work is gone" text for it.
- `start`'s overlap warning passes `sharedGlobs(store)` (P-029's footprint.ts) to `overlapping`, so it ignores shared overlaps, and says "expect conflicts at release; narrow touches or list the file in hub.shared" instead of "add depends_on".

**Out (explicitly not doing):**
- `nextId` keeps scanning every ref and worktree: ID uniqueness across unmerged branches is still needed.
- `git.planBranches`, `git.lsTree` and `git.show` stay in git.ts (P-028's file); if `show` loses its last caller, say so in the Outcome instead of deleting it.
- Q-d4e060 / Q-67af6f (P-002/P-003 on a non-plan branch): the executive's call.

## Acceptance criteria
- [ ] AC1 · Regression test: in a throwaway repo with plan worktrees, fast-forward a ready plan's branch to main so it carries `.crew/plans/P-001-….md` (status `ready`), then `start P-001` in the main checkout (main's copy says `in-progress`). Now `status`, `staff --json`, `context P-001`, `export --json` and `merge-order` report main's status and tasks, never the branch copy's. On today's code at least `status` shows the stale `ready`.
- [ ] AC2 · `grep -rn "plans(true)\|branchPlans\|includeBranches" packages/crew/src` finds nothing, and `npm run typecheck` passes.
- [ ] AC3 · `start P-001` for a plan whose branch exists with a different committed plan file and no worktree opens the worktree on that branch, keeps main's plan file unchanged, and prints no "took the plan from".
- [ ] AC4 · `check` with a local `plan/P-009-x` branch (no plan in main, no worktree) prints the "worktree was removed" hint as today. With only `origin/plan/P-009-x` (no local branch), it prints the origin-only hint and not the "uncommitted work is gone" text.
- [ ] AC5 · `start` of a plan whose touches overlap an in-progress plan only on `hub.shared` touches prints no overlap warning. With a real overlap, the warning doesn't mention depends_on.
- [ ] AC6 · The existing suites that cover the changed call sites pass: `test/hub/e2e/worktrees.test.ts` (with the "start keeps an existing branch's progress" case rewritten to AC3's expectation), `test/hub-worktrees.test.ts`, `test/hub/e2e/team.test.ts`, `test/hub/e2e/context.test.ts`, `test/hub/e2e/basics.test.ts`, `test/view.test.ts`.

## Approach
- store.ts: delete `branchPlans` and the parameter; `plans()` is `loadDir(this.dirs.plan)`; update the doc comment. Drop imports that only `branchPlans` used (`CLOSED` if unused).
- Each call site: `store.plans(true)` → `store.plans()` (knowledge.ts, context.ts ×2, planning.ts ×2, team.ts, reports.ts, roles.ts, workflow.ts ×3, release.ts, execution.ts, goals.ts, advisor.ts ×2, graph.ts, checks.ts).
- workflow.ts `start`: remove the `live`/"took the plan from" block; keep `openPlanWorktree(store, doc.id, branch)`. The overlap warning: `overlapping(doc, store.plans(), sharedGlobs(store))` with the new text. Remove the `source === "worktree"` condition in `move`.
- checks.ts: `Snapshot` drops `allPlans` (uses of it become `plans`); `lostPlans` tells local and origin-only branches apart (`b.startsWith("origin/")` and no local `plan/…` of the same plan).
- execution.ts `handoff` and reports.ts: drop the branch-only `source` handling.
- **Reuse:** `sharedGlobs`/`overlapping` (P-029), the worktree helpers in `test/hub/e2e/worktrees.test.ts`.
- Depends on P-029 for code: `start`'s warning calls P-029's `sharedGlobs` and its shared-aware `overlapping`. It also overlaps P-029 on team.ts and checks.ts.

## Tasks
- [ ] T1: `test/hub/e2e/branch-copies.test.ts` with AC1, AC3, AC4 and AC5, failing on today's code for AC1 and AC3 → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/branch-copies.test.ts` (fails before the change)
- [ ] T2: store.ts and the fifteen call sites → verify: AC2's grep; `npm run typecheck`; `npm run build && npx vitest run test/hub/e2e/branch-copies.test.ts -t stale` (AC1, AC2)
- [ ] T3: `start` without the branch-copy path, with the shared-aware warning; `move`'s handoff condition; the "start keeps an existing branch's progress" case rewritten → verify: `npx vitest run test/hub/e2e/branch-copies.test.ts -t start test/hub/e2e/worktrees.test.ts` (AC3, AC5)
- [ ] T4: checks.ts `Snapshot` and `lostPlans`; execution.ts `handoff` and reports.ts → verify: `npx vitest run test/hub/e2e/branch-copies.test.ts -t lost` (AC4)
- [ ] T5: the covering suites → verify: `npx vitest run test/hub-worktrees.test.ts test/hub/e2e/team.test.ts test/hub/e2e/context.test.ts test/hub/e2e/basics.test.ts test/view.test.ts`; `wc -l` of each touched module under 300 (AC6)

## Test plan
**Targeted checks** (from `packages/crew/`, after `npm run build`):
- Regression test: `test/hub/e2e/branch-copies.test.ts -t stale` (AC1) fails before the change (status reads the branch copy) and passes after.
- AC1, AC3, AC4, AC5 → `npx vitest run test/hub/e2e/branch-copies.test.ts`
- AC2 → its grep; `npm run typecheck`
- AC6 → `npx vitest run test/hub/e2e/worktrees.test.ts test/hub-worktrees.test.ts test/hub/e2e/team.test.ts test/hub/e2e/context.test.ts test/hub/e2e/basics.test.ts test/view.test.ts`

## Rollout & rollback
- Takes effect in this repo once `.crew/bin/crew.mjs` is refreshed (P-024 / the human). Nothing to migrate: no branch copy is live today (see Context).
- Rollback: revert the plan's commit.

## Risks & open questions
- A project still on a pre-P-026 layout (plans committed only on their branches): `check`'s `lostPlans` hint names each such branch, and `migrate --gather` from a checkout of it brings the plan home. Nothing reads it silently any more.
- The widest touches of Wave 1 (fifteen call sites). It overlaps P-024 (release.ts), P-027 (reports.ts), P-028 (execution.ts, workflow.ts), P-029 (team.ts, checks.ts), P-037 (store.ts) and P-038 (planning.ts), so staffing runs it after them. The edits are one token per call site, so merge conflicts are unlikely. P-032 waits for it (land merges the base into plan branches).

## Handoff

## Progress log

## Outcome
