---
id: BUG-045
type: bug
title: new-goal cuts Breakdown titles at the first colon
status: done
severity: S3
priority: P2
goal:
plan: P-073
created: 2026-10-26
closed: 2026-10-28
---

# BUG-045: new-goal cuts Breakdown titles at the first colon

## Summary
`new-goal` creates one item per Breakdown line but cuts each line's title at the first colon, so "SPIKE: Hook facts ..." became an item titled "SPIKE", and the rest of the line is copied into the summary. A line cannot carry a type prefix or a colon in its title.

## Environment
Commit 8562ca6 (G-009 creation), local, main checkout.

## Steps to reproduce
1. Write a goal draft whose Breakdown has the line `- SPIKE: Hook facts for runner-only launches — answers the questions`.
2. Run `node .crew/bin/crew.mjs new-goal "X" --from <draft> --priority P1`.

## Expected
An item titled "Hook facts for runner-only launches" (or a spike item), with the full line as its summary.

## Actual
FEAT-060 titled "SPIKE", FEAT-061/062 with summaries starting at the text after the colon (for example "the `launch: runner|any` policy key ..."). The SPIKE became a FEAT. The goal's Breakdown was rewritten to "FEAT-060: SPIKE: ...".

## Evidence
FEAT-060, FEAT-061, FEAT-062 (created in 8562ca6, rejected as duplicates in 915d5f2, 081767b, ec1e570).

## Impact
Breakdown lines with a colon produce wrong titles and always FEAT type; workaround is to avoid colons in Breakdown lines or create items with `new-item`. Severity S3.

## Notes
Also: Breakdown has no way to create a spike or bug item.
- 2026-10-26: status new → triaged — priority P2, severity S3
- 2026-10-28: status triaged → done — delivered by P-073
