---
id: K-2026-10-26-an-empty-dispatch-with-run-check-go
type: gotcha
title: An empty dispatch with run --check GO needs a focused goal that is not active (proposed) and no open items or plans: an active focus goal with nothing open dispatches the PM to close it, and any open item gives the Director a stall entry; new-goal's Breakdown items must be closed (pm: move FEAT-### wontfix) and the goal focused explicitly
scope: packages/crew/test/hub/e2e/**, packages/crew/src/hub/commands/team/dispatch.ts
source: P-066
supersedes:
tier: project
created: 2026-10-26
---

# An empty dispatch with run --check GO needs a focused goal that is not active (proposed) and no open items or plans: an active focus goal with nothing open dispatches the PM to close it, and any open item gives the Director a stall entry; new-goal's Breakdown items must be closed (pm: move FEAT-### wontfix) and the goal focused explicitly

P-066's idle-mode test needed GO with nothing to dispatch; the obvious set-ups (active goal, no items) always dispatch something
