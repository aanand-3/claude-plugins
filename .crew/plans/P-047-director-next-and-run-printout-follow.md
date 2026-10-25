---
id: P-047
title: Director next and run printout follow dispatch and the runner
goal: G-007
items: CHORE-021
touches: packages/crew/src/hub/commands/team/roles.ts, packages/crew/src/hub/commands/team/autonomy.ts, packages/crew/test/hub/e2e/dispatch.test.ts, packages/crew/test/hub/e2e/team.test.ts, packages/crew/test/hub/e2e/team-2.test.ts
depends_on: P-031, P-034
status: ready
branch: plan/P-047-director-next-and-run-printout-follow
pr:
created: 2026-10-25
started:
completed:
---

# P-047: Director next and run printout follow dispatch and the runner

## Context
CHORE-021 (G-007). P-031 makes `dispatch` the routing table: the Director runs only when dispatch gives it an entry (stale claims to reassign, blocked plans, the next focus, a stall; P-034 adds idle runs), and staffing, assignment and goal closure go to the PM. P-034 adds `run --until-done`, the runner that replaces the hand-written shell loop. Both left two texts behind, to stay off files other plans were editing:
- `next --role director` (roles.ts `RULES.director`) still describes the old hand-off loop: "staff N ready plans: `staff` → the PM assigns, developers start", "P-### and P-### overlap … sequence them", "G-### has nothing open: confirm its acceptance criteria, move it done", "set the focus goal", and its own stale and blocked lines. `context --role director` shows the same lines ("Next for director").
- `run` with no flags (autonomy.ts `run`, the `LOOP` constant) prints `while node .crew/bin/crew.mjs run --check; do claude -p "/crew:team continue" || break; done` instead of `run --until-done`.

**Dependencies (code this plan calls or describes):** P-031 (`dispatch(store)` and its `Entry`, commands/team/dispatch.ts) and P-034 (`run --until-done`, its preflight, stop reasons and flags). Overlaps, for staffing only, not dependencies: roles.ts with P-032 and P-021 (both ready; neither changes the Director's rules); the test files are `hub.shared`.

## Scope
**In:**
- roles.ts `RULES.director` becomes:
  1. `waiting on the executive: Q-… — <text>` for each open escalation (unchanged);
  2. `over budget: …` (unchanged);
  3. the paused line (unchanged);
  4. the Director's own dispatch entries: `dispatch(store).entries` with `role === "director"`, except question entries (`ref` starting `Q-`, which `roleLines` already lists as `QUESTION`), each as its `task` text (`reassign P-###: …`, `unblock P-###: …`, `focus G-###: …`, P-034's idle-run entry, `stall: nothing can move — …`).
  The `staff N ready plan(s)` line, the overlap line, the goal-closure line, the "set the focus goal" line and the Director's own stale and blocked lines are removed (dispatch covers them, or routes them to the PM). Other roles' rules are unchanged.
- autonomy.ts `run` with no flags prints:
  - `Run the team unattended, from the project root in your own terminal:` and `  node .crew/bin/crew.mjs run --until-done`;
  - one line on what it does: a preflight, then passes of `claude -p "/crew:team continue"` until `run --check` says stop, dispatch is empty, 2 passes make no progress or `--max-passes` (20) is reached; `--command CMD` replaces the pass command;
  - the scheduled single-pass line (`run --check && claude -p "/crew:team continue"`, unchanged) and the `Now:` line (unchanged).
  The `LOOP` constant and the `while … run --check` text go.
- Tests: team.test.ts line 49 (`next --as director` contains `staff 1 ready plan`) and team-2.test.ts line 200 (`run` contains `while node …`) are updated; new cases in dispatch.test.ts.

**Out (explicitly not doing):**
- New commands or flags; changes to `dispatch`, the runner, or other roles' `next` lines.
- `plugins/crew/skills/hub/agents/director.md` and `team/SKILL.md` (P-031 and P-034 rewrite them).
- `.claude/agents/**` re-rendering (human-reserved).

## Acceptance criteria
- [ ] AC1 · In a throwaway lifecycle repo with a focused active goal and two ready plans, `next --role director` contains no `staff` line, no "overlap" line and no "has nothing open" line; `next --role pm` still lists `open P-### … → assign P-### --to developer` for the unassigned ready plans.
- [ ] AC2 · With a `blocked` plan P-001, `next --role director` lists `unblock P-001: …`; with a stale claim on P-002 (`limits: { stale_claim_hours: 0 }`, as dispatch.test.ts's AC3 case sets it), it lists `reassign P-002: …`; each line equals the `task` of the matching director entry in `dispatch --json`.
- [ ] AC3 · An open question to the director (`ask P-001 --to director "…"`) appears once in `next --role director`, as its `QUESTION` line, not again as a dispatch line; an escalation still gives `waiting on the executive: Q-…`.
- [ ] AC4 · In the set-up of dispatch.test.ts's "open work that can't move" case, `next --role director` shows dispatch's `stall: nothing can move — …` line.
- [ ] AC5 · `run` (no flags) prints `node .crew/bin/crew.mjs run --until-done`, mentions `--max-passes` and `--command`, and does not contain `while node`; `run --check` output and exit codes are unchanged.
- [ ] AC6 · `npm run typecheck` passes; roles.ts and autonomy.ts stay under 300 lines; `context --role director` still starts with "Idea & focus", "Next for director" (context.test.ts).

## Approach
- roles.ts imports `dispatch` from `./dispatch.js` (dispatch.ts does not import roles.ts; context.ts and advisor.ts import roles.ts, which is fine). One rule: `(v) => dispatch(v.store).entries.filter((e) => e.role === "director" && !e.ref?.startsWith("Q-")).map((e) => e.task)`, after the paused rule. The `staffing`, `overlapping` and `staleClaims` imports go if nothing else in roles.ts uses them.
- autonomy.ts: replace `LOOP` and the three loop lines of the no-flag branch; keep the scheduled and `Now:` lines.
- Tests: dispatch.test.ts gets `it("director next lists the Director's dispatch entries")` (AC1–AC4), reusing its set-up helpers; team.test.ts line 49 asserts the staffing result and that `next --as director` has no `staff` line; team-2.test.ts line 200 expects `run --until-done` (AC5).

## Tasks
- [ ] T1: Director rules from dispatch (roles.ts) → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/dispatch.test.ts -t "director next"` (AC1–AC4)
- [ ] T2: the `run` printout (autonomy.ts) → verify: `npx vitest run test/hub/e2e/team-2.test.ts -t "runner stops"` (AC5)
- [ ] T3: existing assertions moved → verify: `npx vitest run test/hub/e2e/team.test.ts test/hub/e2e/context.test.ts test/hub/e2e/branch-copies.test.ts` green
- [ ] T4: types and size → verify: `npm run typecheck`; `wc -l src/hub/commands/team/roles.ts src/hub/commands/team/autonomy.ts` each under 300 (AC6)

## Test plan
**Targeted checks** (from `packages/crew/`; the e2e suites drive the built `dist/crew.mjs`: `npm run build` first, then discard the generated output, which Release builds):
- AC1–AC4 → `npx vitest run test/hub/e2e/dispatch.test.ts -t "director next"`
- AC5 → `npx vitest run test/hub/e2e/team-2.test.ts -t "runner stops"`
- AC6 → `npm run typecheck`; T4's `wc -l`; `npx vitest run test/hub/e2e/context.test.ts test/hub/e2e/team.test.ts test/hub/e2e/branch-copies.test.ts` (they read the Director's next lines)

## Rollout & rollback
n/a — text only; ships in the bundle (Release builds it) and reaches this repo through `refresh-bin`. Rollback: revert the commit.

## Risks & open questions
- `dispatch` cuts its entries to `budgets.max_agents`. Director entries come early (row 2, after questions), so they are cut only when more than `max_agents` questions are open; the stall entry appears only when nothing else does. Acceptable for a hint; `dispatch --json` shows `more`.
- If P-032 lands first, its roles.ts edits (PM, release, executive and QA lines) merge beside this plan's Director rules; `land` resolves or bounces a textual conflict.

## Handoff

## Progress log

- 2026-10-25: status draft → ready — Architect: specced (ACs, tasks, test plan, exact touches)

## Outcome
