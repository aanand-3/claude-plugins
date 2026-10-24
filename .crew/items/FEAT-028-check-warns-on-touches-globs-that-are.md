---
id: FEAT-028
type: feat
title: check warns on touches globs that are too broad
status: triaged
priority: P2
goal: G-001
plan:
created: 2026-10-24
closed:
---

# FEAT-028: check warns on touches globs that are too broad

## Summary
P-020 claims packages/crew/test/** and .crew/bin/**; P-021 claims plugins/crew/skills/hub/**. Whole-directory globs make every plan that adds one test overlap and wait. check should flag directory-wide globs on shared dirs and the Architect should list exact files.

## User story

## Acceptance criteria
- [ ]

## Notes
- 2026-10-24: status new → triaged — priority P2
