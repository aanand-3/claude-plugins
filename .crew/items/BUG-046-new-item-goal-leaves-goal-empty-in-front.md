---
id: BUG-046
type: bug
title: new-item --goal leaves goal empty in front matter
status: triaged
severity: S3
priority: P2
goal:
plan: P-074
created: 2026-10-26
closed:
---

# BUG-046: new-item --goal leaves goal empty in front matter

## Summary
`new-item ... --goal G-00x --priority P1` creates and triages the item but leaves `goal:` empty in the front matter. A later `triage <ID> --goal G-00x` sets it.

## Environment
Commits b7369a4, 08582cb, dad6188 (G-007 items) and 31b4094, 04a7ae2, 6c74222 (G-009 items), local, main checkout, run by the pm role.

## Steps to reproduce
1. `node .crew/bin/crew.mjs new-item feat "T" --from <draft> --goal G-007 --priority P1`.
2. Read `goal:` in the created item's front matter.

## Expected
`goal: G-007`.

## Actual
`goal:` is empty for BUG-043, FEAT-059, BUG-044, SPIKE-006, FEAT-063 and FEAT-064 (the `check` command reported it).

## Evidence
Commits b7369a4, 08582cb, dad6188, 31b4094, 04a7ae2, 6c74222. `triage <ID> --goal G-00x` afterwards (7985072, b64e380, 0956cec, 26fad82, 0fbc2d9, 1bb7704) fixed it; verified by reading each file's front matter.

## Impact
Items are not linked to their goal until triaged again, so goal views and the focus filter miss them. Severity S3: one extra triage call.

## Notes
Possibly --goal is dropped when the template's `goal:` is overwritten during triage-on-create.
- 2026-10-26: status new → triaged — priority P2, severity S3
