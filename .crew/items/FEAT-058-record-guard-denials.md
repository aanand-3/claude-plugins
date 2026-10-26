---
id: FEAT-058
type: feat
title: Record guard denials
status: new
priority: P1
goal:
plan:
created: 2026-10-26
closed:
---

# FEAT-058: Record guard denials

## Summary
Guard denials only go back to the agent as hook output (guard.ts:199-200) and are never stored, so drift (agents repeatedly trying blocked actions) is invisible. Record every denial in the ledger (role, run, rule); crew.mjs audit lists them since the last audit; a role over a denial limit gets a Director entry.

## User story

## Acceptance criteria
- [ ] every guard denial appears in the ledger with role, run and rule
- [ ] `crew.mjs audit` lists the denials since the last audit, grouped by role and rule
- [ ] a role over the denial limit (set in policy.yaml) gets one Director entry in `dispatch`

## Notes
- 2026-10-26: goal hint G-008 (by Arpit Anand)
