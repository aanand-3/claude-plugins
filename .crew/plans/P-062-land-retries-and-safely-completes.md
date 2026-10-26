---
id: P-062
title: land retries and safely completes a worktree removal that fails early
goal: G-007
items: BUG-041
touches:
depends_on: P-061
status: draft
branch: plan/P-062-land-retries-and-safely-completes
pr:
created: 2026-10-26
started:
completed:
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
- [ ] Regression tests in land.test.ts cover: early failure with tracked files and node_modules (full delete), a later successful retry, and the secrets-file case (folder kept).

## Approach
(Architect.)

## Design

## Tasks
(Architect.)

## Test plan
**Targeted checks:**
- (Architect.)

## Rollout & rollback
n/a — internal change to land's cleanup; revert the commit to back out.

## Risks & open questions
- Deleting a folder is irreversible: the "nothing can be lost" test must be conservative; when unsure, keep and warn.
- Must be sequenced after P-061, which is landing now.

## Handoff

## Progress log

## Outcome
