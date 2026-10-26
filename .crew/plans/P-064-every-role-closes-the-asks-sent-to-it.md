---
id: P-064
title: Every role closes the asks sent to it
goal:
items: BUG-044
touches: plugins/crew/skills/hub/agents/pm.md, plugins/crew/skills/hub/agents/developer.md, plugins/crew/skills/hub/agents/qa.md, plugins/crew/skills/hub/agents/release.md, plugins/crew/skills/hub/agents/designer.md, plugins/crew/skills/hub/agents/generic.md, packages/crew/test/hub/e2e/agents.test.ts
depends_on:
status: accepted
branch: plan/P-064-every-role-closes-the-asks-sent-to-it
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
---

# P-064: Every role closes the asks sent to it

## Context
BUG-044 (G-007, P1, S2): dispatch row 1 offers every open, non-escalation question to the role it was sent to
(`answer Q-… about <ref>: <text>`, dispatch.ts ROWS[0]) until an `answer` event closes it. Only the director and architect
templates tell the agent to run `crew.mjs answer Q-…`; pm, developer, qa, release, designer and the generic project-role
template don't, so those agents do the work and leave the question open, and dispatch re-offers it every round. The hub
side is already right: `answer` accepts the run of the role the question is for (questions.ts `answer`), so this is an
instructions fix.

It is a prerequisite for G-009's Director-first exception work (Director's answer to Q-24ba43): once other roles must
`ask --to director` instead of escalating, every role has to be able to close the asks it is sent, and the Director's
asks to other roles must not loop.

## Scope
**In:**
- One line in each role template that lacks it (`pm.md`, `developer.md`, `qa.md`, `release.md`, `designer.md`,
  `generic.md` in `plugins/crew/skills/hub/agents/`): for an `answer Q-…` entry, do what it asks within the role, then
  close it with `crew.mjs answer Q-… "<what you did, or the answer>"`; if it is not the role's to do, answer saying so and
  naming the role that owns it. Never leave it open.
- A regression test that every agent template names `crew.mjs answer Q-`, and that the rendered pm agent carries it.

**Out (explicitly not doing):**
- Sending an ask that was re-dispatched N times to the Director. Dispatch is computed from the ledger and records no
  offers; repeated re-offers becoming Director stall entries is G-009's "dispatch Director stall entries" item (Q-73467a
  item 2), which covers this case.
- The escalate role gate and ask routing to the Director (G-009 items 1 and 4).
- Any change to `answer`, `ask`, dispatch or the director and architect templates.
- Re-rendering this repository's `.claude/agents/` or `.crew/templates/agents/` (paths.protected: the human does it, see
  Rollout).

## Acceptance criteria
- [ ] AC1 · `pm.md`, `developer.md`, `qa.md`, `release.md`, `designer.md` and `generic.md` each contain a line telling
  the agent that a question entry (`answer Q-…`) is closed with `crew.mjs answer Q-… "…"` after doing it, and what to
  answer when it is not the role's work. Test: every file in `plugins/crew/skills/hub/agents/` contains
  `crew.mjs answer Q-` (fails before the change for those six).
- [ ] AC2 · A rendered agent carries the line: after `init` and `agents` in a test repo, `.claude/agents/crew-pm.md` and
  a project role rendered from `generic.md` contain `crew.mjs answer Q-`.
- [ ] AC3 · No other template text changes: `git diff main -- plugins/crew/skills/hub/agents/director.md
  plugins/crew/skills/hub/agents/architect.md` is empty, and the six changed templates' diffs only add lines (the
  existing tests in `test/hub/e2e/agents.test.ts`, including "agent templates are valid and name real commands" and the
  release-template case, pass unchanged).

## Approach
Add the line where each template keeps its standing instructions: in **Rules** for pm, developer, qa, release, designer
and generic (where the architect's own `answer` line lives). Suggested wording (adapt the "within your role" part to each
role, keep the command literal):

> - A question for you (an `answer Q-…` entry from dispatch or `next`): do what it asks within your role, then close
>   it with `crew.mjs answer Q-… "<what you did, or your answer>"`. If it isn't your role's work, answer saying so and
>   which role owns it; never leave it open.

The templates must name only real hub commands (`answer` is one). Keep each line under the templates' existing wrap
(~120 chars), as the files do.

## Design

## Tasks
- [x] T1: Regression test in `test/hub/e2e/agents.test.ts`, `it("every role template closes its asks with answer (BUG-044)")`: each template file contains `crew.mjs answer Q-`; then `init(repo, { mode: "" })`, write a policy with a project role (as "a project role renders from the generic template" does), `tr(repo, "agents")`, and assert `.claude/agents/crew-pm.md` and the project role's agent contain it → verify: the new case fails on the current templates (six files lack the line).
- [x] T2: Add the line to `pm.md`, `developer.md`, `qa.md`, `release.md`, `designer.md` and `generic.md` → verify: `npx vitest run test/hub/e2e/agents.test.ts` passes (new and existing cases).

## Test plan
**Targeted checks:** (in the plan worktree, `cd packages/crew`; `npm ci --prefer-offline` first in a fresh worktree;
the e2e tests run the built bundle, so `npm run build` before running them; built files are not part of the change)
- AC1, AC2: `npx vitest run test/hub/e2e/agents.test.ts -t "BUG-044"`; before T2 it fails (T1 verify).
- AC3: `npx vitest run test/hub/e2e/agents.test.ts`, and `git diff main --stat -- plugins/crew/skills/hub/agents/`
  lists only the six files, with only insertions.

## Rollout & rollback
Ships in the plugin's templates. In this repository the agents run from `.crew/templates/agents/` and
`.claude/agents/` (both paths.protected): after landing, the human refreshes `.crew/templates/agents/` from
`plugins/crew/skills/hub/agents/` and runs `node .crew/bin/crew.mjs agents`; `agents --check` flags the stale ones until
then. Rollback: revert the commit and re-render.

## Risks & open questions
- Until the human re-renders, this repo's agents still lack the line (BUG-044 persists here); the Release/Director report
  should flag the re-render.
- An agent may close an ask without having done the work; the answer text is the record, and G-009's stall entries catch
  asks that keep coming back.

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-064: Every role closes the asks sent to it [in-review] tasks 2/2 — claimed by Arpit Anand (developer:a69325ed00930a177)
- last checkpoint 2026-10-26 14:24 at done (6620206) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/agents.test.ts -t BUG-044 (AC 2)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/agents.test.ts (AC 3)
- ✓ git diff main --stat -- plugins/crew/skills/hub/agents/ (AC 3)
- ✓ git diff main --numstat -- plugins/crew/skills/hub/agents/ | awk '{n++; if ($2!=0 || $1==0) bad=1} END{exit !(n==6 && !bad)}' (AC 3)
- ✓ git diff main --name-only -- plugins/crew/skills/hub/agents/ | sort | tr '\n' ' ' | grep -qx 'plugins/crew/skills/hub/agents/designer.md plugins/crew/skills/hub/agents/developer.md plugins/crew/skills/hub/agents/generic.md plugins/crew/skills/hub/agents/pm.md plugins/crew/skills/hub/agents/qa.md plugins/crew/skills/hub/agents/release.md ' (AC 3)
- ✓ QA verified AC1-AC3 (agents.test.ts BUG-044 case passes) (reported)
- evidence: AC1 ✓, AC2 ✓, AC3 ✓

Latest log:
- 2026-10-26: status in-progress → in-review
- 2026-10-26: status in-review → accepted
- 2026-10-26: status accepted → in-progress — land: hub.full_suite failed (exit 1):      15| beforeAll(() => { ·        | ^ ·      16|   execFileSync("node", [new URL("../scripts/sample-project.mjs", impor… ·      17|   graph = JSON.parse(tr("export", "--json")); · ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-064-every-role-closes-the-asks-sent-to-it
- 2026-10-26: status in-progress → in-review
- 2026-10-26: status in-review → accepted
- 2026-10-26: status accepted → in-progress — land: hub.full_suite failed (exit 1):      15| beforeAll(() => { ·        | ^ ·      16|   execFileSync("node", [new URL("../scripts/sample-project.mjs", impor… ·      17|   graph = JSON.parse(tr("export", "--json")); · ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
- 2026-10-26: status in-progress → in-review — land bounce was not P-064: view.test.ts times out its beforeAll on main too under load (see the done checkpoint); no code change
- 2026-10-26: status in-review → accepted
- 2026-10-26: BUG-049 overlaps: the full-suite view.test.ts beforeAll timeout under load bounced this landing; not caused by this plan's code (view passes alone). Tracked as BUG-049 (P1, G-007).

## Outcome
Learnings: none
