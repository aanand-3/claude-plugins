---
id: K-2026-10-25-items-close-with-their-plan-stored-item
type: decision
title: Items close with their plan: stored item status gains done; when a plan moves to done (forced or not) each of its items not already closed is stored done with closed: set, a Notes line and a ledger move via plan.done, with no item gate; an item already closed keeps its closure. Every item status can close to done, wontfix or duplicate; ITEM_CLOSED includes done. Closing never blocks or moves its plan: a plan whose only item is closed keeps its status and gates, and the PM decides whether to drop it. Under preset lifecycle item.done, item.wontfix and item.duplicate are pm gates.
scope: packages/crew/src/hub/core/work/model.ts, packages/crew/src/hub/commands/work/workflow.ts, packages/crew/src/hub/core/team/presets.ts, plugins/crew/skills/hub/references/model.md
source: P-045
supersedes:
tier: project
created: 2026-10-25
---

# Items close with their plan: stored item status gains done; when a plan moves to done (forced or not) each of its items not already closed is stored done with closed: set, a Notes line and a ledger move via plan.done, with no item gate; an item already closed keeps its closure. Every item status can close to done, wontfix or duplicate; ITEM_CLOSED includes done. Closing never blocks or moves its plan: a plan whose only item is closed keeps its status and gates, and the PM decides whether to drop it. Under preset lifecycle item.done, item.wontfix and item.duplicate are pm gates.

Executive decision 2026-10-25 for G-007 (BUG-024): a linked item's status follows its plan (done on PM done); the PM can close any item from any status; closing never blocks its plan. Specced in P-045, separate from P-032.
