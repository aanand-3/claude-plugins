---
id: P-062
title: land retries and safely completes a worktree removal that fails early
goal: G-007
items: BUG-041
touches: packages/crew/src/hub/commands/work/land.ts, packages/crew/src/hub/commands/work/worktree-cleanup.ts, packages/crew/src/hub/commands/work/release.ts, packages/crew/test/hub/e2e/land.test.ts
depends_on: P-061
status: in-progress
branch: plan/P-062-land-retries-and-safely-completes
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
---

# P-062: land retries and safely completes a worktree removal that fails early

## Context
Follow-up to BUG-040 under G-007 (autonomous parallel delivery). P-061's cleanup only deletes OS junk and warns when `git worktree remove --force` fails. At the P-059 landing (squash 83e1c72) the removal failed early with "Directory not empty" and left the folder (tracked source, node_modules, .DS_Store at every level) and its worktree registration for manual removal before `done`. BUG-041 captures it. Depends on P-061 because both change land.ts and land.test.ts.

## Scope
**In:**
- After the squash is on the base, and only while git still lists that exact path as the plan's worktree (branch plan/P-###): delete OS junk and retry `git worktree remove --force` up to 3 times with a short pause.
- A full delete of the folder followed by `git worktree prune`, only when nothing can be lost: no uncommitted code (git.codeChanges empty, no untracked files beyond junk), the branch merged into the base, and every ignored path regenerable (node_modules, build output) with none matching policy.secrets.files (an ignored secrets file keeps the folder).
- Otherwise keep the folder and warn, as P-061 does.
- Tests: extend P-061's git test wrapper to fail early and leave tracked files, node_modules, and one case with an ignored secrets file.

**Out (explicitly not doing):**
- Changing P-061's junk-only cleanup behaviour when nothing fails.
- Removing a folder before the squash is on the base, or one git no longer lists as the plan's worktree.
- Preventing Finder from rewriting .DS_Store.

## Acceptance criteria
- [ ] When `git worktree remove --force` fails early, land deletes OS junk and retries up to 3 times with a short pause; a retry that succeeds leaves no folder and no registration.
- [ ] When retries fail and nothing can be lost (no uncommitted code or non-junk untracked files, branch merged into base, only regenerable ignored paths), land deletes the folder and runs `git worktree prune`; git no longer lists the worktree.
- [ ] When anything could be lost (uncommitted code, unmerged branch, an ignored path matching policy.secrets.files such as a dotenv file, or a non-regenerable ignored path), land keeps the folder and warns, as P-061 does.
- [ ] None of this runs before the squash is on the base, or for a path git does not list as the plan's worktree (branch plan/P-###).
- [ ] The full delete never follows a symlink (a symlink in node_modules pointing outside the folder leaves its target intact) and never deletes a path other than the plan's registered worktree; any error during the checks or the delete keeps what is left and warns.
- [ ] Regression tests in land.test.ts cover: early failure with tracked files and node_modules (full delete), a later successful retry, and the secrets-file case (folder kept).

## Approach
Move the worktree cleanup out of land.ts into a new module, `commands/work/worktree-cleanup.ts` (land.ts is already 235 lines), and extend it in stages that run only from `landed()`, i.e. only after `squash()` put the plan's commit on the base. P-061's behaviour is kept: when the first `git worktree remove --force` succeeds nothing new runs, and its junk-only delete (folder holds only OS junk and empty dirs) still applies whether or not git lists the path.

`cleanupWorktree(store, { pid, branch, base, wt })` returns `string | null` (null: removed; a string: the warning) and never throws:
1. `git worktree remove --force wt`. Success → null (as today).
2. **Retry**, only while `registered()` holds: up to 3 times, a short pause (200 ms, `Atomics.wait` on a SharedArrayBuffer), delete OS junk under wt (`sweepJunk`: a walk with `readdirSync(withFileTypes)` that unlinks only names matching `OS_JUNK` and never descends a symlink), then `git worktree remove --force wt` again. Success → null.
3. **P-061's junk-only delete**: `leftovers(wt)` empty → `rmSync` + `git worktree prune` → null (unchanged).
4. **Full delete**, only when `safeToDelete()` returns no reason: `rmSync(wt, { recursive: true, force: true })` (Node's rm unlinks symlinks, never follows them), `git worktree prune`, then `registered()` again (still listed → warning). The output says `P-###: worktree <rel> deleted after git worktree remove failed (nothing in it could be lost)`.
5. Otherwise a warning naming the first reason and up to 5 paths: `kept <rel>: <reason>; remove it by hand, then git worktree prune` (landed() prints it as P-061 does, with "(the landing stands)").

`registered()`: a fresh `git worktree list --porcelain` (not the store's cache) has an entry, not the first (main) one, whose realpath equals realpath(wt) and whose branch is exactly the plan's `branch` (plan/P-###-…).

`safeToDelete()` returns the first reason to keep, in this order; any command failure or exception is itself a reason:
- a. `registered()` holds.
- b. wt is a real directory (`lstatSync`, not a symlink), is not the main checkout, and neither the main checkout nor `git.commonDir` lies inside it (realpaths).
- c. `git -C wt rev-parse --show-toplevel` resolves to wt itself (if git already deleted the worktree's `.git` file, git would answer for the main checkout instead: keep).
- d. no uncommitted code: `git.codeChanges(wt, secrets.files)` empty **and** every entry of `git -C wt status --porcelain -z --untracked-files=all` is a tracked deletion (`D` in either column: git deletes files before it stops; their content is on the branch, which the base holds) or OS junk by basename. Any modified, added, renamed or untracked non-junk path keeps the folder, including untracked secrets files that `codeChanges` leaves out.
- e. the branch is merged or squash-merged into the base: `branchMerged(branch, base, pid)`, exported from release.ts (the test `plan.done` uses).
- f. every ignored file (`git -C wt ls-files -z --others --ignored --exclude-standard`: files, not collapsed dirs) is regenerable (OS junk, a `*.tsbuildinfo`, or under a path segment in `REGENERABLE = node_modules, dist, build, coverage, .cache, __pycache__`) and none matches `policy.secrets.files` (`globRe` from knowledge.ts on the path relative to wt, inside node_modules too).

## Design
- New `packages/crew/src/hub/commands/work/worktree-cleanup.ts`: exports `cleanupWorktree`; holds `OS_JUNK`, `REGENERABLE`, `leftovers`, `sweepJunk`, `registered`, `safeToDelete`, `pause`. Imports `git`, `globRe`, `branchMerged` and the `Store` type.
- land.ts: drops `cleanupWorktree`, `leftovers`, `OS_JUNK` and their fs imports; `landed()` calls `cleanupWorktree(store, { pid: plan.id, branch, base, wt })` before `git branch -D` (check e needs the branch). Nothing else in land.ts changes.
- release.ts: `export` on `branchMerged`; no behaviour change.
- Decision K-2026-10-26-land-records-a-landing-before-cleanup is superseded by one recording this rule.

## Tasks
- [ ] T1: In land.test.ts add the `stuck(r, fails, onRemove = "")` shim beside `finder()`: a `git` first on `r.env.PATH` whose `worktree remove` runs `onRemove` (a shell snippet; `$last` is the path), writes `.DS_Store` into the folder and exits 255 without running the real git for its first `fails` calls (99: always), then execs the real git; every `worktree remove` call appends a line to `<bin>/calls` (`finder()` gets the same counter). Write the tests of the Test plan and run them on P-061's land.ts → verify: the AC1 and AC2/AC5 tests fail (the folder stays); the AC3 keep tests already pass (kept + warning).
- [ ] T2: Create worktree-cleanup.ts by moving `cleanupWorktree`, `leftovers` and `OS_JUNK` out of land.ts unchanged; export `branchMerged` from release.ts → verify: P-061's two cleanup tests and the rest of land.test.ts pass; `npx tsc --noEmit -p .` clean.
- [ ] T3: Add `registered()`, `sweepJunk()`, `pause()` and the retry stage → verify: the AC1 test passes (3 `worktree remove` calls, no folder, no registration).
- [ ] T4: Add `safeToDelete()` (checks a–f) and the full-delete stage with the post-prune `registered()` check → verify: every test of the Test plan passes; land.ts and worktree-cleanup.ts each under 300 lines.

## Test plan
**Targeted checks:** `cd packages/crew && npx vitest run test/hub/e2e/land.test.ts` (run `npm ci --prefer-offline` in the worktree's packages/crew first; the e2e tests run the built bundle, so run `hub.build` after each source change), plus `npx tsc --noEmit -p .`.
The new tests use `hub("", { ".gitignore": <node_modules/, the dotenv file .env, *.local> })`, take one plan P-001 to accepted and run `land P-001`; each asserts exit 0, no `not landed`, and the `landed on main as` log event.
- AC1: "cleanup: a removal that fails twice succeeds on a retry (BUG-041)": `stuck(repo, 2)`; `calls` has 3 lines; folder gone; `git worktree list --porcelain` has no P-001 path; no `cleanup —` line; `pm move P-001 done` passes.
- AC2, AC5: "cleanup: a stuck worktree with tracked files and node_modules is deleted (BUG-041)": the worktree holds the tracked src/cli.ts, `node_modules/pkg/index.js`, `src/.DS_Store`, and `node_modules/.bin/tool`, a symlink to a file in a `mkdtemp` folder outside the repo; `stuck(repo, 99)`; `calls` has 4 lines; folder gone; not listed by `git worktree list`; output has `deleted after`; the symlink's target still exists; `pm move P-001 done` passes.
- AC3 (secrets): "cleanup: an ignored dotenv file keeps the stuck worktree (BUG-041)": as AC2 plus a dotenv file at the worktree root; folder and that file still exist; output has `P-001: cleanup — kept` naming it.
- AC3 (uncommitted): "cleanup: an uncommitted change keeps the stuck worktree": `onRemove` appends a line to `$last/src/cli.ts`; folder kept; warning names `src/cli.ts`.
- AC3 (unmerged): "cleanup: a branch that moved after the squash keeps the stuck worktree": `onRemove` commits a new `extra.txt` on the branch in `$last` with the real git; folder kept; warning says `not merged`.
- AC3 (non-regenerable ignored): "cleanup: an ignored non-build file keeps the stuck worktree": `notes.local` in the worktree; folder kept; warning names `notes.local`.
- AC4: P-061's "a leftover file is a warning" test also asserts `finder()`'s `calls` has exactly 1 line (real git deregistered the path, so no retry and no full delete) and `keep.txt` kept; the existing bounce and stop tests (AC3, AC4, AC10, BUG-035 "tested sha") still keep the worktree when no squash happened. Review checks `cleanupWorktree` is called only from `landed()`.
- Regression: the rest of land.test.ts green, including P-061's ".DS_Store recreated" test (junk-only delete without registration).

## Rollout & rollback
n/a — internal change to land's cleanup, shipped in the hub bundle Release rebuilds at landing; revert the squash commit to back out (P-061's junk-only behaviour returns). No migration.

## Risks & open questions
- Deleting a folder is irreversible: the "nothing can be lost" test must be conservative; when unsure, keep and warn.
- Must be sequenced after P-061, which is landing now: start from its squash on main (fast-forward the plan branch to main before `start`).
- REGENERABLE is a short fixed list; a project whose build output lives elsewhere gets keep-and-warn, the safe default. Widening it (e.g. from config) is a later plan if needed.
- The retry pauses add about 0.6 s to a landing, only when the first removal fails.

## Handoff

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-062-land-retries-and-safely-completes

## Outcome
