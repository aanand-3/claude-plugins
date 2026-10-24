---
id: P-018
title: Squash-merged plans and plan-worktree follow-ups
goal: G-003
items: BUG-005, CHORE-013
touches: packages/crew/src/hub/**, packages/crew/test/**, tests/crew/test_hub.py, plugins/crew/skills/hub/**, .crew/bin/crew.mjs
depends_on:
status: done
branch: plan/P-018-squash-merged-plans-and-plan-worktree
pr:
created: 2026-10-24
started: 2026-10-24
completed: 2026-10-24
assignee: developer
---

# P-018: Squash-merged plans and plan-worktree follow-ups

## Context
Delivers BUG-005 and CHORE-013 under G-003 (Agent team), the follow-ups to P-004 (shared plan worktrees, #9).
- **BUG-005.** `merge-order` decides "merged" with `git merge-base --is-ancestor branch base`. This repo squash-merges every plan, so that is never true: P-001, P-014, P-015 and P-016 are still listed under merge.
- **CHORE-013.** The non-blocking findings of P-004's architect review: the store overlay picks a winner by worktree order and lets a worktree's stale uncommitted copy hide a newer committed one; a plan whose worktree is removed before Release commits disappears without a word; `new-plan` linking an item that lives in another plan's worktree saves it there; auto-checkpoints never fire for plan worktrees (the hook runs from the main checkout); `overlay()` runs `git status` per worktree on every call; `assign` on a worktree-only plan is untested; the guard rewrites any command line that mentions `crew.mjs`, even as a plain argument (`ls …/crew.mjs`, `cmp .crew/bin/crew.mjs …`).
- **Goal close.** SKILL.md says to commit `G-### done` and the new focus on main; the director template says the change travels with the next plan. The executive chose "travels with the next plan" (2026-10-24). `focus` edits `.crew/idea.md`, which `new-plan` does not carry today.

## Scope
**In:**
- `merge-order` counts a plan as merged when a commit on the base branch since the merge-base is its squash (subject `P-###: …` or `<type>(P-###): …`) and holds the branch tip's version of every file the branch changed.
- Overlay: when several plan worktrees change the same file, the most recently written copy wins (not the worktree order); a worktree's uncommitted copy loses to the base checkout's committed copy when that file changed on this checkout's branch after the worktree's copy was written. The worktrees' `git status` is read once per Store.
- `new-plan` carries an uncommitted `.crew/idea.md` (the focus) like items and goals, and the hub reads the idea through the overlay; SKILL.md's goal-close step says the change travels with the next plan.
- `new-plan --items` moves an item that lives in another plan's worktree into the new plan's worktree, restoring it in the other one.
- `check` hints when a plan branch has no worktree and no plan file anywhere (its worktree was removed before Release committed).
- `checkpoint --auto` off a plan branch checkpoints each in-progress plan that has a plan worktree.
- The guard injects `--as/--run-id` only into shell segments that run the hub, not ones where `crew.mjs` is an operand of a file or text command.
- The worktree pytest exercises `assign` on a worktree-only plan.

**Out (explicitly not doing):**
- Merge conflicts between two plans that change the same hub file: the overlay shows one copy; the second merge resolves them.
- Detecting squash-merges whose commit subject names no plan ID.
- Changing how Release commits or merges.

## Acceptance criteria
- [ ] `merge-order` lists a squash-merged plan (base commit `P-###: …` with the branch's changes) under merged, keeps a branch with commits after its squash under merge, and a commit that only mentions the plan ID (`chore(P-###): QA evidence`) doesn't count; in this repo P-001, P-014, P-015 and P-016 show as merged (vitest + `merge-order` here).
- [ ] With an item changed in two plan worktrees, every command shows the newer copy whatever the worktree order; a worktree's uncommitted copy older than a commit on main that changed the file shows main's copy (vitest).
- [ ] `focus` on main followed by `new-plan` carries `.crew/idea.md` into the plan worktree, leaves main's copy as committed, and `context`/`status` from main still show the new focus; SKILL.md's goal-close step says it travels with the next plan (vitest + git grep).
- [ ] `new-plan --items` on an item living in another plan's worktree writes it into the new plan's worktree and restores it in the other (vitest).
- [ ] `check` hints when a plan branch has no worktree and no plan file anywhere (vitest).
- [ ] `checkpoint --auto` run from main records a checkpoint for an in-progress plan in its worktree, and records nothing the second time with no change (vitest).
- [ ] The guard leaves `ls .crew/bin/crew.mjs`, `cmp .crew/bin/crew.mjs x` and `git diff -- .crew/bin/crew.mjs` unchanged, still injects into `node .crew/bin/crew.mjs …` and `cd x && node .crew/bin/crew.mjs …`, and still refuses `--as` for another role anywhere (vitest).
- [ ] `test_plan_worktrees_are_seen_and_edited_from_main` assigns the worktree-only plan and finds the assignment in the worktree's copy (pytest).
- [ ] The overlay reads each worktree's `git status` once per Store (vitest, counting git calls with a git wrapper on PATH).

## Approach
- **Squash detection** (`core/git.ts`, `release.ts`): `git log --format=%H%x09%s <merge-base>..<base>`, keep subjects matching `^(\w+\(P-###\)|P-###):`, then a candidate counts when `git diff --quiet <branch> <candidate> -- <files the branch changed since the merge-base>`. Content proves it; the subject only narrows the search. A branch tip that moved after the squash differs, so it stays unmerged. Checked against this repo: all four plans' branch files match their squash commits.
- **Overlay** (`core/store.ts`): collect candidates per file across worktrees with their mtime; keep the newest. Before using a worktree's copy, if `git log -1 --format=%ct HEAD -- f` on this checkout is newer than the copy's mtime and the file differs from the worktree's HEAD copy, keep this checkout's. Dirty lists cached per Store, cleared by `forgetWorktrees()` and when a document is saved.
- **Idea** (`planning.ts` `carryHub`, `store.idea()`): carry `idea.md`; `idea()` takes a plan worktree's uncommitted copy by the same rule.
- **Item in another worktree** (`planning.ts`): when the item's path is under another worktree, write it to the new worktree and restore the file there from that worktree's HEAD.
- **Lost worktree** (`checks.ts`): local `plan/P-###` branches with no plan worktree and no plan doc in `plans(true)`.
- **Auto-checkpoint** (`execution.ts`): with `--auto` and no plan on this branch, loop over plan worktrees whose plan is in-progress; the fingerprint dedup applies per plan.
- **Guard** (`guard.ts`): rewrite per shell segment; skip a segment whose command (after env assignments) is a file or text tool (`ls`, `cat`, `cmp`, `diff`, `git`, `grep`, `head`, `tail`, `wc`, `cp`, `mv`, `stat`, …). Identity refusals still read the whole command.
- Rebuild dist, re-vendor `.crew/bin/crew.mjs`.

## Tasks
- [x] T1: squash-merge detection in `merge-order` with vitest cases → verify: `cd packages/crew && npx vitest run test/hub-worktrees.test.ts -t merge_order`
- [x] T2: overlay newest-wins, main's newer commit wins, git status cached per Store → verify: `cd packages/crew && npx vitest run test/hub-worktrees.test.ts -t overlay`
- [x] T3: `new-plan` carries the idea; `idea()` overlays; SKILL.md goal close → verify: `cd packages/crew && npx vitest run test/hub-worktrees.test.ts -t focus_travels`
- [x] T4: `new-plan --items` moves an item out of another plan's worktree → verify: `cd packages/crew && npx vitest run test/hub-worktrees.test.ts -t other_worktree`
- [x] T5: `check` hint for a plan whose worktree was removed → verify: `cd packages/crew && npx vitest run test/hub-worktrees.test.ts -t lost_worktree`
- [x] T6: `checkpoint --auto` from main covers plan worktrees → verify: `cd packages/crew && npx vitest run test/hub-worktrees.test.ts -t auto_checkpoint`
- [x] T7: guard injects only into segments that run the hub → verify: `cd packages/crew && npx vitest run test/hub-worktrees.test.ts -t guard`
- [x] T8: `assign` in the worktree test → verify: `uvx --with pyyaml pytest tests/crew/test_hub.py -q -k plan_worktrees_are_seen`
- [x] T9: rebuild dist and re-vendor `.crew/bin/crew.mjs` → verify: `cmp .crew/bin/crew.mjs plugins/crew/skills/hub/dist/crew.mjs`

## Test plan
**Targeted checks:**
- AC1: vitest `test/hub-worktrees.test.ts -t merge_order` (squash commit, moved branch, mention-only commit); `node .crew/bin/crew.mjs merge-order` in this repo lists P-001, P-014, P-015, P-016 as merged.
- AC2: vitest `test/hub-worktrees.test.ts -t overlay`.
- AC3: vitest `test/hub-worktrees.test.ts -t focus_travels`; `git grep -n "travels with the next plan" plugins/crew/skills/hub/SKILL.md`.
- AC4: vitest `test/hub-worktrees.test.ts -t other_worktree`.
- AC5: vitest `test/hub-worktrees.test.ts -t lost_worktree`.
- AC6: vitest `test/hub-worktrees.test.ts -t auto_checkpoint`.
- AC7: vitest `test/hub-worktrees.test.ts -t guard`.
- AC8: pytest `-k plan_worktrees_are_seen`.
- AC9: vitest `test/hub-worktrees.test.ts -t git_status_once`.

**Full suite (before merge, and in CI):** `hub.full_suite` in `.crew/config.yaml`.

- New regression tests are vitest (`packages/crew/test/hub-worktrees.test.ts`), not pytest: P-017 (in progress) ports `tests/crew` to vitest and deletes it. Only the one-line `assign` addition goes into `test_hub.py`, as asked.

## Rollout & rollback
n/a — hub CLI only; the vendored `.crew/bin/crew.mjs` updates with the merge. Rollback: revert the commit.

## Risks & open questions
- mtime decides between worktrees: a `touch` or a checkout can reorder copies. Acceptable: it only matters when two plans edit the same hub file, which already needs a merge resolution.
- A squash commit whose subject was edited to drop the plan ID isn't detected (out of scope); merge-order then lists it, as today.

## Handoff

_Generated 2026-10-24 by `crew.mjs handoff` from the ledger._

- P-018: Squash-merged plans and plan-worktree follow-ups [in-review] tasks 9/9 — claimed by Arpit Anand (developer:p018-session)
- last checkpoint 2026-10-24 10:58 at done (ae9c4c6) by Arpit Anand; since then 0 commit(s), 17 uncommitted file(s): .crew/bin/crew.mjs, packages/crew/src/hub/commands/team/guard.ts, packages/crew/src/hub/commands/views/checks.ts, packages/crew/src/hub/commands/work/execution.ts, packages/crew/src/hub/commands/work/planning.ts, packages/crew/src/hub/commands/work/release.ts, packages/crew/src/hub/core/git.ts, packages/crew/src/hub/core/store.ts
- ✓ cd packages/crew && npx vitest run test/hub-worktrees.test.ts
- ✓ cd packages/crew && npx vitest run test/hub-worktrees.test.ts -t merge_order (AC 1)
- ✓ cd packages/crew && npx vitest run test/hub-worktrees.test.ts -t overlay (AC 2)
- ✓ cd packages/crew && npx vitest run test/hub-worktrees.test.ts -t focus_travels (AC 3)
- ✓ git grep -n "travels with the next plan" plugins/crew/skills/hub/SKILL.md (AC 3)
- ✓ cd packages/crew && npx vitest run test/hub-worktrees.test.ts -t other_worktree (AC 4)
- ✓ cd packages/crew && npx vitest run test/hub-worktrees.test.ts -t lost_worktree (AC 5)
- ✓ cd packages/crew && npx vitest run test/hub-worktrees.test.ts -t auto_checkpoint (AC 6)
- ✓ cd packages/crew && npx vitest run test/hub-worktrees.test.ts -t guard (AC 7)
- ✓ cd packages/crew && npx vitest run test/hub-worktrees.test.ts -t git_status_once (AC 9)
- ✓ uvx --with pyyaml pytest tests/crew/test_hub.py -q -k plan_worktrees_are_seen (AC 8)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins && node .claude/worktrees/P-018-squash-merged-plans-and-plan-worktree/.crew/bin/crew.mjs --as qa --run-id qa:a41b7fc0f2bdb72d4 merge-order | grep -c -E '^merged: P-0(01|14|15|16) ' | grep -qx 4 (AC 1)
- evidence: AC1 ✓, AC2 ✓, AC3 ✓, AC4 ✓, AC5 ✓, AC6 ✓, AC7 ✓, AC8 ✓, AC9 ✓

Latest log:
- 2026-10-24: review: changes requested — Guard identity regression (packages/crew/src/hub/commands/team/guard.ts runsHub ~l.51-55, decide ~l.126-128): segments split only on && || ; | so a segment whose first word is in OPERAND_OF hides a hub run later in it, and the command runs with NO injected identity (role-less: human-attributed ledger entries, role gates skipped). The old bundle injected identity in all four; the new one returns no decision: (1) newline: 'ls x<NL>node .crew/bin/crew.mjs --as architect --run-id architect:a9744985140cab6bf move P-001 done' (realistic for multi-line Bash); (2) 'echo "$(node .crew/bin/crew.mjs --as architect --run-id architect:a9744985140cab6bf move P-001 done)"'; (3) 'ls x & node .crew/bin/crew.mjs --as architect --run-id architect:a9744985140cab6bf ...'; (4) 'find . -exec node .crew/bin/crew.mjs --as architect --run-id architect:a9744985140cab6bf ... \;' (likewise awk system(), git -c alias). Repro: throwaway repo with .claude/agents/crew-qa.md (crew-role: qa); pipe {tool_name:Bash,tool_input:{command},agent_type:crew-qa,agent_id:a1} into 'node dist/crew.mjs --as architect --run-id architect:a9744985140cab6bf guard'. Fix: fail closed - skip injection only for a segment that is provably an operand use (also split on newlines and a single &; never skip a segment containing $( , backticks, <( , -exec, xargs or system), or inject wherever crew.mjs --as architect --run-id architect:a9744985140cab6bf is executed (after 'node ' or at command position) whatever the segment head. Add these four cases to the guard vitest.
- 2026-10-24: status in-review → in-progress — changes requested: Guard identity regression (packages/crew/src/hub/commands/team/guard.ts runsHub ~l.51-55, decide ~l.126-128): segments split only on && || ; | so a segment whose first word is in OPERAND_OF hides a hub run later in it, and the command runs with NO injected identity (role-less: human-attributed ledger entries, role gates skipped). The old bundle injected identity in all four; the new one returns no decision: (1) newline: 'ls x<NL>node .crew/bin/crew.mjs --as architect --run-id architect:a9744985140cab6bf move P-001 done' (realistic for multi-line Bash); (2) 'echo "$(node .crew/bin/crew.mjs --as architect --run-id architect:a9744985140cab6bf move P-001 done)"'; (3) 'ls x & node .crew/bin/crew.mjs --as architect --run-id architect:a9744985140cab6bf ...'; (4) 'find . -exec node .crew/bin/crew.mjs --as architect --run-id architect:a9744985140cab6bf ... \;' (likewise awk system(), git -c alias). Repro: throwaway repo with .claude/agents/crew-qa.md (crew-role: qa); pipe {tool_name:Bash,tool_input:{command},agent_type:crew-qa,agent_id:a1} into 'node dist/crew.mjs --as architect --run-id architect:a9744985140cab6bf guard'. Fix: fail closed - skip injection only for a segment that is provably an operand use (also split on newlines and a single &; never skip a segment containing $( , backticks, <( , -exec, xargs or system), or inject wherever crew.mjs --as architect --run-id architect:a9744985140cab6bf is executed (after 'node ' or at command position) whatever the segment head. Add these four cases to the guard vitest.
- 2026-10-24: review fixes: the guard fails closed (splits on newlines and &, injects into any segment that could run a program: $(, backticks, <(, -exec, xargs, system, node/sh/bash/eval); WorktreeCopies skips a vanished path instead of throwing; overlay moved to core/work/worktrees.ts (store.ts under 300 lines); regression cases for the four bypasses

## Progress log

- 2026-10-24: status draft → ready
- 2026-10-24: assigned to the developer role
- 2026-10-24: status ready → in-progress — branch plan/P-018-squash-merged-plans-and-plan-worktree
- 2026-10-24: status in-progress → in-review
- 2026-10-24: review: changes requested — Guard identity regression (packages/crew/src/hub/commands/team/guard.ts runsHub ~l.51-55, decide ~l.126-128): segments split only on && || ; | so a segment whose first word is in OPERAND_OF hides a hub run later in it, and the command runs with NO injected identity (role-less: human-attributed ledger entries, role gates skipped). The old bundle injected identity in all four; the new one returns no decision: (1) newline: 'ls x<NL>node .crew/bin/crew.mjs --as architect --run-id architect:a9744985140cab6bf move P-001 done' (realistic for multi-line Bash); (2) 'echo "$(node .crew/bin/crew.mjs --as architect --run-id architect:a9744985140cab6bf move P-001 done)"'; (3) 'ls x & node .crew/bin/crew.mjs --as architect --run-id architect:a9744985140cab6bf ...'; (4) 'find . -exec node .crew/bin/crew.mjs --as architect --run-id architect:a9744985140cab6bf ... \;' (likewise awk system(), git -c alias). Repro: throwaway repo with .claude/agents/crew-qa.md (crew-role: qa); pipe {tool_name:Bash,tool_input:{command},agent_type:crew-qa,agent_id:a1} into 'node dist/crew.mjs --as architect --run-id architect:a9744985140cab6bf guard'. Fix: fail closed - skip injection only for a segment that is provably an operand use (also split on newlines and a single &; never skip a segment containing $( , backticks, <( , -exec, xargs or system), or inject wherever crew.mjs --as architect --run-id architect:a9744985140cab6bf is executed (after 'node ' or at command position) whatever the segment head. Add these four cases to the guard vitest.
- 2026-10-24: status in-review → in-progress — changes requested: Guard identity regression (packages/crew/src/hub/commands/team/guard.ts runsHub ~l.51-55, decide ~l.126-128): segments split only on && || ; | so a segment whose first word is in OPERAND_OF hides a hub run later in it, and the command runs with NO injected identity (role-less: human-attributed ledger entries, role gates skipped). The old bundle injected identity in all four; the new one returns no decision: (1) newline: 'ls x<NL>node .crew/bin/crew.mjs --as architect --run-id architect:a9744985140cab6bf move P-001 done' (realistic for multi-line Bash); (2) 'echo "$(node .crew/bin/crew.mjs --as architect --run-id architect:a9744985140cab6bf move P-001 done)"'; (3) 'ls x & node .crew/bin/crew.mjs --as architect --run-id architect:a9744985140cab6bf ...'; (4) 'find . -exec node .crew/bin/crew.mjs --as architect --run-id architect:a9744985140cab6bf ... \;' (likewise awk system(), git -c alias). Repro: throwaway repo with .claude/agents/crew-qa.md (crew-role: qa); pipe {tool_name:Bash,tool_input:{command},agent_type:crew-qa,agent_id:a1} into 'node dist/crew.mjs --as architect --run-id architect:a9744985140cab6bf guard'. Fix: fail closed - skip injection only for a segment that is provably an operand use (also split on newlines and a single &; never skip a segment containing $( , backticks, <( , -exec, xargs or system), or inject wherever crew.mjs --as architect --run-id architect:a9744985140cab6bf is executed (after 'node ' or at command position) whatever the segment head. Add these four cases to the guard vitest.
- 2026-10-24: review fixes: the guard fails closed (splits on newlines and &, injects into any segment that could run a program: $(, backticks, <(, -exec, xargs, system, node/sh/bash/eval); WorktreeCopies skips a vanished path instead of throwing; overlay moved to core/work/worktrees.ts (store.ts under 300 lines); regression cases for the four bypasses
- 2026-10-24: status in-progress → in-review
- 2026-10-24: status in-review → done

## Outcome
Shipped:
- `merge-order` detects squash merges (`git.squashMerge`: a base commit naming the plan that holds the branch tip's version of every file the branch changed); in this repo P-001, P-014, P-015 and P-016 now show as merged.
- Overlay: newest uncommitted copy wins across plan worktrees; a newer commit on this checkout beats an older worktree copy; one `git status` per checkout per Store (cleared on save and `forgetWorktrees`).
- Goal close travels with the next plan (executive's call): `new-plan` carries `.crew/idea.md`, `idea()` reads it through the overlay, SKILL.md says so.
- `new-plan --items` moves an item out of another plan's worktree; `check` hints at a plan branch whose worktree was removed before Release committed; `checkpoint --auto` from main checkpoints in-progress plan worktrees; the guard injects identity only into segments that run the hub.
- Tests: `packages/crew/test/hub-worktrees.test.ts` (9 cases, all failing on the pre-fix bundle), plus `assign` in `test_plan_worktrees_are_seen_and_edited_from_main`.
Deviations: new regression tests are vitest, not pytest, because P-017 is porting `tests/crew` to vitest and deleting it; P-017 has to carry the two `assign` lines in its port.
Follow-ups: none.
Learnings: none
