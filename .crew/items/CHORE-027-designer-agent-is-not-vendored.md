---
id: CHORE-027
type: chore
title: Designer agent is not vendored or rendered in this repo
status: new
priority:
goal:
plan:
created: 2026-10-26
closed:
---

# CHORE-027: Designer agent is not vendored or rendered in this repo

## Summary
P-021 added the designer role but this repo has no .crew/templates/agents/designer.md, no .claude/agents/crew-designer.md and no roles.designer model in policy.yaml; agents --check reports crew-designer.md missing, so dispatch's design-review entries can't launch here. agents and template paths are guard-protected, so the human vendors and renders it.

## Done when
- [ ]

## Notes
