---
id: P-049
title: Usage counts a resumed run once
goal: G-007
items: BUG-027
touches: packages/crew/src/hub/commands/team/autonomy.ts, packages/crew/src/hub/core/memory/ledger.ts, packages/crew/src/hub/core/memory/activity.ts
depends_on:
status: draft
branch: plan/P-049-usage-counts-a-resumed-run-once
pr:
created: 2026-10-25
started:
completed:
---

# P-049: Usage counts a resumed run once

## Context
BUG-027 (G-007). `usage --hook` records the whole transcript's cumulative tokens at every SubagentStop, and `spend()` (core/memory/ledger.ts) and the live page's per-run tokens (core/memory/activity.ts) sum those snapshots, so a resumed run is counted again at each stop (director:afc95553afc679059: 37 events, about 0.98M in, reported as 27M). Token budgets (budgets.*) can stop the team early. Fix: record the delta since the run's last usage event, or keep only the latest event per run when summing. For the Architect to spec (scope, acceptance criteria, tasks, test plan, touches).

## Scope
**In:**
- usage hook delta or latest-per-run summing in `spend()` and the activity page.

**Out (explicitly not doing):**
- Reworking budgets.

## Acceptance criteria
- [ ] For the Architect.

## Approach
Architect decides delta vs latest-per-run; note existing ledger events stay as they are.

## Tasks
- [ ] T1: for the Architect → verify: …

## Test plan
**Targeted checks:**
- for the Architect (regression test that fails before and passes after).

## Rollout & rollback
n/a — internal.

## Risks & open questions
- Overlap: autonomy.ts is also touched by P-034 (and the CHORE-021 plan); ledger.ts by P-025.

## Handoff

## Progress log

## Outcome
