---
id: BUG-041
type: bug
title: land's worktree cleanup gives up when git worktree remove fails early
status: new
severity:
priority: P2
goal:
plan:
created: 2026-10-26
closed:
origin: P-061
---

# BUG-041: land's worktree cleanup gives up when git worktree remove fails early

## Summary
When Release lands a plan, the plan's worktree cleanup runs `git worktree remove --force`. If that fails early (for example "Directory not empty") the cleanup gives up: git still lists the worktree and the folder stays, so the PM cannot complete the plan cleanly until someone removes both by hand. Follow-up to BUG-040 (origin P-061, whose junk-only cleanup keeps such a folder and warns).

## Environment
Local checkout, macOS (Darwin 24.6.0), main at squash 83e1c72 (P-059 landing). Finder likely had the folder open.

## Steps to reproduce
1. Land a plan (real case: P-059, squash 83e1c72) whose worktree holds node_modules and OS junk (.DS_Store files at every level).
2. While land runs `git worktree remove --force`, something (likely a Finder window) writes .DS_Store back, so the removal fails early with "Directory not empty".
3. Inspect `git worktree list` and the plan's worktree folder.

## Expected
Only after the squash is on the base, and only while git still lists that exact path as the plan's worktree (branch plan/P-###):
1. Delete OS junk in the folder and retry `git worktree remove --force` up to 3 times with a short pause.
2. A full delete only when nothing can be lost: no uncommitted code (git.codeChanges empty, no untracked files beyond junk), the branch merged into the base, and every ignored path regenerable (node_modules, build output) with none matching policy.secrets.files (an ignored secrets file such as a dotenv file keeps the folder). Then delete the folder and run `git worktree prune`.
3. Otherwise keep the folder and warn, as P-061 does.

Tests: extend P-061's git test wrapper to fail early and leave tracked files, node_modules, and one case with an ignored secrets file.

## Actual
`git worktree remove --force` failed early with "Directory not empty". Git still lists the worktree; the folder still holds tracked source (src/, package.json), node_modules and .DS_Store files at every level. P-061's junk-only cleanup keeps such a folder and warns, so the folder and its worktree registration need manual removal before `done`.

## Evidence
P-059 landing, squash 83e1c72: the "Directory not empty" failure and the leftover folder (tracked src/, package.json, node_modules, .DS_Store at every level).

## Impact
Every landing hit by this leaves a stale worktree and registration needing manual cleanup before the PM can mark the plan done. Workaround: remove the folder and run `git worktree prune` by hand. Slows autonomous delivery (G-007).

## Notes
Both this fix and P-061 change land.ts and land.test.ts, so the plan depends on P-061.
- 2026-10-26: goal hint G-007 (by Arpit Anand)
