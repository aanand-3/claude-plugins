---
id: G-001
title: Shared context: the hub
status: active
priority: P1
created: 2026-10-23
completed:
integration_branch:
---

# G-001: Shared context: the hub

## Outcome
Every agent and human on a crew project reads and writes one shared context — project state, the ledger, project memory and
policy — and gets what it needs right now from `context`, so work resumes after a crash, parallel agents don't collide and
nothing important lives only in chat.

## Scope
**In:**
- the lean model (idea, goals, items, plans, touches, focus), the ledger, policy, knowledge, execution state and evidence,
  context, role queues and questions — Phases 0–7 of docs/vision.md
- landing them on main as crew 1.0 and dogfooding them in this repository

**Out:**
- the role agent definitions and the Claude Code policy adapter (Workstream T)
- cross-machine ledger sync (later, via refs/crew/ledger)

## Acceptance criteria
- [ ] the verification scenarios in docs/vision.md pass in CI on main (crash resume, claims across worktrees, policy denial, budget, gotcha recall, evidence gate, context budget)
- [ ] this repository runs on its own hub: `crew.mjs check` is clean and `context` gives a useful brief at session start

## Success metrics

## Breakdown
- FEAT-001: Land the hub — review the stacked branches and merge crew 1.0 (rename + lean model) and Phases 3–7 into main
- FEAT-002: Hub hooks in this repo — SessionStart context and Stop/PreCompact checkpoints in .claude/settings.json

## Notes & decisions

## Progress log
- 2026-10-23: status proposed → active — the hub is built on branches; landing it is the work now
