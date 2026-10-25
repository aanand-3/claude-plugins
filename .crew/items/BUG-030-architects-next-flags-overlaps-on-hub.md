---
id: BUG-030
type: bug
title: Architect's next flags overlaps on hub.shared paths
status: new
severity: S3
priority: P2
goal: G-007
plan:
created: 2026-10-25
closed:
---

# BUG-030: Architect's next flags overlaps on hub.shared paths

## Summary
roles.ts architect queue calls overlapping(p, v.plans) without sharedGlobs(store), so next reports overlaps that meet only on hub.shared files (P-031/P-025 on cli.ts, P-031/P-036, P-032/P-034, P-032/P-035 on index.ts/model.md/SKILL.md) as needing depends_on or narrower touches, though staffing does not block on them (footprint.ts overlapping takes shared as its third argument). Fix: pass sharedGlobs(v.store) there; regression test in an e2e test with two ready plans sharing only a hub.shared file.

## Environment

## Steps to reproduce
1.

## Expected

## Actual

## Evidence

## Impact

## Notes
