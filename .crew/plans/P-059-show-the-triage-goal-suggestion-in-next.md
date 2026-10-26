---
id: P-059
title: Show the triage goal suggestion in next --role pm
goal: G-007
items: FEAT-051
touches:
depends_on: P-055
status: draft
branch: plan/P-059-show-the-triage-goal-suggestion-in-next
pr:
created: 2026-10-26
started:
completed:
---

# P-059: Show the triage goal suggestion in next --role pm

## Context
FEAT-051 (G-007, P3, origin P-055). P-055's capture rule keeps a filer's suggested goal in the item's Notes, and the suggestion appears only in `triage`'s output today. The PM's queue (`crew.mjs next --role pm`) should show it next to each item waiting for triage, so the PM can rank and link items without opening each one. Depends on P-055 (accepted, not yet landed), which produces the suggestion. P-021, which also touches `roles.ts`, has landed.

## Scope
**In:**
- `next --role pm` shows each untriaged item's suggested goal when its Notes carry one.
- The text matches what `triage` prints for the same suggestion.

**Out (explicitly not doing):**
- Changing how the filer records the suggestion or how `triage` links goals (P-055).
- Showing the suggestion in any other role's queue.

## Acceptance criteria
- [ ] `next --role pm` shows each untriaged item's suggested goal when its Notes carry one.
- [ ] Items without a suggestion show nothing extra.
- [ ] The text matches what `triage` prints for the same suggestion.
- [ ] A test covers an item with and without a suggestion.

## Approach

## Design

## Tasks
- [ ] T1: … → verify: …

## Test plan
**Targeted checks:**
-

## Rollout & rollback

## Risks & open questions
- Depends on P-055 landing first: the suggestion format comes from it.

## Handoff

## Progress log

## Outcome
