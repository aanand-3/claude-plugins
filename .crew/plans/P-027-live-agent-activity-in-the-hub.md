---
id: P-027
title: Live agent activity in the hub
goal: G-007
items: FEAT-035, FEAT-019
touches:
depends_on:
status: draft
branch: plan/P-027-live-agent-activity-in-the-hub
pr:
created: 2026-10-25
started:
completed:
---

# P-027: Live agent activity in the hub

## Context
Everything an agent does shows in the hub, live: an activity --hook (PostToolUse) appends compact events to activity.jsonl, SubagentStop reports land as report events, status gets a Running now section, a watch command tails the feed, the ui server shows a live activity panel (FEAT-019, folded in), and idle runs are flagged from heartbeats.

Goal G-007 (Autonomous parallel delivery). Design reference: .crew/drafts/the-crew-team-was-pure-reef.md, section W0-c and "Order and parallelism" (W0-c is the first plan the team builds, with nothing running beside it). Draft opened by the PM; the Architect specs scope, acceptance criteria, tasks, test plan, touches and depends_on.

## Scope
**In:**
- FEAT-035, FEAT-019

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
