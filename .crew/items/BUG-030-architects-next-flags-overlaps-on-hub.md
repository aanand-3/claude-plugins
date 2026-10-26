---
id: BUG-030
type: bug
title: Architect's next flags overlaps on hub.shared paths
status: done
severity: S3
priority: P2
goal: G-007
plan: P-044
created: 2026-10-25
closed: 2026-10-26
completed: 2026-10-26
---

# BUG-030: Architect's next flags overlaps on hub.shared paths

## Summary
roles.ts architect queue calls overlapping(p, v.plans) without sharedGlobs(store), so next reports overlaps that meet only on hub.shared files (P-031/P-025 on cli.ts, P-031/P-036, P-032/P-034, P-032/P-035 on index.ts/model.md/SKILL.md) as needing depends_on or narrower touches, though staffing does not block on them (footprint.ts overlapping takes shared as its third argument). Fix: pass sharedGlobs(v.store) there; regression test in an e2e test with two ready plans sharing only a hub.shared file.

## Environment

## Steps to reproduce
1. Have two ready plans whose touches meet only on a hub.shared file (e.g. P-031/P-025 on cli.ts).
2. Run `crew.mjs --as pm --run-id pm:ab2d1adb64e1d1929 next --role architect`.

## Expected
No overlap is flagged for plans meeting only on hub.shared files, as staffing (footprint.ts overlapping with shared as third argument) does not block on them.

## Actual
roles.ts:93 calls overlapping(p, v.plans) without sharedGlobs(v.store); next reports those overlaps as needing depends_on or narrower touches.

## Evidence

## Impact

## Notes
- 2026-10-25: status new → triaged — priority P2, severity S3
- 2026-10-26: status triaged → done — delivered by P-044
