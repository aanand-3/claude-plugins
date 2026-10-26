---
id: G-002
title: Ideation loop
status: active
priority: P2
created: 2026-10-23
completed:
integration_branch:
---

# G-002: Ideation loop

## Outcome
A human brings an idea and, with an agent researching and proposing, reaches a decided idea — problem, outcome, checkable
success criteria and direction — recorded in the hub, with every finding and choice kept as knowledge.

## Scope
**In:**
- one `ideate` skill: research (today's research skill) and the interview half of discover, driven by the idea's lifecycle
- research findings and rejected directions as knowledge entries; the go / pivot / kill decision as the executive's reserved step

**Out:**
- stack and architecture decisions (the Architect's job in T)

## Acceptance criteria
- [ ] from a one-line idea, `ideate` produces a decided idea.md whose success criteria are a checklist the executive confirmed
- [ ] the research verdict and rejected directions are recallable (`recall --topic …`) after kickoff

## Success metrics

## Breakdown
- FEAT-003: ideate skill — merge research and the discover interview into one loop over the idea's lifecycle
- FEAT-004: Research as knowledge — findings, competitors and rejected directions recorded with learn
- FEAT-005: Executive decision step — propose, then the human decides go / pivot / kill with --approved-by

## Notes & decisions

## Progress log
- 2026-10-26: status proposed → active (approved by Arpit Anand)
