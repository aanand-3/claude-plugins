---
id: P-056
title: Guard labels every agent command
goal: G-007
items: FEAT-050
touches:
depends_on:
status: draft
branch: plan/P-056-guard-labels-every-agent-command
pr:
created: 2026-10-26
started:
completed:
---

# P-056: Guard labels every agent command

## Context
FEAT-050 (G-007). The executive watches agents live (G-007's outcome), but background tasks show raw commands like `W=/Users/...; node ... checkpoint ...` that cannot be read. The PreToolUse guard already sees and rewrites every crew agent's Bash call, including its `description`, so it can label each command. This is built-in guard behaviour, not a policy permission.

## Scope
**In:**
- The guard sets each agent command's description to `<role> <plan>: <what>` (for example `qa P-054: build + suite/land tests`); "what" comes from the agent's own description, or is derived from the command (checkpoint P-###, land P-###, vitest run ...).
- A long or background Bash call with no description is refused with a one-line fix, as a hub path in a shell variable already is.
- The hub's live activity feed shows the same label.

**Out (explicitly not doing):**
- Any `.crew/policy.yaml` permission or setting.
- Labelling calls from non-crew sessions.

## Acceptance criteria
- [ ] Every Bash call by a crew agent leaves the guard with a description of the form `<role> <plan>: <what>`.
- [ ] "What" comes from the agent's description when given, otherwise it is derived from the command.
- [ ] A long or background Bash call with no description is refused with a one-line fix.
- [ ] The live activity feed shows the same label for each command.
- [ ] Tests cover the labelling, the derivation, the refusal and the feed.

## Approach
(Architect: what counts as "long", which commands the derivation recognises.)

## Tasks
- [ ] T1: (Architect.)

## Test plan
**Targeted checks:**
- (Architect.)

## Rollout & rollback
Ships in the bundle; reaches this repo through refresh-bin. Rollback: revert the commit.

## Risks & open questions
- The refusal could block agent calls that lack a description; the one-line fix must be clear.
- Queued after P-052 (landed) and FEAT-048 (P-055).

## Handoff

## Progress log

## Outcome
