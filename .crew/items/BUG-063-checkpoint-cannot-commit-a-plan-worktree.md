---
id: BUG-063
type: bug
title: checkpoint cannot commit a plan worktree mid-merge and unstages the resolution
status: duplicate
severity:
priority:
goal:
plan:
created: 2026-10-28
closed: 2026-10-28
origin: P-080
---

# BUG-063: checkpoint cannot commit a plan worktree mid-merge and unstages the resolution

## Summary
`checkpoint` (and anything that goes through `commitWork`) cannot commit a plan worktree that is in the middle of a merge, and its failure path unstages the merge's resolved files.

## Environment
Plan worktree of P-080 at f01ee7c, with a merge of main (d92f4a8) in progress (MERGE_HEAD set, all conflicts resolved and staged), left behind by the failed land on 2026-10-28 13:34.

## Steps to reproduce
1. In a plan worktree, start a merge of main that conflicts, resolve the conflicts and `git add` them (MERGE_HEAD stays set).
2. Run `crew.mjs checkpoint P-### --step done --note "…"`.

## Expected
The checkpoint concludes the merge (a merge commit with both parents), or refuses with a clear message and leaves the index untouched.

## Actual
`git refused the commit (chore(P-080): checkpoint done): fatal: cannot do a partial commit during a merge.` `commitWork` runs `git commit --only -- <files>`, which git refuses during a merge; its catch then runs `git reset -q -- <files>`, which unstages every resolved file (index back to HEAD, MERGE_HEAD still set). Committing the merge after that would silently drop main's side.

## Evidence
packages/crew/src/hub/commands/work/execution.ts, `commitWork`: `commit -q --only` and `reset -q -- ...files` in the catch.

## Impact
A plan sent back by a failed land with a half-done merge cannot be checkpointed or handed over by the developer (who may not git commit). Workaround: re-`git add` the files; a role that may commit has to conclude the merge.

## Notes
Found while taking over P-080.
- 2026-10-28: status new → duplicate — duplicate of BUG-061; unstaging detail noted there
