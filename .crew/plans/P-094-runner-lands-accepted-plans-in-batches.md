---
id: P-094
title: Runner lands accepted plans in batches: dispatch and Release agent
goal: G-007
items: BUG-060
touches:
depends_on:
status: draft
branch: plan/P-094-runner-lands-accepted-plans-in-batches
pr:
created: 2026-10-28
started:
completed:
---

# P-094: Runner lands accepted plans in batches: dispatch and Release agent

## Context
P0 fix for BUG-060 (goal G-007). Dispatch (dispatch.ts:78-80) hands Release only `land P-###` for the first plan in merge order. The vendored `.crew/templates/agents/release.md` and rendered `.claude/agents/crew-release.md` lack P-079's batch Loop text, yet `agents --check` reports them up to date. Draft touches (Architect may adjust): dispatch.ts, its dispatch tests, the release.md template, and the code behind `agents --check` (agents.ts).

## Scope
Spec to be written by the Architect.

## Acceptance criteria
- [ ] TBD by the Architect (BUG-060: dispatch hands Release the batch; release agent template carries the batch Loop; agents --check detects template drift)

## Approach

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

- 2026-10-28: re-goaled none → G-007 by Arpit Anand: P0 BUG-060 fix belongs to G-007
- 2026-10-28: Draft touches for the Architect (not set in frontmatter): packages/crew/src/hub/commands/team/dispatch.ts, its dispatch tests, .crew/templates/agents/release.md, packages/crew/src/hub/commands/team/agents.ts (agents --check)

## Outcome
