---
id: FEAT-028
type: feat
title: check warns on touches globs that are too broad
status: done
priority: P1
goal: G-007
plan: P-029
created: 2026-10-24
closed: 2026-10-26
completed: 2026-10-26
---

# FEAT-028: check warns on touches globs that are too broad

## Summary
P-020 claims packages/crew/test/** and .crew/bin/**; P-021 claims plugins/crew/skills/hub/**. Whole-directory globs make every plan that adds one test overlap and wait. check should flag directory-wide globs on shared dirs and the Architect should list exact files.

## User story

## Acceptance criteria
- [ ]

## Notes
- 2026-10-24: status new → triaged — priority P2
- 2026-10-25: re-triaged: priority P1
- 2026-10-26: status triaged → done — delivered by P-029
