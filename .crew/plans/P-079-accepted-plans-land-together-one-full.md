---
id: P-079
title: Accepted plans land together: one full-suite run per batch
goal: G-007
items: FEAT-071
touches: packages/crew/src/hub/commands/work/land.ts, packages/crew/src/hub/commands/work/land-steps.ts, packages/crew/src/hub/commands/work/batch.ts, packages/crew/src/hub/commands/work/suite.ts, packages/crew/src/hub/commands/work/suite.reg.ts, packages/crew/test/hub/e2e/land-batch.test.ts, packages/crew/test/hub/e2e/land-helpers.ts, packages/crew/test/hub/e2e/land.test.ts, packages/crew/test/hub/e2e/suite.test.ts, plugins/crew/skills/hub/agents/release.md, plugins/crew/docs/reference.md, .crew/config.yaml
depends_on: P-062
status: ready
branch: plan/P-079-accepted-plans-land-together-one-full
pr:
created: 2026-10-27
started:
completed:
---

# P-079: Accepted plans land together: one full-suite run per batch

## Context
FEAT-071 (P0, G-007 autonomous parallel delivery). `land` with no ID takes the accepted plans of `merge-order` one at a time: it updates each plan to the base, rebuilds, runs `hub.full_suite` in the one shared slot (11 to 22 min here, see `crew.mjs suites` on 2026-10-26), squashes and fast-forwards. With four accepted plans that is about an hour, and one red run at the end restarts the wait. This plan makes `land` (no ID) stack the queue on one candidate of the base, run the full suite once for the batch, and then put one squash commit per plan on the base. When the suite is red, it finds the plan that broke it. Decisions that bind it: K-2026-10-25-full-suites-run-through-the-hubs-suite (suites go through `runSuite`), K-2026-10-26-b-keep-merge-conflicts (conflicts go back to the developer, Release never resolves them), K-2026-10-25-plans-go-in-review-accepted (land never moves a plan to done), K-2026-10-23-every-module-stays-under-300-lines, K-2026-10-24-release-builds-the-generated-files.

Depends on P-062 (in flight): it moves the worktree cleanup out of land.ts and changes `landed()`, which this plan reuses.

## Scope
**In:**
- `land` with no ID and two or more landable plans in the queue runs batches. Each plan is prepared as today (generated files restored, uncommitted code bounces, base merged into its branch, where a conflict bounces). The prepared plans are then stacked in merge order on a fresh candidate worktree detached at the base: one squash commit per plan, rebuilt (`hub.build`, `refresh-bin` when the policy says so). After that comes one `hub.full_suite` run on the candidate's tip and, when it is green, every plan's commit goes onto the base with one fast-forward.
- Stacking rules. A plan that conflicts with the plans stacked before it (in files other than generated ones), or whose stacked build fails, leaves the batch. It stays `accepted`, with a log line, and goes into the next batch. Its dependants in the batch leave with it. At position 1 (directly on the base) the same failure is the plan's own and it bounces to its developer, as today.
- Red suite: bisect over the stacked prefixes to find the first red prefix k. Plan k bounces (`accepted → in-progress`, `plan.landed`, note `land: hub.full_suite failed in the batch …`). Plans 1..k-1 land from the green prefix, with no new run. Plans after k go into the next batch.
- `land` keeps forming batches from what is left until nothing is left or a `Stop` happens. When only one plan is left, it takes today's single path.
- A new optional `hub.setup` key in `.crew/config.yaml`: the command that installs a fresh checkout's dependencies. It runs in the candidate before the first build (this repo: `cd packages/crew && npm ci --prefer-offline`).
- `runSuite` takes and records `plans` (the plans the tested tip holds, in order). `suites` shows them (`P-001+P-002`), and the `suites` MCP description names the field.
- Release's agent instructions describe batches.

**Out (explicitly not doing):**
- `land P-###`: unchanged, still a single plan.
- Changing `merge-order`, the slot lock, `suite --ref`, the `plan.landed` gate or the cleanup (P-062).
- Rerunning a red suite to rule out a flaky test. That is BUG-049 and CHORE-025.
- A cap on the batch size, a parallel suite per prefix, and `hub.setup` in `init`'s config template.
- Making the hub resolve any conflict.

## Acceptance criteria
- [ ] AC1: With two or more plans in `merge-order`, `land` (no ID) stacks them in merge order on one candidate detached at the base and runs `hub.full_suite` once for the batch. `suites --json` gains exactly one record, whose `plans` lists the batch in merge order.
- [ ] AC2: On a green suite each plan lands as its own squash commit `<type>(P-###): <title>`, in merge order, parented on the one before it. Each commit's generated files are rebuilt for that commit: with `build: cat src/cli.ts > dist/app.txt`, `git show <sha>:dist/app.txt` equals `git show <sha>:src/cli.ts` for every landed commit. Each plan gets its own `landed on main as <sha>` log event with its own sha. Worktree and branch are removed per plan. The plans stay `accepted` and the PM can move each one done.
- [ ] AC3: When the batch suite is red, `land` bisects the prefixes and bounces only the first plan whose prefix is red, with a note naming the batch. With a batch of three where the second breaks the suite, P-001 lands, P-002 goes back to `in-progress`, and P-003 lands in the next batch. `suites` shows the runs as the batch, then the bisect prefix, then the next batch, each listing its plans. P-001 needs no run beyond the batch and the bisect.
- [ ] AC4: A plan that conflicts with an earlier plan of the batch leaves it without a bounce and does not block the rest: the others land. It is position 1 of the next batch, where a real conflict with the now-landed code bounces it with `merging main conflicts in <files>`, as today. A plan that depends on a plan which left or bounced does not land in that batch.
- [ ] AC5: A single landable plan, and `land P-###`, take today's path: no candidate worktree, one suite record with `plans` holding only that plan. The existing land.test.ts tests pass unchanged, apart from helpers moved to land-helpers.ts.
- [ ] AC6: Two cases stop the batch, and then nothing of it lands, every plan stays `accepted` with its worktree, and `land` exits 1 telling Release to run it again: a plan branch that moved during the suite (BUG-035), and a base that gained code outside `.crew/` three rounds in a row. A base that gained only `.crew/` commits lands on top of them. The candidate worktree is removed after every batch, on success, bounce, stop or throw: `git worktree list` holds no `land-batch` entry afterwards.
- [ ] AC7: `hub.setup`, when set, runs once in each candidate before the first build. When it fails, the batch stops (nothing lands, plans stay accepted) and the output names it.
- [ ] AC8: land.ts, the new modules and suite.ts each stay under 300 lines, with no import cycle among them. `npx tsc --noEmit -p .` is clean.

## Approach
- **Modules.** `commands/work/land-steps.ts` (new) holds what both paths share, moved from land.ts unchanged in behaviour: `Bounce`, `Stop`, `tail`, `commitType`, `prepare(store, plan, base)` (steps 2 and 3: restore generated files, refuse uncommitted code, merge the base into the branch), `rebuild(store, dir, pid)` (step 4 in a given checkout), `landed`, `bounce` and `updateDependant`. `commands/work/batch.ts` (new) holds `landBatch(store, queue, base)`. land.ts keeps the command, `check`, `landOne` (built from `prepare` and `rebuild`), `squash` and the queue loop: with a queue of two or more it calls `landBatch`, otherwise `landOne`.
- **Candidate.** `git worktree add --detach .claude/worktrees/land-batch-<pid> <from>`, a full checkout that nothing outside the batch uses. It is removed with `git worktree remove --force` and `git worktree prune` in a `finally`. A leftover `land-batch-*` whose pid is dead is removed at the start. `hub.setup` runs there first.
- **Stack**, for each prepared plan in order, inside the candidate at c(k-1): `git merge --squash --no-commit <branch>`. A merge base of `from` holds, because every branch has just had `from` merged in. When only generated files conflict, take c(k-1)'s version. A conflict in any other file means `git reset --hard c(k-1)` and the plan leaves the batch (bounces at k=1). Next come `rebuild` and a commit `<type>(P-###): <title>` holding the plan's changes plus the rebuilt files. A failed build also means a reset and leaving (bounces at k=1). Record `tip[pid]` = the branch tip used.
- **Suite.** `runSuite(store, { cwd: candidate, ref: first, plans, capture: true })` on c(n). Green: check every `tip[pid]` is still its branch tip (else `Stop`), then `squashChain`. Red: bisect with lo=0 (the base, assumed green) and hi=n: test c(mid) after `git checkout --detach c(mid)` plus a rebuild-free reset, until hi=lo+1. Then plan hi bounces, prefix 1..lo goes through `squashChain` (when lo > 0), and plans hi+1..n go into the next batch.
- **squashChain**, under the hub-commit lock as `squash()` uses: `now` = base. When the base gained code outside `.crew/` since `from`, return null and the batch redoes from `prepare` (up to `ROUNDS` = 3, then `Stop`). Otherwise, for k = 1..m: tree(k) = first line of `git merge-tree --write-tree now c(k)`, merged on their common ancestor `from`, so it carries the base's `.crew/` commits and the prefix up to k. Then `commit-tree tree(k) -p prev -m subject(k)`, and at the end `merge --ff-only` in the main checkout. Then `landed()` per plan with its own sha, in order.
- **Suite record.** `SuiteRecord.plans?: string[]` (left out of older records). `runSuite` writes `plans ?? (ref ? [ref] : [])`. `suites` text prints `plans.join("+")` in place of `ref` when there are two or more.
- **Rejected:** rerun-without-the-last, which is O(n) runs against bisect's O(log n). Also rejected: stacking in the first plan's worktree, which would put other plans' code on its branch and hide it from `planWorktrees()` during the run. And rebuilding only once at the tip, which would leave intermediate commits on main whose generated files don't match their source.

## Design

## Tasks
- [ ] T1: Move land.test.ts's helpers (`hub`, `wt`, `started`, `inReview`, `accepted`, `land`, `events`, `status`, `subjects`, `ok`, `no`) into `test/hub/e2e/land-helpers.ts` and import them in land.test.ts. Write land-batch.test.ts with the Test plan's cases → verify: land.test.ts passes as before. The new AC1–AC4, AC6 and AC7 cases fail on the current code.
- [ ] T2: Add `plans` to `runSuite` and `SuiteRecord`, the `suites` text output and the MCP description in suite.reg.ts. Regenerate the docs (`npm run build`) → verify: `npx vitest run test/hub/e2e/suite.test.ts test/docs.test.ts` passes with a new case asserting `plans` on `suite --ref P-001` (`["P-001"]`).
- [ ] T3: Create land-steps.ts by moving the shared steps out of land.ts, with no behaviour change → verify: `npx vitest run test/hub/e2e/land.test.ts` passes and `npx tsc --noEmit -p .` is clean.
- [ ] T4: batch.ts: candidate, `hub.setup`, stack, suite, `squashChain`, then land.ts calling `landBatch` for queues of two or more → verify: the AC1, AC2, AC4, AC5 and AC7 cases of land-batch.test.ts pass.
- [ ] T5: Bisect, the stop cases and the candidate cleanup → verify: the AC3 and AC6 cases pass, along with all of land.test.ts and land-batch.test.ts. `wc -l` shows land.ts, land-steps.ts, batch.ts and suite.ts each under 300 lines.
- [ ] T6: Add `setup: cd packages/crew && npm ci --prefer-offline` to the `hub:` block of `.crew/config.yaml`, with a one-line comment. Rewrite release.md's Loop step 2 and step 3 for batches (stacking, a plan leaving the batch, bisect and bounce, the next batch) → verify: `git diff` shows only those lines. `npx vitest run test/hub/e2e/agents.test.ts` passes.

## Test plan
**Targeted checks** (in the plan worktree's packages/crew, after `npm ci --prefer-offline` and `npm run build`, since the e2e tests run the bundle): `npx vitest run test/hub/e2e/land-batch.test.ts test/hub/e2e/land.test.ts test/hub/e2e/suite.test.ts test/docs.test.ts test/hub/e2e/agents.test.ts`, plus `npx tsc --noEmit -p .`.
land-batch.test.ts uses land-helpers' `hub()`, and each plan changes a different line of src/cli.ts. The suite counts come from `suites --json`.
- AC1 "batch: two plans, one suite run": `full_suite: true`. P-001 (line 1) and P-002 (line 7) are accepted. `land` exits 0. `suites --json` has 1 record with `plans` `["P-001","P-002"]`.
- AC2 "batch: one commit per plan with its own rebuilt files": `build: cat src/cli.ts > dist/app.txt`, with `.gitattributes` marking `dist/**` generated. The subjects are `feat(P-002): Login`, then `feat(P-001): Signup`. The P-002 commit's parent is the P-001 commit. For both, `dist/app.txt` equals `src/cli.ts` at that commit. The ledger has one `landed on main as` per plan with distinct shas. `pm move P-001 done` and `pm move P-002 done` pass. No `plan/*` branches or plan worktrees are left.
- AC3 "batch: a red suite bounces only the plan that broke it": `full_suite: "! grep -q BREAK src/cli.ts"`. P-001 is line 1, P-002 writes `BREAK` at line 4, and P-003 is line 7. `land` exits 1. P-001 and P-003 have landed. P-002 is `in-progress` and its last move note contains `hub.full_suite failed`. `suites --json` (oldest first) lists `plans` as `[P-001,P-002,P-003]`, `[P-001]`, `[P-003]`, with exit codes non-zero, 0 and 0.
- AC4 "batch: a plan that conflicts with an earlier one leaves the batch": P-001 and P-002 both change line 3 and P-003 changes line 7. P-001 and P-003 land in one batch whose suite record has `plans` `[P-001,P-003]`. P-002 is bounced with `land: merging main conflicts in src/cli.ts`. The output says P-002 left the batch. A second case, "a dependant leaves with its dependency": P-003 has `--depends P-002`, and P-003 is not landed and is not `in-progress` through `plan.landed` in that batch.
- AC5: land.test.ts runs unchanged (the single-plan and `land P-###` cases). A new case in land-batch.test.ts, "single: one plan takes the single path", asserts `git worktree list` never held `land-batch` (the suite command `git worktree list > wt.txt` writes it out) and that `plans` is `["P-001"]`.
- AC6 "batch: a branch that moved during the suite stops the batch": the suite command commits on P-002's branch through `git -C <worktree>`. `land` exits 1, nothing new is on main, both plans stay `accepted` with their worktrees, and there is no `land-batch` worktree. "batch: a .crew-only commit on the base during the suite still lands": the suite command makes a `.crew/` commit in the main checkout, and both plans land on top of it.
- AC7 "batch: hub.setup runs in the candidate": `setup: pwd > "$OUT"/setup.txt`, where the file names a `land-batch-` path and is written once. "batch: a failing hub.setup stops the batch": `setup: false`, nothing lands, and the output names `hub.setup`.
- AC8: `wc -l src/hub/commands/work/{land,land-steps,batch,suite}.ts`, plus review checking that land-steps.ts imports neither land.ts nor batch.ts.

## Rollout & rollback
- Config: `hub.setup` is added to `.crew/config.yaml`. A project without it gets a candidate with no install step, which suits projects that need no dependencies.
- It ships in the hub bundle Release rebuilds at landing, and the executive's session refreshes `.crew/bin` on main after the merge (K-2026-10-25-claude-codes-auto-mode-permission-check). The first batch landing happens after that refresh.
- Observability: `crew.mjs suites` shows each batch with its plans, and the ledger has a log line per plan that leaves a batch or bounces.
- Rollback: revert the squash commit. `land` goes back to one plan at a time, and `plans` stays an ignored field in older records.

## Risks & open questions
- A flaky full suite (BUG-049) makes bisect blame the wrong plan, which then bounces with no fault in its code. The note names the batch so the developer can tell. A rerun guard is a later item if it happens.
- Bisect assumes failures are monotonic (a green prefix stays green). An interaction failure is blamed on the later plan of the pair, which is the right owner.
- A batch plan's commit tree can differ from its branch in generated files. `git.squashMerge` may then not recognise the branch as squash-merged. `land` deletes the branch anyway, but P-062's full-delete fallback (check e) would keep a stuck worktree and warn.
- `hub.setup` (`npm ci`) adds roughly 30 s per batch, small next to one 11–22 min suite run saved per extra plan.
- Overlaps: land.ts with P-062 (a dependency); suite.ts with P-066 (accepted, landing first; no code needed from it). The test files and `.crew/config.yaml` are shared.

## Handoff

## Progress log

- 2026-10-27: status draft → ready

## Outcome
