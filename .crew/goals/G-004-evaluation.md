---
id: G-004
title: Evaluation
status: active
priority: P2
created: 2026-10-23
completed:
integration_branch:
---

# G-004: Evaluation

## Outcome
Every change to agents, policy or playbook lessons is scored against fixed golden projects, so improvement can be told apart
from drift before anything is promoted.

## Scope
**In:**
- golden sample projects and end-to-end scenario evals with scores
- the first scenarios from the hub's verification: crash resume, gotcha recall, budget, policy denial

**Out:**
- learning itself (L)

## Acceptance criteria
- [ ] the scenario suite runs with one command and reports a score per scenario
- [ ] a deliberately bad lesson or prompt change lowers the score

## Success metrics

## Breakdown
- FEAT-013: Golden sample projects — small, fixed repositories with ideas and expected outcomes
- FEAT-014: Scenario evals — crash resume, gotcha recall, budget and policy denial, scored
- FEAT-015: Regression gate — compare scores before and after a change to agents, policy or lessons

## Notes & decisions

## Progress log
- 2026-10-26: status proposed → active (approved by Arpit Anand)
