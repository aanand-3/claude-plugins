---
id: P-072
title: Human follow-ups stay in the inbox until done
goal:
items: FEAT-068
touches: packages/crew/src/hub/commands/team/followups.ts, packages/crew/src/hub/commands/team/questions.reg.ts, packages/crew/src/hub/commands/team/inbox.ts, packages/crew/src/hub/commands/work/execution.ts, packages/crew/src/hub/server.ts, packages/crew/ui/src/views/Inbox.tsx, packages/crew/ui/src/styles/views.css, packages/crew/test/hub/e2e/inbox.test.ts, plugins/crew/skills/hub/references/model.md, plugins/crew/skills/team/SKILL.md
depends_on:
status: in-progress
branch: plan/P-072-human-follow-ups-stay-in-the-inbox-until
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
---

# P-072: Human follow-ups stay in the inbox until done

## Context
FEAT-068 (G-007, P2). When the executive answers a question by approving a route that leaves a step to them (merge a
branch, run a command, commit a result), `answer` closes the question and nothing tracks the step: `inbox` reads
"nothing waits on you" while the work it unblocks still waits on the human. Found on Q-d4e060 (P-003: "you
commit/merge; the team won't push"); P-060's and P-064's rollout steps were tracked only in agent reports.

Today (main): `answer()` in `commands/team/questions.ts` records an `answer` event and stops. `inbox.ts` lists goals,
escalations (open questions with `escalation` or `to: executive`) and human-gated approvals. An open blocking question
on a document already stops its forward moves (`workflow.ts`), shows in `staff` as "waits for an answer (Q-…)"
(`team.ts`), in `status` under "Open questions" (`reports.ts`), and holds the document in `run --check` through
`escalationHolds` when it is addressed to the executive. `resume` (`recovery()` in `work/execution.ts`) shows no
questions at all.

Design choice: a follow-up is recorded as one more open question to the executive, an `ask` event with two extra
fields (`after`: the answered Q-…, `step`: what to do), about the document it unblocks. That reuses every existing
wait path (forward-move refusal, staff, status, `run --check` holds, the executive's `next`) with no new ledger event
type, and closing it is the existing human-only `answer Q-… "done" --approved-by <name>`.

Overlaps checked (plans in flight): P-070 (ready) changes `ask()` routing in `questions.ts` and P-064 (accepted) only
template lines; this plan leaves `questions.ts` untouched (the follow-up is recorded from a new `followups.ts`, not
through `ask()`, so P-070's routing never applies to it). P-066 (in progress) touches `reports.ts` and `autonomy.ts`,
P-071 (draft) and others `team.ts`, P-067/P-068 `workflow.ts`: none of those is changed here; `status` and `staff`
already show the follow-up through the open question. No `depends_on`.

## Scope
**In:**
- `crew.mjs answer Q-… "<text>" --approved-by <name> --follow-up "<step>" [--unblocks P-###|ITEM]`: answers the
  question as today, then records the follow-up: an `ask` event `{ qid: <new Q-…>, to: "executive", text:
  "follow-up (after Q-…): <step>", after: <answered Q-…>, step: <step>, approved_by }` about `--unblocks`, or the
  answered question's ref when omitted. Blocking (the default for asks). No notification (the human just wrote it).
  Prints `Q-new → executive about P-###: follow-up stays in your inbox until done (answer Q-new "done" --approved-by <you>)`.
- Refusals, all before anything is recorded: `--follow-up` without `--approved-by` (a follow-up is a human's step);
  an empty step; no document to unblock (neither `--unblocks` nor a ref on the question); a target that is not a plan
  or an item (a goal/idea/no-ref executive question would stop the whole team in `escalationHolds`); an unknown target.
- New `packages/crew/src/hub/commands/team/followups.ts`: `answerWithFollowUp(store, qid, text, o, step, unblocks?)`
  (validate, then `answer()`, then record) and `openFollowUps(events)` (open questions whose `ask` event has `after`).
- `inbox`: follow-ups become their own kind, after escalations: `{ kind: "follow-up", ref: Q-…, about: P-###,
  question: <step>, options: ["done"], holds: "holds P-###", how: "answer Q-… \"done\" --approved-by <you>" }`, and
  no longer appear as escalations. Text form prints `FOLLOW-UP`. Escalation entries' `how` stays as today
  (a runnable command; Q-015c91); the text form prints one more line under each escalation,
  `  then:    add --follow-up "<your step>" if a step stays with you`, and the UI offers it through the "Then you…"
  field (Design). Follow-ups leave the inbox when answered (the human marks them done).
- `resume` (and so the generated `## Handoff`): one line per open blocking question on the plan,
  `waits for an answer: Q-… → <to>: <text>`, so a follow-up names itself as the plan's wait reason.
- `ui` server: the `answer` action takes optional `follow_up` and `unblocks` and goes through `answerWithFollowUp`
  when `follow_up` is non-empty. Inbox page: the `follow-up` kind (chip, step, what it holds, a Done button), and an
  optional "Then you…" field inside an escalation's answer form, before Answer. An entry's question text (the step of
  a follow-up, the question of an escalation) wraps inside its card, long unbroken tokens included: one new
  `.inbox__text` rule in `ui/src/styles/views.css`.
- `model.md` "Inbox" paragraph and `team/SKILL.md` "Each run": when an answer leaves a step to the human, record it
  with `--follow-up`; it stays in the inbox until answered `done`.

**Out (explicitly not doing):**
- The hub detecting the condition met by itself (e.g. a branch merged): conditions are free text; the human marks the
  step done. A later item can add typed conditions if needed (FEAT-068's AC2 "or the hub sees the condition met").
- The asker attaching a proposed follow-up when it escalates (`escalate --follow-up`): it needs a field on `ask()` in
  `questions.ts`, which P-070 and FEAT-065 are changing; the human adds the step when answering. Can follow once
  those land.
- `--follow-up` on the MCP `answer` tool (agents can't pass `--approved-by`; the frozen `registry-before.json` stays).
- Any change to `questions.ts`, `dispatch.ts`, `team.ts` (staff), `reports.ts` (status), `autonomy.ts`, `workflow.ts`.
- A new ledger event type.

## Acceptance criteria
- [ ] AC1 · Recording: in a throwaway repo, an escalation about P-001 answered with `answer Q-a "yes, you merge"
  --approved-by Amit --follow-up "merge branch x into main"` closes Q-a and records an open `ask` to `executive` about
  P-001 with `after: Q-a`, `step` and `approved_by: Amit`; `--unblocks P-002` sets the ref to P-002 instead. Each
  refusal in Scope fails with a message and records nothing (no `answer` event for Q-a either). Test: `inbox.test.ts`
  case "follow-up: an answer records a step for the human (FEAT-068)".
- [ ] AC2 · Inbox: `inbox` lists the follow-up as `FOLLOW-UP Q-b about P-001: merge branch x into main` with
  `holds P-001` and `answer Q-b "done" --approved-by <you>`; `inbox --json` has `kind: "follow-up"`, `about`,
  `question` (the step), `options: ["done"]`; it is not listed as an escalation; after `answer Q-b "done"
  --approved-by Amit` the inbox is empty; an agent run answering Q-b without `--approved-by` is refused. Test: same
  file, case "follow-up: stays in the inbox until done (FEAT-068)".
- [ ] AC3 · Wait reason: while Q-b is open, `status` lists Q-b about P-001 with the step under "Open questions";
  `staff --json` lists ready P-001 waiting with `waits for an answer (Q-b)`; `resume P-001` prints
  `waits for an answer: Q-b → executive: follow-up (after Q-a): merge branch x into main`; `run --check` lists P-001
  in `held`. Test: same file, case "follow-up: the document shows it as its wait reason (FEAT-068)".
- [ ] AC4 · UI: served `ui`, `POST /api/commands/answer` with `follow_up` (and the page token, `approved_by`) records
  the follow-up and `GET /api/inbox` lists it with kind `follow-up`; without `follow_up` the action behaves as
  before. Test: same file, case "ui: answer with a follow-up (FEAT-068)". The Inbox page (manual, Design section): the
  follow-up entry shows, Done closes it without a reload, the "Then you…" field on an escalation records a follow-up.
- [ ] AC6 · Inbox layout (Designer's review): `views.css` has exactly one new rule,
  `.inbox__text { overflow-wrap: anywhere; min-width: 0; }`, next to the other `.live__`/`.actions__` rules, and the
  entry's question `<p>` in `Inbox.tsx` carries `className="inbox__text"`; in `Answer`, the "Then you…" input
  (`aria-label` "Follow-up for Q-…", unchanged) sits inside the answer `<form>`, on its own `.actions__row` above the
  row holding the decision input and the Answer button, with placeholder `Then you… (optional step you will do)`, so
  Enter in either input submits the answer with `follow_up`. Check: the static check in the Test plan; on screen
  (manual), a 300-character step and an escalation with one unbroken 80-character token wrap inside their cards with
  no sideways scroll at 375/900/1440 px, light and dark, and the placeholder is not clipped at 375 px.
- [ ] AC5 · `npm run typecheck` passes; `followups.ts`, `inbox.ts`, `execution.ts`, `server.ts` and `Inbox.tsx` stay
  under 300 lines; the existing `inbox.test.ts` cases pass unchanged.

## Approach
- `followups.ts` (new, ~50 lines): `answerWithFollowUp` reads the question with `questions(store.ledger.events())`
  (import only, `questions.ts` unchanged), runs every check, then calls `answer(store, qid, text, o)`, then
  `store.ledger.record("ask", target, { qid, to: "executive", text, after, step, approved_by })` with a fresh
  `Q-` + 3 random bytes hex id as `ask()` makes them. `openFollowUps(events)`: the `qid`s of `ask` events carrying
  `after` (not `from`, which move events use), intersected with `openQuestions(events)`.
- `questions.reg.ts`: `answer` gets `str: ["scope", "approved-by", "follow-up", "unblocks"]`; with `follow-up` it
  calls `answerWithFollowUp`, else `answer` as today; the usage line names `[--follow-up STEP [--unblocks ID]]`.
  The MCP tool is unchanged.
- `inbox.ts`: compute the follow-up qid set once; escalations filter them out; follow-ups map to the new kind.
  `InboxEntry.kind` gains `"follow-up"`.
- `execution.ts` `recovery()`: after the checkpoint line, `openQuestions(events, plan.id).filter(blocking)` lines.
- `server.ts`: in `ACTIONS.answer`, `str(b, "follow_up")` non-empty → `answerWithFollowUp`.
- `Inbox.tsx`: see Design. Mirror `InboxEntry` there.
- Tests in `test/hub/e2e/inbox.test.ts` reuse its helpers (`lifecycle`, `as`, `tr`, the `ui --port 0` spawn).

## Design
Composition on the existing Inbox view (docs/design/DESIGN.md tokens; inventory components only, nothing new):
- Follow-up entry: the same `Card` as other entries; title row `Chip tone="primary" dot` labelled "follow-up" plus the
  Q-id as plain `.id` text (like escalations); body `<p>` the step; `.muted` line "about P-### · holds P-###" via
  `IdLink`; one `btn` "Done" (disabled while busy or with no name, title "Enter your name first") that posts
  `answer {qid, text: "done", approved_by}`; then the `how` command in `code.live__action` and `Result`, as today.
- Escalation entry: inside the answer form, before Answer: the `<form>` holds two `.actions__row`s, first one more
  `input.input.actions__note`, placeholder "Then you… (optional step you will do)" (short enough not to clip at
  375 px), `aria-label="Follow-up for Q-…"`, then the existing row with the decision input and the Answer button.
  Enter in either input submits; when filled it is sent as `follow_up` with the answer. No layout change otherwise.
- Text wrapping: the entry's question `<p>` (shared by every kind) gets `className="inbox__text"`, styled by one rule
  in `ui/src/styles/views.css` beside the `.live__`/`.actions__` rules: `.inbox__text { overflow-wrap: anywhere;
  min-width: 0; }`, so a branch name, path or URL in a step breaks inside the card. No other style change.
- States: loading, error, empty and the not-served hint unchanged. The follow-up card disappears on the change event
  after Done (no reload).
- UI criteria: at 375, 900 and 1440 px, light and dark, no horizontal overflow (long step text wraps inside the card),
  chip and button readable; keyboard: Done and the new input reachable by Tab with visible focus.

## Tasks
- [x] T1: Add the three FEAT-068 CLI cases to `test/hub/e2e/inbox.test.ts` (AC1-AC3) → verify: `npx vitest run test/hub/e2e/inbox.test.ts -t FEAT-068` fails before T2-T4.
- [x] T2: `followups.ts` and the `answer --follow-up/--unblocks` registration in `questions.reg.ts` → verify: `npx vitest run test/hub/e2e/inbox.test.ts -t "an answer records"` passes.
- [x] T3: `inbox.ts` follow-up kind and the escalation `then:` hint line → verify: `npx vitest run test/hub/e2e/inbox.test.ts -t "stays in the inbox"` passes.
- [x] T4: `recovery()` wait lines in `execution.ts` → verify: `npx vitest run test/hub/e2e/inbox.test.ts -t "wait reason"` passes.
- [x] T5: `server.ts` `answer` action with `follow_up`, plus the ui case in `inbox.test.ts` → verify: `npx vitest run test/hub/e2e/inbox.test.ts -t "ui"` passes.
- [x] T6: `Inbox.tsx` follow-up kind, Done button and "Then you…" field per Design → verify: `npm run build`, then the manual Inbox check in the Test plan.
- [x] T7: `model.md` Inbox paragraph and `team/SKILL.md` "Each run" line on `--follow-up` → verify: `grep -n "follow-up" plugins/crew/skills/hub/references/model.md plugins/crew/skills/team/SKILL.md` finds both.
- [x] T8: Types and sizes → verify: `npm run typecheck`; `wc -l` of the five source files each under 300; `npx vitest run test/hub/e2e/inbox.test.ts` all green.
- [ ] T9: Design review changes (AC6): the `.inbox__text` rule in `ui/src/styles/views.css` and `className="inbox__text"` on the entry's question `<p>` in `Inbox.tsx`; the "Then you…" input moved inside the answer `<form>` on its own `.actions__row` above the decision row, placeholder `Then you… (optional step you will do)`, aria-label kept → verify: the AC6 static check in the Test plan, `npm run build`, `npm run typecheck`, `wc -l ui/src/views/Inbox.tsx` under 300; then hand back for the Designer's re-review with the on-screen check.

## Test plan
**Targeted checks:** (in the plan worktree, `cd packages/crew`; `npm ci --prefer-offline` first in a fresh worktree;
the e2e tests run the built bundle, so `npm run build` before running them; built files are not part of the change)
- AC1, AC2, AC3: `npx vitest run test/hub/e2e/inbox.test.ts -t FEAT-068` (fails before T2).
- AC4: `npx vitest run test/hub/e2e/inbox.test.ts -t ui`; manual (QA, then the Designer's review): scratch repo from
  `scripts/sample-project.mjs`, an escalation about a plan, `ui --no-open`, `#/inbox`: answer it with "Then you…"
  filled, the follow-up card appears; Done removes it without a reload; full-size screenshots at 375/900/1440 px in
  light and dark, no overflow with a 300-character step.
- AC5: `npm run typecheck`; `wc -l src/hub/commands/team/followups.ts src/hub/commands/team/inbox.ts
  src/hub/commands/work/execution.ts src/hub/server.ts ui/src/views/Inbox.tsx`; `npx vitest run test/hub/e2e/inbox.test.ts`.
- AC6 static: `grep -n "inbox__text" ui/src/styles/views.css ui/src/views/Inbox.tsx` finds the rule (with
  `overflow-wrap: anywhere` and `min-width: 0`) and the `className` on the question `<p>`; in `Inbox.tsx`, the
  `Follow-up for` input line comes after `<form` and before both the `Answer ${e.ref}` input and `</form>`
  (`grep -n -e "<form" -e "Follow-up for" -e 'Answer ${e.ref}' -e "</form>" ui/src/views/Inbox.tsx` prints them in
  that order), and `grep -n "optional step you will do" ui/src/views/Inbox.tsx` finds the placeholder;
  `git diff main -- ui/src/styles/views.css` adds only that rule. AC6 on screen: the AC4 manual run (QA screenshots,
  then the Designer's re-review) with a 300-character step and an escalation carrying one unbroken 80-character
  token, at 375/900/1440 px, light and dark: no sideways scroll, text inside the card, placeholder not clipped.

## Rollout & rollback
Ships in the hub bundle and UI (Release builds them); this repo gets it through `refresh-bin`. Old hubs read a
follow-up as an ordinary open question to the executive (shown in `inbox` as an escalation, answerable the same way),
so mixed versions stay safe. Rollback: revert the commit; open follow-ups stay answerable as questions.

## Risks & open questions
- A follow-up blocks its document's forward moves until done. That is the intent (P-003 waits for the merge); for a
  step that does not hold the work, the human points `--unblocks` at the right document or answers it `done` early.
- After P-070 lands, `ask()` routes role asks for the executive to the Director; follow-ups are recorded directly, so
  they keep `to: executive`. Covered by AC1's assertion on `to`.
- Open (to PM, fyi): FEAT-068 AC2's "or the hub sees the condition met" and AC1's "asker attaches one when it
  escalates" are deferred (see Out).

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-072: Human follow-ups stay in the inbox until done [in-review] tasks 8/8 — claimed by Arpit Anand (developer:aac15b1577cfbb410)
- last checkpoint 2026-10-26 14:39 at T8 (d3cad9d) by Arpit Anand; since then 0 commit(s), 4 uncommitted file(s): plugins/crew/skills/hub/dist/crew.mjs, plugins/crew/skills/hub/dist/mcp.mjs, plugins/crew/skills/hub/dist/ui.html, plugins/crew/skills/hub/references/commands.md
- don't retry: screenshot loop on a sample-project scratch repo at 375/900/1440 light/dark — a follow-up card only exists after a human answer with the approval flag, which the guard rightly refuses to agents, and Bash access to the /tmp scratch repo is denied in this session; left to QA and the Designer's manual check per the Test plan
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —

Latest log:
- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-072-human-follow-ups-stay-in-the-inbox-until

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-072-human-follow-ups-stay-in-the-inbox-until
- 2026-10-26: status in-progress → in-review
- 2026-10-26: design review: changes requested — Inbox.tsx (packages/crew/ui/src/views/Inbox.tsx) - two changes, then a new design review. (1) Long step text overflows the card: the entry's question <p> (line 68, shared by follow-ups and escalations) has no wrapping rule, and .card has min-width:0 but no overflow-wrap, so an unbroken token longer than the card (a branch name like plan/P-072-human-follow-ups-stay-in-the-inbox-until, a path, a URL - the typical content of a follow-up step) runs past the card edge and scrolls the page sideways at 375 px. This breaks the Design section's criterion 'long step text wraps inside the card'. Fix: add one rule in packages/crew/ui/src/styles/views.css next to the other .live__/.actions__ rules, e.g. '.inbox__text { overflow-wrap: anywhere; min-width: 0; }', and put className="inbox__text" on that <p>; ask the Architect to add views.css to touches. (2) The 'Then you...' field sits after the Answer button and outside the <form>, so the natural flow (type the decision, press Enter or Answer) submits before the human reaches it, and Enter inside it does nothing. Fix: move the follow-up input inside the answer <form>, on its own .actions__row above the row with the decision input and Answer button, so Enter in either field submits both; shorten its placeholder so it is not clipped at 375 px, e.g. 'Then you... (optional step you will do)', keeping the aria-label. This amends the Design wording 'under the existing answer form' to 'inside the answer form, before Answer'. Everything else matches the Design section: inventory only (Card, Chip tone=primary dot, .id, IdLink, btn, input.actions__note, code.live__action, Result), tokens only, check_design --all clean. Not done in this review: the on-screen full-size check at 375/900/1440 light/dark (this session could not serve the UI or create a follow-up card, which needs a human answer with the approval flag); the re-review needs those screenshots from QA or the executive, with a 300-character step and one unbroken 80-character token.
- 2026-10-26: status in-review → in-progress — design changes requested: Inbox.tsx (packages/crew/ui/src/views/Inbox.tsx) - two changes, then a new design review. (1) Long step text overflows the card: the entry's question <p> (line 68, shared by follow-ups and escalations) has no wrapping rule, and .card has min-width:0 but no overflow-wrap, so an unbroken token longer than the card (a branch name like plan/P-072-human-follow-ups-stay-in-the-inbox-until, a path, a URL - the typical content of a follow-up step) runs past the card edge and scrolls the page sideways at 375 px. This breaks the Design section's criterion 'long step text wraps inside the card'. Fix: add one rule in packages/crew/ui/src/styles/views.css next to the other .live__/.actions__ rules, e.g. '.inbox__text { overflow-wrap: anywhere; min-width: 0; }', and put className="inbox__text" on that <p>; ask the Architect to add views.css to touches. (2) The 'Then you...' field sits after the Answer button and outside the <form>, so the natural flow (type the decision, press Enter or Answer) submits before the human reaches it, and Enter inside it does nothing. Fix: move the follow-up input inside the answer <form>, on its own .actions__row above the row with the decision input and Answer button, so Enter in either field submits both; shorten its placeholder so it is not clipped at 375 px, e.g. 'Then you... (optional step you will do)', keeping the aria-label. This amends the Design wording 'under the existing answer form' to 'inside the answer form, before Answer'. Everything else matches the Design section: inventory only (Card, Chip tone=primary dot, .id, IdLink, btn, input.actions__note, code.live__action, Result), tokens only, check_design --all clean. Not done in this review: the on-screen full-size check at 375/900/1440 light/dark (this session could not serve the UI or create a follow-up card, which needs a human answer with the approval flag); the re-review needs those screenshots from QA or the executive, with a 300-character step and one unbroken 80-character token.

## Outcome
Shipped: `answer … --follow-up STEP [--unblocks ID]` records a follow-up (an `ask` to the executive with `after` and
`step`, about the answered question's document or `--unblocks`) after the answer, with every refusal checked before
anything is written (new `commands/team/followups.ts`); `inbox` lists it as kind `follow-up` (not as an escalation)
until answered `done`; `resume`/handoff list each open blocking question as `waits for an answer: Q-… → to: text`; the
`ui` `answer` action takes `follow_up`/`unblocks`; the Inbox page shows the follow-up card with a Done button and a
"Then you…" field under each escalation's answer; `model.md` and `team/SKILL.md` describe it.
Deviations: the escalation hint is a text-form `then:` line, not a change to the `how` field (the existing AC1 case
asserts `how` exactly; agreed via the T3 wording); a usage line for `answer --follow-up` was added (registry test still
green); the text form prints `FOLLOW-UP  Q-…` with two spaces like the other kinds. The developer's screenshot loop was
not run: a follow-up card needs a human answer with the approval flag, which agents can't give — QA and the Designer
do the manual Inbox check. A long unbroken step word may overflow the card (the existing escalation `<p>` has no
`overflow-wrap` either; the styles are outside touches).
Learnings: K-2026-10-26-a-ui-state-that-only-a-human-approval
