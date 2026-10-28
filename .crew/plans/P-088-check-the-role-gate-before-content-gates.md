---
id: P-088
title: Check the role gate before content gates on move
goal:
items: CHORE-003
touches: packages/crew/src/hub/commands/work/workflow.ts, packages/crew/test/hub/e2e/policy.test.ts
depends_on:
status: in-progress
branch: plan/P-088-check-the-role-gate-before-content-gates
pr:
created: 2026-10-28
started: 2026-10-28
completed:
assignee: developer
---

# P-088: Check the role gate before content gates on move

## Context
CHORE-003 (G-003): `move` runs the transition's content gate (`guard()`: readiness, evidence, code review, landed) before the
policy's role gate (inside `authorize()`). A run in the wrong role therefore hears about missing content first — QA moving a
plan to `done` is told "no code review yet" instead of "this is the pm role's step" — and may go and fix content it was never
allowed to move. The role gate answers "may you do this at all", so it should be checked first.

## Scope
**In:**
- In `packages/crew/src/hub/commands/work/workflow.ts`, take the role-gate check out of `authorize()` into a small exported
  helper (e.g. `requireRole(store, id, transition, from, also)`) that `authorize()` still calls, so every existing caller
  (assign, reassign, review, land, regoal, start) behaves exactly as before.
- In `move()`, compute `lane` (fast lane) before `guard()` and call that helper before `guard()`, with the same arguments
  `authorize()` gets (`via ?? kind.status`, `via ? undefined : old`, `lane ? ["pm"] : []`), when the policy is valid and no
  `--approved-by` is given (a human approval skips the role gate, as today). `authorize()` stays where it is after `guard()`.
- Regression tests in `packages/crew/test/hub/e2e/policy.test.ts`.

**Out (explicitly not doing):**
- Human gates and reserved steps keep their place after the content gate: an agent still learns what content is missing
  before it asks a human to approve.
- `start` (its `checkStartable()` before `authorize()`), `review`, `land`, `regoal`: unchanged.
- No policy, message-text or docs change.

## Acceptance criteria
- [ ] AC1: With `role_gates: plan.accepted: qa`, a developer-role run moving an in-review plan to `accepted` that has no QA
  evidence and no code review is refused with "is for the qa role; this run is the developer role", and the error names
  neither the missing evidence nor the missing review.
- [ ] AC2: In the same setup, a qa-role run making the same move is still refused by the content gate (its error lists the
  missing evidence/review), i.e. the right role still hits the content gate.
- [ ] AC3: With `role_gates: plan.ready: architect`, a developer-role run moving a draft plan that fails the Definition
  of Ready (e.g. an empty section) to `ready` is refused with "is for the architect role", not the readiness problems.
- [ ] AC4: Existing behaviour holds: the "role gates", "a human gate is refused over MCP and approved on the CLI" and
  lifecycle/regoal cases in `policy.test.ts` pass unchanged, and a move refused by the role gate records no ledger event.
- [ ] AC5: `workflow.ts` stays under 300 lines (project convention) and `npm run typecheck` passes.

## Approach
- Split, don't duplicate: the role lookup (`policy.role_gates[kind.from>status] ?? policy.role_gates[transition]`, compared
  with `store.ledger.who.role` and `also`) moves verbatim into the helper; `authorize()` calls it at its end, so its message
  and behaviour are unchanged for every caller.
- `move()` calls the helper early only when `store.policy.errors` is empty (an invalid policy is still refused by
  `authorize()` with its own message, and `--force` paths still reach it) and `approvedBy` is unset.
- `--force` skips `guard()` today and still does; the early role check runs regardless of `--force`, matching `authorize()`.
- Net change in `workflow.ts` is a few lines; it is at 289 lines, so keep the helper compact.
- Overlap: accepted plans P-068, P-071, P-072 also touch `workflow.ts`; the merge queue rebases this small edit, no
  dependency needed. `policy.test.ts` is in `hub.shared`.

## Design

## Tasks
- [x] T1: Extract the role-gate check from `authorize()` into an exported helper and call it from `move()` before `guard()` (with `lane` computed first) as described in Approach → verify: `cd packages/crew && npm run typecheck` passes and `wc -l src/hub/commands/work/workflow.ts` is under 300 (AC5).
- [x] T2: Add a `policy.test.ts` case for AC1–AC3 (wrong role refused by the role gate, error free of content-gate text; right role still hits the content gate; a developer making an unready draft ready refused as the architect's step; no move event recorded) → verify: `cd packages/crew && npx vitest run test/hub/e2e/policy.test.ts` passes, and the new case fails against the base `workflow.ts` (write `git show main:packages/crew/src/hub/commands/work/workflow.ts` into the worktree, run, then restore from `git show HEAD:…`) (AC1–AC4).

## Test plan
**Targeted checks:**
- `cd packages/crew && npx vitest run test/hub/e2e/policy.test.ts` — new case covers AC1, AC2, AC3; existing "role gates",
  human-gate and lifecycle cases cover AC4.
- Regression: the new case fails with the base branch's `workflow.ts` (content-gate message first) and passes after (AC1, AC3).
- `cd packages/crew && npx vitest run test/hub/e2e/team.test.ts test/hub/e2e/team-2.test.ts test/hub/e2e/review-fixes.test.ts`
  — other moves through role gates (AC4).
- `cd packages/crew && npm run typecheck` and `wc -l src/hub/commands/work/workflow.ts` (AC5).

## Rollout & rollback
n/a — internal ordering of refusals in the hub CLI; revert the commit to back out. Release rebuilds the bundled `.crew/bin`.

## Risks & open questions
- A wrong-role run that also lacks content now needs a second attempt by the right role to see content problems; that is
  the intended behaviour.

## Handoff

## Progress log

- 2026-10-28: status draft → ready
- 2026-10-28: assigned to the developer role
- 2026-10-28: status ready → in-progress — branch plan/P-088-check-the-role-gate-before-content-gates

## Outcome
