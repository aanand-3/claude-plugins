---
id: FEAT-050
type: feat
title: Guard labels every agent command
status: triaged
priority: P2
goal: G-007
plan:
created: 2026-10-26
closed:
---

# FEAT-050: Guard labels every agent command

## Summary
The PreToolUse guard already sees and rewrites every crew agent's Bash call, and the call includes its `description`. Make the guard (1) set each agent command's description to `<role> <plan>: <what>` (for example `qa P-054: build + suite/land tests`), taking "what" from the agent's own description or deriving it from the command (checkpoint P-###, land P-###, vitest run ...); (2) refuse a long or background Bash call with no description, with a one-line fix, as it already refuses a hub path in a shell variable; (3) show the same label in the hub's live activity feed. This is built-in guard behaviour, not a policy permission.

## User story
As the executive watching agents live (G-007's outcome), I want every agent command to carry a readable label, so that background tasks no longer show raw commands like `W=/Users/...; node ... checkpoint ...` that I cannot read.

## Acceptance criteria
- [ ] Every Bash call by a crew agent leaves the guard with a description of the form `<role> <plan>: <what>`.
- [ ] When the agent gave a description, "what" comes from it; otherwise the guard derives it from the command (checkpoint P-###, land P-###, vitest run ...).
- [ ] A long or background Bash call with no description is refused with a one-line fix.
- [ ] The hub's live activity feed shows the same label for each command.
- [ ] Tests cover the labelling, the derivation, the refusal and the feed.

## Notes
- Queue after P-052 and FEAT-048.
- Not a policy permission: no `.crew/policy.yaml` change.
- Approved in principle by the executive via the coordinator, 2026-10-26 ("yes, lets do it").
- The architect decides what counts as "long" and which commands the derivation recognises.
- 2026-10-26: status new → triaged — priority P2
