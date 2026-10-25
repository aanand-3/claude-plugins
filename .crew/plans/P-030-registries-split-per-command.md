---
id: P-030
title: Registries split per command
goal: G-007
items: FEAT-039
touches:
depends_on:
status: draft
branch: plan/P-030-registries-split-per-command
pr:
created: 2026-10-25
started:
completed:
---

# P-030: Registries split per command

## Context
Split the registries: each command module registers its own CLI command and MCP tool, cli.ts and mcp.ts load them, so a new command touches only its own file. The command reference in hub/SKILL.md is generated from the modules.

Goal G-007 (Autonomous parallel delivery). Design reference: .crew/drafts/the-crew-team-was-pure-reef.md, section W1-e and "Order and parallelism". Draft opened by the PM; the Architect specs scope, acceptance criteria, tasks, test plan, touches and depends_on.

## Scope
**In:**
- FEAT-039

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
