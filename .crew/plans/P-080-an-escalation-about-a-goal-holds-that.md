---
id: P-080
title: An escalation about a goal holds that goal, not the team
goal: G-007
items: BUG-051
touches: packages/crew/src/hub/commands/team/questions.ts, packages/crew/src/hub/commands/team/autonomy.ts, plugins/crew/skills/hub/references/model.md, plugins/crew/skills/team/SKILL.md, packages/crew/test/hub/run-check.test.ts, packages/crew/test/hub/e2e/inbox.test.ts, packages/crew/test/hub/e2e/dispatch.test.ts
depends_on:
status: in-progress
branch: plan/P-080-an-escalation-about-a-goal-holds-that
pr:
created: 2026-10-27
started: 2026-10-27
completed:
assignee: developer
---

# P-080: An escalation about a goal holds that goal, not the team

## Context
BUG-051 (G-007): an open escalation whose ref is a goal makes `run --check` STOP with "waiting for the executive", so the unattended runner dispatches nothing. On 2026-10-26, Q-088a6e on G-005 (a goal-document edit) froze every plan, landing and review for about 20 minutes. In the same check, an item escalation (Q-d55a87 on FEAT-074) only held FEAT-074.

The rule is already decided in K-2026-10-26-mostly-right-with-one-change-drop-the-if (the answer to Q-d77055). The rule depends only on the ref. An open escalation about a goal holds that goal and nothing else: the open blocking question already refuses the goal's forward moves, and dispatch gives no entry whose ref is the goal. The goal's plans and items keep moving. An escalation stops the team only when it has no ref or its ref is the IDEA. A policy escalation has no ref, because `kindOf` knows only idea, goal, plan and item. The "escalations hold every open plan and item" stop stays as it is, and held goals don't count toward it. If the focus goal is held and nothing else can move, dispatch's existing stall entry reports it.

The split lives in one function, `escalationHolds()` in `packages/crew/src/hub/commands/team/questions.ts`. `run --check` (`runState` in autonomy.ts), `dispatch` and `inbox` all use it, so one change fixes all three.

## Scope
**In:**
- `escalationHolds()` treats a `goal` ref like a plan or item ref: it goes into `held`, not `stops`. Fix its doc comment to match.
- Update the `runState` docstring in autonomy.ts, which today says it stops on an escalation "that isn't about one plan or item".
- Docs: the Inbox and Dispatch paragraphs of `plugins/crew/skills/hub/references/model.md`, and the "It stops" line of `plugins/crew/skills/team/SKILL.md`.
- Regression tests in run-check.test.ts, inbox.test.ts and dispatch.test.ts.

**Out (explicitly not doing):**
- Holding a goal's plans or items when its goal is escalated. If that work must wait, the asker escalates on those plans or items, or the Director pauses the team.
- Telling scope escalations apart from other escalations. The hub sees only the ref.
- A "policy" ref kind.
- Changes to inbox.ts, dispatch.ts or the stall entry. They read `held` and pick up goals with no change.
- Letting roles edit goal or item bodies (FEAT-075).
- Regenerated files (dist, commands.md). Release builds them.

## Acceptance criteria
- [ ] AC1: In a repo with an active focus goal G-001 and two ready plans, an open escalation on G-001 makes `run --check` exit 0 and print `GO` and `HELD  G-001 (Q-…)`. `run --check --json` has `stop: false` and a `held` entry starting `G-001 (`. (Regression: before the fix, the same run exits 1 with `STOP  waiting for the executive`.)
- [ ] AC2: An escalation with no ref, or with the IDEA as its ref, still makes `run --check` exit 1 with `waiting for the executive` and the question's text.
- [ ] AC3: With an escalation open on G-001, `dispatch --json` has no entry whose ref is G-001, but still has entries for the goal's ready plans (P-001 and P-002).
- [ ] AC4: `inbox --json` shows an escalation on G-001 with `holds: "holds G-001"`. A no-ref escalation still shows `holds: "stops the team"`.
- [ ] AC5: The `escalationHolds` and `runState` doc comments, the Inbox and Dispatch paragraphs in model.md, and the "It stops" line in team/SKILL.md all say that a plan, item or goal escalation holds only that document, and that only an escalation with no ref (or about the idea) stops the team. Check: `grep -n "plan, item or goal" plugins/crew/skills/hub/references/model.md plugins/crew/skills/team/SKILL.md` returns at least one line per file, and `grep -n "about the idea or a goal" packages/crew/src` returns nothing.

## Approach
- questions.ts: change the test to `kind === "plan" || kind === "item" || kind === "goal"`. Everything else is already ref-generic. `runState`'s "hold every open" check only looks at plan and item IDs, so held goals never count toward it. Dispatch's `held.has(e.ref)` filter drops goal-ref entries such as "PM closes G-###". The stall entry lists held refs. Inbox labels a held ref `holds <ref>`.
- autonomy.ts: change the docstring only, no logic. The module stays under 300 lines (K-2026-10-23-every-module-stays-under-300-lines).
- Tests use the existing helpers: `setup()` in run-check.test.ts, and the fixtures in inbox.test.ts and dispatch.test.ts. Update run-check.test.ts's header comment too, which says a goal escalation stops the team.

## Design
n/a (no UI paths).

## Tasks
- [ ] T1: Add the failing regression tests first. run-check.test.ts covers AC1 and AC2 (the IDEA case is new; the no-ref case already exists). inbox.test.ts covers AC4 and dispatch.test.ts covers AC3. → verify: `cd packages/crew && npx vitest run test/hub/run-check.test.ts test/hub/e2e/inbox.test.ts test/hub/e2e/dispatch.test.ts`, where the new goal cases fail before T2.
- [ ] T2: Fix `escalationHolds()` and its doc comment in questions.ts. → verify: the same command passes, and `npm run typecheck` in packages/crew is clean.
- [ ] T3: Update the `runState` docstring in autonomy.ts and the header comment in run-check.test.ts. → verify: the `grep -n "about the idea or a goal" packages/crew/src` check from AC5 returns nothing.
- [ ] T4: Update the model.md Inbox and Dispatch paragraphs and the team/SKILL.md "It stops" line. → verify: the AC5 grep for "plan, item or goal" finds each file.

## Test plan
**Targeted checks:**
- `packages/crew/test/hub/run-check.test.ts`: a goal escalation gives HELD G-001 and exit 0 (AC1). A no-ref escalation and an IDEA escalation give STOP and exit 1 (AC2).
- `packages/crew/test/hub/e2e/dispatch.test.ts`: a goal escalation gives no G-001 entry and keeps the P-001 and P-002 entries (AC3).
- `packages/crew/test/hub/e2e/inbox.test.ts`: `holds G-001` for a goal escalation and `stops the team` for a no-ref one (AC4).
- `npm run typecheck` in packages/crew (T2).
- The greps in AC5 (docs and comments).

## Rollout & rollback
n/a: a hub-internal rule change. Release rebuilds and refreshes `.crew/bin` when it lands. To roll back, revert the squash commit; goal escalations then stop the team again.

## Risks & open questions
- A goal escalation about scope no longer stops work under that goal. This is decided: the asker escalates on the affected plans or items, or the Director pauses the team. The team skill's "It stops" line should say so.
- Touches overlap accepted plans: P-070 on questions.ts and P-066 on autonomy.ts, both waiting to land. Both changes here are small and local, and the merge queue resolves them. Plan this after they land if staffing refuses the overlap.

## Handoff

## Progress log

- 2026-10-27: status draft → ready
- 2026-10-27: assigned to the developer role
- 2026-10-27: status ready → in-progress — branch plan/P-080-an-escalation-about-a-goal-holds-that

## Outcome
