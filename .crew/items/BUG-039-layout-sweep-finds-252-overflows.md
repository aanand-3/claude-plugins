---
id: BUG-039
type: bug
title: Layout sweep finds 252 overflows in existing document pages at 375 px
status: triaged
severity: S4
priority: P3
goal: G-003
plan:
created: 2026-10-26
closed:
---

# BUG-039: Layout sweep finds 252 overflows in existing document pages at 375 px

## Summary
P-021's layout sweep (layout_sweep.mjs, task T8) found 252 sideways-overflow findings at 375 px in light mode across this repo's existing document pages. They are mostly long unbroken knowledge IDs and BUG-004's title overflowing their cards. This is out of P-021's scope.

## Environment
This repo's hub UI, 375 px viewport, light theme, running P-021's layout_sweep.mjs against this repo's hub.

## Steps to reproduce
1. Build P-021's `layout_sweep.mjs` (from the P-021 work on main).
2. Run it against this repo's hub at 375 px, light theme.
3. Read the findings list.

## Expected
No sideways overflow on any document page at 375 px.

## Actual
252 findings, mostly long unbroken knowledge IDs and BUG-004's title overflowing their cards.

## Evidence
- The sweep's findings output from P-021's T8 run (252 entries).
- Gotcha K-2026-10-26-a-long-unbroken-word-overflows-as-text describes the cause: a long unbroken word overflows as text.

## Impact
Cosmetic: the document pages scroll sideways on a phone-width screen. Nothing breaks. Suggested S4, P3.

## Notes
- Found by P-021's T8, out of P-021's scope.
- See gotcha K-2026-10-26-a-long-unbroken-word-overflows-as-text; the likely fix is wrapping long words in cards and titles.
- 2026-10-26: status new → triaged — priority P3, severity S4
