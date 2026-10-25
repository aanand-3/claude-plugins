---
id: P-031
title: Hub dispatch
goal: G-007
items: FEAT-040
touches: packages/crew/src/hub/commands/team/dispatch.ts, packages/crew/src/hub/commands/team/dispatch.reg.ts, packages/crew/src/hub/commands/index.ts, packages/crew/src/hub/cli.ts, packages/crew/src/hub/mcp.ts, packages/crew/src/hub/core/team/presets.ts, packages/crew/test/hub/e2e/dispatch.test.ts, packages/crew/test/hub/e2e/team.test.ts, packages/crew/test/hub/e2e/team-2.test.ts, packages/crew/test/hub/registry.test.ts, packages/crew/test/mcp.test.ts, plugins/crew/skills/hub/agents/director.md, plugins/crew/skills/hub/agents/pm.md, plugins/crew/skills/team/SKILL.md, plugins/crew/skills/hub/SKILL.md, plugins/crew/skills/hub/references/model.md
depends_on:
status: in-review
branch: plan/P-031-hub-dispatch
pr:
created: 2026-10-25
started: 2026-10-25
completed:
assignee: developer
---

# P-031: Hub dispatch

## Context
W2-a of G-007 (design: `.crew/drafts/the-crew-team-was-pure-reef.md`, "W2-a: the hub dispatches; the PM owns each plan; the Director handles exceptions", with its dispatch table). Delivers FEAT-040.

Today an LLM Director pass decides every hand-off, and a subagent can't start other subagents, so only the top-level loop can launch role agents. Routing is mechanical given a plan's state and the role gates, so the hub decides it: a new `dispatch [--json]` lists one `{role, ref, task, resume}` entry per actionable thing, capped by `budgets.max_agents`, built from the gates and helpers that exist today (no new routing table). `/crew:team` becomes the dispatcher's executor; the PM owns each plan's lifecycle and goal closure (`goal.done` moves from director to pm); the Director handles exceptions and the goal queue only.

Is the `goal.done` change a reserved policy change? No: the human made this role change in the design (2026-10-25, "your choice"). It ships in the plugin's `lifecycle` preset (`core/team/presets.ts`), and reaches this repo only when Release refreshes `.crew/bin` (`refresh-bin`, governed by `release.refresh_bin`). `.crew/policy.yaml` is not edited.

Needs no other plan's code. It reads P-029's shared-aware staffing through `staffing()` whichever version is on the base, and registers its command the way the base does when it updates (see Approach). Overlaps, for staffing only: P-028 (`director.md`) and P-032 (`presets.ts`). After P-029 lands, `cli.ts`, `mcp.ts`, `commands/index.ts`, both `SKILL.md`s, `model.md` and the test files are `hub.shared`.

## Scope
**In:**
- `crew.mjs dispatch [--json]` and an MCP tool `dispatch` (same JSON): the dispatch table below, in priority order, one entry per document (one per question for questions), cut to `budgets.max_agents` entries (no cut when it is null).
- JSON: `{ "max_agents": 3 | null, "paused": null | "<reason>", "entries": [{ "role", "ref", "task", "resume" }], "more": <entries cut by the cap> }`. `resume` is the run that should continue the work (`<role>:<agent_id>`, as the guard names runs), or null. Text form: one `DISPATCH  <role>  <ref>  <task>` line per entry, then `… and N more (budgets.max_agents)`, or `nothing to dispatch` with the reason.
- The table, highest priority first:
  1. **Questions:** an open question addressed to a role other than the executive → that role: `answer Q-…`. This covers the bounce and attempt limits (the hub already asks the Director) and a human's steering question (`ask --to director …`).
  2. **Director exceptions:** a stale claim (`staleClaims`) → director: `reassign P-###`. A `blocked` plan → director: unblock. The focus goal missing, done or dropped while another goal is active → director: `focus G-###`, naming the first active goal by priority, then ID.
  3. **Urgent bugs:** a `new` BUG with severity S1 or priority P0 → pm: triage.
  4. **Release:** the first plan in `mergeOrder().merge` → release: merge it (one entry at most; merging is serial).
  5. **In review:** if an acceptance criterion's latest check failed → developer: fix, with `resume` = the plan's implementer run (the last claim's run). Else, if `reviewProblems` is non-empty → architect: review. Else, if any criterion lacks passing independent evidence → qa: test, with `resume` = the last QA run that checkpointed this plan. Else → pm: complete (`move P-### done`).
  6. **Goal closure:** the focus goal is active and all its plans are closed and items done → pm: verify each criterion and `move G-### done`.
  7. **In progress:** claimed → developer: continue (`resume P-###`), with `resume` = the claim's run. Unclaimed → developer: `start P-###` (it takes the branch over), with `resume` = the last claimer.
  8. **Ready to start:** a plan in `staffing().start` that is assigned → its assignee role: `start P-###`. One that isn't assigned → pm: `assign P-### --to developer [--team T]`.
  9. **Triage:** other `new` items → pm: triage, in `ranked` order.
  10. **Spec**, only while fewer plans are `ready` and unclaimed than `max_agents` (counting the spec entries this pass adds; no limit when `max_agents` is null): `draft` plans → architect: spec to ready. Then `triaged` items with no plan that may be worked now (on the focus goal, or BUG/CHORE off focus: `OFF_FOCUS_OK`) → architect: write a plan, in `ranked` order.
  11. **Stall:** nothing above matched, but open plans or items exist → director: one entry, "nothing can move", with `staffing().waiting`'s reasons.
- Skipped everywhere: documents an open escalation holds (`escalationHolds().held`). While the team is paused, `entries` is empty and `paused` gives the reason.
- `presets.ts`: `goal.done: "pm"`. The Director keeps `plan.reassigned`.
- Role text:
  - `director.md`: the step-by-step hand-off loop and the staffing roster are removed. The Director runs when dispatch gives it an entry: answer questions, reassign stale work, unblock, diagnose a stall (re-spec, split or drop goes to the Architect or PM as `ask`), set the next focus when the hub hasn't, escalate what is reserved. It never launches agents.
  - `pm.md`: tasks come from dispatch. Triage, assign and complete stay. Goal closure is new: verify each criterion, then `move G-### done`.
- `team/SKILL.md`, "Each run": a pass is (1) `run --check` (STOP → report and end), (2) `dispatch --json`, (3) for each entry, in parallel, launch `crew-<role>` with the ref and task, or resume the agent the roster holds for `resume` (its agent ID follows the colon in the run), (4) wait for the reports, (5) repeat until dispatch is empty or `run --check` says STOP. This session never chooses the routing. Escalations are put to the user as today.
- `model.md`: `goal.done → pm` in the lifecycle preset text; a short "Dispatch" paragraph. `hub/SKILL.md`: a `dispatch` row, if it still has a command table when this plan updates to the base.

**Out (explicitly not doing):**
- Idle runs to the Director: P-034 adds that row (it needs P-027's `liveRuns`).
- The goal queue and moving the focus automatically: P-033. Until then, row 2 sends the Director to `focus` the next goal.
- The runner (`run --until-done`): P-034. The inbox: P-035.
- `next --role` (roles.ts) stays as it is. Its Director rules still describe the old loop; that is a follow-up once dispatch is in use, not this plan.
- Re-rendering `.claude/agents/**`, refreshing `.crew/bin`, any change to `.crew/policy.yaml` (human-reserved; see Rollout).
- Generated files (`plugins/crew/skills/hub/dist/**`, `references/commands.md`): Release builds them.

## Acceptance criteria
- [ ] AC1 · Items and specs: in a throwaway repo under `preset: lifecycle` with a focused active goal, `dispatch --json` gives pm/triage for a `new` FEAT; architect/spec for a `draft` plan; architect/"write a plan" for a `triaged` focus item with no plan; nothing for a triaged FEAT of another goal. A `new` BUG with `--severity S1` comes before release, review and every later row.
- [ ] AC2 · The plan pipeline, one fixture per row: ready and staffed but unassigned → pm/assign; assigned → developer/start; in progress and claimed → developer/continue with `resume` = the claim's run; in review without approval → architect/review; approved, evidence missing → qa/test; a failing check → developer/fix with `resume` = the implementer run; approved with full evidence → pm/complete; done and not merged → release/merge (only the first in `merge-order`).
- [ ] AC3 · Exceptions go to the Director: a stale claim (`limits.stale_claim_hours: 0`) → director/reassign; a `blocked` plan → director; focus goal done while another goal is active → director/`focus G-002`; open work that can't move (P-002 ready and depending on P-001, P-001 held by an open escalation, nothing else open) → one director/stall entry naming "depends on P-001".
- [ ] AC4 · A question `ask P-001 --to architect "…"` gives architect/`answer Q-…`, and a human's `ask --to director "…"` with no ref gives director/`answer Q-…`. Escalations to the executive give no entry, and the plan an escalation holds gets no entry.
- [ ] AC5 · The cap: with `budgets.max_agents: 2` and four actionable documents, `entries` has the two highest-priority entries and `more` is 2. With no `max_agents`, nothing is cut. No two entries share a ref.
- [ ] AC6 · The spec frontier: with `max_agents: 2` and two ready, unclaimed plans, no architect spec entry appears; with one ready plan, at most one appears.
- [ ] AC7 · Paused (`pause --reason x`): `entries` is empty, `paused` is `"x"`, and the text form says the team is paused.
- [ ] AC8 · Under `preset: lifecycle`, `move G-001 done` by the pm succeeds once the goal is verified with nothing open, and by the director is refused "for the pm role". `policy show` lists `role_gates goal.done pm`.
- [ ] AC9 · The MCP tool `dispatch` returns the same JSON as `dispatch --json`; `dispatch` appears in `crew.mjs help`.
- [ ] AC10 · `director.md` no longer has the hand-off loop (no "hand each to the role" or roster step) and says the Director acts on dispatch entries; `pm.md` has goal closure; `team/SKILL.md`'s "Each run" runs `run --check` → `dispatch --json` → one agent per entry; `model.md` says `goal.done → pm`.
- [ ] AC11 · `npm run typecheck` passes; `dispatch.ts` and every touched module stay under 300 lines; the team, team-2, basics and mcp suites pass with only the goal-closer role changed in their assertions and `dispatch` added to mcp.test.ts's tool list; `npx vitest run test/hub/registry.test.ts` passes with `registry-before.json` unchanged (`git diff --quiet main -- test/hub/registry-before.json`).

## Approach
- **`commands/team/dispatch.ts` (new):** `dispatch(store): Dispatch` (pure over the stores and ledger) and `dispatchCmd(store, json)`. Reuse, never copy: `staffing` (team.ts), `staleClaims`/`paused` (liveness.ts), `openQuestions`/`escalationHolds` (questions.ts), `evidence`/`implementers` (execution.ts), `reviewProblems` (review.ts), `mergeOrder` (release.ts), `ranked`/`itemStatus`/`goalPlans`/`goalItems`/`onFocus` (core/work/queries.ts), `OFF_FOCUS_OK`/`CLOSED` (model.ts). Read plans with `store.plans()` (main checkout, P-026). Each row is a small function `(view) => Entry[]`; `dispatch` concatenates them in table order, drops held refs and repeated refs (the first entry wins), then cuts to `max_agents`. If dispatch.ts nears 300 lines, the rows move to `dispatch-rows.ts`.
- **"Latest check failed"** means the newest verify covering that AC in the plan's checkpoints has `ok: false` (the same reading as `evidence()`). The QA `resume` is the last `checkpoint` event on the plan whose role is `qa`.
- **Registration:** if `commands/index.ts` exists when this branch updates to the base (P-030 landed), the CLI spec, help line and MCP tool go in `commands/team/dispatch.reg.ts` with one import line in `commands/index.ts` (K-2026-10-25-each-command-registers-its-cli-spec-help). Otherwise they go in cli.ts (`COMMANDS`, `USAGE`, after `staff`) and mcp.ts (`TOOLS`), and P-030 moves them when it next updates. Touches name both.
- **Registry tests (Q-5212df):** `registry-before.json` stays frozen (it records P-030's split, not the current registry). `registry.test.ts` checks that the commands, help lines and tools from before the split are unchanged, not that nothing was added: compare `inventory()` restricted to BEFORE's keys with BEFORE, and require BEFORE's command and tool names to be a subset of `REGISTRY.from`'s. Later plans that add a command then need no edit there. `mcp.test.ts`: add `dispatch` to the sorted tool-name list.
- **presets.ts:** one value. **team.test.ts / team-2.test.ts:** the lines that close a goal `as director` become `as pm`, and "for the director role" becomes "for the pm role".
- **Tests (`test/hub/e2e/dispatch.test.ts`, new):** one `it` per row group, built from `lifecycle`, `plan`, `as`, `started`, `inReview`, `ship` in `team-helpers.ts` and `qaDone`/`finish` in `helpers.ts`. Each asserts on `JSON.parse(dispatch --json)`.

## Tasks
- [x] T1: dispatch.ts rows 1–11, held/paused handling, cap and frontier → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/dispatch.test.ts` (AC1–AC7)
- [x] T2: registration (`dispatch.reg.ts` + index line, or cli.ts + mcp.ts) and the text form → verify: `npx vitest run test/hub/e2e/dispatch.test.ts -t mcp` and `node plugins/crew/skills/hub/dist/crew.mjs help | grep dispatch` (AC9)
- [x] T3: `goal.done: pm` in presets.ts; team/team-2 assertions → verify: `npx vitest run test/hub/e2e/team.test.ts test/hub/e2e/team-2.test.ts test/hub/e2e/dispatch.test.ts -t goal` (AC8)
- [x] T4: director.md, pm.md, team/SKILL.md "Each run", model.md (and hub/SKILL.md's row if the table still exists) → verify: `grep -c "hand each to the role" plugins/crew/skills/hub/agents/director.md` prints 0; `grep -n "dispatch --json" plugins/crew/skills/team/SKILL.md plugins/crew/skills/hub/agents/director.md`; `grep -n "goal.done.*pm" plugins/crew/skills/hub/references/model.md`; `npx vitest run test/plugin` (AC10)
- [ ] T5: types, sizes, registry tests (see Approach), unchanged suites → verify: `npm run typecheck`; `wc -l src/hub/commands/team/dispatch*.ts`; `npx vitest run test/hub/e2e/basics.test.ts test/mcp.test.ts test/hub/registry.test.ts`; `git diff --quiet main -- test/hub/registry-before.json` (AC11)

## Test plan
**Targeted checks** (from `packages/crew/`; the e2e suites drive the built `dist/crew.mjs`, so run `npm run build` first, then discard the generated output — `git checkout -- ../../plugins/crew/skills` and `git clean` of new dist files — since Release builds it):
- AC1–AC7 → `npx vitest run test/hub/e2e/dispatch.test.ts`
- AC8 → `npx vitest run test/hub/e2e/team.test.ts test/hub/e2e/team-2.test.ts test/hub/e2e/dispatch.test.ts -t goal`
- AC9 → `npx vitest run test/hub/e2e/dispatch.test.ts -t mcp`; the `help | grep dispatch` check
- AC10 → T4's greps; `npx vitest run test/plugin`
- AC11 → `npm run typecheck`; T5's `wc -l`; `npx vitest run test/hub/e2e/basics.test.ts test/mcp.test.ts test/hub/registry.test.ts`; T5's `git diff --quiet`

## Rollout & rollback
- Ships in the plugin (bundle built by Release, agent sources, team skill).
- **In this repo, after merge (human / escalation):** Release runs `refresh-bin` (P-024) so `.crew/bin/crew.mjs` has `dispatch` and the new `goal.done` gate. The human then re-renders `.claude/agents/**` (`crew.mjs agents`; protected), so the Director and PM read their new text, and starts a new session. Until then this repo's rendered Director still runs the old loop, which keeps working: the gates it uses are unchanged except `goal.done`, which only takes effect with the refreshed bin.
- Rollback: revert the plan's commit. A goal the PM closed stays done (the gate checks only who moves it).

## Risks & open questions
- Dispatch and `next --role` can disagree until roles.ts follows dispatch. Dispatch is what `/crew:team` executes; `next` stays a per-role view.
- An agent resumed across `claude -p` passes isn't available to SendMessage (a new session has no roster). `resume` is then a hint, and the executor starts a fresh agent that reads `resume P-###` from the hub.
- The stall row may fire for work that is waiting correctly (on a dependency in progress elsewhere). It does so only when nothing else is dispatchable, and the Director's answer is to report it.
- Merge-conflict surface: team-2.test.ts is also edited by P-033 (the "is done" message next to the goal-close line). Both are shared test files; the second to land resolves it.

## Handoff

_Generated 2026-10-25 by `crew.mjs handoff` from the ledger._

- P-031: Hub dispatch [in-review] tasks 4/5 — claimed by Arpit Anand (developer:ad203d7d12e3f9fc1)
- last checkpoint 2026-10-25 12:49 at T5 (0e2bd18) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- next: T5: types, sizes, registry tests (see Approach), unchanged suites → verify: `npm run typecheck`; `wc -l src/hub/commands/team/dispatch*.ts`; `npx vitest run test/hub/e2e/basics.test.ts test/mcp.test.ts test/hub/registry.test.ts`; `git diff --quiet main -- test/hub/registry-before.json` (AC11)
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —, AC6 —, AC7 —, AC8 —, AC9 —, AC10 —, AC11 —

Latest log:
- 2026-10-25: status draft → ready
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-031-hub-dispatch

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-031-hub-dispatch
- 2026-10-25: status in-progress → in-review

## Outcome
Learnings: K-2026-10-25-a-plan-that-adds-a-hub-command-or-mcp, K-2026-10-25-dispatch-commands-team-dispatch-ts-is, K-2026-10-25-approved-with-one-change-do-not-edit
