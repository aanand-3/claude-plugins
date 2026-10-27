---
id: BUG-053
type: bug
title: Inbox name placeholder is clipped at 375 px
status: triaged
severity: S4
priority: P3
goal:
plan:
created: 2026-10-27
closed:
---

# BUG-053: Inbox name placeholder is clipped at 375 px

## Summary
On the hub's Inbox page at 375 px, the "Answering as" name input's placeholder is cut off. Seen during P-072's design
review; the issue was already there and is not part of P-072. Severity S4 (cosmetic).

## Environment
Hub UI (`crew.mjs ui`) built from P-072's worktree at 13949d7, headless Chrome, 375 px, light and dark.

## Steps to reproduce
1. Serve the hub UI, open `#/inbox` with no stored approver name.
2. Set the viewport to 375 px wide.

## Expected
The whole placeholder is readable inside the input.

## Actual
"Your name — recorded with every answer and approval" stops at "…every answer an" (the input is about 307 px wide).

## Evidence
`packages/crew/ui/src/views/Inbox.tsx`, the input in the "Answering as" card.

## Impact
Every human who opens the Inbox on a phone before entering a name. Workaround: none needed, the field still works.

## Notes
Fix: use a shorter placeholder, e.g. "Your name (recorded with each answer)", as P-072 did for its "Then you…" field.
- 2026-10-27: status new → triaged — priority P3, severity S4
