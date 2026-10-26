---
id: CHORE-028
type: chore
title: Architect ADRs in docs/adr are never committed or reviewed
status: triaged
priority: P3
goal: G-001
plan:
created: 2026-10-26
closed:
---

# CHORE-028: Architect ADRs in docs/adr are never committed or reviewed

## Summary
architect.md:25 tells the Architect to write an ADR in docs/adr/ for stack or architecture decisions, but docs/ is not hub state (STATE_PATHS, core/work/hubstate.ts:11) and the Architect has no plan for it, so the file would sit uncommitted on main and skip review. No docs/adr exists yet, so it has never happened. Decide: ADRs as hub knowledge (learn decision, already tracked) with the docs/adr file written in a plan, or drop docs/adr from the Architect's loop.

## Done when
- [ ]

## Notes
- 2026-10-26: status new → triaged — priority P3
