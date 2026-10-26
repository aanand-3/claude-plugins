---
id: FEAT-022
type: feat
title: Agent lifecycle: one commit per plan, resumed agents, targeted tests
status: done
priority: P1
goal: G-003
plan: P-004
created: 2026-10-24
closed: 2026-10-26
completed: 2026-10-26
---

# FEAT-022: Agent lifecycle: one commit per plan, resumed agents, targeted tests

## Summary
The crew agents commit after every task, start every agent from scratch, and run the full test suite on every check. Commit once per plan, keep agents alive for the life of their plan, run only the tests a plan touches, and run the full suite once, before the merge, plus in CI.

## User story
As the executive running a crew team, I want one commit per plan, agents that pick up where they left off within a plan, and tests scoped to the change, so that history stays readable and runs cost fewer tokens and less time.

## Acceptance criteria
- [ ] A plan reaches main as one commit; no per-task or per-status-move commits.
- [ ] Follow-ups within a plan (QA bugs, review changes, the next Director cycle) go to the same agent instead of a new one.
- [ ] Developer and QA run targeted checks; the full suite runs before the merge and in CI.

## Notes
Raised in chat on 2026-10-24. This repo has no CI yet (no `.github/`).
- 2026-10-24: status new → triaged — priority P1
- 2026-10-26: status triaged → done — Delivered by P-004 (done). Q-848e65 triage.
