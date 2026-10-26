---
id: FEAT-051
type: feat
title: Show the triage goal suggestion in next --role pm
status: done
priority: P3
goal: G-007
plan: P-059
created: 2026-10-26
closed: 2026-10-26
---

# FEAT-051: Show the triage goal suggestion in next --role pm

## Summary
P-055's capture rule keeps a filer's suggested goal in the item's Notes, and the suggestion appears only in `triage`'s output today. Show it in the PM's queue as well (`crew.mjs next --role pm`), next to each item waiting for triage, so the PM sees the suggested goal before opening the item. Origin: P-055.

## User story
As the PM, I want the filer's suggested goal shown in my triage queue, so that I can rank and link items without opening each one to read its Notes.

## Acceptance criteria
- [ ] `next --role pm` shows each untriaged item's suggested goal when its Notes carry one.
- [ ] Items without a suggestion show nothing extra.
- [ ] The text matches what `triage` prints for the same suggestion.
- [ ] A test covers an item with and without a suggestion.

## Notes
- Origin: P-055 (Triage owns goal links).
- Needs `roles.ts`, which P-021 also touches; wait until P-021 lands before opening a plan.
- Small; P3 is enough.
- 2026-10-26: status new → triaged — priority P3
- 2026-10-26: status triaged → done — delivered by P-059
