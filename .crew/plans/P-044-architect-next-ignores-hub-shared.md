---
id: P-044
title: Architect next ignores hub.shared overlaps
goal: G-007
items: BUG-030
touches: packages/crew/src/hub/commands/team/roles.ts, packages/crew/test/hub/e2e/**
depends_on:
status: draft
branch: plan/P-044-architect-next-ignores-hub-shared
pr:
created: 2026-10-25
started:
completed:
---

# P-044: Architect next ignores hub.shared overlaps

## Context
BUG-030 (G-007): roles.ts:93 calls overlapping(p, v.plans) without sharedGlobs(v.store), so the architect's next flags overlaps that staffing ignores.

## Scope
**In:**
- Pass sharedGlobs(v.store) as the third argument in roles.ts.
- Regression test.

**Out (explicitly not doing):**
- Changing staffing or footprint.ts.

## Acceptance criteria
- [ ] Two ready plans sharing only a hub.shared file produce no overlap flag in the architect's next.
- [ ] Regression test (e2e) covers it.

## Approach
Architect to spec.

## Tasks
- [ ] T1: pass sharedGlobs → verify: e2e test

## Test plan
E2E with two ready plans meeting only on a hub.shared file.

## Rollout & rollback

## Risks & open questions
-

## Handoff

## Progress log

## Outcome
