---
id: P-047
title: Director next and run printout follow dispatch and the runner
goal: G-007
items: CHORE-021
touches: packages/crew/src/hub/commands/team/roles.ts, packages/crew/src/hub/commands/team/autonomy.ts, packages/crew/test/hub/e2e/dispatch.test.ts
depends_on: P-031, P-034, P-032
status: draft
branch: plan/P-047-director-next-and-run-printout-follow
pr:
created: 2026-10-25
started:
completed:
---

# P-047: Director next and run printout follow dispatch and the runner

## Context
CHORE-021 (G-007). After P-031 (dispatch) and P-034 (run --until-done), roles.ts still describes the Director's old hand-off loop and `run` with no flags prints the shell loop instead of `run --until-done`. Both were kept out of P-031/P-034 to avoid roles.ts (P-039) and autonomy.ts (P-027, P-033). For the Architect to spec.

## Scope
**In:**
- `next --role director` text and the `run` printout.

**Out (explicitly not doing):**
- New commands.

## Acceptance criteria
- [ ] For the Architect.

## Approach
Depends on P-031 and P-034 (the text must describe code that exists) and P-032 (it edits roles.ts too).

## Tasks
- [ ] T1: for the Architect → verify: …

## Test plan
**Targeted checks:**
- for the Architect.

## Rollout & rollback
n/a — text only.

## Risks & open questions
- Overlap: roles.ts with P-032 and P-021; autonomy.ts with P-034 and the BUG-027 plan.

## Handoff

## Progress log

## Outcome
