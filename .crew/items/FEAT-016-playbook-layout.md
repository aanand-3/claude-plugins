---
id: FEAT-016
type: feat
title: Playbook layout
status: triaged
priority: P3
goal: G-005
plan:
created: 2026-10-23
closed:
---

# FEAT-016: Playbook layout

## Summary
policy and lessons per role, pinned by ref

Slice of G-005 (Self-learning roles): Playbook layout — policy and lessons per role, pinned by ref

## User story

## Acceptance criteria
- [ ]

## Notes
- 2026-10-23: triaged from G-005 breakdown
- 2026-10-26: Architect (Q-e45ff2 follow-up): per-role policy is already read too: core/team/policy.ts:101 loads policy/roles/ROLE.yaml as the org role layer, policy/global.yaml as org, at a pinned ref via git show; store.ts knowledge() reads lessons/**.md. Remaining is small: per-role lessons scoping (lessons/ROLE/**) and a scaffold or doc page for the layout. Smaller spec than a new feature.
