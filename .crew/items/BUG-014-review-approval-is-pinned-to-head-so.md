---
id: BUG-014
type: bug
title: Review approval is pinned to HEAD, so uncommitted changes after it go unnoticed
status: new
severity:
priority:
goal: G-001
plan: P-028
created: 2026-10-24
closed:
---

# BUG-014: Review approval is pinned to HEAD, so uncommitted changes after it go unnoticed

## Summary
review --approve records the HEAD commit (P-019: 'approved (6239707)' in every round). With plan worktrees the plan's work stays uncommitted until Release, so HEAD never moves: an approval of round-2 code still looks current after round-3 changes, and the done gate can't tell. Seen in P-019, where the architect re-approved, so no harm. Possible fix: record a hash of the plan's working-tree diff with the approval and compare it at done.

## Environment
This repo, main at f07709f (after P-026); `preset: lifecycle`, `hub.plan_worktrees: true`. Code: `packages/crew/src/hub/commands/work/review.ts` (`review`, `reviewProblems`).

## Steps to reproduce
1. In a throwaway repo with `preset: lifecycle` and `hub.plan_worktrees: true`, take a plan P-001 through `start` (its worktree is `.claude/worktrees/P-001-…`) and write its code there without committing (today's normal state: nothing is committed until Release), then `move P-001 in-review` as the developer.
2. As the architect: `crew.mjs review P-001 --approve`. It prints `approved at <sha>`, where `<sha>` is the plan branch's tip, the commit the worktree was cut from, which holds none of the plan's code.
3. In the plan's worktree, change a code file after the approval (e.g. append a line to `src/a.ts`), still uncommitted.
4. As QA, record passing evidence for every criterion; then, from the main checkout, as the PM: `crew.mjs move P-001 done`.
5. Repeat steps 1–4 with no change in step 3, and run step 4's `move P-001 done` from inside the plan's worktree instead.

## Expected
- Step 4: refused with "the code changed since the approving review (…)": the approved code isn't the code being completed.
- Step 5: accepted: nothing changed since the approval.

## Actual
- Step 4: accepted. `reviewProblems` compares the branch's last code commit with the approved sha (both the fork commit, so "covered") and looks at uncommitted files only when the command runs on the plan's branch, so from the main checkout the post-approval change is invisible. The plan goes to done with code the reviewer never saw.
- Step 5: refused, the reverse error: inside the worktree every uncommitted plan file counts as "changed since the approval", so done can never pass from there (CHORE-014 item 2; P-026 hit it and was completed from the main checkout instead).

## Evidence
- P-019: every review round recorded `approved (6239707)`, the same sha, while the code changed between rounds.
- CHORE-014 note 2026-10-25: P-026's `move done` from inside its worktree was refused after a fresh approval.
- review.ts: `sha = rev-parse <branch>`; the dirty check is guarded by `git.currentBranch() === plan.branch`.

## Impact
S3: the review gate on done doesn't hold for any plan-worktree plan. Today the Architect re-reviews by habit, so no unreviewed code is known to have shipped; an unattended run (G-007) would ship it. Fixed by P-028 (WIP commits on the plan branch; the approval pins a commit that holds the code, and the gate checks the plan's worktree from any checkout).

## Notes
