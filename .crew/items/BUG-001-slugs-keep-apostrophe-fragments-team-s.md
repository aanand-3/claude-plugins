---
id: BUG-001
type: bug
title: Slugs keep apostrophe fragments (team-s)
status: done
severity: S4
priority: P3
goal: G-001
plan: P-022
created: 2026-10-23
closed: 2026-10-26
completed: 2026-10-26
---

# BUG-001: Slugs keep apostrophe fragments (team-s)

## Summary
Slugs keep a dangling fragment from apostrophes: "the team's first job" becomes `the-team-s-first-job`.

## Environment
crew 1.0 (feat/hub-context), any OS.

## Steps to reproduce
1. `crew.mjs new-item feat "Kickoff as the team's first job" --why x`

## Expected
`.crew/items/FEAT-…-kickoff-as-the-teams-first-job.md`

## Actual
`.crew/items/FEAT-012-kickoff-as-the-team-s-first-job.md` (also K-… entries)

## Evidence

## Impact
Cosmetic; file names and knowledge IDs read oddly. No workaround needed.

## Notes
- 2026-10-23: status new → triaged — priority P3, severity S4
- 2026-10-26: DONE: fixed by P-022 (fc812e2). core/text.ts slugify drops apostrophes; text.test.ts 'drops apostrophes instead of splitting on them' expects the-teams-first-job. No remaining work.
- 2026-10-26: status triaged → done — DONE per Architect review: fixed by P-022 (fc812e2).
