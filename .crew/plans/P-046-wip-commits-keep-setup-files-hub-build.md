---
id: P-046
title: WIP commits keep setup files; hub build removes its temp dirs
goal: G-007
items: CHORE-023, CHORE-024
touches: packages/crew/src/hub/core/git.ts, packages/crew/build.mjs, packages/crew/test/hub/e2e/wip-commits.test.ts
depends_on:
status: draft
branch: plan/P-046-wip-commits-keep-setup-files-hub-build
pr:
created: 2026-10-25
started:
completed:
---

# P-046: WIP commits keep setup files; hub build removes its temp dirs

## Context
Two small, independent chores in G-007, grouped to save a plan cycle.
- CHORE-023: `git.codeChanges` (packages/crew/src/hub/core/git.ts) drops every `.crew/` path, so a plan's change to `.crew/config.yaml` or `.crew/templates/**` is never WIP-committed and is invisible to the review gate. Only the hub's state paths (STATE_PATHS) should be excluded. Add a case in test/hub/e2e/wip-commits.test.ts.
- CHORE-024: `bundlePage` in packages/crew/build.mjs makes a `hub-ui-*` mkdtemp dir per vite build and never removes it. Remove it in a finally.
For the Architect to spec.

## Scope
**In:**
- the two fixes above.

**Out (explicitly not doing):**
- Anything else in git.ts or build.mjs.

## Acceptance criteria
- [ ] For the Architect (the items' Done-when lists are the starting point).

## Approach
Independent files; the Architect may split if the review is easier that way.

## Tasks
- [ ] T1: for the Architect → verify: …

## Test plan
**Targeted checks:**
- for the Architect.

## Rollout & rollback
n/a — internal.

## Risks & open questions
- Overlap: wip-commits.test.ts is in P-032's touches; schedule after P-032 or keep this plan's edit to a new test case.

## Handoff

## Progress log

## Outcome
