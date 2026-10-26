---
id: P-035
title: Human inbox
goal: G-007
items: FEAT-043
touches: packages/crew/src/hub/commands/team/inbox.ts, packages/crew/src/hub/commands/team/inbox.reg.ts, packages/crew/src/hub/commands/team/questions.ts, packages/crew/src/hub/commands/team/questions.reg.ts, packages/crew/src/hub/commands/team/guard.ts, packages/crew/src/hub/commands/index.ts, packages/crew/src/hub/cli.ts, packages/crew/src/hub/mcp.ts, packages/crew/src/hub/server.ts, packages/crew/ui/src/views/Inbox.tsx, packages/crew/ui/src/views/index.ts, packages/crew/test/hub/e2e/inbox.test.ts, packages/crew/test/hub/e2e/guard.test.ts, plugins/crew/skills/team/SKILL.md, plugins/crew/skills/hub/references/model.md
depends_on: P-027, P-031
status: ready
branch: plan/P-035-human-inbox
pr:
created: 2026-10-25
started:
completed:
assignee: developer
---

# P-035: Human inbox

## Context
W2-e of G-007 (design: `.crew/drafts/the-crew-team-was-pure-reef.md`, "W2-e: the human talks to the hub, not to a session"). Delivers FEAT-043.

Today the human reaches the team only through the main Claude Code session (`plugins/crew/skills/team/SKILL.md`, "Each run"). An answer counts only when given in that conversation, so an unattended run waits on an escalation until someone opens a session. After this plan, the hub has an inbox: `crew.mjs inbox` (and an Inbox page in `crew.mjs ui`) lists what waits on the human. That is goals to approve, escalations (which is how reserved decisions arrive), and plan steps the policy gates to a human. Each entry has its question, its options and what it holds. The human answers from their own terminal (`answer Q-… "…" --approved-by <name>`, `move G-### active --approved-by <name>`) or from the page. Agents stay refused: the guard already denies `--approved-by` to every Claude tool call, and this plan adds the UI's command endpoint to that rule. The human steers with `ask --to director "…"`, which P-031's dispatch routes to the Director on the next pass.

**Code dependencies:**
- **P-027:** the Inbox page refreshes when an answer lands. An answer writes only the ledger, and P-027 makes the `ui` server send a change event on ledger writes (today it watches only `.crew/` and git refs). The page also follows P-027's served-only panel pattern (`ix.served`).
- **P-031:** steering. A human's question to the Director reaches it through `dispatch` (P-031's row 1). AC7 checks that path, and "Each run" in `team/SKILL.md` describes P-031's pass loop.

The decision this replaces (answers only in the session conversation) lives in `team/SKILL.md`, not in a knowledge entry. The new decision is recorded as K-2026-10-25-the-human-answers-and-approves-from (Architect, with this spec); the skill text changes here.

Overlaps, for staffing only: P-037 on `guard.ts`, and P-030 on `questions.reg.ts` (the `ask`/`escalate` registration once P-030 lands; cli.ts and mcp.ts before). `cli.ts`, `mcp.ts`, `commands/index.ts`, `team/SKILL.md` and the test files are `hub.shared` once P-029 lands.

## Scope
**In:**
- `inboxEntries(store)` in a new `commands/team/inbox.ts`, and `crew.mjs inbox [--json]` plus an MCP tool `inbox` (read-only, same JSON). Entries, oldest first within each kind:
  - **goal**: each `proposed` goal → `{ kind: "goal", ref: "G-###", question: "Approve G-###: <title>?", options: ["approve", "drop"], holds: "its plans and items wait until it is approved", how: "move G-### active --approved-by <you> · move G-### dropped --approved-by <you>" }`.
  - **escalation**: each open question that is an escalation or addressed to the executive → `{ kind: "escalation", ref: "Q-…", about: <ref or null>, question, options, holds, how: "answer Q-… \"<decision>\" --approved-by <you>" }`. `holds` comes from `escalationHolds`: "holds P-###" for a plan or item, otherwise "stops the team".
  - **approval**: each plan in review whose `plan.done` the policy gates to a human (`approvalReason`) and that has nothing else missing (evidence complete, review approved) → `{ kind: "approval", ref: "P-###", question: "Complete P-###: <title>?", options: ["approve"], holds: "P-###", how: "move P-### done --approved-by <you>" }`.
  - Text form: one block per entry (kind, ref, question, options, holds, the command). `Inbox empty — nothing waits on you.` when there are none.
- **Options on questions:** `ask` and `escalate` take `--options "A; B"` (split on `;`, trimmed, empty dropped), stored as `options: string[]` on the `ask` event. The `Question` type, `questions`/`questions --json` and the inbox show them. Without `--options`, nothing changes.
- **`ui` server:**
  - `GET /api/inbox` returns `{ entries }`.
  - Two new `ACTIONS`, through the page's token check like the others: `answer` `{ qid, text, approved_by }` → `answer(store, qid, text, { approvedBy })`, and `approve-goal` `{ id, approved_by }` → `move(store, id, "active", …, approvedBy)`. Both refuse an empty `approved_by` with the same message as the CLI ("a human answers it … --approved-by <name>").
- **Inbox page** (`ui/src/views/Inbox.tsx`, route `inbox`, in the sidebar): each entry with its question, options and what it holds.
  - Served: an option button fills the answer box, and Answer posts with the approver's name. The page asks for the name once and keeps it in `localStorage`, wrapped in try/catch. A goal has Approve/Drop. The list reloads on each change event.
  - Not served (`export`, which has no inbox data): the page says to run `crew.mjs inbox` or open `crew.mjs ui`, and renders without errors.
- **Guard:** for any Claude tool call (agents and the main session alike, like the `--approved-by` rule), deny:
  - a Bash command that contains `/api/commands/` and runs `curl`, `wget`, `node`, `python` or `fetch`;
  - a WebFetch whose URL contains `/api/commands/`.
  The message: "only the human answers and approves, from their own terminal or browser".
- **`team/SKILL.md`, "Each run":**
  - The session is one view onto the hub. It shows `inbox` and the live feed (`status`, `watch`), and puts each inbox entry to the user.
  - It records an answer with `--approved-by` only when the user gave that decision in this conversation, as today.
  - The user can always answer from their own terminal or the Inbox page instead, with no session open.
  - Steering goes through `ask --to director "…"` (or `focus`, `pause`, `new-goal`) from their terminal.
- `model.md`: an "Inbox" paragraph (what is listed, how to answer, `--options`).

**Out (explicitly not doing):**
- A notification for each new **goal** awaiting approval. Escalations already notify (`notify.on: [escalation]`). A goal-approval kind needs a new `NOTIFY_ON` value emitted from `new-goal` (planning.ts, P-038/P-039's file): follow-up item.
- Choosing a notification channel (`notify.command` in `.crew/policy.yaml`): the human's policy change.
- Answering non-escalation questions from the inbox (those go to roles, via dispatch).
- `.claude/settings.json`, `.claude/agents/**`, `.crew/bin`, `.crew/policy.yaml` (human-reserved).
- Generated files: Release builds them.

## Acceptance criteria
- [ ] AC1 · In a throwaway repo, `inbox` lists:
  - a proposed G-002 (with its approve/drop commands);
  - an escalation about P-001 with "holds P-001";
  - an escalation with no ref with "stops the team";
  - under `mode: ai-assisted`, a plan in review with complete evidence and an approving review, as an `approval` for `done`.
  `inbox --json` has the same entries with `kind`, `ref`, `question`, `options`, `holds` and `how`. In a repo with none of these it prints `Inbox empty`.
- [ ] AC2 · `escalate P-001 "Ship it?" --options "yes, today; no"` stores `options: ["yes, today", "no"]`; `questions --json` and `inbox` show them; `ask P-001 --to pm "x"` without `--options` stores no `options` field.
- [ ] AC3 · From a terminal with no role, `answer Q-… "yes, today" --approved-by Amit` answers the escalation. The entry leaves the inbox, `run --check` no longer holds P-001, and `move G-002 active --approved-by Amit` removes the goal entry.
- [ ] AC4 · `guard` with a hook payload for an agent (`agent_type` set) and for the main session (none) denies `curl -X POST http://127.0.0.1:8765/api/commands/answer -d …` and a WebFetch of `http://127.0.0.1:8765/api/commands/approve-goal`. It still allows `curl http://127.0.0.1:8765/api/graph`.
- [ ] AC5 · The served `ui` (`ui --no-open --port 0`):
  - `GET /api/inbox` returns the AC1 entries.
  - `POST /api/commands/answer` with the page token and `approved_by: "Amit"` answers the escalation (the ledger `answer` event has `approved_by: Amit`).
  - The same POST without `approved_by` is 400 with the human-answers message, and with a wrong token is 403.
  - `POST /api/commands/approve-goal` moves G-002 to `active` with `approved_by` recorded.
- [ ] AC6 · The Inbox page (served):
  - It lists the entries; an option button fills the answer; Answer posts; the entry disappears without a reload.
  - The `export` page's Inbox shows the `crew.mjs inbox` / `crew.mjs ui` hint and no console errors.
  - Checked from full-size screenshots at desktop and 375 px widths, with no overflow.
- [ ] AC7 · Steering: a human's `ask --to director "Prioritise G-002"` with no ref appears as a director entry in `dispatch --json` and as nothing in the inbox.
- [ ] AC8 · `team/SKILL.md`'s "Each run" says the user can answer from the inbox (CLI or page) without a session, and still records `--approved-by` only for decisions given in the conversation. `model.md` has the "Inbox" paragraph.
- [ ] AC9 · `npm run typecheck` passes; inbox.ts, questions.ts, guard.ts, server.ts and Inbox.tsx stay under 300 lines; the guard, questions (team-2), live-ui and view suites pass.

## Approach
- **inbox.ts:** pure over the stores and ledger.
  - Reuse `questions`/`openQuestions`/`escalationHolds` (questions.ts), `approvalReason` (core/team/policy.ts), and `evidence` (execution.ts) with `reviewProblems` (review.ts) for `plan.done`.
  - Mirror the "complete" test of the executive rule in roles.ts; don't import roles.ts internals.
- **questions.ts:** `ask`/`escalate` take `options?: string[]` in their options object; `Question` gets `options: string[]` (`[]` when absent).
- **Registration:**
  - If P-030 has landed when this branch updates to the base: `inbox` registers in `commands/team/inbox.reg.ts` (plus its `commands/index.ts` line), and `--options` goes in `commands/team/questions.reg.ts`.
  - Otherwise both go in cli.ts and mcp.ts.
- **server.ts:** add the two actions to `ACTIONS` and the `GET /api/inbox` route beside `/api/activity` (P-027). The header comment ("No --force, no document creation from the browser") gets "human approvals need a name".
- **guard.ts:** one more rule, beside the `--approved-by` rule (before the role check, so it applies to every session). Use `segments`/`words` for Bash, and match `tool_name === "WebFetch"` with `input.url`.
- **Inbox.tsx:**
  - Built from `Card`, `Chip` and `IdLink`, with existing tokens and styles; one entry in `views/index.ts`.
  - Calls go through `runAction` in `ui/src/api.ts` (no change to api.ts).
  - Data comes from `fetch("api/inbox")` when `ix.served`.
- **Tests:**
  - `test/hub/e2e/inbox.test.ts` (new): AC1–AC3, AC5, AC7, using `lifecycle`, `as`, `newGoal`, `inReview`, `qaDone`, and the `ui --port 0` spawn from P-027's `live-ui.test.ts`.
  - The guard cases go in `test/hub/e2e/guard.test.ts`.

## Tasks
- [ ] T1: `--options` on ask/escalate; `Question.options` → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/inbox.test.ts -t options` (AC2)
- [ ] T2: inbox.ts + `inbox` command and MCP tool → verify: `npx vitest run test/hub/e2e/inbox.test.ts -t "lists|answer|steer"` (AC1, AC3, AC7)
- [ ] T3: guard rule → verify: `npx vitest run test/hub/e2e/guard.test.ts` (AC4)
- [ ] T4: server `/api/inbox`, `answer` and `approve-goal` actions → verify: `npx vitest run test/hub/e2e/inbox.test.ts -t ui` (AC5)
- [ ] T5: Inbox page → verify: `npm run build`, then the manual check in the Test plan (AC6)
- [ ] T6: team/SKILL.md "Each run", model.md → verify: `grep -n "inbox" plugins/crew/skills/team/SKILL.md plugins/crew/skills/hub/references/model.md`; `npx vitest run test/plugin` (AC8)
- [ ] T7: types, sizes, unchanged suites → verify: `npm run typecheck`; `wc -l` of the touched modules; `npx vitest run test/hub/e2e/team-2.test.ts test/hub/e2e/live-ui.test.ts test/view.test.ts` (AC9)

## Test plan
**Targeted checks** (from `packages/crew/`; e2e suites drive the built `dist/crew.mjs`: `npm run build` first, then discard the generated output, which Release builds):
- AC1, AC2, AC3, AC5, AC7 → `npx vitest run test/hub/e2e/inbox.test.ts`
- AC4 → `npx vitest run test/hub/e2e/guard.test.ts`
- AC6 (manual, QA) → in a scratch repo built by `scripts/sample-project.mjs`, add a proposed goal and two escalations (one with `--options`), run `ui --no-open`, open `#/inbox`. Answer one escalation from the page, and check that it disappears without a reload. Approve the goal. Judge from full-size screenshots at desktop and 375 px. Open the `export` HTML's inbox: the hint is shown, no console errors.
- AC8 → T6's grep; `npx vitest run test/plugin`
- AC9 → `npm run typecheck`; T7's `wc -l`; `npx vitest run test/hub/e2e/team-2.test.ts test/hub/e2e/live-ui.test.ts test/view.test.ts`

## Rollout & rollback
- Ships in the bundle and the UI (Release builds them); this repo gets it through `refresh-bin` (P-024).
- **Human / escalation:** the guard rule applies here once `.crew/bin` is refreshed (the guard hook runs the vendored hub). A notification channel for inbox entries (`notify.command`, `on: [escalation]`) is the human's policy change in `.crew/policy.yaml`.
- Rollback: revert the plan's commit. `options` on old `ask` events is ignored by the old hub.

## Risks & open questions
- The guard rule matches literal text. An agent that hides the URL (built at run time) could still reach the endpoint with the page token, which it can read from `GET /`. That is the same limit as BUG-011/BUG-021 (the guard reads commands, not intent). The endpoint also requires a non-empty `approved_by`, and every UI answer records it in the ledger, so a misuse is visible and attributable.
- Other human-gated steps (`plan.ready` under `ai-assisted`/`human-led`, `item.triaged` under `human-led`) aren't listed yet; under `lifecycle` only `goal.active` is gated, and that is listed. Add them if a project on those modes needs it.

## Handoff

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-26: assigned to the developer role

## Outcome
