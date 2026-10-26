---
id: P-054
title: suite --ref runs in the plan's worktree
goal: G-007
items: BUG-035
touches:
depends_on:
status: draft
branch: plan/P-054-suite-ref-runs-in-the-plans-worktree
pr:
created: 2026-10-26
started:
completed:
---

# P-054: suite --ref runs in the plan's worktree

## Context
BUG-035 (G-007, S2/P1). `suite --ref P-###` runs `hub.full_suite` in the caller's checkout, so from the main checkout it tests main, not the plan, yet records a green suite for the plan. P-049 merged (b249d20) on such a run; nothing in the hub reads the record before a merge, and the record carries no sha. The quality gate can pass without testing the plan.

## Scope
**In:**
- `suite --ref P-###` runs in that plan's worktree, or refuses when the plan has none; without `--ref` it keeps the caller's checkout.
- The suite record carries the tested HEAD sha and branch.
- The merge step accepts only a green record for the plan's ref, its worktree and the plan branch's current sha.
- Release's instructions drop "in the plan's worktree" as a manual precondition once enforced.

**Out (explicitly not doing):**
- Changing what `hub.full_suite` runs, or the suite slot and queueing.

## Acceptance criteria
- [ ] `suite --ref P-###` from the main checkout runs with cwd in the plan's worktree and records its sha and branch.
- [ ] `suite --ref P-###` for a plan with no worktree refuses with a clear message.
- [ ] A green record from the wrong worktree, or for a stale sha, is not accepted by the merge gate.
- [ ] Regression test fails before the fix and passes after.

## Approach
(Architect.)

## Tasks
- [ ] T1: (Architect.)

## Test plan
**Targeted checks:**
- (Architect.)

## Rollout & rollback
n/a — internal hub change; ships in the bundle. Rollback: revert the commit.

## Risks & open questions
- Where the gate lives (`land` or a check before Release's merge) is the architect's call.

## Handoff

## Progress log

## Outcome
