---
id: FEAT-027
type: feat
title: Release refreshes .crew/bin/crew.mjs from the rebuilt bundle
status: done
priority: P1
goal: G-007
plan: P-024
created: 2026-10-24
closed: 2026-10-26
completed: 2026-10-26
---

# FEAT-027: Release refreshes .crew/bin/crew.mjs from the rebuilt bundle

## Summary
.crew/bin/** is a protected path, so after every merge a human must copy plugins/crew/skills/hub/dist/crew.mjs over .crew/bin/crew.mjs; until then the repo's hub runs stale code (new IDs still get -s- slugs). Release should run one sanctioned sync step. Needs a policy change, which is the executive's to approve.

## User story

## Acceptance criteria
- [ ]

## Notes
- 2026-10-24: status new → triaged — priority P2
- 2026-10-24: Executive approval (Arpit Anand, in chat 2026-10-24): 'I approve the policy change for FEAT-027: Release may refresh .crew/bin/crew.mjs from the rebuilt bundle. Have the Architect spec it.' Covers this policy.change only.
- 2026-10-24: re-triaged: priority P2
- 2026-10-25: re-triaged: priority P1
- 2026-10-26: status triaged → done — delivered by P-024
