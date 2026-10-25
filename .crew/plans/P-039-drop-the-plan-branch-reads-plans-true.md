---
id: P-039
title: Drop the plan-branch reads (plans(true))
goal: G-007
items: CHORE-018
touches:
depends_on:
status: draft
branch: plan/P-039-drop-the-plan-branch-reads-plans-true
pr:
created: 2026-10-25
started:
completed:
---

# P-039: Drop the plan-branch reads (plans(true))

## Context
Code part of CHORE-018: remove the plan-branch reads (plans(true)) once no legacy branch needs them. The hub-only parts were done by the PM on 2026-10-25: migrate --gather found nothing to gather; BUG-015 and SPIKE-003 were already closed as duplicates; K-2026-10-23-a-plan-file-on-main-can-lag-its-branch and K-2026-10-23-commit-hub-changes-before-staffing were superseded by K-2026-10-25-plan-status-lives-in-the-main-checkout and K-2026-10-25-hub-writes-are-committed-on-the-base.

Goal G-007 (Autonomous parallel delivery). Follow-up to P-026 (W0-b in .crew/drafts/the-crew-team-was-pure-reef.md). Draft opened by the PM; the Architect specs scope, acceptance criteria, tasks, test plan, touches and depends_on, and confirms no legacy plan branch still needs plans(true).

## Scope
**In:**
- CHORE-018 (code part: drop plans(true))

**Out (explicitly not doing):**
- The hub-only parts above (already done).

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
