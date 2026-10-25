---
id: P-028
title: Plan branches commit as they go
goal: G-007
items: FEAT-036, BUG-014, CHORE-014
touches: packages/crew/src/hub/core/git.ts, packages/crew/src/hub/commands/work/execution.ts, packages/crew/src/hub/commands/work/review.ts, packages/crew/src/hub/commands/work/workflow.ts, packages/crew/test/hub/e2e/wip-commits.test.ts, packages/crew/test/hub/e2e/worktrees.test.ts, packages/crew/test/hub/squash-merge.test.ts, plugins/crew/skills/hub/agents/developer.md, plugins/crew/skills/hub/agents/director.md
depends_on:
status: in-progress
branch: plan/P-028-plan-branches-commit-as-they-go
pr:
created: 2026-10-25
started: 2026-10-25
completed:
assignee: developer
---

# P-028: Plan branches commit as they go

## Context
W1-b of G-007 (design: `.crew/drafts/the-crew-team-was-pure-reef.md`, "W1-b: commit on the plan branch"). With `hub.plan_worktrees`, a plan's code stays uncommitted in its worktree until Release makes the plan's one commit. So the plan branch's tip never moves: `review --approve` pins the commit the worktree was cut from, and the done gate (`reviewProblems`, review.ts) looks at uncommitted files only when the command runs on the plan's branch. From the main checkout, a change made after the approval goes unnoticed (BUG-014); from inside the worktree, done is refused even when nothing changed (CHORE-014 item 2, hit by P-026).

The fix: the hub commits the plan's code on the plan branch at each checkpoint and at the hand-over to review. Generated files (`linguist-generated` in `.gitattributes`, P-023's rule) and hub paths (`.crew/`) stay out. An approval then pins a commit that holds the reviewed code, and the gate looks at the plan's worktree from any checkout. Release still squashes the branch into one commit on the base (FEAT-022's rule holds).

The same files carry two more CHORE-014 follow-ups, so they ride here: squash detection (item 6, git.ts: a squash where main also changed one of the files, or a renamed file, isn't seen as merged; the Director placed it here) and auto checkpoints (item 5, execution.ts: one failing worktree aborts the rest).

## Scope
**In:**
- `checkpoint` of a plan (not `--auto`) commits the plan's code in its worktree when `hub.plan_worktrees` is on: every uncommitted change there, minus `.crew/**`, files `.gitattributes` marks `linguist-generated`, and files matching the policy's `secrets.files`. One commit on the plan branch: `chore(P-###): checkpoint <step>`. Nothing to commit: no commit.
- `move P-### in-review` makes the same commit first (`chore(P-###): hand over to review`), so the handed-over code is committed whoever moves it.
- A refused command leaves no commit behind (`ws.onAbort` resets the branch to where it was, keeping the changes in the worktree).
- `review --approve` with plan worktrees refuses while the plan's worktree has uncommitted code (as defined above), naming the files and `checkpoint`. It records the plan branch's tip.
- The done gate (`reviewProblems`) with plan worktrees: the approval covers the code when the branch's last code commit is reachable from the approved commit and the plan's worktree has no uncommitted code, from whichever checkout `move done` runs. Without plan worktrees, the gate is unchanged.
- Squash detection (CHORE-014 item 6): `git.squashMerge` matches a candidate commit when merging the branch into it changes nothing (`git merge-tree --write-tree <candidate> <branch>` gives the candidate's own tree). This covers a file that main changed too, and renames.
- `checkpoint --auto` (CHORE-014 item 5): a failure in one plan's worktree is reported and the others still get checkpointed. Auto checkpoints never commit.
- Role text: developer.md (the checkpoint commits your work on the plan branch; still never `git commit` yourself; checkpoint before you hand over) and director.md's "its code is committed when it is complete" line. `start`'s message ("its code is committed when the plan completes").

**Out (explicitly not doing):**
- The merge queue, rebuilding at release and release.md's wording: P-032 (it rewrites Release's flow; until then Release's "commit everything once, squash-merge" still works on a branch with WIP commits).
- references/model.md's `plan_worktrees` row and the config.yaml comment: P-032 (model.md is shared by P-029 and P-024; P-032 rewrites the release mechanics they describe).
- CHORE-014 item 1 (guard: `git -c alias.x='!crew.mjs …'`): split into its own item (guard.ts is not in this plan). Item 3 (retitled ID decided by worktree order) is obsolete since P-026 (one home). Item 4 (`lostPlans` hint for an origin-only branch): P-039, which removes the plan-branch reads. Item 5's second half (auto checkpoints carry the main session's run) is harmless: implementers are counted from claims and moves, and auto checkpoints carry no checks.
- Solo mode (`plan_worktrees` off): developers commit as before; nothing changes there.

## Acceptance criteria
- [ ] AC1 · With `hub.plan_worktrees: true`, `checkpoint P-001 --step T1`, run from the plan's worktree or from the main checkout, makes exactly one commit on `plan/P-001-…`, subject `chore(P-001): checkpoint T1`, holding every changed or new code file of the worktree. A changed `linguist-generated` file, a changed file under `.crew/`, and a new `.env` stay uncommitted. The checkpoint event's `sha` is the new commit. A second checkpoint with nothing changed makes no commit. With `plan_worktrees` off, checkpoint makes no commit.
- [ ] AC2 · `move P-001 in-review` with uncommitted code in the plan's worktree commits it (`chore(P-001): hand over to review`) before the move; when the move is refused (e.g. Outcome has no `Learnings:` line), the plan branch has no new commit and the changes are still in the worktree, uncommitted.
- [ ] AC3 · Regression test (BUG-014): after `review P-001 --approve`, an uncommitted code change in the plan's worktree makes `move P-001 done` from the main checkout refuse with "the code changed since the approving review"; so does a checkpoint commit made after the approval. A fresh approval then lets done pass.
- [ ] AC4 · With no code change since the approval, `move P-001 done` passes both from the main checkout and from inside the plan's worktree, also when the worktree holds rebuilt `linguist-generated` files (CHORE-014 item 2).
- [ ] AC5 · `review P-001 --approve` refuses while the plan's worktree has uncommitted code, naming the files and saying to checkpoint; with a clean worktree it prints and records the plan branch's tip.
- [ ] AC6 · `merge-order` lists as merged a plan squash-merged after main changed one of the plan's files, and one whose branch renamed a file. A commit that only names the plan, and a branch that moved on after its squash, are still unmerged (the existing squash case keeps passing).
- [ ] AC7 · `checkpoint --auto` from the main checkout with two in-progress plan worktrees, one of which makes the checkpoint fail, still checkpoints the other, exits 0 and makes no commit in either.
- [ ] AC8 · developer.md and director.md describe the checkpoint commits (no "Never commit: the worktree keeps the work" and no "its code is committed when it is complete"), and `start` no longer prints "its code is committed when the plan completes".

## Approach
- **git.ts.**
  - `generated(dir, files)`: the subset `.gitattributes` marks `linguist-generated` (`check-attr -z`, as `footprint.drift` does; footprint.ts is P-029's and is left as is).
  - `codeChanges(dir, secretGlobs)`: `changed(dir, ["."])` minus `.crew/`, minus `generated`, minus files matching `secretGlobs` (`globRe` from knowledge.ts).
  - `squashMerge`: keep the subject filter on candidates; replace the `diff --quiet` test with "merging the branch into the candidate is a no-op": `git merge-tree --write-tree <sha> <branch>` succeeds and prints `<sha>^{tree}`. Needs git ≥ 2.38 (this repo has 2.39); with an older git, fall back to today's test.
- **execution.ts.** `commitWork(store, plan, subject)`: only with `plan_worktrees` and a plan home on the plan's branch; list `codeChanges`; `git -C <home> add -A -- <files>` then `commit -q --only -m <subject> -- <files>` (hooks run: never `--no-verify`; a hook that refuses fails the command with git's message, and nothing is recorded). Remember the previous HEAD and register `ws.onAbort(() => git reset -q --soft <prev>)` so a later refusal leaves no commit behind. `checkpoint` calls it after all its validation and before `snapshot`; `--auto` doesn't. `autoWorktrees` wraps each plan's checkpoint in try/catch on `HubError`, says which failed, and goes on.
- **workflow.ts.** In `move`, after the gates and `authorize` pass for `plan → in-review`, call `commitWork(store, doc, "chore(P-###): hand over to review")`. Replace `start`'s "its code is committed when the plan completes" with "checkpoints commit its code on the branch". workflow.ts is 278 lines and stays under 300.
- **review.ts.** With plan worktrees: `review --approve` fails while `codeChanges(planHome)` is non-empty; `sha` is the plan branch's tip, as now. `reviewProblems`: dirty = `codeChanges(store.planHome(pid))` whatever the current branch; `covered` as now (the last code commit is an ancestor of the approved sha). Without plan worktrees, both keep today's logic.
- **Reuse:** `git.changed`, `store.planHome`, `globRe`, `ws.onAbort`, the throwaway-repo helpers in `test/helpers/repo.ts` and `test/hub/e2e/helpers.ts`, `worktreeHub`/`donePlan` from `test/hub-worktrees.test.ts` (copy the setup, don't edit that file).

## Tasks
- [ ] T1: git.ts `generated`, `codeChanges` and the merge-tree `squashMerge`; `test/hub/squash-merge.test.ts` with the main-also-changed, rename, mention-only and moved-on cases → verify: `cd packages/crew && npx vitest run test/hub/squash-merge.test.ts test/hub-worktrees.test.ts -t merge_order` (AC6)
- [ ] T2: `commitWork` in execution.ts; `checkpoint` commits; `--auto` never commits and survives a failing worktree → verify: `npx vitest run test/hub/e2e/wip-commits.test.ts -t checkpoint` and `npx vitest run test/hub/e2e/execution.test.ts` (AC1, AC7)
- [ ] T3: `move … in-review` commits first and a refused move leaves no commit; `start`'s message → verify: `npx vitest run test/hub/e2e/wip-commits.test.ts -t "in-review"` (AC2, AC8 message)
- [ ] T4: review.ts: approve refuses on uncommitted code; the gate checks the plan's worktree from any checkout, generated files excluded; the BUG-014 regression test → verify: `npx vitest run test/hub/e2e/wip-commits.test.ts -t review` fails on today's code for the BUG-014 case and passes after; `npx vitest run test/hub/e2e/team-2.test.ts` still passes (AC3, AC4, AC5)
- [ ] T5: developer.md and director.md text → verify: `grep -n "Never commit: the worktree keeps the work\|its code is committed when it is complete" plugins/crew/skills/hub/agents/developer.md plugins/crew/skills/hub/agents/director.md` finds nothing; `npx vitest run test/plugin` passes (AC8)
- [ ] T6: types and module size → verify: `npm run typecheck`; `wc -l src/hub/core/git.ts src/hub/commands/work/execution.ts src/hub/commands/work/review.ts src/hub/commands/work/workflow.ts` each under 300

## Test plan
**Targeted checks** (from `packages/crew/`, after `npm run build`; the e2e tests drive the built `dist/crew.mjs`):
- Regression test (BUG-014): the "approval then an uncommitted change" case in `test/hub/e2e/wip-commits.test.ts`. It fails before the fix (done passes from the main checkout) and passes after.
- AC1, AC2 → `npx vitest run test/hub/e2e/wip-commits.test.ts -t checkpoint` and `-t "in-review"`: `git log` on the plan branch, `git status` in the worktree (generated, `.crew/` and `.env` files still dirty).
- AC3, AC4, AC5 → `npx vitest run test/hub/e2e/wip-commits.test.ts -t review`; `npx vitest run test/hub/e2e/team-2.test.ts` (solo-mode review gate unchanged).
- AC6 → `npx vitest run test/hub/squash-merge.test.ts` and `npx vitest run test/hub-worktrees.test.ts -t merge_order`.
- AC7 → `npx vitest run test/hub/e2e/wip-commits.test.ts -t auto` and `npx vitest run test/hub/e2e/execution.test.ts`.
- AC8 → T5's grep; `npx vitest run test/plugin`.
- `npm run typecheck`.

## Rollout & rollback
- Plans already in progress when this merges: their next checkpoint commits what is in their worktree. Nothing to migrate.
- This repo runs the vendored `.crew/bin/crew.mjs`: the behaviour starts once it is refreshed (P-024's `refresh-bin`, or the human's copy). The rendered `.claude/agents/crew-developer.md` and `crew-director.md` are protected: the human re-renders them (`crew.mjs agents`) after the merge.
- The gotcha K-2026-10-24-with-plan-worktrees-run-move-p-done-from no longer holds once this lands: record its replacement with `learn … --supersedes` (QA's or the developer's learning at review).
- Rollback: revert the plan's commit. WIP commits already on plan branches are harmless: Release squashes them.

## Risks & open questions
- A project's pre-commit hook runs on every checkpoint. A slow hook slows checkpoints; a refusing hook (lint, secret scan) fails the checkpoint with its message, which is the hook doing its job. Never bypassed.
- `git merge-tree --write-tree` needs git ≥ 2.38; the fallback keeps today's (weaker) squash detection on older git. P-036 (doctor) can check the version.
- Shares no file with P-029, P-030, P-037 or P-038. Overlaps P-027 on developer.md (P-027 runs first and alone, so staffing sequences it) and P-039 on execution.ts and workflow.ts (staffing sequences them; neither needs the other's code).

## Handoff

_Generated 2026-10-25 by `crew.mjs handoff` from the ledger._

- P-028: Plan branches commit as they go [in-progress] tasks 0/6 — claimed by Arpit Anand (developer:a1c98a9dbee8039d1)
- last checkpoint 2026-10-25 07:23 at T6 (f7c315a) by Arpit Anand; since then 0 commit(s), 8 uncommitted file(s): packages/crew/src/hub/commands/work/execution.ts, packages/crew/src/hub/commands/work/review.ts, packages/crew/src/hub/commands/work/workflow.ts, packages/crew/src/hub/core/git.ts, plugins/crew/skills/hub/agents/developer.md, plugins/crew/skills/hub/agents/director.md, packages/crew/test/hub/e2e/wip-commits.test.ts, packages/crew/test/hub/squash-merge.test.ts
- next: T1: git.ts `generated`, `codeChanges` and the merge-tree `squashMerge`; `test/hub/squash-merge.test.ts` with the main-also-changed, rename, mention-only and moved-on cases → verify: `cd packages/crew && npx vitest run test/hub/squash-merge.test.ts test/hub-worktrees.test.ts -t merge_order` (AC6)
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —, AC6 —, AC7 —, AC8 —

Latest log:
- 2026-10-25: status draft → ready
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-028-plan-branches-commit-as-they-go

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-028-plan-branches-commit-as-they-go
- 2026-10-25: Architect: touches += packages/crew/test/hub/e2e/worktrees.test.ts (Q-1c0a2e).

## Outcome
