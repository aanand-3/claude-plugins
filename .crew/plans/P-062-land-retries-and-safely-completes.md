---
id: P-062
title: land retries and safely completes a worktree removal that fails early
goal: G-007
items: BUG-041
touches: packages/crew/src/hub/commands/work/land.ts, packages/crew/src/hub/commands/work/worktree-cleanup.ts, packages/crew/src/hub/commands/work/release.ts, packages/crew/test/hub/e2e/land.test.ts
depends_on: P-061
status: in-review
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
- d. no uncommitted code: `git.codeChanges(wt, secrets.files)`, less OS junk by basename and less the tracked deletions found by the status walk below (codeChanges lists deletions too), empty **and** every entry of `git -C wt status --porcelain -z --untracked-files=all` is a tracked deletion (`D` in either column: git deletes files before it stops; their content is on the branch, which the base holds) or OS junk by basename. Any modified, added, renamed or untracked non-junk path keeps the folder, including untracked secrets files that `codeChanges` leaves out.
- e. the branch is merged or squash-merged into the base: `branchMerged(branch, base, pid)`, exported from release.ts (the test `plan.done` uses).
- f. every ignored file (`git -C wt ls-files -z --others --ignored --exclude-standard`: files, not collapsed dirs) is regenerable (OS junk, a `*.tsbuildinfo`, or under a path segment in `REGENERABLE = node_modules, dist, build, coverage, .cache, __pycache__`) and none matches `policy.secrets.files` (`globRe` from knowledge.ts on the path relative to wt, inside node_modules too).

## Design
- New `packages/crew/src/hub/commands/work/worktree-cleanup.ts`: exports `cleanupWorktree`; holds `OS_JUNK`, `REGENERABLE`, `leftovers`, `sweepJunk`, `registered`, `safeToDelete`, `pause`. Imports `git`, `globRe`, `branchMerged` and the `Store` type.
- land.ts: drops `cleanupWorktree`, `leftovers`, `OS_JUNK` and their fs imports; `landed()` calls `cleanupWorktree(store, { pid: plan.id, branch, base, wt })` before `git branch -D` (check e needs the branch). Nothing else in land.ts changes.
- release.ts: `export` on `branchMerged`; no behaviour change.
- Decision K-2026-10-26-land-records-a-landing-before-cleanup is superseded by one recording this rule.

## Tasks
- [x] T1: In land.test.ts add the `stuck(r, fails, onRemove = "")` shim beside `finder()`: a `git` first on `r.env.PATH` whose `worktree remove` runs `onRemove` (a shell snippet; `$last` is the path), writes `.DS_Store` into the folder and exits 255 without running the real git for its first `fails` calls (99: always), then execs the real git; every `worktree remove` call appends a line to `<bin>/calls` (`finder()` gets the same counter). Write the tests of the Test plan and run them on P-061's land.ts → verify: the AC1 and AC2/AC5 tests fail (the folder stays); the AC3 keep tests already pass (kept + warning).
- [x] T2: Create worktree-cleanup.ts by moving `cleanupWorktree`, `leftovers` and `OS_JUNK` out of land.ts unchanged; export `branchMerged` from release.ts → verify: P-061's two cleanup tests and the rest of land.test.ts pass; `npx tsc --noEmit -p .` clean.
- [x] T3: Add `registered()`, `sweepJunk()`, `pause()` and the retry stage → verify: the AC1 test passes (3 `worktree remove` calls, no folder, no registration).
- [x] T4: Add `safeToDelete()` (checks a–f) and the full-delete stage with the post-prune `registered()` check → verify: every test of the Test plan passes; land.ts and worktree-cleanup.ts each under 300 lines.

## Test plan
**Targeted checks:** `cd packages/crew && npx vitest run test/hub/e2e/land.test.ts` (run `npm ci --prefer-offline` in the worktree's packages/crew first; the e2e tests run the built bundle, so run `hub.build` after each source change), plus `npx tsc --noEmit -p .`.
The new tests use `hub("", { ".gitignore": <node_modules/, the dotenv file .env, *.local> })`, take one plan P-001 to accepted and run `land P-001`; each asserts exit 0, no `not landed`, and the `landed on main as` log event.
- AC1: "cleanup: a removal that fails twice succeeds on a retry (BUG-041)": `stuck(repo, 2)`; `calls` has 3 lines; folder gone; `git worktree list --porcelain` has no P-001 path; no `cleanup —` line; `pm move P-001 done` passes.
- AC2, AC5: "cleanup: a stuck worktree with tracked files and node_modules is deleted (BUG-041)": the worktree holds the tracked src/cli.ts (the shim's `onRemove` deletes it, as git does before it stops, and writes `src/.DS_Store`), `node_modules/pkg/index.js`, `src/.DS_Store`, and `node_modules/.bin/tool`, a symlink to a file in a `mkdtemp` folder outside the repo; `stuck(repo, 99)`; `calls` has 4 lines; folder gone; not listed by `git worktree list`; output has `deleted after`; the symlink's target still exists; `pm move P-001 done` passes.
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

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-062: land retries and safely completes a worktree removal that fails early [in-review] tasks 4/4 — claimed by Arpit Anand (developer:acd4138b45ba70200)
- last checkpoint 2026-10-26 14:58 at done (a298f51) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- ✓ cd packages/crew && npx tsc --noEmit -p . (AC 6)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/land.test.ts -t 'BUG-041' (AC 1)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/land.test.ts -t 'cleanup' --reporter=verbose 2>&1 | grep -E 'cleanup|Tests |passed|skipped' | head -30 (AC 1)
- ✗ cd packages/crew && npx vitest run test/hub/e2e/land.test.ts -t 'cleanup' --reporter=json 2>/dev/null | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));const t=r.testResults.flatMap(x=>x.assertionResults).filter(a=>/BUG-041|stuck worktree/.test(a.fullName));console.error(t.map(a=>a.status+" "+a.title).join("\n"));process.exit(t.length>=6&&t.every(a=>a.status==="passed")?0:1)' (AC 2) — Node.js v26.5.0
- ✗ cd packages/crew && out=$(npx vitest run test/hub/e2e/land.test.ts -t cleanup --reporter=verbose 2>&1); echo "$out" | grep -E '✓|×|Tests' | tr '\n' '|' | cut -c1-900 >&2; echo "$out" | grep -qE 'Tests +[0-9]+ passed' && ! echo "$out" | grep -q 'failed' (AC 2) —  ✓ test/hub/e2e/land.test.ts > cleanup > cleanup: a .DS_Store recreated during worktree removal does not stop the landing (BUG-040) 11618ms| ✓ test/hub/e2e/land.test.ts > cleanup > cleanup: a leftover file is a warning, not a failed landing (BUG-040) 14062ms| ✓ test/hub/e2e/land.test.ts > cleanup > cleanup: a removal that fails twice succeeds on a retry (BUG-041) 11771ms| ✓ test/hub/e2e/land.test.ts > cleanup > cleanup: a stuck worktree with tracked files and node_modules is deleted (BUG-041) 11235ms| ✓ test/hub/e2e/land.test.ts > cleanup > cleanup: an ignored dotenv file keeps the stuck worktree (BUG-041) 9607ms| ✓ test/hub/e2e/land.test.ts > cleanup > cleanup: an uncommitted change keeps the stuck worktree 9435ms| ✓ test/hub/e2e/land.test.ts > cleanup > cleanup: a branch that moved after the squash keeps the stuck worktree 12316ms| ✓ test/hub/e2e/land.test.ts > cleanup
- ✓ cd packages/crew && npx vitest run test/hub/e2e/land.test.ts -t cleanup (AC 2)
- ✗ cd packages/crew && [ $(grep -c 'BUG-041\|stuck worktree' test/hub/e2e/land.test.ts) -ge 6 ] && npx vitest run test/hub/e2e/land.test.ts -t 'BUG-041|stuck worktree' --reporter=junit | grep -E 'tests="[0-9]+"' | head -3 | grep -vq 'skipped="[1-9]' (AC 2)
- ✗ cd packages/crew && grep -n 'test(\|it(' test/hub/e2e/land.test.ts | grep -i 'cleanup' | cut -c1-140; false (AC 2) — 451:  it("cleanup: an ignored non-build file keeps the stuck worktree", () => {
- ✗ cd packages/crew && npx vitest run test/hub/e2e/land.test.ts -t cleanup --reporter=verbose 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E '^ *(✓|×|↓)|Tests ' | cut -c1-60 | tr -s ' \n' ' ' ; echo; false (AC 2) —  ↓ test/hub/e2e/land.test.ts > flow > in-review → accept ↓ test/hub/e2e/land.test.ts > flow > bounce limit: a plan ↓ test/hub/e2e/land.test.ts > land > two plans: lands bot ↓ test/hub/e2e/land.test.ts > land > bounce: the same lin ↓ test/hub/e2e/land.test.ts > land > bounce: a failing fu ↓ test/hub/e2e/land.test.ts > land > bounce: the rebuilt ↓ test/hub/e2e/land.test.ts > land > an uncommitted file ↓ test/hub/e2e/land.test.ts > land > squash: the landed c ↓ test/hub/e2e/land.test.ts > land > tested sha: a branch ↓ test/hub/e2e/land.test.ts > land > tested sha: a landed ↓ test/hub/e2e/land.test.ts > land > refuses and writes n ↓ test/hub/e2e/land.test.ts > land > dependants: an open ↓ test/hub/e2e/land.test.ts > land > dependants: merged w ✓ test/hub/e2e/land.test.ts > cleanup > cleanup: a .DS_St ✓ test/hub/e2e/land.test.ts > cleanup > cleanup: a leftov ✓ test/hub/e2e/land.test.ts > cleanup > cleanup: a remova ✓ test/hub/e2e/land.test.ts > cleanup > cleanup: a stuck ✓ test/hub/e2e/land.test.ts > cleanup > cleanup: an ignor ✓ test/hub/e2e/land.test.ts > cleanup > cleanup: an uncom ✓ test/hub/e2e/land.test.ts > cleanup > cleanup: a branch ✓ test/hub/e2e/land.test.ts > cleanup > cleanup: an ignor ↓ test/hub/e2e/land.test.ts > merge-order > lists accepte ↓ test/hub/e2e/land.test.ts > next > the PM accepts, Rele ↓ test/hub/e2e/land.test.ts > next > ai-assisted without ↓ test/hub/e2e/land.test.ts > views > check reports an ac Tests 8 passed | 17 skipped (25)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/land.test.ts -t 'dotenv file keeps|uncommitted change keeps|branch that moved|non-build file keeps' (AC 3)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/land.test.ts -t 'tracked files and node_modules is deleted' (AC 2)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/land.test.ts -t 'removal that fails twice' (AC 1)
- ✓ Reviewed worktree-cleanup.ts and land.ts on the P-062 branch: cleanupWorktree is called only from landed(), after squash() returned a sha and 'landed on' was logged; retries loop on registered(at) (git lists the path on exactly branch plan/P-###); whyKeep(a) refuses when not registered; full delete only after whyKeep passes. Gap: no test for the unlisted-path case. (AC 4) (reported)
- ✓ Reviewed worktree-cleanup.ts: rmSync only on the registered wt (whyKeep b rejects a symlinked wt and any folder holding the main checkout or common dir); rmSync unlinks symlinks without following; safeToDelete try/catch turns a failed check into keep+warn and the delete is try/catch (warn). Runtime: the stuck test with node_modules/.bin/tool symlink to an outside file passed, target intact. (AC 5) (reported)
- evidence: AC1 ✓, AC2 ✓, AC3 ✓, AC4 ✓, AC5 ✓, AC6 ✓

Latest log:
- 2026-10-26: QA: AC1-AC6 verified; cleanup tests 7/7 pass; AC4 has no unlisted-path test (code-reviewed only). Tasks still 0/4 unchecked: BUG-048 precondition (also P-064 0/2, dispatch offers pm accept).
- 2026-10-26: status in-review → accepted
- 2026-10-26: status accepted → in-progress — land: hub.full_suite failed (exit 1):      15| beforeAll(() => { ·        | ^ ·      16|   execFileSync("node", [new URL("../scripts/sample-project.mjs", impor… ·      17|   graph = JSON.parse(tr("export", "--json")); · ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-062-land-retries-and-safely-completes
- 2026-10-26: status in-progress → in-review
- 2026-10-26: review: changes requested — One fault in check d (worktree-cleanup.ts whyKeep): git.codeChanges lists tracked deletions too (core/git.ts changed() keeps " D" entries), so in the real BUG-041 case, where git worktree remove deletes some tracked files before it stops, the dirty set gets those deletions and the folder is always kept as "uncommitted code"; AC2 never fires. Fix: build dirty from codeChanges less OS junk and less every path the status walk accepts as a tracked deletion (D , " D", DD) - or collect the deletions in the walk first and filter codeChanges by them. Test (land.test.ts, AC2 "a stuck worktree with tracked files and node_modules is deleted"): make onRemove also delete the tracked src/cli.ts (rm -f "$last/src/cli.ts"; then the .DS_Store write into src/ needs mkdir -p "$last/src"), so the test covers a tracked deletion; it must still end with the folder deleted. Spec Approach d and the AC2 test line are updated to say this. Both reported departures are accepted: check d accepting only "D ", " D" and "DD" is the safer reading (MD/AD hold staged content not on the branch); filtering untracked OS junk from codeChanges by basename inside worktree-cleanup.ts (git.ts unchanged) is right. Everything else matches the spec: touches respected, cleanupWorktree called only from landed(), retries only while registered, symlinks never followed, both files under 300 lines.
- 2026-10-26: status in-review → in-progress — changes requested: One fault in check d (worktree-cleanup.ts whyKeep): git.codeChanges lists tracked deletions too (core/git.ts changed() keeps " D" entries), so in the real BUG-041 case, where git worktree remove deletes some tracked files before it stops, the dirty set gets those deletions and the folder is always kept as "uncommitted code"; AC2 never fires. Fix: build dirty from codeChanges less OS junk and less every path the status walk accepts as a tracked deletion (D , " D", DD) - or collect the deletions in the walk first and filter codeChanges by them. Test (land.test.ts, AC2 "a stuck worktree with tracked files and node_modules is deleted"): make onRemove also delete the tracked src/cli.ts (rm -f "$last/src/cli.ts"; then the .DS_Store write into src/ needs mkdir -p "$last/src"), so the test covers a tracked deletion; it must still end with the folder deleted. Spec Approach d and the AC2 test line are updated to say this. Both reported departures are accepted: check d accepting only "D ", " D" and "DD" is the safer reading (MD/AD hold staged content not on the branch); filtering untracked OS junk from codeChanges by basename inside worktree-cleanup.ts (git.ts unchanged) is right. Everything else matches the spec: touches respected, cleanupWorktree called only from landed(), retries only while registered, symlinks never followed, both files under 300 lines.
- 2026-10-26: status in-progress → in-review
- 2026-10-26: QA: AC1-AC6 verified; cleanup tests 7/7 pass; AC4 has no unlisted-path test (code-reviewed only). Tasks still 0/4 unchecked: BUG-048 precondition (also P-064 0/2, dispatch offers pm accept).
- 2026-10-26: status in-review → accepted
- 2026-10-26: status accepted → in-progress — land: hub.full_suite failed (exit 1):      15| beforeAll(() => { ·        | ^ ·      16|   execFileSync("node", [new URL("../scripts/sample-project.mjs", impor… ·      17|   graph = JSON.parse(tr("export", "--json")); · ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
- 2026-10-26: status in-progress → in-review — land bounce was the view.test.ts beforeAll timeout under load (BUG-049), not P-062 code; no code change since a298f51 (approved/QA'd content unchanged); view.test.ts passes alone 14/14 in 73s
- 2026-10-26: BUG-049 overlaps: the full-suite view.test.ts beforeAll timeout under load bounced this landing; not caused by this plan's code (view passes alone). Tracked as BUG-049 (P1, G-007).

## Outcome
The worktree cleanup lives in commands/work/worktree-cleanup.ts. When `git worktree remove --force` fails and git still lists the path as the plan's worktree, land deletes OS junk and retries up to 3 times (200 ms apart). P-061's junk-only delete follows. Then comes a full delete (`rmSync`, `git worktree prune`, a check that git no longer lists the path), only when `safeToDelete()` checks a–f find nothing that could be lost. Otherwise the warning is `kept <rel>: <reason>`. A path git no longer lists keeps P-061's `left` warning, with no retry. `branchMerged` is exported from release.ts. land.test.ts passes 25/25 (6 new BUG-041 tests), and tsc is clean.
Learnings: K-2026-10-26-git-codechanges-dir-secrets-counts
