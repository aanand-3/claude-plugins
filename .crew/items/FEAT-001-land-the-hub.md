---
id: FEAT-001
type: feat
title: Land the hub
status: triaged
priority: P1
goal: G-001
plan:
created: 2026-10-23
closed:
---

# FEAT-001: Land the hub

## Summary
review the stacked branches and merge crew 1.0 (rename + lean model) and Phases 3–7 into main

Slice of G-001 (Shared context: the hub): Land the hub — review the stacked branches and merge crew 1.0 (rename + lean model) and Phases 3–7 into main

## User story

## Acceptance criteria
- [ ]

## Notes
- 2026-10-23: triaged from G-001 breakdown
- 2026-10-26: DONE: the hub is on main. crew 1.0, the lean model and Phases 3-7 landed through P-013..P-051 (packages/crew/src/hub; vision Verification scenarios covered by named tests: execution.test.ts 'a crashed run resumes from the ledger', ledger.test.ts 'a claim is visible and refused from another worktree', policy.test.ts loosen/human gate/budgets, knowledge.test.ts recall, execution.test.ts evidence gate, context.test.ts budget). CI green on main at last push. Only leftover branch is claude/crew-bug-001-9d4b01 (P-002/P-003 specs, Q-d4e060/Q-67af6f), not a hub landing. No remaining work.
