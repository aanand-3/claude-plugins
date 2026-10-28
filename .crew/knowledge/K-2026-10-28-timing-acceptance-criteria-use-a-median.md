---
id: K-2026-10-28-timing-acceptance-criteria-use-a-median
type: decision
title: Timing acceptance criteria use a median over at least five back-to-back runs with a tolerance (e.g. ratio <= 0.55 for 'about half'), never a single-run hard bound at the target
scope: .crew/plans/**
source: 
supersedes:
tier: project
created: 2026-10-28
---

# Timing acceptance criteria use a median over at least five back-to-back runs with a tolerance (e.g. ratio <= 0.55 for 'about half'), never a single-run hard bound at the target

P-078 AC9 'at most half' failed on noise: six pairs at load 6-11 gave ratios 0.48-0.57, median 0.505 (BUG-056); a single-run bound at the expected value fails about half the time
