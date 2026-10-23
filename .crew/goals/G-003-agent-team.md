---
id: G-003
title: Agent team
status: proposed
priority: P1
created: 2026-10-23
completed:
integration_branch:
---

# G-003: Agent team

## Outcome
A team of role agents — Director, PM, Architect, Developer, QA, Release — turns a decided idea into a shipped product
through the hub, with the policy applied to each role and humans involved only where the mode and reserved decisions say.

## Scope
**In:**
- plugin agent definitions per role, driven by `context --role` and `next --role`
- the Claude Code policy adapter: per-role models, tools and write paths, and a PreToolUse guard (agents can't edit policy)
- kickoff and onboard as the team's first job (their progress as ledger runs); staffing, teams and integration order

**Out:**
- cross-project learning (L) and the scoring harness (E)

## Acceptance criteria
- [ ] on a sample idea, the Director staffs the team and the roles take it from decided idea to a merged first plan, using only hub commands to coordinate
- [ ] a role cannot use a tool or write a path its policy denies

## Success metrics

## Breakdown
- FEAT-006: Director and PM agents — staffing from the ready frontier, focus, triage and ranking
- FEAT-007: Architect agent — architecture, ADRs and plans with touches, kickoff's first job
- FEAT-008: Developer agent — resume, checkpoint, learn, hand off
- FEAT-009: QA agent — independent evidence for every criterion, bugs with reproductions
- FEAT-010: Release agent — merge order, rollout and rollback
- FEAT-011: Claude Code policy adapter — render models, tools and paths per role; PreToolUse guard
- FEAT-012: Kickoff as the team's first job — progress as ledger runs instead of yaml files

## Notes & decisions

## Progress log
