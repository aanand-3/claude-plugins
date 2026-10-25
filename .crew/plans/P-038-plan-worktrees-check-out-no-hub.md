---
id: P-038
title: Plan worktrees check out no hub documents
goal: G-007
items: CHORE-017
touches:
depends_on:
status: draft
branch: plan/P-038-plan-worktrees-check-out-no-hub
pr:
created: 2026-10-25
started:
completed:
---

# P-038: Plan worktrees check out no hub documents

## Context
A plan worktree still holds main's committed .crew documents as of its cut (read-only, stale since P-026); an agent that reads them instead of using crew.mjs sees old state. Use sparse-checkout to leave .crew/{plans,items,goals,knowledge,idea.md} out of plan worktrees.

Goal G-007 (Autonomous parallel delivery). Follow-up to P-026 (W0-b in .crew/drafts/the-crew-team-was-pure-reef.md). Draft opened by the PM; the Architect specs scope, acceptance criteria, tasks, test plan, touches and depends_on.

## Scope
**In:**
- CHORE-017

**Out (explicitly not doing):**
- To be set by the Architect.

## Acceptance criteria
- [ ] To be specified by the Architect.

## Approach

## Tasks
- [ ] T1: To be specified by the Architect.

## Test plan
**Targeted checks:**
- To be specified by the Architect.

## Rollout & rollback

## Risks & open questions
-

## Handoff

## Progress log

## Outcome
