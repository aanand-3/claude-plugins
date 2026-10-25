---
id: SPIKE-004
type: spike
title: Let test-only overlaps run in parallel instead of becoming depends_on
status: triaged
priority: P1
goal: G-007
plan: P-029
created: 2026-10-24
closed:
---

# SPIKE-004: Let test-only overlaps run in parallel instead of becoming depends_on

## Summary
packages/crew/src/hub/core/work/footprint.ts treats any touches overlap as a conflict unless one plan depends on the other, so the Architect adds depends_on even when the shared files are test files that merge cleanly (new test cases). Investigate allowing such overlaps to run concurrently and rebase at release. Replaces SPIKE-003 (same question, sections completed).

## Question
Can footprint.ts let two plans whose touches overlap only in test files run concurrently (rebasing at release) without letting real source conflicts through, and which overlaps qualify?

## Timebox
Half a day.

## Output
A recommendation recorded with `learn decision` (which overlaps qualify, how release handles the rebase), plus a FEAT item if the answer is yes.

## Findings

## Notes
Related: FEAT-025 (bundles built at release) and FEAT-028 (broad touches globs) remove the other two sources of false overlap.
- 2026-10-24: status new → triaged — priority P3
- 2026-10-25: re-triaged: priority P1
