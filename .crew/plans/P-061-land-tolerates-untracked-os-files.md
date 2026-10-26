---
id: P-061
title: land tolerates untracked OS files in the worktree folder
goal: G-007
items: BUG-040
touches:
depends_on:
status: draft
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
- [ ] Landing a plan whose worktree folder holds an untracked .DS_Store succeeds: exit 0, "landed on <base> as <sha>" is logged, the plan can be moved done.
- [ ] The branch is deleted and dependants' worktrees are updated in that case.
- [ ] If worktree removal still fails after the squash, land records the landing first, reports the cleanup failure as a separate warning, and does not print "not landed" or leave the plan accepted.
- [ ] Regression test: fails before the fix and passes after, for a worktree with an untracked .DS_Store.

## Approach

## Design

## Tasks
- [ ] T1: … → verify: …

## Test plan
**Targeted checks:**
-

## Rollout & rollback

## Risks & open questions
- Removing the folder more aggressively could delete untracked files that matter; the fix must stay limited to the worktree of the plan just landed and OS junk, or leave the folder and warn.
- Whether to record the landing before cleanup or to make cleanup tolerant (or both) is the architect's call; the criteria accept either so long as the landing is recorded.
- Dependants' worktree updates must still run when cleanup only partly succeeds.

## Handoff

## Progress log

## Outcome
