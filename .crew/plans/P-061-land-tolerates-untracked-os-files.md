---
id: P-061
title: land tolerates untracked OS files in the worktree folder
goal: G-007
items: BUG-040
touches: packages/crew/src/hub/commands/work/land.ts, packages/crew/test/hub/e2e/land.test.ts
depends_on:
status: ready
branch: plan/P-061-land-tolerates-untracked-os-files
pr:
created: 2026-10-26
started:
completed:
---

# P-061: land tolerates untracked OS files in the worktree folder

## Context
BUG-040 (G-007, S3/P2): after the squash merge, `land` removes the plan's worktree. When the folder holds untracked OS files such as .DS_Store, `git worktree remove --force` fails ("Directory not empty"). land then prints "not landed ... stays accepted" and exits 1, although the squash commit is already on main. The "landed" log, the branch deletion and the update of dependants' worktrees are all skipped, so every landing on macOS with a Finder-touched worktree needs manual completion by the PM. Found while completing P-057 (squash 9c19220, release run release:a32c5793ebe232365).

## Scope
**In:**
- A worktree cleanup failure after a successful squash no longer reports the plan as not landed.
- Untracked OS files (.DS_Store and the like) in the worktree folder do not block removing it.
- The landing is recorded ("landed on <base> as <sha>"), the branch deleted and dependants' worktrees updated even when cleanup fails; a cleanup failure is reported separately.
- A regression test for the .DS_Store case.

**Out (explicitly not doing):**
- Changing how land squashes, orders or runs the suite.
- Cleaning other untracked files a developer left in the worktree on purpose.
- Preventing Finder from creating OS files.

## Acceptance criteria
- [ ] AC1: Landing a plan whose `git worktree remove --force` fails with "Directory not empty" because an untracked .DS_Store is (re)created in the folder succeeds: exit 0, the ledger has the `landed on main as <sha>` log for the plan, the worktree folder is gone, and the PM's `move P-### done` passes.
- [ ] AC2: In that case the plan's branch is deleted and a dependant's worktree is updated (fast-forwarded to main).
- [ ] AC3: If removal still fails after the squash because the folder holds a file that is not OS junk (e.g. `keep.txt`), land exits 0, logs `landed on main as <sha>` before the cleanup, prints a separate warning naming the folder and what to remove by hand, never prints "not landed", still updates dependants, and leaves `keep.txt` on disk (never deleted).
- [ ] AC4: Regression tests for AC1 and AC3 fail on main (land exits 1 with "not landed") and pass after the fix.

## Approach
Both: record the landing before any cleanup, and make the cleanup tolerate OS junk; a cleanup that still fails is a warning, never a failure of the landing.

Why `--force` fails at all: git deletes the folder tree itself and tolerates untracked files, but on macOS Finder (or Spotlight) writes `.DS_Store` back into a folder it has open between git emptying it and `rmdir`, so `rmdir` fails with ENOTEMPTY. A plain untracked `.DS_Store` present beforehand does not reproduce it (checked with git 2.39). git has by then also deleted the worktree's admin entry (`delete_git_work_tree` then `delete_git_dir`), so the folder is often already unregistered.

In land.ts:
1. `landed()` order: (a) `log(… "landed on <base> as <short>")` first — the squash is on the base, that is the fact to record; (b) `cleanupWorktree(store, wt)`; (c) `git branch -D` (non-throwing); (d) `store.forgetWorktrees()` and update dependants; (e) say `landed …` and then each warning as its own line `P-###: cleanup — <what> (the landing stands)`. Nothing after (a) throws a `HubError` out of `landed()`: every git call there uses `git.git(…)` without `check` or `spawnSync`, so the caller's catch can never print "not landed" for a landed plan.
2. `cleanupWorktree(store, wt)` returns a warning string or null. It runs `git worktree remove --force wt`; on failure, if `wt` still exists, it lists every leftover entry recursively; when each one is OS junk — basename `.DS_Store`, `._*` (AppleDouble), `Thumbs.db`, `desktop.ini`, or the worktree's own `.git` *file* — or an empty directory, it `rmSync(wt, { recursive: true })`; then `git worktree prune`. Anything else stays and gives the warning "left <rel folder>: <first few leftover paths>; remove it by hand, then `git worktree prune`". A branch that `branch -D` cannot delete gives a warning too.
3. Safety: `wt` is only ever the landed plan's own worktree (`store.planWorktrees().get(pid)`, which excludes the main checkout), and the sweep runs only after `squash()` returned a sha. Files the developer left on purpose are never deleted: a non-junk leftover keeps the whole folder.
4. `landedProblems` already accepts a squash-merged branch and a worktree git no longer registers, so `done` passes once the admin entry is gone; with a leftover folder still registered the warning tells the PM what to do by hand.

The regression tests simulate Finder's race deterministically with a `git` shim first on the test repo's PATH (written by the test into the repo's temp dir): for `worktree remove`, it runs the real git (path resolved with `command -v git` when the test starts), then recreates `<wt>/.DS_Store` (AC1) or `<wt>/keep.txt` (AC3) and exits 255 with git's "Directory not empty" message; every other call passes through. No test seam in src.

## Design

## Tasks
- [ ] T1: Write the AC1 and AC3 tests in test/hub/e2e/land.test.ts (shim on `repo.env.PATH`, a plan with a dependant for AC2) and run them on the unchanged land.ts → verify: both fail, land exits 1 with "not landed".
- [ ] T2: Reorder `landed()` (log first, non-throwing branch delete, dependants always, warnings after) → verify: the AC3 test passes; the existing land tests (AC1–AC10, BUG-035) still pass.
- [ ] T3: Add `cleanupWorktree()` with the OS-junk sweep and `git worktree prune` → verify: the AC1/AC2 test passes; `keep.txt` survives in the AC3 test; land.ts stays under 300 lines.

## Test plan
**Targeted checks:** `cd packages/crew && npx vitest run test/hub/e2e/land.test.ts` (run `npm ci --prefer-offline` in the worktree's packages/crew first), plus `npx tsc --noEmit -p .`.
- AC1, AC2: new test "cleanup: a .DS_Store recreated during worktree removal does not stop the landing (BUG-040)" — exit 0; `events(repo, "log")` has `landed on main as`; `hasWorktree` false; `git branch --list plan/*` has no P-001 branch; the dependant P-002's worktree contains main's squash commit; `pm move P-001 done` passes.
- AC3: new test "cleanup: a leftover file is a warning, not a failed landing (BUG-040)" — exit 0; output has `cleanup —` and not `not landed`; the landed log exists; `keep.txt` still exists in the folder.
- AC4: T1 run on the unchanged land.ts (developer's checkpoint note), then the same tests green after T2–T3.
- Regression: the rest of test/hub/e2e/land.test.ts green.

## Rollout & rollback
n/a for config or data: a change to land's cleanup only. Release's next `land` builds .crew/bin from the change. Rollback: revert the squash commit; a landing it recorded stays valid.

## Risks & open questions
- Removing the folder more aggressively could delete untracked files that matter; the fix must stay limited to the worktree of the plan just landed and OS junk, or leave the folder and warn.
- Whether to record the landing before cleanup or to make cleanup tolerant (or both) is the architect's call; the criteria accept either so long as the landing is recorded.
- Dependants' worktree updates must still run when cleanup only partly succeeds.

## Handoff

## Progress log

- 2026-10-26: status draft → ready

## Outcome
