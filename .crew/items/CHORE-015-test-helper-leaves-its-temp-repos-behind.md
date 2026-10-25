---
id: CHORE-015
type: chore
title: Test helper leaves its temp repos behind
status: triaged
priority: P3
goal:
plan:
created: 2026-10-24
closed:
---

# CHORE-015: Test helper leaves its temp repos behind

## Summary
Repo.create() in packages/crew/test/helpers/repo.ts makes a git repo in the temp dir per test and never removes it; repeated full-suite runs filled the disk (ENOSPC) while recording P-017's QA. Remove them after each test.

## Done when
- [ ]

## Notes
- 2026-10-26: status new → triaged — priority P3
