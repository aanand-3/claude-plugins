---
id: P-048
title: Notify the human when a goal waits for approval
goal: G-007
items: FEAT-045
touches: packages/crew/src/hub/commands/work/planning.ts, packages/crew/src/hub/core/team/policy.ts, packages/crew/test/hub/e2e/policy.test.ts
depends_on: P-035
status: draft
branch: plan/P-048-notify-the-human-when-a-goal-waits
pr:
created: 2026-10-25
started:
completed:
---

# P-048: Notify the human when a goal waits for approval

## Context
FEAT-045 (G-007). P-035 lists proposed goals in the human inbox but only escalations notify today. Add a goal-approval NOTIFY_ON kind emitted from `new-goal` (planning.ts), so `notify.command` can fire. Left out of P-035 to keep it off P-038/P-039's file (both are done now). For the Architect to spec.

## Scope
**In:**
- a goal-approval notify kind emitted by `new-goal`.

**Out (explicitly not doing):**
- Other notification kinds.

## Acceptance criteria
- [ ] For the Architect (the item's list is the starting point).

## Approach
Depends on P-035 (inbox and NOTIFY_ON context).

## Tasks
- [ ] T1: for the Architect → verify: …

## Test plan
**Targeted checks:**
- for the Architect.

## Rollout & rollback
n/a — off unless notify.on lists the kind.

## Risks & open questions
- A new kind may touch the registry/mcp tests (see the K-2026-10-25 gotcha on COMMANDS and tool lists).

## Handoff

## Progress log

## Outcome
