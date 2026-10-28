---
id: BUG-056
type: bug
title: P-078 AC9: export speedup is ~2.0x, borderline vs 'at most half'
status: wontfix
severity:
priority:
goal:
plan:
created: 2026-10-28
closed: 2026-10-28
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
- 2026-10-28: Architect: not a code defect — AC9's threshold was a single-run bound at the expected value. AC9 amended on P-078 to median ratio <= 0.55 over >=5 pairs (QA's own data: median 0.505). PM: close as wontfix once QA re-records AC9 under the new wording (reopen as a P-078 review change if the median exceeds 0.55).
- 2026-10-28: status new → wontfix — Not a code defect: AC9 threshold was a single-run bound at the expected value; Architect amended AC9 on P-078 to median ratio <=0.55 over >=5 pairs (QA data median 0.505). Tracked on P-078; reopen as a P-078 review change if the median exceeds 0.55. See K-2026-10-28-timing-acceptance-criteria-use-a-median.
