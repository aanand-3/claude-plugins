---
id: BUG-044
type: bug
title: Roles other than director and architect never close an ask
status: triaged
severity: S2
priority: P1
goal:
plan:
created: 2026-10-26
closed:
---

# BUG-044: Roles other than director and architect never close an ask

## Summary
Roles other than director and architect never close an `ask`. Only those two role templates contain the `answer Q-…` line, so for every other role (pm, developer, qa, release, designer) dispatch row 1 re-dispatches the same ask every round, forever.

Fix direction (draft step 5, "Closing asks"): add the line "for an `answer Q-…` entry: do it, then `answer` with what you did" to every role template (pm, developer, qa, release, designer) in `plugins/crew/skills/hub/agents/*.md`; an ask re-dispatched N times goes to the Director.

## Environment
Current main, local hub, any dispatch round with an open ask addressed to pm, developer, qa, release or designer.

## Steps to reproduce
1. `node .crew/bin/crew.mjs ask --to pm "groom G-001"`.
2. Run the pm agent for the dispatched entry; it does the work but has no instruction to `answer`.
3. Run `node .crew/bin/crew.mjs dispatch` again.

## Expected
The ask is closed by `answer Q-…` and is no longer dispatched.

## Actual
Dispatch row 1 returns the same ask again every round.

## Evidence
Role templates for pm, developer, qa, release and designer lack the `answer Q-…` line; director and architect have it.

## Impact
Asks to those roles loop forever and burn agent slots; the human cannot route work to them through `ask`. Severity S2: the ask path is unusable for five of seven roles; the only workaround is answering manually.

## Notes
Goal G-007. Source draft: .crew/drafts/yes-pm-logs-them-recursive-sparkle.md step 5.
- 2026-10-26: goal hint G-007 (by Arpit Anand)
- 2026-10-26: status new → triaged — priority P1, severity S2
