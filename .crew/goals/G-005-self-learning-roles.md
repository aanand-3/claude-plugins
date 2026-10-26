---
id: G-005
title: Self-learning roles
status: active
priority: P3
created: 2026-10-23
completed:
integration_branch:
---

# G-005: Self-learning roles

## Outcome
Each role gets better across projects: mistakes recorded in run records become lessons in a shared playbook, lessons come
back in context when their trigger matches, and recurring mistakes strengthen or retire them.

## Scope
**In:**
- the playbook repository layout (policy/ and lessons/ per role), promotion from playbook-candidate entries, review per mode
- recurrence tracking and per-role metrics from the ledger

**Out:**
- editing agent prompts automatically (lessons graduate into them only through a reviewed plugin PR)

## Acceptance criteria
- [ ] a mistake in one sample project becomes a lesson that is recalled, and avoided, in another
- [ ] per-role metrics are reported from the ledger and fall across the golden projects

## Success metrics

## Breakdown
- FEAT-016: Playbook layout — policy and lessons per role, pinned by ref
- FEAT-017: Lesson loop — mistakes from run records become trigger → do → because candidates, promoted per mode
- FEAT-018: Recurrence and metrics — bounce rate, repeated mistakes, escalations per role

## Notes & decisions

## Progress log
- 2026-10-26: status proposed → active (approved by Arpit Anand)
