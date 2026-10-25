---
id: P-043
title: Serialize and cap the full suite under parallel plans
goal: G-007
items: BUG-028
touches: packages/crew/**, .crew/config.yaml
depends_on:
status: draft
branch: plan/P-043-serialize-and-cap-the-full-suite-under
pr:
created: 2026-10-25
started:
completed:
---

# P-043: Serialize and cap the full suite under parallel plans

## Context
BUG-028 (G-007): with several plans running, the full vitest run times out in test/mcp.test.ts beforeAll at load 50-100; Release merged P-033 without one green full run. Executive decision: serialize full suites with a hub lock, cap vitest workers, record durations. Converting tests to in-process is CHORE-025, out of scope here. Architect to refine the spec.

## Scope
**In:**
- A hub lock taken around `hub.full_suite`, with config `hub.suite_slots` (default 1) setting how many full suites may run at once
- vitest `maxWorkers: "50%"` in packages/crew
- Record each full-suite run's duration (queue wait and run time) in the hub

**Out (explicitly not doing):**
- Converting hub tests to run in-process (CHORE-025)
- Cheaper beforeAll fixtures

## Acceptance criteria
- [ ] With `hub.suite_slots` unset, a second `hub.full_suite` waits while one runs, and runs after it ends
- [ ] `hub.suite_slots: 2` lets two run at once
- [ ] vitest config sets maxWorkers "50%"
- [ ] Each full-suite run records its duration, readable through a hub command
- [ ] A stale lock from a dead run does not block the next one

## Approach
Architect to specify.

## Tasks
- [ ] T1: Architect to specify → verify: Architect

## Test plan
**Targeted checks:**
- Architect to specify

## Rollout & rollback
n/a — internal hub change; remove the config key to revert.

## Risks & open questions
- Where the lock lives (hub dir vs git common dir) so all worktrees share it

## Handoff

## Progress log

## Outcome
