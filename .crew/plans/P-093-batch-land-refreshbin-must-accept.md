---
id: P-093
title: Batch land: refreshBin must accept the candidate worktree
goal:
items: BUG-059
touches: packages/crew/src/hub/commands/work/release.ts, packages/crew/src/hub/commands/work/land-steps.ts, packages/crew/test/hub/e2e/land-batch.test.ts, packages/crew/test/hub/e2e/land-helpers.ts
depends_on:
status: draft
branch: plan/P-093-batch-land-refreshbin-must-accept
pr:
created: 2026-10-28
started:
completed:
---

# P-093: Batch land: refreshBin must accept the candidate worktree

## Context
P0 fix for BUG-059 (goal G-007). The batch `land` added by P-079 calls `refreshBin` while rebuilding its candidate worktree (detached HEAD); `refreshBin` refuses any checkout that is not a plan's worktree, so every batch land fails where policy sets `release.refresh_bin`. Nine accepted plans wait on this: P-069, P-070, P-072, P-073, P-075, P-082, P-074, P-085, P-080.

## Scope
**In:**
- Let the land steps refresh `.crew/bin` in the candidate worktree (see BUG-059 Notes for fix direction).
- Regression batch test with `release.refresh_bin` set.

**Out (explicitly not doing):**
- Changing the `refresh-bin` command's role and plan checks, unless the Architect chooses so.

## Acceptance criteria
- [ ] To be written by the Architect.

## Approach

## Design

## Tasks
- [ ] To be written by the Architect.

## Test plan
**Targeted checks:**
- To be written by the Architect.

## Rollout & rollback

## Risks & open questions
-

## Handoff

## Progress log

## Outcome
