---
id: CHORE-010
type: chore
title: Track plan-mode plans in the hub
status: done
priority: P2
goal: G-001
plan: P-013
created: 2026-10-24
closed: 2026-10-26
completed: 2026-10-26
---

# CHORE-010: Track plan-mode plans in the hub

## Summary
Plans made in plan mode live in `~/.claude/plans/`, outside the repo and untracked. Import the eight that belong to this repo into the hub with the status git history shows, and make new plan-mode plans land in `.crew/drafts/` so they become tracked plans.

## Done when
- [ ]

## Notes
Raised in chat on 2026-10-24. Six shipped, one (research) never landed, one (Node only) is still open as CHORE-007..009.
- 2026-10-24: status new → triaged — priority P2
- 2026-10-26: DONE: shipped by P-013 (669d819). Pre-hub plans are .crew/plans/P-005..P-012; .claude/settings.json sets plansDirectory .crew/drafts and runs .crew/bin/track_plan_draft.mjs on ExitPlanMode and SessionStart. No remaining work.
- 2026-10-26: status triaged → done — DONE per Architect review: shipped by P-013 (669d819).
