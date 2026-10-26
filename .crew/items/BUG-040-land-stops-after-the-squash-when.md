---
id: BUG-040
type: bug
title: land stops after the squash when the worktree folder holds untracked OS files (.DS_Store)
status: triaged
severity: S3
priority: P2
goal: G-007
plan: P-061
created: 2026-10-26
closed:
---

# BUG-040: land stops after the squash when the worktree folder holds untracked OS files (.DS_Store)

## Summary
`land` stops after the squash merge when the plan's worktree folder holds untracked OS files such as .DS_Store, so the landing is never recorded.

## Environment
main at 9c19220 (P-057 squash), macOS, release run release:a32c5793ebe232365.

## Steps to reproduce
1. Have an accepted plan with a worktree under .claude/worktrees/.
2. Let Finder create a .DS_Store in that worktree folder.
3. Run `crew.mjs land` for the plan.

## Expected
Cleanup tolerates untracked OS files, or the landing is recorded before cleanup and a cleanup failure is reported separately.

## Actual
The squash commit lands on main, then `git worktree remove --force` fails ("Directory not empty"). land prints "not landed ... stays accepted" and exits 1, skipping the "landed" log, branch deletion and updating dependants' worktrees.

## Evidence
P-057 squash 9c19220 (full suite green, 597 tests); release run release:a32c5793ebe232365; merge-order reported P-057 as merged while the plan stayed accepted.

## Impact
Every landing on macOS with a Finder-touched worktree needs manual completion; dependants are not updated. Workaround: PM moves the plan done with a note.

## Notes
Found while completing P-057.
- 2026-10-26: status new → triaged — priority P2, severity S3
