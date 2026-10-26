---
id: P-048
title: Notify the human when a goal waits for approval
goal: G-007
items: FEAT-045
touches: packages/crew/src/hub/commands/work/planning.ts, packages/crew/src/hub/core/team/policy.ts, packages/crew/test/hub/e2e/policy.test.ts, plugins/crew/skills/hub/references/model.md, plugins/crew/skills/team/SKILL.md
depends_on:
status: accepted
branch: plan/P-048-notify-the-human-when-a-goal-waits
pr:
created: 2026-10-25
started: 2026-10-26
completed:
assignee: developer
---

# P-048: Notify the human when a goal waits for approval

## Context
FEAT-045 (G-007). A new goal is `proposed` (the goal template's status) and waits for the human's `move G-### active --approved-by <name>` (`goal.active` is a human gate under the lifecycle preset). Nothing tells the human: `notify` (commands/team/autonomy.ts) fires for `escalation`, `budget`, `stale`, `goal-done` and `paused` (`NOTIFY_ON`, core/team/policy.ts:15), and P-035's inbox lists proposed goals only when someone looks. This plan adds a `goal-approval` kind that `new-goal` (commands/work/planning.ts `newGoal`) emits, so a project whose policy sets `notify: { command: …, on: [goal-approval] }` hears about it. P-035 left it out to keep off planning.ts while P-038/P-039 were editing it (both done).

**No dependency.** `notify` and `NOTIFY_ON` exist on main; the notification names the approval command, not the inbox, so it does not need P-035's code. Overlaps, for staffing only: policy.ts with P-032 and P-034 (P-034 adds `stopped` to the same `NOTIFY_ON` line). The test file, model.md and team/SKILL.md are `hub.shared`. This repo's policy keeps no `notify:` (decision K-2026-10-25-unattended-runs-use-claude-p-permission: the inbox is the only channel for now); the kind is opt-in and changes nothing here.

## Scope
**In:**
- `NOTIFY_ON` gains `"goal-approval"`, so `policy check` accepts `notify.on: [goal-approval]`.
- `newGoal`, after `writeNew` and `breakdownToItems`: `notify(store, "goal-approval", <G-###>, "<G-###> waits for approval: <title> → move <G-###> active --approved-by <you>")`. Sent once per goal (`notify`'s ledger dedupe on kind and ref), only when `notify.on` lists the kind and `notify.command` is set, and after the goal's writes succeed (`beforeFlush`), as every other kind.
- Docs: the `notify` row of model.md and the `notify` sentence of team/SKILL.md list `goal-approval` with the other kinds.

**Out (explicitly not doing):**
- Other notification kinds (P-034 adds `stopped`), or notifying for goals created before this plan.
- Choosing a channel or editing `.crew/policy.yaml` (the human's).
- An inbox link in the text (P-035's inbox lists the goal anyway).

## Acceptance criteria
- [ ] AC1 · In a throwaway lifecycle repo with `notify: { command: "cat >> notified.jsonl; echo >> notified.jsonl", on: [goal-approval] }`, `new-goal` writes exactly one event to `notified.jsonl` with `kind: "goal-approval"`, `ref: "G-001"`, and a `text` naming G-001, its title and `move G-001 active --approved-by`.
- [ ] AC2 · A second `new-goal` sends one event for G-002; moving G-001 active and running other commands sends nothing more for G-001 (`notify` ledger events: one per goal).
- [ ] AC3 · With `notify.on: [escalation]` (no `goal-approval`), `new-goal` sends nothing and records no `notify` event.
- [ ] AC4 · `policy check` accepts `notify: { on: [goal-approval] }` and still rejects an unknown kind (`notify.on: 'lunch' is not one of …`, now listing `goal-approval`).
- [ ] AC5 · model.md's `notify` row and team/SKILL.md's notify sentence list `goal-approval`.
- [ ] AC6 · `npm run typecheck` passes; planning.ts and policy.ts stay under 300 lines.

## Approach
- planning.ts imports `notify` from `../team/autonomy.js`. autonomy.ts already imports `setFocus` from planning.ts; the cycle is call-time only (as workflow.ts ↔ autonomy.ts today), so it is safe in the bundle and under vitest.
- policy.ts: one word added to the `NOTIFY_ON` array on its existing line (the file is at 297 lines; no new line).
- Tests: a new `it("new-goal notifies goal-approval once per goal")` in test/hub/e2e/policy.test.ts, with team-helpers' `lifecycle`, `LIFECYCLE` and `as`, and helpers' `newGoal`, set up as team-2.test.ts's "notify runs the policy command once per event" does.

## Tasks
- [x] T1: the `goal-approval` kind and its emission in `newGoal` → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/policy.test.ts -t "goal-approval"` (AC1–AC4)
- [x] T2: docs → verify: `grep -n "goal-approval" ../../plugins/crew/skills/hub/references/model.md ../../plugins/crew/skills/team/SKILL.md` lists both (AC5); `npx vitest run test/plugin`
- [x] T3: types, sizes, the existing notify test → verify: `npm run typecheck`; `wc -l src/hub/commands/work/planning.ts src/hub/core/team/policy.ts` each under 300; `npx vitest run test/hub/e2e/team-2.test.ts -t notify` (AC6)

## Test plan
**Targeted checks** (from `packages/crew/`; the e2e suites drive the built `dist/crew.mjs`: `npm run build` first, then discard the generated output, which Release builds):
- AC1–AC4 → `npx vitest run test/hub/e2e/policy.test.ts -t "goal-approval"`
- AC5 → T2's grep; `npx vitest run test/plugin`
- AC6 → `npm run typecheck`; T3's `wc -l`; `npx vitest run test/hub/e2e/team-2.test.ts -t notify test/hub/e2e/idea.test.ts` (other new-goal paths)

## Rollout & rollback
n/a — off unless a project's `notify.on` lists `goal-approval`. Ships in the bundle (Release builds it), reaches this repo through `refresh-bin`. Rollback: revert the commit; a policy that lists `goal-approval` then fails `policy check` until the kind is removed from it.

## Risks & open questions
- P-034 edits the same `NOTIFY_ON` line (adds `stopped`): whichever lands second gets a one-line textual conflict, which `land` bounces back to its developer to resolve.
- A goal created while the team is paused still notifies: approval is the human's in any case.

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-048: Notify the human when a goal waits for approval [in-review] tasks 0/3 — claimed by Arpit Anand (developer:ac6144f54a3bb12a7)
- last checkpoint 2026-10-26 05:30 at T3 (dfa60d2) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-048-notify-the-human-when-a-goal-waits/packages/crew && npm run build >/dev/null 2>&1 && npx vitest run test/hub/e2e/policy.test.ts -t goal-approval ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-048-notify-the-human-when-a-goal-waits checkout -- plugins; exit $r (AC 1,2,3,4)
- ✓ grep -n goal-approval /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-048-notify-the-human-when-a-goal-waits/plugins/crew/skills/hub/references/model.md /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-048-notify-the-human-when-a-goal-waits/plugins/crew/skills/team/SKILL.md (AC 5)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-048-notify-the-human-when-a-goal-waits/packages/crew && npm run typecheck && wc -l src/hub/commands/work/planning.ts src/hub/core/team/policy.ts && test $(wc -l < src/hub/commands/work/planning.ts) -lt 300 && test $(wc -l < src/hub/core/team/policy.ts) -lt 300 && npm run build >/dev/null 2>&1 && npx vitest run test/hub/e2e/team-2.test.ts -t notify ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-048-notify-the-human-when-a-goal-waits checkout -- plugins/crew/skills/hub/dist; exit $r (AC 6)
- next: T1: the `goal-approval` kind and its emission in `newGoal` → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/policy.test.ts -t "goal-approval"` (AC1–AC4)
- evidence: AC1 ✓ (self), AC2 ✓ (self), AC3 ✓ (self), AC4 ✓ (self), AC5 ✓ (self), AC6 ✓ (self)

Latest log:
- 2026-10-25: status draft → ready — Architect: specced (ACs, tasks, test plan, exact touches)
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-048-notify-the-human-when-a-goal-waits

## Progress log

- 2026-10-25: status draft → ready — Architect: specced (ACs, tasks, test plan, exact touches)
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-048-notify-the-human-when-a-goal-waits
- 2026-10-26: status in-progress → in-review — T1-T3 done: goal-approval kind emitted by new-goal, docs, typecheck/sizes; checks pass at checkpoints
- 2026-10-26: status in-review → accepted
- 2026-10-26: landed on main as 5b7ec20

## Outcome
Learnings: none
