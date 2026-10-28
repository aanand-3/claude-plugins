---
id: BUG-056
type: bug
title: P-078 AC9: export speedup is ~2.0x, borderline vs 'at most half'
status: new
severity:
priority:
goal:
plan:
created: 2026-10-28
closed:
---

# BUG-056: P-078 AC9: export speedup is ~2.0x, borderline vs 'at most half'

## Summary
P-078 AC9: the plan worktree's built bundle `export --json` takes slightly more than half the wall time of the main checkout's `.crew/bin/crew.mjs`.

## Environment

## Steps to reproduce
1. Load average under 12 and falling (5.7 at the end).
2. Run `node .crew/drafts/qa78-ac9.mjs` from the main checkout: it times the main checkout's `export --json`, then the worktree bundle's, back to back, 2 rounds per run.

## Expected
Bundle time <= 0.50 x main time, output identical apart from generatedAt.

## Actual
Output identical every time. Main vs bundle (ms), ratio: 7143/4048 0.57; 6922/3320 0.48; 6336/3286 0.52; 6487/3255 0.50; 6380/3242 0.51; 6415/3239 0.50. Bundle is about 3.25 s against about 6.4 s, so the ratio sits at the 0.50 limit and 4 of 6 pairs are over it. The criterion's "at most half" is not met reliably.

## Evidence

## Impact

## Notes
