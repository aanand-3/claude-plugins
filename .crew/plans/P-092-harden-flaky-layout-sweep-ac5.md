---
id: P-092
title: Harden flaky layout-sweep AC5 and playbook-home setup
goal: G-007
items: BUG-057
touches: packages/crew/test/tools/layout-sweep.test.ts, packages/crew/test/hub/e2e/playbook-home.test.ts
depends_on:
status: draft
branch: plan/P-092-harden-flaky-layout-sweep-ac5
pr:
created: 2026-10-28
started:
completed:
---

# P-092: Harden flaky layout-sweep AC5 and playbook-home setup

## Context
P0 per the Director (Q-9b0ef6): main's full suite fails on two timing-sensitive tests, so no plan can land. Fixes BUG-057 (layout-sweep AC5 route-label race; playbook-home 10s beforeEach timeout). Related: Q-51ab50, BUG-039/P-086, BUG-049/P-077. The mcp/view 120s beforeAll timeouts are out (P-077).

## Scope
**In:**
- To be specced by the Architect.

**Out (explicitly not doing):**
- mcp.test.ts / view.test.ts timeouts (P-077); P-086's CSS fix.

## Acceptance criteria
- [ ] To be specced by the Architect.

## Approach
Director's direction: wait for a stable route label before asserting; playbook-home hook deadline like P-077's.

## Design

## Tasks
- [ ] T1: … → verify: …

## Test plan
**Targeted checks:**
-

## Rollout & rollback

## Risks & open questions
-

## Handoff

## Progress log

## Outcome
