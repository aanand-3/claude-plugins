---
id: CHORE-020
type: chore
title: Guard: a git alias with ! runs the hub with no identity
status: done
priority: P2
goal: G-007
plan: P-042
created: 2026-10-25
closed: 2026-10-26
completed: 2026-10-26
---

# CHORE-020: Guard: a git alias with ! runs the hub with no identity

## Summary
Split from CHORE-014 item 1 (P-018's architect review): an agent can run the hub through a git alias with a shell escape (git -c 'alias.x=!node .crew/bin/crew.mjs --as architect --run-id architect:a6aaa9bc6c362dcaf ...' x). The guard does not see crew.mjs --as architect --run-id architect:a6aaa9bc6c362dcaf as the command, so it injects no identity and the call runs with no role. Add ! (alias shell escapes) to the guard's RUNNER detection in packages/crew/src/hub/commands/team/guard.ts, with a case in test/hub/e2e/guard.test.ts. Not in P-028 (guard.ts is outside its touches).

## Done when
- [ ]

## Notes
- 2026-10-25: status new → triaged — priority P2
- 2026-10-26: status triaged → done — delivered by P-042
