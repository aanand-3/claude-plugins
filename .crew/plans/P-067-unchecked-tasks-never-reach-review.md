---
id: P-067
title: Unchecked tasks never reach review, and dispatch never offers a refused accept
goal:
items: BUG-048
touches: packages/crew/src/hub/commands/work/workflow.ts, packages/crew/src/hub/core/work/transition-gates.ts, packages/crew/src/hub/commands/team/dispatch.ts, plugins/crew/docs/policy.md, plugins/crew/docs/plan-lifecycle.md, packages/crew/test/hub/e2e/execution.test.ts, packages/crew/test/hub/e2e/dispatch.test.ts
depends_on:
status: done
branch: plan/P-067-unchecked-tasks-never-reach-review
pr:
created: 2026-10-26
started: 2026-10-26
completed: 2026-10-26
assignee: developer
---

# P-067: Unchecked tasks never reach review, and dispatch never offers a refused accept

## Context
BUG-048 (S2, P2, found on P-060): a developer moved a plan to in-review with every task still `- [ ]`. After QA's evidence came in green, dispatch's in-review row (`packages/crew/src/hub/commands/team/dispatch.ts`, row 5) offered `pm: accept` on every pass. The `plan.accepted` gate in `guard()` (`packages/crew/src/hub/commands/work/workflow.ts`) refused that move because of the unchecked tasks. The loop stalled until a human asked the Director (Q-794258 → Q-ff5ed7).

Dispatch and the gate disagree: the accept gate checks tasks, evidence and review, but row 5 only checks evidence and review before it routes to the PM. The `plan.in-review` gate checks only learnings, so a plan can get into this state.

The fix has two parts:
1. **Prevent:** `move P-### in-review` refuses unchecked tasks, the same check the accept gate makes.
2. **Route:** for a plan that is already in review with unchecked tasks (moved before this fix, or moved with `--force`), dispatch sends the developer to finish the tasks. It never sends the PM to an accept the hub will refuse.

`next` gets its entries from `dispatch()` (`roles.ts`), so the routing fix covers `next` too. Related: FEAT-066 (a generic Director stall after N refused or bounced moves) is a separate safety net and is not part of this plan.

## Scope
**In:**
- `plan.in-review` gate: refuse while any task is unchecked, listing each one as `unchecked task: <text>`. `--force` still overrides, as for every gate.
- Gate label and docs: `TRANSITION_GATES["plan.in-review"].gate` becomes "Tasks checked and learnings recorded". Regenerate `plugins/crew/docs/policy.md` and `plugins/crew/docs/plan-lifecycle.md` with `npm run docs`.
- Dispatch row 5: an in-review plan with unchecked tasks, and no failed check, routes to `developer` with `finish P-###: tick its done tasks (<T-ids> unchecked), or move it back to in-progress`, resumed from the plan's last claim run. This comes before the code review, design review, QA and PM entries.

**Out (explicitly not doing):**
- Having `checkpoint --step` tick its task box (the root-cause note on BUG-048). This is a separate change to execution; capture it as an item if wanted.
- A generic stall after repeated refusals (FEAT-066).
- Changes to the `plan.accepted` gate.

## Acceptance criteria
- [ ] AC1: `move P-### in-review` on a plan with an unchecked task fails, names each unchecked task, and leaves the status at in-progress. The same plan with every task ticked (and a Learnings line) moves to in-review.
- [ ] AC2: `move P-### in-review --force` still moves a plan with unchecked tasks (gates stay overridable).
- [ ] AC3 (regression, BUG-048): this is the P-060 sequence: a plan forced into in-review with unchecked tasks, approved code review, and QA evidence green for every criterion. `dispatch --json` then gives a `developer` entry `finish P-###: …` for it, naming the unchecked T-ids. It gives no `pm` `accept` entry. After the tasks are ticked, the next `dispatch --json` gives `pm accept P-###`.
- [ ] AC4: a failing check on an in-review plan still routes to `developer fix` first, whether or not tasks are unchecked. A plan with every task ticked still gets the existing review → design review → QA → PM order. The existing dispatch tests pass unchanged.
- [ ] AC5: the gate table in `plugins/crew/docs/policy.md` and the transition table and diagram in `plugins/crew/docs/plan-lifecycle.md` read "Tasks checked and learnings recorded" for `plan.in-review`, and the docs test (`test/docs.test.ts`) passes.

## Approach
- `workflow.ts` `guard()`: in the `plan.in-review` branch, prepend `doc.tasks().filter(([done]) => !done).map(([, t]) => \`unchecked task: ${t}\`)` to `learningsProblems(...)`. This is the same expression the accepted branch uses; factor it into one small local helper used by both branches. For in-review, add one problem line after the list: `tick each done task \`- [x]\` in the plan's Tasks (no hub command ticks them)`.
- `transition-gates.ts`: change the `plan.in-review` gate text. The label `can't go to review` stays.
- `dispatch.ts` row 5: after the failing-check line, `const open = p.tasks().filter(([d]) => !d)`. If any task is unchecked, return `entry("developer", p.id, \`finish ${p.id}: tick its done tasks (${ids} unchecked), or move it back to in-progress\`, v.lastRun(p.id, "claim"))`. `ids` are the leading `T\d+` of each task text; if a task has no T-id, use its first words.
- Existing tests: the e2e helpers (`helpers.ts`, `team-helpers.ts`) already tick every task before a plan is handed over, so most fixtures pass as they are. Any test that moves a plan to in-review with unchecked tasks on purpose either ticks them first or uses `--force`. Test files are `hub.shared`.

## Design

## Tasks
- [x] T1: In-review gate refuses unchecked tasks (`workflow.ts`, `transition-gates.ts`) → verify: `cd packages/crew && npx vitest run test/hub/e2e/execution.test.ts` passes with new AC1 and AC2 cases
- [x] T2: Dispatch routes an in-review plan with unchecked tasks to its developer before review, QA or accept (`dispatch.ts`) → verify: `cd packages/crew && npx vitest run test/hub/e2e/dispatch.test.ts` passes with the new AC3 and AC4 cases
- [x] T3: Regenerate the gate docs (`npm run docs`) → verify: `cd packages/crew && npx vitest run test/docs.test.ts` passes and `grep -n "Tasks checked and learnings recorded" plugins/crew/docs/policy.md plugins/crew/docs/plan-lifecycle.md` shows the policy table row, the lifecycle diagram line and the lifecycle table row
- [x] T4: Fix any fixture the new gate breaks in the targeted files (tick tasks, or `--force` where the test means to skip the gate) → verify: `cd packages/crew && npx vitest run test/hub/e2e/execution.test.ts test/hub/e2e/dispatch.test.ts test/hub/e2e/land.test.ts test/docs.test.ts` all pass, and `npm run typecheck` is clean

## Test plan
**Targeted checks:**
- AC1, AC2: new cases in `packages/crew/test/hub/e2e/execution.test.ts`: refusal text lists the unchecked tasks and the status is unchanged; ticked plan moves; `--force` moves.
- AC3 (regression, fails before the fix): new case in `packages/crew/test/hub/e2e/dispatch.test.ts`: force a plan into in-review with unchecked tasks, approve the review, record independent passing evidence for every criterion, then assert `brief(dispatch)` holds `developer P-001 finish` and no `pm P-001 accept`. Tick the tasks and assert `pm P-001 accept`.
- AC4: existing dispatch cases ("in review: architect review, then a failing check…", "approved with evidence missing → QA") plus one new case: a failing check together with unchecked tasks gives `developer fix`.
- AC5: `packages/crew/test/docs.test.ts` (generated docs in sync) and the grep in T3.
- `packages/crew/test/hub/e2e/land.test.ts` asserts on gate refusal text; run it to confirm nothing changed there.

## Rollout & rollback
n/a: this changes hub behaviour only. The bundle is rebuilt by Release. To roll back, revert the commit. Plans already in review with unchecked tasks are routed to their developer as soon as this lands.

## Risks & open questions
- Some test outside the targeted files may move a plan to in-review with unchecked tasks. Release's full suite would catch it. Test files are `hub.shared`, so a fix there doesn't block other plans.
- A developer has no hub command that ticks boxes. They edit the plan file (K-2026-10-26-checkpoint-step-tn-and-handoff-never), so the refusal text should say so: "tick `- [x]` in the plan's Tasks".

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-067: Unchecked tasks never reach review, and dispatch never offers a refused accept [in-review] tasks 4/4 — claimed by Arpit Anand (developer:a10bfc1495e94a99d)
- last checkpoint 2026-10-26 14:16 at T4 (004e807) by Arpit Anand; since then 0 commit(s), 2 uncommitted file(s): plugins/crew/skills/hub/dist/crew.mjs, plugins/crew/skills/hub/dist/mcp.mjs
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —

Latest log:
- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-067-unchecked-tasks-never-reach-review

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-067-unchecked-tasks-never-reach-review
- 2026-10-26: status in-progress → in-review
- 2026-10-26: status in-review → accepted
- 2026-10-26: landed on main as 3eb5da3
- 2026-10-26: landed on main as 3eb5da3; full suite 71 files / 667 tests passed; no rollout steps beyond merge
- 2026-10-26: status accepted → done

## Outcome
`move P-### in-review` now refuses unchecked tasks (each listed, with a hint to tick `- [x]`); `--force` still overrides. Dispatch row 5 sends an in-review plan with unchecked tasks to its developer (`finish P-###: … (T-ids unchecked)`) after a failing check and before review, design review, QA and accept. Gate docs regenerated. No existing fixture needed changes.
Learnings: none
