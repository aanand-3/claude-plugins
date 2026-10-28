---
id: P-093
title: Batch land: refreshBin must accept the candidate worktree
goal: G-007
items: BUG-059
touches: packages/crew/src/hub/commands/work/release.ts, packages/crew/src/hub/commands/work/land-steps.ts, packages/crew/test/hub/e2e/land-batch.test.ts, packages/crew/test/hub/e2e/land.test.ts
depends_on:
status: ready
branch: plan/P-093-batch-land-refreshbin-must-accept
pr:
created: 2026-10-28
started:
completed:
assignee: developer
---

# P-093: Batch land: refreshBin must accept the candidate worktree

## Context
P0 fix for BUG-059 (goal G-007). The batch `land` added by P-079 (FEAT-071) rebuilds each stacked plan in a candidate worktree detached at the base. `rebuild` (land-steps.ts:67-68) calls `refreshBin(store, dir, false)` whenever `release.refresh_bin` is set. The `refresh-bin` command's checks in `refreshBin` (release.ts:113-116: role is release, and the checkout's branch belongs to a plan) refuse the candidate's detached HEAD with "refresh-bin: this checkout (branch 'none') is not a plan's worktree; run it in the plan's worktree". So every batch land fails in this repo, whose policy sets `release.refresh_bin: { from: plugins/crew/skills/hub/dist, files: [crew.mjs, ui.html] }`. land-batch.test.ts never sets the key, so its cases missed it. Nine accepted plans wait on this: P-069, P-070, P-072, P-073, P-075, P-082, P-074, P-085, P-080.

The single path (`landOne`) works today (P-062, P-077, P-079, P-092 landed with it) because it rebuilds in the plan's own worktree, as release. Its behaviour must stay the same.

## Scope
**In:**
- Split the copy out of `refreshBin` into an internal, exported function with no role or plan-branch check. `rebuild` calls it, and the `refresh-bin` command calls it after its checks.
- A regression batch case in land-batch.test.ts with `release.refresh_bin` set, and a single-path case in land.test.ts that pins `landOne`'s behaviour with the key set.

**Out (explicitly not doing):**
- Changing the `refresh-bin` command: its role check, plan-worktree check, `--check` mode, messages and help line stay as they are.
- Changing how `rebuild`'s changed files reach a commit. `.crew/bin/**` is code to `git.codeChanges`, so `rebuild` already returns it: `stack()` stages it into the plan's squash commit in the candidate, and `landOne` commits it on the plan branch.
- Any change to batch.ts, land.ts, the guard, or the policy schema.

## Acceptance criteria
- [ ] AC1 (regression, BUG-059): in a lifecycle hub whose `.crew/policy.yaml` sets `release.refresh_bin` (`from: src`, `files: [bin.txt]`, with `src/bin.txt` and `.crew/bin/bin.txt` both committed as `old`), two accepted plans land together with `land` (no ID, the batch path). P-001 changes only `src/cli.ts`, and P-002 changes `src/cli.ts` and sets `src/bin.txt` to `new`. `land` exits 0, and its output does not contain "not a plan's worktree". Main has `feat(P-001): Signup` then `feat(P-002): Login`. The case fails on the current main code (that refusal, exit 1).
- [ ] AC2: in AC1's landing, the refreshed file lands in the right plan's squash commit. `git show <P-001 sha>:.crew/bin/bin.txt` is `old`, `git show <P-002 sha>:.crew/bin/bin.txt` is `new`, and `.crew/bin/bin.txt` is among P-002's changed files (`git show --name-only <P-002 sha>`) and not among P-001's. The main checkout's `.crew/bin/bin.txt` reads `new`, and `git status --porcelain -- .crew/bin` there is empty. No `land-batch-*` worktree is left.
- [ ] AC3 (landOne unchanged): with the same policy, `land P-001` for one accepted plan that sets `src/bin.txt` to `new` exits 0. Its output contains "refreshed .crew/bin/bin.txt from src/bin.txt". The landed `feat(P-001): …` commit's changed files are exactly `.crew/bin/bin.txt`, `src/bin.txt` and `src/cli.ts`, and the main checkout's `.crew/bin/bin.txt` reads `new`.
- [ ] AC4 (command unchanged): the `refresh-bin` command still refuses another role, a missing key and a checkout that is not a plan's worktree, with the same messages. It still refreshes in a plan's worktree as release, and `--check` still behaves as before. test/hub/refresh-bin.test.ts passes unmodified.
- [ ] AC5: release.ts and land-steps.ts stay under 300 lines each, and the typecheck passes.

## Approach
- **Decision: an internal copy function, not a looser check.** Accepting "a plan's worktree or a land candidate" in `refreshBin` would mean recognising candidates by path or detached HEAD inside a user-facing command. That would give the command a way around its own check. The checks are the command's contract with an agent typing `refresh-bin`. `land` is already authorised by its `plan.landed` gate, and it chooses the checkout itself (a plan's worktree or its own candidate). So the land steps need no second check.
- In release.ts, add `export function copyBin(store: Store, root: string): string[]` (the name is the developer's choice). It does the policy validation that `refreshBin` does now (the `from`/`files` presence, the relative-path and not-under-`.crew/` rule, bare file names). It computes the stale files, copies each one while keeping the target's mode, and says `refreshed .crew/bin/<f> from <src>/<f>` for each, or `refresh-bin: .crew/bin is up to date with <src>` when none are stale, plus the existing `skipped …` lines. It returns the `.crew/bin/<f>` paths it copied. No role check and no branch check.
- `refreshBin` keeps its `--check` branch as it is. On the non-check path it runs its role check and its plan-worktree check, in the current order and with the current messages, and then calls `copyBin`. The validation runs before the checks today, so a bad key is still reported first (factor a small shared helper for validation and the stale list if needed, so `--check` and `copyBin` share it).
- land-steps.ts `rebuild` calls `copyBin(store, dir)` in place of `refreshBin(store, dir, false)`, under the same `binFrom && binFiles.length` condition. Its return value stays as it is: the copied files are tracked code changes, so `git.codeChanges` already lists them, and the batch's `stack()` stages them into that plan's squash commit. The returned paths are not needed by `rebuild`. Keep the return anyway for tests, or return nothing; the developer chooses the smaller of the two.
- Behaviour change, stated: through `land`, the refresh no longer requires the release role, because `land`'s own `plan.landed` gate decides who lands (release under the lifecycle preset, so nothing changes in this repo or the tests).
- A refresh happens in a batch only on the plan whose stacked squash changes a `from` file. Later plans find `.crew/bin` up to date, so each refreshed file rides in the commit of the plan that made it stale, and reaches main through `squashChain`.

## Design

## Tasks
- [ ] T1: Write the AC1/AC2 regression case in land-batch.test.ts first (`batch: release.refresh_bin refreshes .crew/bin in the candidate, in the plan's own commit (BUG-059)`). Build the repo with `hub("", { ".crew/policy.yaml": "preset: lifecycle\nrelease:\n  refresh_bin:\n    from: src\n    files: [bin.txt]\n", "src/bin.txt": "old\n", ".crew/bin/bin.txt": "old\n" })`. P-002's worktree writes `src/bin.txt` before `accepted(...)`, whose `ship` commits it. No `full_suite` is needed. No new helper starts a process. If one is added, it must clean up on every exit path, timeouts included (BUG-058). → verify: `npm run build`, then `npx vitest run test/hub/e2e/land-batch.test.ts -t "BUG-059"` fails with "not a plan's worktree" before the fix.
- [ ] T2: Write the AC3 case in land.test.ts's `land` describe (`land: release.refresh_bin refreshes .crew/bin in the plan's own commit`). Use the same repo setup with one plan and `land(repo, "P-001")`. → verify: it passes on the current code (the single path works today), which pins the behaviour.
- [ ] T3: release.ts: add `copyBin` as described in Approach, and make the `refresh-bin` command path call it after its unchanged role and plan checks. → verify: `npx tsc --noEmit -p .` (or `npm run typecheck`) passes, and `wc -l` stays under 300.
- [ ] T4: land-steps.ts: `rebuild` calls `copyBin(store, dir)`, and the `refreshBin` import goes. → verify: `npm run build`, then the T1 case passes, and T2 and test/hub/refresh-bin.test.ts pass unmodified.
- [ ] T5: Show that the regression fails against main. Write main's versions into the worktree (`git show main:packages/crew/src/hub/commands/work/release.ts > …` and the same for land-steps.ts), run `npm run build`, and run the T1 case: it fails with "not a plan's worktree". Then restore the fixed versions from `git show HEAD:…` (or the checkpoint's copy) and rebuild, so the e2e run uses the fixed bundle (K-2026-10-25 stash gotcha, K-2026-10-26 dist gotcha). → verify: the failing output is recorded in the checkpoint note, and `git diff` shows only the plan's intended changes after the restore.

## Test plan
Run in `packages/crew` of the plan worktree, after `npm ci --prefer-offline` and `npm run build`. The e2e tests drive the built dist, so rebuild after every source change.

**Targeted checks:**
- AC1, AC2: `npx vitest run test/hub/e2e/land-batch.test.ts`. The new BUG-059 case passes after the fix and fails against main's release.ts and land-steps.ts (T5). The existing batch cases still pass.
- AC3: `npx vitest run test/hub/e2e/land.test.ts` (the new refresh_bin case and the existing single-path cases).
- AC4: `npx vitest run test/hub/refresh-bin.test.ts`, unmodified.
- AC5: `npm run typecheck` and `wc -l src/hub/commands/work/release.ts src/hub/commands/work/land-steps.ts`.

## Rollout & rollback
n/a: an internal change to the hub's land steps. It reaches this repo's `.crew/bin` when Release lands it and refreshes `.crew/bin` (the plan's own land does the refresh). P-093 lands with `land P-093`, the single path, which works today. Rollback is reverting the squash commit, and batch land then fails again as in BUG-059.

## Risks & open questions
- The refresh through `land` no longer checks the role. That is accepted: the `plan.landed` gate authorises `land`, and the user-facing command keeps both checks (see Approach).
- If two plans in one batch both change a `from` file, each squash commit carries its own refresh. That is correct and needs no special handling.

## Handoff

## Progress log

- 2026-10-28: re-goaled none → G-007 by Arpit Anand: BUG-059 is on G-007; the fix unblocks batch landing (FEAT-071)
- 2026-10-28: status draft → ready
- 2026-10-28: assigned to the developer role

## Outcome
