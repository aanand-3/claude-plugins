---
id: FEAT-065
type: feat
title: Role gate on escalate: only the Director escalates
status: triaged
priority: P1
goal: G-009
plan:
created: 2026-10-26
closed:
---

# FEAT-065: Role gate on escalate: only the Director escalates

## Summary
Only the Director may run `escalate`. Any other role gets a refusal with the hint `ask <ID> --to director "<why>"`. The executive or human may still ask `--to director` directly. Exceptions then reach the Director first and the executive sees only what the Director escalates.

## User story
As the executive, I want every exception to reach the Director first, so that I am asked only when the Director cannot resolve it.

## Acceptance criteria
- [ ] `escalate` by any role other than the Director is refused with the `ask <ID> --to director` hint.
- [ ] The Director's `escalate` and the executive's `ask --to director` still work.
- [ ] One targeted test; the full suite passes.

## Notes
Goal G-009 (Director-first exceptions). Depends on BUG-044 (roles other than director/architect never close an ask, a G-007 prerequisite): without it a role's ask to the Director cannot be answered and closed. Source: Q-24ba43, Q-73467a.
- 2026-10-26: goal hint G-009 (by Arpit Anand)
- 2026-10-26: status new → triaged — priority P1
