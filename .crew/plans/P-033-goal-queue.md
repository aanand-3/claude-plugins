---
id: P-033
title: Goal queue
goal: G-007
items: FEAT-041
touches: packages/crew/src/hub/commands/team/autonomy.ts, packages/crew/src/hub/core/work/queries.ts, packages/crew/test/goal-queue.test.ts, packages/crew/test/hub/e2e/goal-queue.test.ts, packages/crew/test/hub/run-check.test.ts, packages/crew/test/hub/e2e/team-2.test.ts, plugins/crew/skills/hub/references/model.md, plugins/crew/skills/team/SKILL.md
depends_on:
status: draft
branch: plan/P-033-goal-queue
pr:
created: 2026-10-25
started:
completed:
---

# P-033: Goal queue

## Context
W2-b of G-007 (design: `.crew/drafts/the-crew-team-was-pure-reef.md`, "W2-b: a goal queue"). Delivers FEAT-041.

Today `runState` (commands/team/autonomy.ts) stops the team when the focus goal is done ("the executive validates it and sets the next goals"), and nothing moves the focus on. After this plan, the goals the human approved (`active`, behind the `goal.active` human gate) form an ordered queue. When the focus goal is done (or dropped, or there is none), the hub moves the focus to the next goal in the queue, and the team stops only when no approved goal is left, or on an escalation, a pause or a budget stop, as today. The stop message reports what was finished.

The move is mechanical, so the hub makes it inside `runState`, which every pass runs first (`run --check` in `/crew:team` and in P-034's runner). No agent decides it. Who closes a goal stays separate: P-031 moves `goal.done` to the PM, and either gate works with this plan.

Design choice, recorded as a decision with this plan: **queue order is priority, then ID**, over the active goals, with the current focus first while it is open. There is no queue file and no new command: the human orders goals by their priority when approving them, and `focus G-###` still jumps the queue. A stored order would be one more document to keep in sync, for a need nobody has yet.

Needs no other plan's code. `crew-director.md` is P-031's (the design's open point): P-031's Director text says to set the next focus "unless the hub already moved it", which is true before and after this plan, so this plan leaves the agent text alone. Overlaps, for staffing only: P-027 on `autonomy.ts` (P-027 edits `usageHook`; this plan edits `runState`). `team/SKILL.md`, `model.md` and the test files are `hub.shared` once P-029 lands.

## Scope
**In:**
- `goalQueue(goals, focus)` in core/work/queries.ts: the `active` goals ordered by priority (P0 first, no priority last), then ID. The focus goal comes first when it is active. Proposed, done and dropped goals are never in the queue.
- `advanceFocus(store)` in autonomy.ts. When the focus is empty, unknown, `done` or `dropped`, and the queue has a goal, it sets the focus to the first one through `setFocus` (planning.ts, which logs `focus A → B` on the idea; a hub write, committed like any other) and returns `{ from, to }`. Otherwise it returns null. A `proposed` focus is left alone.
- `runState` calls `advanceFocus` first. The focus reasons become:
  - no focus and an empty queue, with done goals → `all approved goals done: G-001, G-007` (done goals by completion date). If proposed goals exist, `; waiting for approval: G-009` is appended.
  - no focus, an empty queue, nothing done → `no approved goal: the executive approves one (move G-### active --approved-by <name>)`, plus the same "waiting for approval" tail.
  - Escalation, held, pause and budget reasons are unchanged.
- `Stop` gains `queue: string[]` (the queue after any move) and `moved: { from, to } | null`. `run --check` prints `FOCUS  G-001 → G-002 (G-001 is done)` when it moved, and `QUEUE  G-002, G-003` on GO. `run --json` carries both fields.
- Docs: `model.md` gets a "Goal queue" paragraph (approved = active; order = priority, then ID; the hub moves the focus; `focus` overrides). `team/SKILL.md`'s "Unattended" stop list says "no approved goal left" instead of "a done or missing focus goal".

**Out (explicitly not doing):**
- A stored queue order or a `queue` command (see Context).
- Who closes a goal (`goal.done` role): P-031.
- Agent text (`director.md`, `pm.md`): P-031.
- The runner (`run --until-done`): P-034, which reads `runState` as it is after this plan.
- `status`/`context` showing the queue (reports.ts and context.ts belong to P-027 and P-039). A follow-up if wanted.
- Generated files: Release builds them.

## Acceptance criteria
- [ ] AC1 · `goalQueue` (unit, imports src): goals G-001 active P2, G-002 active P1, G-003 proposed P0, G-004 done, G-005 active with no priority give `[G-002, G-001, G-005]`. With focus G-001 they give `[G-001, G-002, G-005]`.
- [ ] AC2 · In a throwaway repo under `preset: lifecycle`, with focus G-001 done and G-002 active, `run --check` exits 0 and prints `FOCUS  G-001 → G-002`. Afterwards `.crew/idea.md` has `focus: G-002`, and its log has `focus G-001 → G-002`.
- [ ] AC3 · With G-001 done (focus) and G-002 only proposed, `run --check` exits 1 with `STOP  all approved goals done: G-001; waiting for approval: G-002`, and the focus is unchanged.
- [ ] AC4 · With no goal done and none active (G-001 proposed, no focus), `run --check` exits 1 with `no approved goal: the executive approves one`.
- [ ] AC5 · A dropped focus goal advances like a done one. A `proposed` focus goal is not replaced, and `run --check` keeps today's behaviour for it.
- [ ] AC6 · `run --check --json` has `queue` and `moved` (`{"from":"G-001","to":"G-002"}` in AC2's setup, null when nothing moved). The escalation, held, pause and budget cases in `run-check.test.ts` and `team-2.test.ts` pass, with only the done-focus expectation changed.
- [ ] AC7 · `model.md` has the "Goal queue" paragraph; `team/SKILL.md` no longer lists "a done or missing focus goal" as a stop.
- [ ] AC8 · `npm run typecheck` passes; autonomy.ts and queries.ts stay under 300 lines.

## Approach
- **queries.ts:** `goalQueue(goals: Docs, focus: string): string[]` beside `goalOrder`, using `PRIORITIES` for the rank. Pure, no store.
- **autonomy.ts:** `advanceFocus` before the focus check in `runState`. It imports `setFocus` from `../work/planning.js` (a commands→commands import, allowed). It replaces the two focus `reasons.push` lines. "Done goals by completion date" reads each goal's `completed:` field (stamped on `move … done`), then ID. `run()` prints the FOCUS/QUEUE lines from the new `Stop` fields.
- **Reuse:** `setFocus`, `PRIORITIES`, `CLOSED`, the throwaway-repo helpers (`newIdea`, `newGoal`, `tr`, `lifecycle`, `as`).
- **team-2.test.ts:** the closing expectation `toContain("G-001 is done")` becomes the new no-goal-left message. (P-031 edits the line above it, the closing role; the second to land resolves it, and test files are shared.)

## Tasks
- [ ] T1: `goalQueue` in queries.ts → verify: `cd packages/crew && npx vitest run test/goal-queue.test.ts` (AC1)
- [ ] T2: `advanceFocus`, the new focus reasons and `Stop` fields in autonomy.ts; the FOCUS/QUEUE lines → verify: `npm run build && npx vitest run test/hub/e2e/goal-queue.test.ts` (AC2–AC6)
- [ ] T3: existing suites follow the new message → verify: `npx vitest run test/hub/run-check.test.ts test/hub/e2e/team-2.test.ts` (AC6)
- [ ] T4: model.md and team/SKILL.md → verify: `grep -n "Goal queue" plugins/crew/skills/hub/references/model.md`; `grep -c "done or missing focus goal" plugins/crew/skills/team/SKILL.md` prints 0; `npx vitest run test/plugin` (AC7)
- [ ] T5: types and sizes → verify: `npm run typecheck`; `wc -l src/hub/commands/team/autonomy.ts src/hub/core/work/queries.ts` (AC8)

## Test plan
**Targeted checks** (from `packages/crew/`; e2e suites drive the built `dist/crew.mjs`: `npm run build` first, then discard the generated output, which Release builds):
- AC1 → `npx vitest run test/goal-queue.test.ts` (unit, new)
- AC2–AC5 → `npx vitest run test/hub/e2e/goal-queue.test.ts` (new)
- AC6 → `npx vitest run test/hub/e2e/goal-queue.test.ts -t json test/hub/run-check.test.ts test/hub/e2e/team-2.test.ts`
- AC7 → T4's greps; `npx vitest run test/plugin`
- AC8 → `npm run typecheck`; T5's `wc -l`

## Rollout & rollback
- Ships in the bundle (Release builds it); reaches this repo's agents when Release runs `refresh-bin` (P-024). No policy or agent change.
- Rollback: revert the plan's commit. A focus already moved stays where it is (an ordinary `focus` change).

## Risks & open questions
- `run --check` now writes (the focus) when it moves. The write is a hub document change, committed on the base branch like `focus G-###`. It happens only when the focus goal is closed. A read-only `--json` caller (the runner) sees the move in `moved`.
- Priority as the order: two P1 goals run by ID. If the human wants another order, they set priorities or `focus` explicitly; revisit with a stored order only if that proves too coarse.

## Handoff

## Progress log

## Outcome
