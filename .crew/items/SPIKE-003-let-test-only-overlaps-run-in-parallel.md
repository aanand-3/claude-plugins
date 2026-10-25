---
id: SPIKE-003
type: spike
title: Let test-only overlaps run in parallel instead of becoming depends_on
status: duplicate
priority:
goal: G-003
plan:
created: 2026-10-24
closed: 2026-10-24
---

# SPIKE-003: Let test-only overlaps run in parallel instead of becoming depends_on

## Summary
core/work/footprint.ts treats any touches overlap as a conflict unless one plan depends on the other, so the Architect adds depends_on even when the shared files are test files that merge cleanly (new test cases). Investigate allowing such overlaps to run concurrently and rebase at release.

## Question

## Timebox

## Output

## Findings

## Notes
- 2026-10-24: status new → duplicate — Recaptured as SPIKE-004 with question, timebox and output filled
