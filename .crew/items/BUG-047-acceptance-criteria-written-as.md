---
id: BUG-047
type: bug
title: Acceptance criteria written as a numbered list are not parsed (nested bullets become the criteria)
status: triaged
severity: S3
priority: P2
goal:
plan: P-075
created: 2026-10-26
closed:
origin: P-060
---

# BUG-047: Acceptance criteria written as a numbered list are not parsed (nested bullets become the criteria)

## Summary

## Environment

## Steps to reproduce
1. Write a plan whose `## Acceptance criteria` is a numbered list (`1. **Title.** ...`) with nested `- ` bullets under some items (P-060 has 8 numbered criteria; items 4 and 6 hold three nested bullets each).
2. Run `crew.mjs context` / `crew.mjs resume P-060`, or `crew.mjs checkpoint --ac 7`.

## Expected
Each numbered criterion is one acceptance criterion (AC1..AC8); `--ac 7` and `--ac 8` are accepted.

## Actual
`criteria()` in packages/crew/src/hub/commands/work/execution.ts uses `Doc.checklist` (`- [ ]` lines) and falls back to `Doc.bullets` (lines starting `- `). Numbered items are ignored, so only the 6 nested bullets are parsed as AC1..AC6; `--ac` accepts only 1-6, and evidence recorded as "AC4" attaches to the wrong text. `--ac all` silently covers just those 6.

## Evidence

## Impact

## Notes
Fix: also accept `N. ` numbered items in criteria() (and keep the nested-bullet fallback only when none exist). Affects P-060 acceptance evidence mapping.
- 2026-10-26: status new → triaged — priority P2, severity S3
