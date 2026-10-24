---
id: FEAT-025
type: feat
title: Build the bundles once at release, not in every plan
status: triaged
priority: P1
goal: G-001
plan: P-023
created: 2026-10-24
closed:
---

# FEAT-025: Build the bundles once at release, not in every plan

## Summary
Every code plan must rebuild and commit plugins/crew/skills/hub/dist/*.mjs (convention K-2026-10-23-rebuild-the-bundles-and-commit-them; test/dist.test.ts enforces it), so all code plans touch the same generated files and serialize: P-022 (one-line text.ts fix) waits on P-020 only through dist/** and test/**. Plans should change source and tests only; Release rebuilds dist/ in the plan's single commit and runs the bundle check then. Removes dist/** and .crew/bin/** from touches.

## User story

## Acceptance criteria
- [ ]

## Notes
- 2026-10-24: status new → triaged — priority P1
