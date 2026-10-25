---
id: K-2026-10-25-the-goal-queue-is-the-active-goals
type: decision
title: The goal queue is the active goals ordered by priority then ID, focus first while open; runState moves a done, dropped or missing focus to the next queued goal (a hub write through setFocus) and stops only when none is left, with no stored queue file and no queue command
scope: packages/crew/src/hub/commands/team/autonomy.ts, packages/crew/src/hub/core/work/queries.ts
source: P-033
supersedes:
tier: project
created: 2026-10-25
---

# The goal queue is the active goals ordered by priority then ID, focus first while open; runState moves a done, dropped or missing focus to the next queued goal (a hub write through setFocus) and stops only when none is left, with no stored queue file and no queue command

W2-b: the move is mechanical so the hub makes it where every pass starts (run --check); priority already orders goals and focus still overrides, so a stored order would be one more document to keep in sync
