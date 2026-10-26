---
id: P-070
title: Asks for the executive go to the Director first
goal:
items: CHORE-030
touches: packages/crew/src/hub/commands/team/questions.ts, plugins/crew/skills/hub/agents/director.md, plugins/crew/docs/context-and-memory.md, plugins/crew/skills/hub/SKILL.md, packages/crew/test/hub/e2e/dispatch.test.ts
depends_on:
status: in-review
branch: plan/P-070-asks-for-the-executive-go
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
---

# P-070: Asks for the executive go to the Director first

## Context
CHORE-030 (G-009, P2), from the executive's Q-24ba43 and the Director's Q-73467a item 4: every exception should reach
the Director first, and the executive should see only what the Director escalates. Today `ask --to executive` from any
role goes straight to the human: `ask()` in `packages/crew/src/hub/commands/team/questions.ts` records it with
`to: executive`, which inbox, `escalationHolds`, `notify` and `answer` all treat as an escalation, and dispatch row 1
never offers it to the Director. Q-d4e060 and Q-67af6f on P-003 are this pattern.

Still needed (checked 2026-10-26): `ask` has no routing, `director.md` doesn't say it is the only way to the executive,
and `plugins/crew/docs/context-and-memory.md` has nothing on questions. No plan covers it: P-064 (BUG-044, accepted)
only adds `answer Q-…` lines to the other role templates, and its Out section leaves ask routing to this item.

Split with FEAT-065 (escalate role gate, not yet planned): FEAT-065 changes `escalate` (refuse it for every role but the
Director). This plan changes only `ask` to the executive. Neither needs the other's code; both edit `questions.ts`, in
different functions.

## Scope
**In:**
- `ask()` routing: when the target is the policy's escalation target (`policy.escalation.to`, `executive` by default),
  the call is not an escalation (`o.escalation` unset), the run has a role (`CREW_ROLE`) that is neither the Director
  nor the escalation target, and the policy has a `director` role, the question is recorded `to: director` instead, and
  the output says so: `Q-… → director … (asks for the executive go to the Director first; only the Director escalates)`.
  `--fyi` and `--options` are kept. Nothing else in `ask` changes.
- Unchanged on purpose: the Director's own `ask --to executive` (already an escalation everywhere), a run with no role
  or in the executive role (the human), `escalate` (FEAT-065's), and policies without a `director` role.
- `plugins/crew/skills/hub/agents/director.md`: say that questions other roles meant for the executive arrive as its
  `answer Q-…` entries, that it settles what it can and escalates only what only the human may decide, and that it is
  the only role that reaches the executive (with `escalate`).
- `plugins/crew/docs/context-and-memory.md`: a short "Questions and exceptions" prose section (outside the generated
  blocks) describing Director-first routing: roles ask `--to director` (an ask to the executive is routed there), the
  Director answers or escalates, the human answers escalations with `--approved-by`.
- `plugins/crew/skills/hub/SKILL.md` (hub.shared): the "Roles and questions" paragraph's escalate sentence says
  exceptions go to the Director first and only the Director escalates to the human.

**Out (explicitly not doing):**
- The escalate role gate and the `escalate` lines in other role templates (`pm.md`, `generic.md`, `release.md`):
  FEAT-065.
- Director stall entries (FEAT-066) and the runner's Director pass (FEAT-067).
- MCP tool or CLI descriptions in `questions.reg.ts` (they would regenerate `references/commands.md` and
  `docs/reference.md`); dispatch, inbox and answer code.
- Re-rendering this repository's `.claude/agents/` or `.crew/templates/agents/` (paths.protected: the human does it,
  see Rollout).

## Acceptance criteria
- [ ] AC1 · A run in a role other than director/executive that runs `ask P-001 --to executive "…"` records an `ask`
  event with `to: director`, prints that it went to the Director, adds no inbox escalation, and `dispatch` gives the
  director an `answer Q-…` entry for it. Test: `dispatch.test.ts` case "an ask to the executive from a role goes to the
  Director (CHORE-030)".
- [ ] AC2 · The Director's `ask --to executive`, a run with `--as executive`, and `escalate` still record
  `to: executive` and show in `inbox` as escalations. Test: same case.
- [ ] AC3 · `director.md` says it is the only role that reaches the executive (via `escalate`) and that routed
  questions arrive as its `answer Q-…` entries; `context-and-memory.md` has a "Questions and exceptions" section saying
  asks for the executive go to the Director first. Test: `agents.test.ts` "agent templates are valid and name real
  commands" passes; `docs.test.ts` passes; `grep -n "Director first" plugins/crew/docs/context-and-memory.md
  plugins/crew/skills/hub/agents/director.md` finds both.

## Approach
In `ask()`, after the `--to` role check, compute the effective target:
`const target = store.policy.policy.escalation.to;` and if `to === target && !o.escalation && who.role &&
who.role !== "director" && who.role !== target && roles.includes("director")` then `to = "director"` and append the
routing note to the `store.say` line. `who` is `store.ledger.who`. Keep `notify` keyed on the final `to`, so a routed ask
doesn't notify the human. `questions.ts` stays well under 300 lines.

Doc wording should be short and literal (real hub commands only; templates keep their ~120-char wrap).

## Design

## Tasks
- [x] T1: Add `it("an ask to the executive from a role goes to the Director (CHORE-030)")` to `test/hub/e2e/dispatch.test.ts` (lifecycle, newPlan; `as developer ask P-001 --to executive`; assert last ask event `to: director`, output names the Director, `inbox --json` has no escalation, director's dispatch has `answer <qid>`; then `as director ask --to executive`, `as executive ask --to executive` and `as pm escalate` each record `to: executive` and appear in `inbox`) → verify: the new case fails before T2.
- [x] T2: Route the ask in `questions.ts` `ask()` as in Approach → verify: `npx vitest run test/hub/e2e/dispatch.test.ts test/hub/e2e/inbox.test.ts test/hub/run-check.test.ts` passes.
- [x] T3: Update `director.md`, `context-and-memory.md` (prose outside generated blocks) and the hub `SKILL.md` escalate sentence → verify: `npx vitest run test/hub/e2e/agents.test.ts test/docs.test.ts` passes and the grep in AC3 finds both files.

## Test plan
**Targeted checks:** (in the plan worktree, `cd packages/crew`; `npm ci --prefer-offline` first in a fresh worktree;
the e2e tests run the built bundle, so `npm run build` before running them; built files are not part of the change)
- AC1, AC2: `npx vitest run test/hub/e2e/dispatch.test.ts -t "CHORE-030"` (fails before T2); plus
  `npx vitest run test/hub/e2e/inbox.test.ts test/hub/run-check.test.ts` unchanged and green.
- AC3: `npx vitest run test/hub/e2e/agents.test.ts test/docs.test.ts`; the grep in AC3.

## Rollout & rollback
Ships in the hub bundle and plugin templates. In this repository the Director agent runs from
`.crew/templates/agents/` and `.claude/agents/` (paths.protected): after landing, the human refreshes
`.crew/templates/agents/director.md` from `plugins/crew/skills/hub/agents/` and runs `node .crew/bin/crew.mjs agents`;
`.crew/bin` is refreshed after merge as usual. Rollback: revert the commit, rebuild and re-render.

## Risks & open questions
- A role that really needs the human (a reserved decision) now waits one Director pass longer; the Director escalates
  it. Accepted: that is the Director-first rule.
- Until FEAT-065 lands, a role can still reach the executive with `escalate`; this plan closes only the `ask` path.

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-070: Asks for the executive go to the Director first [in-review] tasks 3/3 — claimed by Arpit Anand (developer:ac46af70205372d20)
- last checkpoint 2026-10-26 16:00 at T3 (68d6406) by Arpit Anand; since then 0 commit(s), 2 uncommitted file(s): plugins/crew/skills/hub/dist/crew.mjs, plugins/crew/skills/hub/dist/mcp.mjs
- evidence: AC1 —, AC2 —, AC3 —

Latest log:
- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-070-asks-for-the-executive-go

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-070-asks-for-the-executive-go
- 2026-10-26: status in-progress → in-review

## Outcome
Shipped: `ask()` in `questions.ts` routes an ask for the escalation target (executive) from a role other than the
Director or the executive to `director` when the policy has a director role, and says so in its output; the Director's
own ask, the executive's, `escalate` and director-less policies are unchanged. `director.md`, `context-and-memory.md`
("Questions and exceptions") and the hub `SKILL.md` describe Director-first routing. New e2e case in
`dispatch.test.ts` ("CHORE-030"). No deviations from the spec. Follow-ups: FEAT-065 (escalate role gate); after
landing, the human refreshes `.crew/templates/agents/director.md` and re-renders agents (see Rollout).
Learnings: none
