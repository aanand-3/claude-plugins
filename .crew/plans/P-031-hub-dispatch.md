---
id: P-031
title: Hub dispatch
goal: G-007
items: FEAT-040
touches: packages/crew/src/hub/commands/team/dispatch.ts, packages/crew/src/hub/commands/team/dispatch.reg.ts, packages/crew/src/hub/commands/index.ts, packages/crew/src/hub/cli.ts, packages/crew/src/hub/mcp.ts, packages/crew/src/hub/core/team/presets.ts, packages/crew/test/hub/e2e/dispatch.test.ts, packages/crew/test/hub/e2e/team.test.ts, packages/crew/test/hub/e2e/team-2.test.ts, packages/crew/test/hub/e2e/goal-queue.test.ts, packages/crew/test/hub/registry.test.ts, packages/crew/test/mcp.test.ts, plugins/crew/skills/hub/agents/director.md, plugins/crew/skills/hub/agents/pm.md, plugins/crew/skills/team/SKILL.md, plugins/crew/skills/hub/SKILL.md, plugins/crew/skills/hub/references/model.md
depends_on:
status: done
branch: plan/P-031-hub-dispatch
pr:
created: 2026-10-25
started: 2026-10-25
completed: 2026-10-25
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
- [ ] AC12 · Every test that closes a goal under `preset: lifecycle` does so as the pm: `goal-queue.test.ts`'s `close()` helper runs `as(repo, "pm", "move", g, to, "--force")` (for `done` and `dropped`; `goal.dropped` is ungated), and `npx vitest run test/hub/e2e/goal-queue.test.ts` passes all 5 tests (AC2–AC6 of P-033) with no other line of that file changed. No test outside `dispatch.test.ts` / `team.test.ts` (which assert the refusal on purpose) moves a goal to `done` as the director (`grep -rnE '"director", "move", [^)]*"done"' test/hub` lists only those two), and `grep -c '"director"' test/hub/e2e/goal-queue.test.ts` prints 0.

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
- [x] T5: types, sizes, registry tests (see Approach), unchanged suites → verify: `npm run typecheck`; `wc -l src/hub/commands/team/dispatch*.ts`; `npx vitest run test/hub/e2e/basics.test.ts test/mcp.test.ts test/hub/registry.test.ts`; `git diff --quiet main -- test/hub/registry-before.json` (AC11)
- [x] T6: `goal-queue.test.ts` line 20, `close()`: `as(repo, "director", …)` → `as(repo, "pm", …)` (P-033's goal-queue test closes goals as the director, which the new `goal.done: pm` gate refuses; Release's full suite caught it on 7515f1b) → verify: `npm run build && npx vitest run test/hub/e2e/goal-queue.test.ts` (5 passed); T6's grep in AC12 (AC12)

## Test plan
**Targeted checks** (from `packages/crew/`; the e2e suites drive the built `dist/crew.mjs`, so run `npm run build` first, then discard the generated output — `git checkout -- ../../plugins/crew/skills` and `git clean` of new dist files — since Release builds it):
- AC1–AC7 → `npx vitest run test/hub/e2e/dispatch.test.ts`
- AC8 → `npx vitest run test/hub/e2e/team.test.ts test/hub/e2e/team-2.test.ts test/hub/e2e/dispatch.test.ts -t goal`
- AC9 → `npx vitest run test/hub/e2e/dispatch.test.ts -t mcp`; the `help | grep dispatch` check
- AC10 → T4's greps; `npx vitest run test/plugin`
- AC11 → `npm run typecheck`; T5's `wc -l`; `npx vitest run test/hub/e2e/basics.test.ts test/mcp.test.ts test/hub/registry.test.ts`; T5's `git diff --quiet`
- AC12 → `npx vitest run test/hub/e2e/goal-queue.test.ts`; `grep -rnE '"director", "move", [^)]*"done"' test/hub` (only dispatch.test.ts and team.test.ts, both asserting the refusal)

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

- P-031: Hub dispatch [in-review] tasks 6/6 — claimed by Arpit Anand (developer:a9de166b4a3040f9f)
- last checkpoint 2026-10-25 15:08 at T6 (4da1e87) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- ✓ npx vitest run test/hub/e2e/dispatch.test.ts -t 'AC1\)' (AC 1)
- ✗ npx vitest run test/hub/e2e/dispatch.test.ts -t 'AC2\)' (AC 2) — ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
- ✓ npx vitest run test/hub/e2e/dispatch.test.ts -t 'AC3\)' (AC 3)
- ✓ npx vitest run test/hub/e2e/dispatch.test.ts -t 'AC4\)' (AC 4)
- ✓ npx vitest run test/hub/e2e/dispatch.test.ts -t 'the plan pipeline' (AC 2)
- ✗ npx vitest run test/hub/e2e/dispatch.test.ts -t 'in review: architect' (AC 2) — ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
- ✗ npx vitest run test/hub/e2e/dispatch.test.ts -t 'approved with evidence missing' (AC 2) — ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
- ✗ npx vitest run test/hub/e2e/dispatch.test.ts -t 'a done, unmerged' (AC 2) — ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
- ✓ env | grep -i crew; npx vitest run test/hub/e2e/dispatch.test.ts -t 'a done, unmerged' 2>&1 | head -60 (AC 2)
- ✓ sh /private/tmp/claude-502/-Users-aanand-Documents-Projects-Personal-claude-plugins/a0656153-a37f-49d7-8e02-2a018492b918/scratchpad/t.sh (AC 2)
- ✓ sh /private/tmp/claude-502/-Users-aanand-Documents-Projects-Personal-claude-plugins/a0656153-a37f-49d7-8e02-2a018492b918/scratchpad/c-2.sh (AC 2)
- ✓ sh /private/tmp/claude-502/-Users-aanand-Documents-Projects-Personal-claude-plugins/a0656153-a37f-49d7-8e02-2a018492b918/scratchpad/c-5.sh (AC 5)
- ✓ sh /private/tmp/claude-502/-Users-aanand-Documents-Projects-Personal-claude-plugins/a0656153-a37f-49d7-8e02-2a018492b918/scratchpad/c-6.sh (AC 6)
- ✓ sh /private/tmp/claude-502/-Users-aanand-Documents-Projects-Personal-claude-plugins/a0656153-a37f-49d7-8e02-2a018492b918/scratchpad/c-7.sh (AC 7)
- ✓ sh /private/tmp/claude-502/-Users-aanand-Documents-Projects-Personal-claude-plugins/a0656153-a37f-49d7-8e02-2a018492b918/scratchpad/c-8.sh (AC 8)
- ✓ sh /private/tmp/claude-502/-Users-aanand-Documents-Projects-Personal-claude-plugins/a0656153-a37f-49d7-8e02-2a018492b918/scratchpad/c-9.sh (AC 9)
- ✓ sh /private/tmp/claude-502/-Users-aanand-Documents-Projects-Personal-claude-plugins/a0656153-a37f-49d7-8e02-2a018492b918/scratchpad/c-9b.sh (AC 9)
- ✓ sh /private/tmp/claude-502/-Users-aanand-Documents-Projects-Personal-claude-plugins/a0656153-a37f-49d7-8e02-2a018492b918/scratchpad/c-10.sh (AC 10)
- ✓ sh /private/tmp/claude-502/-Users-aanand-Documents-Projects-Personal-claude-plugins/a0656153-a37f-49d7-8e02-2a018492b918/scratchpad/c-11.sh (AC 11)
- evidence: AC1 ✓, AC2 ✓, AC3 ✓, AC4 ✓, AC5 ✓, AC6 ✓, AC7 ✓, AC8 ✓, AC9 ✓, AC10 ✓, AC11 ✓, AC12 —

Latest log:
- 2026-10-25: architect: diagnosed Release's goal-queue failure on 7515f1b — goal-queue.test.ts close() closes goals as the director, refused by P-031's goal.done: pm gate. Fix (verified with a temporary copy: 5/5 pass): close() runs as pm. Spec updated: goal-queue.test.ts added to touches, AC12, T6, test-plan line. Re-review needed after the change.
- 2026-10-25: status done → in-progress — full-suite failure: test/hub/e2e/goal-queue.test.ts close() runs director move done, refused by the new pm-only goal.done gate
- 2026-10-25: developer: T6 done in the worktree but not committed. git merge main is in progress: all conflicts resolved and staged (registry.test.ts keeps the arrayContaining subset line, mcp.test.ts lists dispatch and suites, hub dist takes main's side) except .crew/bin/crew.mjs, which the policy protects from the developer, so the merge and the T6 checkpoint cannot be committed. goal-queue.test.ts close() now runs as pm (unstaged, one line); build + goal-queue 5/5 pass; AC12 greps: only dispatch.test.ts:221 and team.test.ts:173, count 0. Needs Release (refresh-bin) or the Director to resolve .crew/bin/crew.mjs --as developer --run-id developer:a9de166b4a3040f9f to main's side, then re-run the T6 checkpoint. Unstaged change to .claude/agents/crew-release.md in the worktree is not the developer's.

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-031-hub-dispatch
- 2026-10-25: status in-progress → in-review
- 2026-10-25: architect review: approved at 0e2bd18. Owed in the plan file (developer, no code change): tick T5 (its checks pass: typecheck, wc -l 161/18, basics/mcp/registry green, registry-before.json unchanged) and complete the Outcome with what shipped and the one deviation — AC5's 'no max_agents' case is not reachable through policy (default 4, no null override), so the test uses a cap above the work; the null path in dispatch() is covered by code reading only.
- 2026-10-25: developer: ticked T5 and completed the Outcome (what shipped, AC5 deviation) as the architect review asked; no code change
- 2026-10-25: status in-review → done
- 2026-10-25: Release: NOT merged. Full suite failed on 7515f1b: test/hub/e2e/goal-queue.test.ts 3 tests (AC2, AC3, AC6) - director 'move G-001 done --force' refused: 'G-001 -> done is for the pm role; this run is the director role'. Passes on main.
- 2026-10-25: architect: diagnosed Release's goal-queue failure on 7515f1b — goal-queue.test.ts close() closes goals as the director, refused by P-031's goal.done: pm gate. Fix (verified with a temporary copy: 5/5 pass): close() runs as pm. Spec updated: goal-queue.test.ts added to touches, AC12, T6, test-plan line. Re-review needed after the change.
- 2026-10-25: status done → in-progress — full-suite failure: test/hub/e2e/goal-queue.test.ts close() runs director move done, refused by the new pm-only goal.done gate
- 2026-10-25: developer: T6 done in the worktree but not committed. git merge main is in progress: all conflicts resolved and staged (registry.test.ts keeps the arrayContaining subset line, mcp.test.ts lists dispatch and suites, hub dist takes main's side) except .crew/bin/crew.mjs, which the policy protects from the developer, so the merge and the T6 checkpoint cannot be committed. goal-queue.test.ts close() now runs as pm (unstaged, one line); build + goal-queue 5/5 pass; AC12 greps: only dispatch.test.ts:221 and team.test.ts:173, count 0. Needs Release (refresh-bin) or the Director to resolve .crew/bin/crew.mjs --as developer --run-id developer:a9de166b4a3040f9f to main's side, then re-run the T6 checkpoint. Unstaged change to .claude/agents/crew-release.md in the worktree is not the developer's.
- 2026-10-25: status in-progress → in-review
- 2026-10-25: status in-review → done
- 2026-10-25: merged to main as 34e9472 (squash); full suite green (exit 0); build + refresh-bin done in plan commit; human step pending: re-render .claude/agents (crew.mjs agents) and start new session

## Outcome
Shipped: the hub command `dispatch [--json]` and the MCP tool `dispatch` (same JSON) in `commands/team/dispatch.ts` (rows 1–11, held/paused handling, the `max_agents` cap with `more`, the spec frontier), registered via `dispatch.reg.ts`; `goal.done: pm` in the lifecycle preset; director.md, pm.md, team/SKILL.md "Each run", model.md and hub/SKILL.md's row updated to the dispatch loop; registry.test.ts compares only the pre-split commands/tools with the frozen `registry-before.json`; `dispatch` added to mcp.test.ts's tool list; new e2e `dispatch.test.ts`. T5 checks pass: typecheck, `wc -l` 161/18, basics/mcp/registry green, `registry-before.json` unchanged. Reopened for the full-suite failure: T6 makes `goal-queue.test.ts`'s `close()` run as the pm (5/5 pass); AC12 greps list only dispatch.test.ts and team.test.ts, `"director"` count 0 in goal-queue.test.ts. Branch merged with main up to 6b426a4 (P-042, P-043, P-044); diff vs main is P-031's files only.
Deviations: AC5's "no `max_agents`" case can't be set through policy (the default is 4 and nothing overrides it to null), so the test uses a cap above the work instead; the null path in `dispatch()` is checked only by reading the code.
Follow-ups: none beyond those listed under Scope "Out".
Learnings: K-2026-10-25-a-plan-that-adds-a-hub-command-or-mcp, K-2026-10-25-dispatch-commands-team-dispatch-ts-is, K-2026-10-25-approved-with-one-change-do-not-edit
