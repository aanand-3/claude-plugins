---
id: K-2026-10-28-comparing-two-crew-mjs-export-json-runs
type: gotcha
title: Comparing two 'crew.mjs export --json' runs on the main checkout while agents work can differ for reasons other than the code: the hub changes between the runs. Bracket the run under test with main runs before and after (main-bundle-main) and only count a mismatch when both main runs agree
scope: .crew/plans/**
source: P-078
supersedes:
tier: project
created: 2026-10-28
---

# Comparing two 'crew.mjs export --json' runs on the main checkout while agents work can differ for reasons other than the code: the hub changes between the runs. Bracket the run under test with main runs before and after (main-bundle-main) and only count a mismatch when both main runs agree

P-078 AC9: one of seven pairs differed at a load spike (main took 19s); four bracketed triples right after were identical field by field
