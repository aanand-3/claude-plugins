---
id: K-2026-10-26-dispatch-routes-a-plan-only-to-a-move
type: decision
title: Dispatch routes a plan only to a move its gate would allow: an in-review plan with unchecked tasks goes to its developer (finish), never to a PM accept; and move in-review refuses unchecked tasks
scope: packages/crew/src/hub/commands/team/dispatch.ts, packages/crew/src/hub/commands/work/workflow.ts
source: P-067
supersedes:
tier: project
created: 2026-10-26
---

# Dispatch routes a plan only to a move its gate would allow: an in-review plan with unchecked tasks goes to its developer (finish), never to a PM accept; and move in-review refuses unchecked tasks

BUG-048: dispatch and the accepted gate disagreed, so the loop re-offered a refused accept every pass
