---
id: P-031
title: Hub dispatch
goal: G-007
items: FEAT-040
touches:
depends_on:
status: draft
branch: plan/P-031-hub-dispatch
pr:
created: 2026-10-25
started:
completed:
---

# P-031: Hub dispatch

## Context
The hub dispatches; the PM owns each plan; the Director handles exceptions. A new `dispatch [--json]` (commands/team/, beside staff) lists one {role, ref, task} entry per actionable thing from the existing gates, capped by budgets.max_agents. goal.done moves from director to pm; /crew:team becomes the dispatcher's executor; the Director's step-by-step hand-off loop is removed.

Goal G-007 (Autonomous parallel delivery). Design reference: .crew/drafts/the-crew-team-was-pure-reef.md, section W2-a (with its dispatch table) and "Order and parallelism". Draft opened by the PM; the Architect specs scope, acceptance criteria, tasks, test plan, touches and depends_on. Note: changing goal.done's role gate in presets.ts may count as a policy change; the Architect should confirm whether it is reserved.

## Scope
**In:**
- FEAT-040

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
