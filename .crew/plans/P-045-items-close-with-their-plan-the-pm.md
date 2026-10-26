---
id: P-045
title: Items close with their plan; the PM closes any item
goal: G-007
items: BUG-024
touches: packages/crew/src/hub/core/work/model.ts, packages/crew/src/hub/commands/work/workflow.ts, packages/crew/src/hub/core/team/presets.ts, packages/crew/test/hub/e2e/item-close.test.ts, packages/crew/test/hub/e2e/items.test.ts, packages/crew/test/hub/e2e/team.test.ts, packages/crew/test/hub/e2e/review-fixes.test.ts, packages/crew/test/hub/e2e/policy.test.ts, packages/crew/test/hub-worktrees.test.ts, plugins/crew/skills/hub/references/model.md
depends_on:
status: in-progress
branch: plan/P-045-items-close-with-their-plan-the-pm
pr:
created: 2026-10-25
started: 2026-10-26
completed:
assignee: developer
---

# P-045: Items close with their plan; the PM closes any item

## Context
BUG-024 (G-007): an item never closes. `PLAN_TO_ITEM` (core/work/model.ts) derives a linked item's status for display only;
the stored `status:` stays `triaged` and `closed:` is never set (BUG-005 after P-018). `ITEM_FLOW` has no `done`, so
`move BUG-005 done` is refused (`Unknown status 'done'. Valid: new, triaged, wontfix, duplicate`), and a finished spike
with no plan (SPIKE-005) can't be closed at all. Code that reads the stored status (`goalItems`, autonomy's open
documents, `new-plan`'s link check) counts delivered items as open.

**Executive decision (2026-10-25, verbatim):** "Item rule for G-007: a linked item's status follows its plan (done on PM
done); the PM can close any item from any status (done/wontfix/duplicate); closing never blocks its plan."

This plan is separate from P-032 (merge queue: land). P-032 is at `max_tasks` (10 tasks) and waits on six plans; this fix
needs none of its code, since it hooks the plan's move to `done` whichever edge leads there (`in-review → done` today,
`accepted → done` after P-032), and `done` means "on the base" once P-032 lands.

## Scope
**In:**
- **Item flow** (model.ts): stored `done` joins the item statuses, and every status can close to `done`, `wontfix` or
  `duplicate`: `new: [triaged, done, wontfix, duplicate]`, `triaged: [new, done, wontfix, duplicate]`,
  `done: [new, wontfix, duplicate]`, `wontfix: [new, done, duplicate]`, `duplicate: [new, done, wontfix]`.
  `ITEM_CLOSED` gains `done` (so `closed:` is stamped, `itemStatus` returns the stored closure, and `goalItems`,
  autonomy and `new-plan`'s link check treat it as closed).
- **Items follow their plan** (workflow.ts): when a plan moves to `done` (with or without `--force`), each of its items
  (`planItems`) whose stored status is not closed is stored `done` with `closed:` set to today, a Notes line
  `status <old> → done — delivered by P-###`, and a ledger `move` event `{from, to: "done", via: "plan.done"}`. It is a
  consequence of the plan's move, so no item gate applies to it. An item already closed (done, wontfix, duplicate) is
  left as it is: the PM's closure stands.
- **Closing never blocks its plan:** no new gate reads a closed item. A plan whose only item is closed keeps its status
  and every gate as before; the hub never drops or moves it. Whether it still has something to deliver is the PM's call
  (`move P-### dropped`), documented in model.md.
- **The PM owns closing** (presets.ts, `preset: lifecycle`): role gates `item.done`, `item.wontfix`, `item.duplicate` → pm
  (`triage --reject` moves through the same gates).
- **Docs** (plugins/crew/skills/hub/references/model.md): the item lifecycle line and the table (stored `done`; items
  close when their plan is done; the PM closes any item from any status; closing never blocks or moves the plan), and the
  `preset: lifecycle` gate list.

**Out (explicitly not doing):**
- Backfilling items already linked to done plans (BUG-005 and others): the PM closes them with `move <ID> done` once this
  merges (Rollout).
- `next` / `check` hints for a plan whose items are all closed, UI changes (the UI already styles `done` items), and the
  agent texts (pm.md is owned by P-031 and P-032 now; a follow-up adds one line once they land).
- Any change to policy.yaml, config.yaml or settings.

## Acceptance criteria
- [ ] AC1 · Item flow (regression test for BUG-024): in a throwaway hub with the default policy, `move BUG-001 done` on a
  triaged bug with no plan exits 0, and the file reads `status: done` and `closed: <today>`; `move FEAT-001 done` from
  `new` exits 0; `move BUG-001 duplicate` from `done` exits 0; `move BUG-001 bogus` is refused listing `done` among the
  valid statuses; `check` reports no invalid status for an item stored `done`; afterwards `next --role architect` no
  longer lists `write a plan for BUG-001`.
- [ ] AC2 · Items follow their plan: P-001 delivers BUG-001 and BUG-002 (both triaged). Walked to `done` (helpers'
  `finish`), BUG-001 reads `status: done`, `closed: <today>`, and a Notes line naming P-001, and `ledger --ref BUG-001
  --json` has a `move` event from `triaged` to `done` with `via: plan.done`. The same holds when the plan is moved
  `done --force` (team-helpers' `finish` under `preset: lifecycle`).
- [ ] AC3 · Closing never blocks its plan: with BUG-002 moved to `duplicate` while P-001 is in progress, P-001 still goes
  to in-review and done with no refusal, and BUG-002 still reads `status: duplicate` with its first `closed:` date. A plan
  whose only item was moved to `wontfix` while the plan was `ready` still starts and reaches `done`, and the item stays
  `wontfix`.
- [ ] AC4 · The PM owns closing: under `preset: lifecycle`, `move BUG-001 done` and `triage BUG-001 --reject wontfix
  --note x` as the developer are refused naming the pm role; as the PM both succeed. `policy show --json` lists
  `item.done`, `item.wontfix` and `item.duplicate` → pm.
- [ ] AC5 · model.md's item lifecycle and the `preset: lifecycle` gate list name stored `done`, closing from any status,
  items closing when their plan is done, and the three new pm gates.

## Approach
- **model.ts:** `ITEM_FLOW` as in Scope; `ITEM_CLOSED = new Set(["done", "wontfix", "duplicate"])`. `PLAN_TO_ITEM` is
  unchanged (P-032 adds its `accepted` row). The existing `stamp` line already sets `closed:` for any `ITEM_CLOSED` status.
- **workflow.ts:** in `move`, after the plan document is saved and its ledger `move` recorded, when `kind === "plan" &&
  status === "done"`, call a new `closeItems(store, doc)` at the bottom of the file: for each `q.planItems(doc,
  store.items())` not in `ITEM_CLOSED`, set `status: done` and `closed:`, `appendLog(…, "Notes")`, save, and record the
  ledger event. It writes the items without `move()`/`authorize()` (no item gate; the plan's own gate already applied).
  Items live in the main checkout (one home since P-038), so the write lands there and the hub's next commit carries it.
- **presets.ts:** three lines in `lifecycle.global.role_gates` next to `item.triaged`.
- **Tests:** a new `packages/crew/test/hub/e2e/item-close.test.ts` that drives the built `dist/crew.mjs`, reusing
  `helpers.ts` (`init`, `newBug`, `newPlan`, `finish`, `item`) and `team-helpers.ts` (`lifecycle`, `as`, `finish`) without
  changing them. Existing tests stay as they are; if one asserts a stored `status: triaged` after its plan is done, update
  that assertion.

## Tasks
- [ ] T1: item flow and closed set in model.ts → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/item-close.test.ts -t "flow"` (AC1)
- [ ] T2: `closeItems` on a plan's move to done in workflow.ts → verify: `npx vitest run test/hub/e2e/item-close.test.ts -t "follow"` and `-t "never blocks"` (AC2, AC3)
- [ ] T3: pm role gates for item.done, item.wontfix, item.duplicate in presets.ts → verify: `npx vitest run test/hub/e2e/item-close.test.ts -t "pm owns"` (AC4)
- [ ] T4: model.md item lifecycle and lifecycle gate list → verify: `grep -n "item.done" plugins/crew/skills/hub/references/model.md` and the lifecycle paragraph reads as in AC5 (AC5)
- [ ] T5: existing item, policy and worktree tests still pass → verify: `npx vitest run test/hub/e2e/items.test.ts test/hub/e2e/review-fixes.test.ts test/hub/e2e/policy.test.ts test/hub/e2e/team.test.ts test/hub-worktrees.test.ts` all green, and `npm run typecheck`

## Test plan
**Targeted checks:**
- `test/hub/e2e/item-close.test.ts` (new; build first with `npm run build`):
  - "flow": AC1 — the regression test for BUG-024 (fails before the fix with `Unknown status 'done'`).
  - "follow": AC2 — `finish` with the default policy, and team-helpers' forced `finish` under `preset: lifecycle`.
  - "never blocks": AC3 — a duplicate item on an in-progress plan; a plan whose only item is wontfix.
  - "pm owns": AC4 — developer refused, PM allowed, `policy show --json` gates.
- `test/hub/e2e/items.test.ts`, `test/hub/e2e/team.test.ts`, `test/hub/e2e/review-fixes.test.ts`,
  `test/hub/e2e/policy.test.ts`, `test/hub-worktrees.test.ts` ("one home"): unchanged behaviour (T5).
- AC5: read the diff of model.md against the criterion.

## Rollout & rollback
- After the merge (and the human's `.crew/bin` refresh): the PM closes items already delivered by done plans that still
  read `triaged` (BUG-005 via P-018, and any `check`/`status` shows as derived `done`), and closes SPIKE-005 if its
  findings are complete, with `move <ID> done --note "…"`.
- Rollback: revert the plan's commit. Items stored `done` would then be invalid statuses for `check`; move them back to
  `triaged` with `--force` (the derived status still reads `done` from their plan).

## Risks & open questions
- Touches overlap P-032 (model.ts, workflow.ts, presets.ts), P-021 (model.ts, presets.ts), P-025 (workflow.ts) and P-031
  (presets.ts, in progress). They can't be narrowed: these three files hold the item flow, the plan move and the gates.
  Each change is a few lines in its own region (`ITEM_FLOW`/`ITEM_CLOSED`; one call plus a new function at the end of
  workflow.ts; three gate lines), so whichever plan lands second rebases in minutes. No `depends_on`: this plan needs none
  of their code.
- `itemStatus` now returns a stored `done` before it looks at the plan: an item the PM closed as `done` while its plan is
  still in progress reads `done`. That is the decision (the PM can close any item from any status).
- The rendered `.claude/agents/crew-pm.md` does not mention closing items until pm.md gains a line (follow-up after P-031
  and P-032); the PM can still find it in model.md and in the refusal's list of valid statuses.

## Handoff

## Progress log

- 2026-10-25: status draft → ready — BUG-024 specced as its own plan (P-032 is at max_tasks and waits on six plans)
- 2026-10-25: assigned to the developer role — BUG-024; touches overlap P-032/P-021/P-025/P-031 a few lines each
- 2026-10-26: status ready → in-progress — branch plan/P-045-items-close-with-their-plan-the-pm

## Outcome
