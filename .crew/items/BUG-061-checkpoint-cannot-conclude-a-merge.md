---
id: BUG-061
type: bug
title: checkpoint cannot conclude a merge of the base into a bounced plan branch
status: triaged
severity: S2
priority: P1
goal: G-007
plan:
created: 2026-10-28
closed:
origin: P-068
---

# BUG-061: checkpoint cannot conclude a merge of the base into a bounced plan branch

## Summary

## Environment

## Steps to reproduce
1. Land bounces a plan on a conflict with the base.
2. In the plan worktree: `git merge <base>`, resolve, `git add` the resolved files.
3. `crew.mjs checkpoint P-### --step T1`.

## Expected
The checkpoint concludes the merge: a two-parent commit `chore(P-###): update to <base>` on the plan branch; it refuses
while unmerged paths or conflict markers remain; generated files take the base's version (Release rebuilds them).

## Actual
git refuses: "cannot do a partial commit during a merge"; the checkpoint fails and the merge stays open.

## Evidence

## Impact

## Context
K-2026-10-26-b has the developer resolve land conflicts and checkpoint. But commitWork
(packages/crew/src/hub/commands/work/execution.ts) runs `git commit --only -- files`, which git refuses while
MERGE_HEAD exists, and the developer may not `git commit`. Every conflicted bounce (P-068, P-071, P-066) hits this.
Interim answer: Q-4f7783 (the developer concludes the merge with `git commit --no-edit`, merge commits only).

## Fix sketch
In commitWork, when `<worktree>/.git` MERGE_HEAD exists: refuse on unmerged paths, else stage code files and run
`git commit --no-edit -m <subject>` without `--only`. Verify with an e2e land-bounce test: conflict, merge base,
resolve, checkpoint gives a two-parent commit, the next land merges cleanly.

## Notes
- 2026-10-28: BUG-063 duplicate: same commitWork --only failure; also note the catch's git reset -q unstages the resolved merge files, fix must not reset the index during a merge
- 2026-10-28: status new → triaged — priority P1, severity S2
