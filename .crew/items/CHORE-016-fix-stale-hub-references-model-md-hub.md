---
id: CHORE-016
type: chore
title: Fix stale hub references: model.md, hub SKILL.md, vision.md
status: triaged
priority: P2
goal: G-006
plan:
created: 2026-10-25
closed:
---

# CHORE-016: Fix stale hub references: model.md, hub SKILL.md, vision.md

## Summary
model.md's lifecycle diagrams miss edges in PLAN_FLOW/GOAL_FLOW/ITEM_FLOW and its git mapping describes only the solo flow (not plan_worktrees); it still says knowledge is written by migrate; it lists full_suite as a parsed setting. hub/SKILL.md says nothing records usage automatically, but the SubagentStop hook does. vision.md's Workstream C Deferred list has shipped work.

## Done when
- [ ] `plugins/crew/skills/hub/references/model.md`'s plan, goal and item lifecycle diagrams show every edge in `PLAN_FLOW`, `GOAL_FLOW` and `ITEM_FLOW` (including `in-review→in-progress`, `in-progress→ready`, `ready→draft`, `dropped→draft`), checked edge by edge against `packages/crew/src`
- [ ] model.md's git mapping describes both flows: solo (branch per plan) and `plan_worktrees: true` (one shared worktree per plan from `new-plan`, a single commit at completion)
- [ ] model.md no longer says knowledge is written by `migrate` "today, by `learn` later"; it names `learn` as the writer
- [ ] model.md's settings table lists `full_suite` only if the policy loader parses it (`grep -rn full_suite packages/crew/src` finds a reader); otherwise the row is removed or marked as not yet read, and the definition-of-done line that cites it agrees
- [ ] `plugins/crew/skills/hub/SKILL.md` no longer says nothing records usage automatically; it says the SubagentStop hook (`usage --hook`) records each agent's tokens and manual `usage` is for runs outside that hook
- [ ] `docs/vision.md`'s Workstream C "Deferred" list drops (or marks shipped) what has since shipped, e.g. automatic `usage` capture, with each remaining entry checked against the code or the hub
- [ ] Docs-only change: no source or `dist/` changes; the hub's `check` is clean

## Notes
- 2026-10-25: status new → triaged — priority P2
