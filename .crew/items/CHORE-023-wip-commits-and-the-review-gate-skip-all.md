---
id: CHORE-023
type: chore
title: WIP commits and the review gate skip all of .crew/, including setup files
status: triaged
priority: P2
goal: G-007
plan:
created: 2026-10-25
closed:
---

# CHORE-023: WIP commits and the review gate skip all of .crew/, including setup files

## Summary
Found re-reviewing P-029: git.codeChanges (P-028) drops every .crew/ path, so a plan's change to .crew/config.yaml (P-029's hub.shared), .crew/templates or other setup files is never WIP-committed and is invisible to the review gate after approval; it only reaches main through Release's commit. Only the hub's state paths (STATE_PATHS in core/work/hubstate.ts) should be excluded; setup files under .crew/ are code like any other. Fix in packages/crew/src/hub/core/git.ts codeChanges, with a case in test/hub/e2e/wip-commits.test.ts.

## Done when
- [ ]

## Notes
- 2026-10-25: status new → triaged — priority P2
