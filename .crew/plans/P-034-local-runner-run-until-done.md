---
id: P-034
title: Local runner: run --until-done
goal: G-007
items: FEAT-042, CHORE-005
touches:
depends_on: P-031
status: draft
branch: plan/P-034-local-runner-run-until-done
pr:
created: 2026-10-25
started:
completed:
---

# P-034: Local runner: run --until-done

## Context
A local runner: `run --until-done [--max-passes N]` spawns a /crew:team pass each time, logs each pass to the ledger, stops on runState or after two passes in a row with no ledger progress, and notifies on stop. Preflight (CHORE-005) checks the crew agents are rendered and loadable and the guard hook is installed.

Goal G-007 (Autonomous parallel delivery). Design reference: .crew/drafts/the-crew-team-was-pure-reef.md, section W2-c and "Order and parallelism" (the runner loops over W2-a's dispatch). Draft opened by the PM; the Architect specs scope, acceptance criteria, tasks, test plan, touches and depends_on.

## Scope
**In:**
- FEAT-042, CHORE-005

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
