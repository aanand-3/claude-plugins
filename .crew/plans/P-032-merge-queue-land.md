---
id: P-032
title: Merge queue: land
goal: G-007
items: FEAT-037
touches: packages/crew/src/hub/commands/work/land.ts, packages/crew/src/hub/commands/work/land.reg.ts, packages/crew/src/hub/commands/index.ts, packages/crew/src/hub/commands/work/release.ts, packages/crew/src/hub/core/work/model.ts, packages/crew/src/hub/core/team/presets.ts, packages/crew/test/hub/e2e/land.test.ts, plugins/crew/skills/hub/agents/release.md, plugins/crew/skills/hub/references/model.md, plugins/crew/skills/hub/SKILL.md, .crew/config.yaml
depends_on: P-028, P-024, P-030, P-039, P-031, P-043
status: draft
branch: plan/P-032-merge-queue-land
pr:
created: 2026-10-25
started:
completed:
---

# P-032: Merge queue: land

## Context
W1-c of G-007 (design: `.crew/drafts/the-crew-team-was-pure-reef.md`, "W1-c: a merge queue"). Merging is a prose procedure in release.md (P-023's step 3): discard the generated files, bring the branch up to the base, run `hub.build`, make the plan's one commit, run `hub.full_suite`, squash-merge, remove the worktree. Nothing does it for Release: nothing retries after a conflict, and nothing updates the plans that depend on the merged one. With parallel plans (P-029's `hub.shared` lets overlapping plans run together) conflicts become normal, so the steps must be a command. `land P-###` turns them into one, in merge order. A conflict or a failing suite sends the plan back to its developer with the files or the failure in the note.

**Dependencies (each is code this plan calls or needs):**
- **P-028**: `land` builds on its commit model. The plan's code is already committed on its branch (WIP commits), and `land` reuses its `git.generated` / `codeChanges` helpers to restore generated files and to refuse a branch with uncommitted code.
- **P-024**: the design's W1-a. P-023 shipped its part (the `linguist-generated` marking, drift and `hub.build`); `refresh-bin` is the rest. `land` calls P-024's `refreshBin` between the build and the commit, when the policy sets `release.refresh_bin`.
- **P-030**: `land` registers through P-030's registry (`land.reg.ts` and one line in `commands/index.ts`).
- **P-039**: `land` merges the base into plan branches (step 3) and fast-forwards dependants (step 8). That puts each plan's own file from main on its branch. Until P-039, `plans(true)` reads such a branch copy over main's, so `status`, `staff` and `merge-order` would show stale plans right after every `land`.

**Squash detection.** BUG-005 was delivered by P-018 and is closed with it; P-028 closes the remaining gap (CHORE-014 item 6). `land` writes the squash commit's subject as `<type>(P-###): <title>`, which `git.squashMerge` matches.

## Scope
**In:**
- `crew.mjs land [P-###]` (CLI only, like `merge-order`). With an ID, it lands that plan. Without one, it lands each plan of `merge-order`'s list in order and skips plans that depend on one that bounced. For each plan:
  1. Checks: the plan is `done`, in `merge-order`'s merge list (its dependencies are merged), has a worktree on its branch, and this run passes the `plan.landed` role gate (`release` under the lifecycle preset). Otherwise it refuses and writes nothing.
  2. Restores the generated files in the worktree (`linguist-generated`: tracked ones checked out, new ones removed). Uncommitted code left in the worktree bounces the plan ("uncommitted code after done").
  3. Merges the base into the plan branch (`chore(P-###): update to <base>`). On a conflict it aborts the merge and bounces the plan with the conflicting files.
  4. Runs `hub.build` in the worktree (when set), then `refresh-bin` (when the policy sets `release.refresh_bin`). It commits what they changed (`chore(P-###): rebuild generated files`). A failing build bounces the plan with the last lines of its output.
  5. Runs `hub.full_suite` in the worktree (when set) through P-043's `runSuite` (commands/work/suite.ts), so it waits for a suite slot and is recorded in `suites`. A failure bounces the plan with the last lines of its output.
  6. Squash-merges, under the hub-commit lock: `git merge-tree --write-tree <base> <branch>` gives the tree, `git commit-tree -p <base>` the commit, subject `<type>(P-###): <title>` (feat if the plan delivers a FEAT, else fix if a BUG, else chore). Then `git merge --ff-only` in the main checkout, which must be on the base branch. If the base gained a commit outside `.crew/` since step 3, `land` goes back to step 3 first, so what lands is what the suite ran on. The user's other uncommitted files in the main checkout are never staged; if one is in the way of the fast-forward, `land` stops with git's message and keeps the worktree.
  7. Removes the worktree and deletes the branch.
  8. Updates the worktrees of open plans that depend on it: `merge --ff-only <base>` when possible; otherwise, with no uncommitted code there, `merge --no-edit <base>`. Otherwise (dirty, or a conflict, which is aborted) it prints "update P-### by hand: <why>".
  9. Logs `landed on <base> as <sha>` on the plan.
- **Bounce:** the plan moves `done → in-progress` (`via: plan.landed`, a new edge in `PLAN_FLOW`), with the reason in the note. The developer who holds the plan gets it back through `next`. The next `land` takes it again once it is done.
- `presets.ts`: `"plan.landed": "release"` and the edge gate `"plan.done>in-progress": "release"` under the lifecycle preset, so only Release reopens a done plan, through `land` or by hand.
- `merge-order`'s per-plan instruction says `land P-###` instead of the manual steps.
- Docs: release.md (step 3 becomes `crew.mjs land`; conflicts and suite failures go back automatically; reserved steps unchanged); references/model.md (`plan_worktrees` row: checkpoints commit on the plan branch and `land` squashes it; Git mapping; the `done → in-progress` edge); hub SKILL.md's "Release merges in `merge-order`" sentence; the config.yaml comment "nothing is committed until the plan completes".

**Out (explicitly not doing):**
- Pushing, PRs or CI (the team doesn't push; a project using PRs keeps its own flow, and `land` refuses nothing about that).
- Rollouts and reserved steps (`deploy.production`, `publish`): Release still follows the plan's Rollout and escalates.
- Re-running QA or review after a bounce: P-028's gate already makes a code change need a new approval, and QA's evidence policy is unchanged.
- `dispatch` routing to `land` (P-031).
- Changing `.crew/bin/**` other than through P-024's `refresh-bin`, `.claude/agents/**` or the policy (human-reserved).

## Acceptance criteria
- [ ] AC1 · In a throwaway repo with plan worktrees, two done plans that edit different lines of the same `src/cli.ts`: `land` merges the first, then updates and merges the second. `git log main` shows exactly one new commit per plan, `feat(P-001): …` and `feat(P-002): …`. Both worktrees and branches are gone, and `merge-order` says nothing to merge.
- [ ] AC2 · When the two plans change the same line, the second bounces: it is `in-progress` with a note naming `src/cli.ts`, its branch has no half-merge (`git status` clean, `MERGE_HEAD` absent), main has only the first plan's commit, and its worktree is kept.
- [ ] AC3 · With `hub.full_suite` set to a command that fails for the plan, `land P-001` bounces it with the command's last output line in the note, and main is unchanged. With `hub.build` writing a `linguist-generated` file, the landed commit contains the rebuilt file.
- [ ] AC4 · An unrelated uncommitted file in the main checkout stays uncommitted and unchanged across `land`.
- [ ] AC5 · An open plan P-003 that depends on P-001 has its worktree fast-forwarded (or merged, when it has its own commits) to the new base after P-001 lands. `land` prints what it did for P-003.
- [ ] AC6 · Under `preset: lifecycle`, `land` as the developer role refuses, naming the release role, and so does `move P-001 in-progress` of a done plan by the developer; `land` of a plan that isn't done, or whose dependency isn't merged, refuses and writes nothing.
- [ ] AC7 · The landed commit is recognised by `git.squashMerge`: after landing, a branch recreated at the old tip shows as merged in `merge-order`.
- [ ] AC8 · release.md tells Release to run `crew.mjs land` (and no longer to "commit everything once"); model.md documents the bounce edge and that `land` squashes; `merge-order` prints `land P-###` for a plan to merge.

## Approach
- **land.ts** (new, under 300 lines; release.ts keeps `merge-order`). Read `hub.build` and `hub.full_suite` with `yamlBlock(config, "hub")` (store.ts, exported). Run shell steps with `spawnSync(cmd, {shell: true, cwd: worktree})` and no timeout beyond the suite's own. Keep the output tail as `checkpoint` does (copy the few lines of `tail` from execution.ts, which is not in this plan's touches).
- **Lock:** take `hub-commit.lock` (hubstate.ts's `acquireLock`/`releaseLock` path) around step 6, so no hub commit lands on the base between the merge-tree and the fast-forward.
- **Bounce:** `move(store, id, "in-progress", "land: <reason>", false, undefined, "plan.landed")`. `PLAN_FLOW.done` gains `"in-progress"`. The `via` keeps Release from becoming an implementer (`implementers` ignores `via` moves) and skips the claim.
- **Registration:** `land.reg.ts` with the CLI spec and the usage line `land [P-###]   squash-merge done plans in merge order: update, rebuild, full suite, merge; a conflict goes back to the developer (Release)`, plus one line in `commands/index.ts`.
- **Reuse:** `mergeOrder` (release.ts) for the queue and the dependency check; `git.generated`, `git.codeChanges` (P-028); `refreshBin` (P-024); `authorize` and `move` (workflow.ts); `store.planHome`; the repo helpers in `test/helpers/repo.ts` and the worktree setup from `test/hub-worktrees.test.ts` (copied into the new test).

## Tasks
- [ ] T1: `PLAN_FLOW` edge, the `plan.landed` gate and the `plan.done>in-progress` edge gate → verify: `cd packages/crew && npx vitest run test/hub/e2e/land.test.ts -t gate` (AC6)
- [ ] T2: land.ts steps 1–5 and the bounce → verify: `npm run build && npx vitest run test/hub/e2e/land.test.ts -t "bounce"` (AC2, AC3)
- [ ] T3: step 6 squash (merge-tree, commit-tree, ff-only under the lock, repeat when the base moved) and step 7 → verify: `npx vitest run test/hub/e2e/land.test.ts -t "two plans"` and `-t "uncommitted"` (AC1, AC4, AC7)
- [ ] T4: step 8 dependants and step 9 log; the queue without an ID → verify: `npx vitest run test/hub/e2e/land.test.ts -t dependants` (AC5)
- [ ] T5: registration; `merge-order` text → verify: `node ../../plugins/crew/skills/hub/dist/crew.mjs --help | grep -n "^  land"` after `npm run build`; `npx vitest run test/hub-worktrees.test.ts -t merge_order test/hub/registry.test.ts` (AC8)
- [ ] T6: release.md, model.md, SKILL.md sentence, config.yaml comment → verify: `grep -n "crew.mjs land" plugins/crew/skills/hub/agents/release.md`; `grep -c "commit everything once" plugins/crew/skills/hub/agents/release.md` prints 0; `npx vitest run test/plugin` (AC8)
- [ ] T7: types and size → verify: `npm run typecheck`; `wc -l src/hub/commands/work/land.ts src/hub/commands/work/release.ts src/hub/core/work/model.ts` each under 300

## Test plan
**Targeted checks** (from `packages/crew/`, after `npm run build`; `land.test.ts` drives the built `dist/crew.mjs` in throwaway repos with plan worktrees, `hub.build` and `hub.full_suite` set to small shell commands):
- AC1, AC4, AC7 → `npx vitest run test/hub/e2e/land.test.ts -t "two plans"` and `-t uncommitted`
- AC2, AC3 → `npx vitest run test/hub/e2e/land.test.ts -t bounce`
- AC5 → `npx vitest run test/hub/e2e/land.test.ts -t dependants`
- AC6 → `npx vitest run test/hub/e2e/land.test.ts -t gate`
- AC8 → T5's and T6's greps; `npx vitest run test/hub-worktrees.test.ts -t merge_order test/plugin`
- `npm run typecheck`

## Rollout & rollback
- This repo: once merged and `.crew/bin/` is refreshed, Release runs `land`. The human re-renders `.claude/agents/crew-release.md` (protected) so this repo's Release reads the new release.md. Until then Release follows the old prose, which still works.
- `land` requires git ≥ 2.38 (`merge-tree --write-tree`); it refuses with that message on an older git.
- Rollback: revert the plan's commit; Release goes back to the manual steps in the previous release.md.

## Risks & open questions
- A long `hub.full_suite` holds no lock: only step 6 does, so hub commands keep working while the suite runs. If the base moves during the suite, `land` repeats from step 3, and a busy base can make it loop. It gives up after 3 rounds and says so.
- Bounced plans keep QA's earlier evidence; if the fix changes behaviour, the reviewer's fresh approval (P-028) is the check. Whether QA must re-verify after a bounce is a PM/policy question for later.
- The new `done → in-progress` edge is also reachable by a plain `move`. Under the lifecycle preset only the release role may take it (the edge gate), which is the same power `land` has. Without a preset, any run may, like every other move. workflow.ts needs no change: `authorize` already reads edge gates.
- Touches overlap P-031 (presets.ts) and P-043 (release.md): this plan depends on both, P-043 also for `runSuite`. P-021 (model.ts, presets.ts, config.yaml; G-003) depends on this plan.

## Handoff

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-25: Architect: depends_on P-031 (presets.ts) and P-043 (runSuite for step 5, release.md) added
- 2026-10-25: status ready → draft — Architect: re-spec for the executive decision (accepted status, PM owns done)

## Outcome
