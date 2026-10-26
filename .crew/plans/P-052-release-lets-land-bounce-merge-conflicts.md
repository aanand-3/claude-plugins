---
id: P-052
title: Release lets land bounce merge conflicts
goal: G-007
items: BUG-036
touches:
depends_on:
status: draft
branch: plan/P-052-release-lets-land-bounce-merge-conflicts
pr:
created: 2026-10-26
started:
completed:
---

# P-052: Release lets land bounce merge conflicts

## Context
BUG-036 (G-007). Since P-051 the guard binds every role's Bash writes to `paths.write`, so Release (`.crew/drafts/**`) cannot resolve a merge conflict. The executive decided (Q-544d38, hub 6905992): option B. Release never resolves conflicts; `land` bounces a conflicting plan back to its developer (seen with P-045, hub 2f7828d). The fix is in Release's instructions and the role text, not in `paths.write`.

## Scope
**In:**
- Release's instructions (agent file and any role text the hub generates) say: on a merge conflict, let `land` bounce the plan to the developer; do not edit, abort-and-reroute by hand, or widen anything.
- Keep the plugin copy and the vendored copy of the instructions in step.

**Out (explicitly not doing):**
- Widening Release's `paths.write` (rejected by the executive).
- Changing how `land` detects or bounces a conflict.

## Acceptance criteria
- [ ] Release's instructions state that a conflict is left to `land`'s bounce to the developer and that Release never resolves one.
- [ ] No remaining Release instruction tells it to resolve or edit conflicted files.
- [ ] A test or plugin check covers the new instruction text.

## Approach
(Architect.)

## Tasks
- [ ] T1: (Architect.)

## Test plan
**Targeted checks:**
- (Architect.)

## Rollout & rollback
n/a — text only; reaches this repo through refresh-bin. Rollback: revert the commit.

## Risks & open questions
- None known.

## Handoff

## Progress log

## Outcome
