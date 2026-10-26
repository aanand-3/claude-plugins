---
id: FEAT-052
type: feat
title: Security role
status: triaged
priority: P1
goal: G-008
plan:
created: 2026-10-26
closed:
---

# FEAT-052: Security role

## Summary
template, ROLES/ACTIONS/preset entries, drafts-only writes, policy model, rendered by `agents`

Slice of G-008 (Whole-project security): Security role — template, ROLES/ACTIONS/preset entries, its own write limit, policy model, rendered by `agents`.

Security uses the drafts-only preset (`DRAFTS`, `core/team/presets.ts:6`), like QA and the PM: the guard refuses any other write (`paths.write`, `guard.ts:155-170`). Everything it produces (bugs, risk entries, audit events) goes through hub commands and is tracked.

## User story

## Acceptance criteria
- [ ] `agents --check` is clean with the security role; `.claude/agents/crew-security.md` carries `crew-role: security` and the model from `roles.security` in policy.yaml
- [ ] the Security agent can write `.crew/drafts/x.md` (Write tool and Bash redirect)
- [ ] the guard refuses the Security agent writing any other path, e.g. `docs/security/threat-model.md` or `packages/crew/src/hub/commands/team/guard.ts`

## Notes
- 2026-10-26: triaged from G-008 breakdown
- 2026-10-26: sharpened from the pre-approval review of G-008 (see the goal's Notes & decisions)
