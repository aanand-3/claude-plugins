---
id: P-032
title: Merge queue: land
goal: G-007
items: FEAT-037
touches: packages/crew/src/hub/commands/work/land.ts, packages/crew/src/hub/commands/work/land.reg.ts, packages/crew/src/hub/commands/index.ts, packages/crew/src/hub/commands/work/release.ts, packages/crew/src/hub/commands/work/suite.ts, packages/crew/src/hub/commands/work/workflow.ts, packages/crew/src/hub/core/work/model.ts, packages/crew/src/hub/core/work/footprint.ts, packages/crew/src/hub/core/team/presets.ts, packages/crew/src/hub/core/team/policy.ts, packages/crew/src/hub/commands/team/liveness.ts, packages/crew/src/hub/commands/team/questions.ts, packages/crew/src/hub/commands/team/roles.ts, packages/crew/src/hub/commands/team/dispatch.ts, packages/crew/src/hub/commands/views/checks.ts, packages/crew/src/hub/commands/views/reports.ts, packages/crew/ui/src/views/Board.tsx, packages/crew/ui/src/views/Overview.tsx, packages/crew/ui/src/views/DocPage.tsx, packages/crew/ui/src/components/Actions.tsx, packages/crew/ui/src/components/primitives.tsx, packages/crew/test/hub/e2e/land.test.ts, packages/crew/test/hub/e2e/suite.test.ts, packages/crew/test/hub/e2e/helpers.ts, packages/crew/test/hub/e2e/team-helpers.ts, packages/crew/test/hub/e2e/policy.test.ts, packages/crew/test/hub/e2e/team.test.ts, packages/crew/test/hub/e2e/team-2.test.ts, packages/crew/test/hub/e2e/execution.test.ts, packages/crew/test/hub/e2e/review-fixes.test.ts, packages/crew/test/hub/e2e/review-fixes-2.test.ts, packages/crew/test/hub/e2e/wip-commits.test.ts, packages/crew/test/hub/e2e/context.test.ts, packages/crew/test/hub/e2e/basics.test.ts, packages/crew/test/hub/e2e/ledger.test.ts, packages/crew/test/hub/e2e/worktrees.test.ts, packages/crew/test/hub/e2e/items.test.ts, packages/crew/test/hub/e2e/dispatch.test.ts, packages/crew/test/hub-worktrees.test.ts, packages/crew/test/hub/squash-merge.test.ts, plugins/crew/skills/hub/agents/release.md, plugins/crew/skills/hub/agents/pm.md, plugins/crew/skills/hub/agents/developer.md, plugins/crew/skills/hub/agents/qa.md, plugins/crew/skills/hub/references/model.md, plugins/crew/skills/hub/SKILL.md, docs/vision.md
depends_on: P-028, P-024, P-030, P-039, P-031, P-043
status: in-progress
branch: plan/P-032-merge-queue-land
pr:
created: 2026-10-25
started: 2026-10-26
completed:
assignee: developer
---

# P-032: Merge queue: land

## Context
W1-c of G-007 (design: `.crew/drafts/the-crew-team-was-pure-reef.md`, "W1-c: a merge queue"). Merging is a prose procedure in release.md (P-023's step 3): discard the generated files, bring the branch up to the base, run `hub.build`, make the plan's one commit, run `hub.full_suite`, squash-merge, remove the worktree. Nothing does it for Release: nothing retries after a conflict, and nothing updates the plans that depend on the merged one. With parallel plans (P-029's `hub.shared` lets overlapping plans run together) conflicts become normal, so the steps must be a command. `land P-###` turns them into one, in merge order.

**Executive decision (2026-10-25, verbatim):** "Fold into P-032: PM accepts in-review→accepted, Release lands and on a green merge the PM moves accepted→done; a failed merge or suite moves accepted→in-progress back to the developer with no force. PM owns done. Architect specs the names and gates." This replaces the earlier design, where the PM moved a plan to `done` before the merge and `land` bounced it `done → in-progress`. `done` now means "on the base branch".

**The plan lifecycle after this plan:**
```
draft → ready → in-progress → in-review → accepted → done
                    ▲              │           │
                    └──────────────┴───────────┘   (review changes; a failed land)
```
- `in-review → accepted` (gate `plan.accepted`, the PM under the lifecycle preset): the checks that guard `done` today (tasks ticked, QA's independent evidence, an approving review of the current code) move here unchanged.
- `accepted → done` (gate `plan.done`, still the PM): the only check is that the plan is **landed**: no plan worktree is left and its branch, if it still exists, is merged or squash-merged into the base. Evidence and review are not checked again: `land`'s own commits (the base merge, the rebuild) are not code changes the reviewer must see.
- `accepted → in-progress`: always through the `plan.landed` gate (the release role under the lifecycle preset), whether `land` takes it or Release moves it by hand after a failed manual merge. The move keeps the developer's claim, so the plan goes back to the developer who holds it. No force and no human approval: the gate is a role gate.
- `in-review → done` is removed. `accepted` is not closed: the claim stays, the goal stays open, a plan that depends on it doesn't start (`start` still waits for `done`), and its linked items stay `in-progress` until it is `done`.

**Dependencies (each is code this plan calls or needs):**
- **P-028**: the commit model. The plan's code is committed on its branch (WIP commits); `land` reuses `git.generated` / `codeChanges` to restore generated files and to refuse uncommitted code.
- **P-024**: `refreshBin`, called between the build and the commit when the policy sets `release.refresh_bin`.
- **P-030**: the registry (`land.reg.ts`, one line in `commands/index.ts`).
- **P-039**: plan files have one home, so `merge-order` and `status` read main's copy after each `land`.
- **P-031**: `presets.ts` (its `goal.done → pm` change) and `dispatch.ts`, whose release and in-review rows this plan changes. Also the binding decision on `test/hub/registry.test.ts`: it checks the pre-split commands, help lines and tools against the frozen `registry-before.json` and that their names are a subset, so adding `land` needs no edit there, but **no existing help line or tool description may change** (`move`, `merge-order`, `merge_order` keep their text).
- **P-043**: `runSuite` (commands/work/suite.ts) for step 5, and release.md's suite wording.

**Squash detection.** `land` writes the squash commit's subject as `<type>(P-###): <title>`, which `git.squashMerge` matches.

## Scope
**In:**
- **Status `accepted`** in `PLAN_FLOW`: `in-review: [in-progress, accepted, dropped]`, `accepted: [done, in-progress, dropped]`, `done: []`. `PLAN_TO_ITEM.accepted = "in-progress"`. `questions.ts` `FORWARD` gains `accepted` (a blocking question holds acceptance). `footprint.ts` `LIVE` gains `accepted` (its touches still overlap until it lands).
- **Gates** (workflow.ts `guard`): the `done` checks move to `accepted`; `done` checks `landedProblems` (release.ts). In `move`, a plan leaving `accepted` for `in-progress` without a `via` takes `via = "plan.landed"`, so the gate is `plan.landed` and no claim or assignment check runs.
- **Bounce limit:** `liveness.ts` `bounces` counts `accepted → in-progress` as well as `in-review → in-progress`, and `move` calls `escalateLimit` for both, so a plan that keeps failing to land reaches the Director after `max_bounces`.
- **Policy:** presets.ts lifecycle gains `"plan.accepted": "pm"` and `"plan.landed": "release"`; `"plan.done": "pm"` stays. policy.ts: `ACTIONS` gains `plan.landed`; `MODE_GATES` for `ai-assisted` and `human-led` gate `plan.accepted` instead of `plan.done` (the human approves acceptance; `done` after a landing is mechanical). `.crew/policy.yaml` is not changed.
- **`merge-order`** (release.ts): the queue is `accepted` plans with an unmerged branch, first accepted first (the time of the move to `accepted`), dependencies first. A dependency no longer blocks once it is `done`, or `accepted` and landed. A plan still `done` with an unmerged branch (completed before this plan) is listed too, with the old manual steps and "(completed before `accepted`: merge by hand)". The per-plan line for an accepted plan says `land P-###`. A merged `accepted` plan is listed as `merged: P-### (branch) — the PM moves it done; delete the branch`. `landedProblems(store, plan)` lives here.
- **`crew.mjs land [P-###]`** (CLI only, like `merge-order`; no MCP tool, so `test/mcp.test.ts` is unchanged). With an ID it lands that plan; without one, each plan of `merge-order`'s list in order, skipping plans that depend on one that bounced. For each plan:
  1. Checks: the plan is `accepted` (a legacy `done` plan: refused, naming `merge-order`), in `merge-order`'s merge list, has a worktree on its branch, and this run passes `authorize(…, "plan.landed")`. Otherwise it refuses and writes nothing.
  2. Restores generated files in the worktree (`linguist-generated`). Uncommitted code left there bounces the plan ("uncommitted code after acceptance").
  3. Merges the base into the plan branch (`chore(P-###): update to <base>`); a conflict is aborted and bounces the plan with the conflicting files.
  4. Runs `hub.build` (when set), then `refreshBin` (when the policy sets `release.refresh_bin`), and commits what changed (`chore(P-###): rebuild generated files`). A failing build bounces with the last lines of its output.
  5. Runs `hub.full_suite` (when set) through `runSuite`, so it waits for a slot and is recorded in `suites`. A failure bounces with the last lines of its output.
  6. Under the hub-commit lock: `git merge-tree --write-tree <base> <branch>`, `git commit-tree -p <base>` with subject `<type>(P-###): <title>` (feat for a FEAT, else fix for a BUG, else chore), `git merge --ff-only` in the main checkout (which must be on the base). If the base gained a commit outside `.crew/` since step 3, back to step 3 (at most 3 rounds, then it stops and says so; the plan stays accepted). The user's other uncommitted files in the main checkout are never staged; if one is in the way of the fast-forward, `land` stops with git's message and keeps the worktree.
  7. Removes the worktree and deletes the branch.
  8. Updates the worktrees of open plans that depend on it: `merge --ff-only <base>`, else (no uncommitted code there) `merge --no-edit <base>`, else (dirty, or a conflict, aborted) prints "update P-### by hand: <why>".
  9. Logs `landed on <base> as <sha>` on the plan and prints `P-###: landed on <base> as <sha> — the PM moves it done`. `land` never moves a plan to `done`.
- **Bounce:** `move(store, id, "in-progress", "land: <reason>", false, undefined, "plan.landed")`, never forced. If the move itself is refused (a blocking question on the plan), `land` prints why, leaves the plan `accepted` with its worktree, and exits 1.
- **`next` (roles.ts):** PM: `accept P-###: … → move P-### accepted` for an in-review plan with complete evidence and review (was `complete … done`), and `complete P-###: landed on <base> → move P-### done` for a landed accepted plan. Release: `land P-###: …` for the first of `merge-order`. Executive: the human-gate line names `plan.accepted` (`move P-### accepted --approved-by <you>`). QA's "report to the closer" reads the `plan.accepted` gate.
- **`dispatch` (P-031's dispatch.ts):** the release row says `land P-###`; the in-review row's last entry is `accept P-###: move P-### accepted` for the PM; a new row after release sends each landed accepted plan to the PM: `complete P-###: move P-### done`.
- **Views:** `check` applies the done-plan checks (ticked tasks, Outcome) to `accepted` plans too, and counts `accepted` with the started states for a `proposed` goal; the status report's "Now" lists `accepted` plans. The UI board gets an `accepted` column between `in-review` and `done` (Board.tsx), with a tone (primitives.tsx), its place in DocPage's status order, Overview's active list, and Actions' forward set.
- **Docs:** release.md (step 3 becomes `crew.mjs land`; a bounce goes back automatically; after landing the PM moves the plan done; reserved steps unchanged; "Never merge a plan that is not accepted"); pm.md (accept, then complete once landed); developer.md (a plan can come back from `accepted`, with the land failure in the note); qa.md (QA's checks count toward acceptance); references/model.md (lifecycle diagram, item table, gates list, Definition of Done split into "accepted" and "done", Git mapping: the branch's last commit sets `accepted`, the PM moves `done` on the base after the merge); hub SKILL.md (worktree paragraph: `land`; the solo flow's step 4: `accepted`, merge, then `done`; the "Never mark a plan done" rule); docs/vision.md (the gate table's `in-review→done` row and the default-mode sentence).

**Out (explicitly not doing):**
- Pushing, PRs or CI. A project that merges through PRs keeps that flow: PM accepts on the branch, the PR merges, the PM moves `done` (the landed check sees the squash).
- Rollouts and reserved steps (`deploy.production`, `publish`): Release still follows the plan's Rollout and escalates.
- Re-running QA or review after a bounce (P-028's review gate already makes a code change need a new approval before `accepted`).
- Changing the text of any existing help line or MCP tool description, and `registry-before.json` (binding decision).
- `.crew/policy.yaml`, `.crew/config.yaml`, `.crew/bin/**`, `.claude/agents/**` (human-reserved or Release's). The stale config.yaml comment ("nothing is committed until the plan completes") is left for the human.
- Migrating plans already `done` and unmerged: they are listed by `merge-order` with the manual steps.

## Acceptance criteria
- [ ] AC1 · Flow and gates, under `preset: lifecycle` in a throwaway repo with plan worktrees: `move P-001 done` from `in-review` is refused as not allowed (allowed: accepted, dropped, in-progress); `move P-001 accepted` as QA is refused naming the pm role, and as the PM succeeds once QA's evidence and an approving review are in (and is refused without the review); `move P-001 done` as the PM is refused while the plan is not landed, with a message naming `land P-001`; `move P-001 in-progress` from `accepted` as the developer is refused naming the release role, and as Release succeeds: the ledger move has `via: plan.landed`, `claims` still shows the developer's run, and `next --role developer` lists `continue P-001`.
- [ ] AC2 · Two accepted plans that edit different lines of the same `src/cli.ts`: `land` merges the first, then updates and merges the second. `git log main` shows exactly one new commit per plan, `feat(P-001): …` and `feat(P-002): …`. Both worktrees and branches are gone, both plans are still `accepted` and their items `in-progress`, `merge-order` says nothing to merge, and `move P-001 done` as the PM then succeeds and FEAT-001 becomes `done`.
- [ ] AC3 · When the two plans change the same line, the second bounces: it is `in-progress` with a note naming `src/cli.ts`, its branch has no half-merge (`git status` clean, `MERGE_HEAD` absent), main has only the first plan's commit, and its worktree is kept.
- [ ] AC4 · With `hub.full_suite` set to a command that fails for the plan, `land P-001` bounces it with the command's last output line in the note, and main is unchanged. With `hub.build` writing a `linguist-generated` file, the landed commit contains the rebuilt file.
- [ ] AC5 · An unrelated uncommitted file in the main checkout stays uncommitted and unchanged across `land`.
- [ ] AC6 · An open plan P-003 that depends on P-001 has its worktree fast-forwarded (or merged, when it has its own commits) to the new base after P-001 lands, and `land` prints what it did for P-003. An accepted P-004 that depends on an accepted, unlanded P-001 is listed after it by `merge-order`; once P-001 has landed (still `accepted`), P-004 is no longer waiting.
- [ ] AC7 · `land` refuses and writes nothing: as the developer role (naming the release role); for an `in-review` plan; for a plan whose dependency is not landed; for a `done` plan with an unmerged branch, which `merge-order` lists with the manual steps.
- [ ] AC8 · The landed commit is recognised by `git.squashMerge`: after landing, a branch recreated at the old tip shows as merged in `merge-order`.
- [ ] AC9 · `next --role pm` lists `accept P-001` for an in-review plan with complete evidence and review, and `complete P-001` (→ `move P-001 done`) once it is accepted and landed; `next --role release` lists `land P-001` for an accepted plan; `dispatch` gives the same three entries to pm, release and pm. In `mode: ai-assisted` without a preset, `move P-001 accepted` needs a human's approval and `move P-001 done` of a landed plan does not.
- [ ] AC10 · Under the lifecycle preset (`max_bounces: 2`), a plan that has come back twice from review and then bounces from `land` gets an open question to the director.
- [ ] AC11 · `check` reports an `accepted` plan with an unchecked task as an error; the status report's "Now" section lists an `accepted` plan; the UI board's plan columns are `draft, ready, in-progress, blocked, in-review, accepted, done`.
- [ ] AC12 · release.md tells Release to run `crew.mjs land` (and no longer to "commit everything once"); pm.md says `move P-### accepted` and, after the landing, `move P-### done`; model.md's lifecycle shows `accepted`; `merge-order` prints `land P-###` for an accepted plan; `crew.mjs --help` lists `land`.

## Approach
- **model.ts:** `PLAN_FLOW` and `PLAN_TO_ITEM` as in Scope. `CLOSED` and `ACTIVE` stay as they are (`accepted` is neither: an accepted plan's branch is gone after `land`, so `check`'s active-plan branch hint must not apply).
- **workflow.ts** (274 lines; stay under 300): in `guard`, the current `status === "done"` branch becomes `status === "accepted"`, and a new `done` branch returns `landedProblems(store, doc)` with the label "isn't landed". At the top of `move`, `if (kind === "plan" && old === "accepted" && status === "in-progress") via ??= "plan.landed";` (before `assignedHere`, `authorize` and `claimFor`). The `escalateLimit` call fires for `old` in `in-review` or `accepted`.
- **release.ts:** `landedProblems(store, plan)`: with plan worktrees, a worktree still open for the plan → "its worktree <path> is still open: Release lands it with `land P-###`"; its branch exists and is neither an ancestor of the base nor `git.squashMerge`d → "<branch> is not merged into <base>: Release lands it with `land P-###`". A missing branch with no worktree counts as landed. `mergeOrder` reuses its merged test (`isMerged`) for both; `done` → `accepted` in the queue filter, the `doneAt` key and the dependency rule; the legacy `done` entries carry a flag the text uses.
- **land.ts** (new, under 300 lines): read `hub.build` and `hub.full_suite` with `yamlBlock(config, "hub")`; shell steps with `spawnSync(cmd, {shell: true, cwd: worktree})`; the output tail as `checkpoint` does (copy the few lines of `tail` from execution.ts, which is not in touches). The hub-commit lock via `acquireLock`/`releaseLock` (core/memory/ledger.ts) on the same `hub-commit.lock` path hubstate.ts uses, around step 6 only.
- **suite.ts** (Q-4f7208): `runSuite` gains an option `capture?: boolean`; with it, the command runs with `stdio: ["inherit", "pipe", "pipe"]`, its stdout and stderr are written through to `process.stdout`/`process.stderr` after the run, and the result also carries `output` (stdout + stderr as text). Without it, behaviour is unchanged (`stdio: "inherit"`, no `output`), so `suite` and its record stay as they are. `land` calls it with `capture: true` and bounces with the tail of `output`.
- **Registration:** `land.reg.ts` with the CLI spec and the usage line `land [P-###]   squash-merge accepted plans in merge order: update, rebuild, full suite, merge; a failure goes back to the developer (Release)`, plus one line in `commands/index.ts`.
- **roles.ts, dispatch.ts:** the lines in Scope; the landed test is `!landedProblems(store, p).length`.
- **Tests:** `land.test.ts` drives the built `dist/crew.mjs` in throwaway repos with plan worktrees (repo helpers from `test/helpers/repo.ts`, the worktree setup from `test/hub-worktrees.test.ts`, copied in). Existing tests that walk a plan to `done` through its gates change to `accepted`, and those that need a `done` plan add the landing (or the merge) and then `done`: in `helpers.ts`, `qaDone` ends at `accepted` and `finish` then moves `done` (its plans have no branch, so they count as landed); `team-helpers.ts`'s forced `done` becomes `accepted`, merge, `done`. Expected `next` / `dispatch` texts change with the new wording.

## Tasks
- [x] T1: flow, gates, landed check, the `plan.landed` routing and the bounce count (model.ts, workflow.ts, release.ts `landedProblems`, presets.ts, policy.ts, liveness.ts, questions.ts, footprint.ts) → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/land.test.ts -t "flow"` and `-t "bounce limit"` (AC1, AC10)
- [x] T2: `merge-order` on accepted plans, the landed dependency rule, the legacy `done` entries and the `land P-###` text → verify: `npx vitest run test/hub/e2e/land.test.ts -t "merge-order"`, `test/hub-worktrees.test.ts -t merge_order`, `test/hub/squash-merge.test.ts` (AC6 second half, AC7 legacy)
- [x] T3: land.ts steps 1–5 and the bounce → verify: `npm run build && npx vitest run test/hub/e2e/land.test.ts -t "bounce"` and `-t "refuses"` (AC3, AC4, AC7)
- [x] T4: step 6 squash (merge-tree, commit-tree, ff-only under the lock, repeat when the base moved) and step 7 → verify: `npx vitest run test/hub/e2e/land.test.ts -t "two plans"`, `-t uncommitted`, `-t squash` (AC2, AC5, AC8)
- [x] T5: step 8 dependants, step 9 log, the queue without an ID → verify: `npx vitest run test/hub/e2e/land.test.ts -t dependants` (AC6)
- [x] T6: `next` lines (roles.ts), `dispatch` rows (dispatch.ts), mode gates → verify: `npx vitest run test/hub/e2e/land.test.ts -t "next"`, `test/hub/e2e/dispatch.test.ts`, `test/hub/e2e/policy.test.ts` (AC9)
- [ ] T7: existing tests moved to the new flow → verify: `npx vitest run test/hub/e2e/team.test.ts test/hub/e2e/team-2.test.ts test/hub/e2e/execution.test.ts test/hub/e2e/review-fixes.test.ts test/hub/e2e/review-fixes-2.test.ts test/hub/e2e/wip-commits.test.ts test/hub/e2e/context.test.ts test/hub/e2e/basics.test.ts test/hub/e2e/ledger.test.ts test/hub/e2e/worktrees.test.ts test/hub/e2e/items.test.ts` all green
- [ ] T8: `check`, status report, UI board → verify: `npx vitest run test/hub/e2e/land.test.ts -t "views"`; `grep -n '"accepted"' ui/src/views/Board.tsx`; `npm run typecheck` (it covers `ui/`) (AC11)
- [ ] T9: registration and docs → verify: `node ../../plugins/crew/skills/hub/dist/crew.mjs --help | grep -n "^  land"` after `npm run build`; `npx vitest run test/hub/registry.test.ts test/mcp.test.ts test/plugin`; `grep -n "crew.mjs land" ../../plugins/crew/skills/hub/agents/release.md`; `grep -c "commit everything once" ../../plugins/crew/skills/hub/agents/release.md` prints 0; `grep -n "accepted" ../../plugins/crew/skills/hub/agents/pm.md ../../plugins/crew/skills/hub/references/model.md` (AC12)
- [ ] T10: types and size → verify: `npm run typecheck`; `wc -l src/hub/commands/work/land.ts src/hub/commands/work/release.ts src/hub/commands/work/workflow.ts src/hub/commands/team/roles.ts src/hub/commands/team/dispatch.ts` each under 300

## Test plan
**Targeted checks** (from `packages/crew/`, after `npm run build`; `land.test.ts` drives the built `dist/crew.mjs` in throwaway repos with plan worktrees, `hub.build` and `hub.full_suite` set to small shell commands, `preset: lifecycle` where a criterion names it):
- AC1, AC10 → `npx vitest run test/hub/e2e/land.test.ts -t flow` and `-t "bounce limit"`
- AC2, AC5, AC8 → `-t "two plans"`, `-t uncommitted`, `-t squash`
- AC3, AC4 → `-t bounce`; `npx vitest run test/hub/e2e/suite.test.ts` (runSuite without capture unchanged)
- AC6 → `-t dependants` and `-t merge-order`; `npx vitest run test/hub-worktrees.test.ts -t merge_order test/hub/squash-merge.test.ts`
- AC7 → `-t refuses`
- AC9 → `-t next`; `npx vitest run test/hub/e2e/dispatch.test.ts test/hub/e2e/policy.test.ts`
- AC11 → `-t views`; the Board.tsx grep; `npm run typecheck`
- AC12 → T9's greps and `npx vitest run test/hub/registry.test.ts test/mcp.test.ts test/plugin`
- The converted test files of T7 (they cover workflow.ts, roles.ts, release.ts and the helpers).

## Rollout & rollback
- This repo, in order: Release lands P-032 by the current manual steps (its own code is not in `.crew/bin` yet), together with any plan already `done` and unmerged. The executive's session refreshes `.crew/bin` on main (K-2026-10-25 gotcha: a Release subagent can't), and re-renders `.claude/agents/crew-pm.md`, `crew-release.md`, `crew-developer.md` and `crew-qa.md` (protected) so the agents read the new text. Until the re-render, the PM's old text says `move P-### done` from in-review, which the hub refuses with "allowed: accepted, …", and Release's old text describes the manual merge, which still works.
- Plans `in-review` at that moment simply take the new path (`accepted`, `land`, `done`).
- `land` requires git ≥ 2.38 (`merge-tree --write-tree`); it refuses with that message on an older git.
- Rollback: revert the plan's commit. A plan left `accepted` then has an unknown status: `move P-### done --force` by the PM (or the human) after its merge. Release goes back to the manual steps.

## Risks & open questions
- A long `hub.full_suite` holds no lock: only step 6 does. If the base moves during the suite, `land` repeats from step 3 and gives up after 3 rounds; the plan stays `accepted` and is not bounced (nothing is wrong with it).
- Bounced plans keep QA's earlier evidence; the reviewer's fresh approval (P-028) is required before `accepted` again. Whether QA must re-verify after a land bounce is a PM/policy question for later.
- A blocking question on an accepted plan stops the bounce move (questions hold forward moves, and `in-progress` is one); `land` reports it and exits 1 rather than forcing.
- Projects whose own `.crew/policy.yaml` lists `plan.done` in `human_gates` or `role_gates` keep that gate on the final, mechanical step; model.md tells them to gate `plan.accepted` instead. This repo's policy names neither.
- The `merge-order` and `merge_order` help text keeps saying "done plans" (the frozen registry forbids changing it); the command's output and release.md say accepted.
- Touches overlap P-031 (presets.ts, dispatch.ts, pm.md, model.md, SKILL.md) and P-043 (release.md): this plan depends on both. P-021 (model.ts, presets.ts) depends on this plan.

## Handoff

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-25: Architect: depends_on P-031 (presets.ts) and P-043 (runSuite for step 5, release.md) added
- 2026-10-25: status ready → draft — Architect: re-spec for the executive decision (accepted status, PM owns done)
- 2026-10-25: status draft → ready — Architect: re-specced for accepted → land → done (executive decision)
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-032-merge-queue-land
- 2026-10-26: Architect: Q-4f7208 — suite.ts (runSuite `capture` option) and suite.test.ts added to touches

## Outcome
