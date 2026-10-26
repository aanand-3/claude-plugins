---
id: P-065
title: Only crew agents act in a crew role
goal:
items: BUG-043
touches: packages/crew/src/hub/commands/team/guard.ts, packages/crew/test/hub/e2e/guard.test.ts, plugins/crew/skills/hub/SKILL.md
depends_on:
status: done
branch: plan/P-065-only-crew-agents-act-in-a-crew-role
pr:
created: 2026-10-26
started: 2026-10-26
completed: 2026-10-26
assignee: developer
---

# P-065: Only crew agents act in a crew role

## Context
BUG-043 (G-007, P1, S2): `guard.ts` `decide()` returns `null` for the main session (`if (!h.agent_type) return null`)
and for subagents that aren't crew agents (`if (!role) return null`, before the identity block), so their hub calls go
through with whatever identity the caller types: `--as pm`, `--run-id …`, a `CREW_ROLE=` / `CREW_RUN=` assignment, or
`as: "pm"` on an MCP tool. Seen on 2026-10-26: the main session ran `assign P-060 --to developer` with `--as pm`
(0734bc7) and the hub recorded the pm role. Every role gate (PM-only assign, developer-only start, QA evidence) is then
convention only for those callers. The team rule is that the session launches the role's agent instead
(K-2026-10-26-the-team-session-never-runs-a-roles-hub). The guard is an accident-preventer, not a security boundary.

Overlap: P-063 (in review) changes `guard.ts` too (the secrets check at line 138, `words` moved out). This plan changes
other lines of the same file and needs none of P-063's code, so there is no dependency; `guard.ts` is not a
`hub.shared` path, so staffing holds this plan until P-063 lands, and the developer starts from P-063's guard.ts on
main. `guard.test.ts` and `SKILL.md` are `hub.shared`. P-062 touches none of these files.

## Scope
**In:**
- For the main session and for subagents that aren't crew agents, the guard refuses in a hub call (Bash text naming
  `crew.mjs`): `--as <role>` / `--as=<role>` for any role but `executive`; `--run-id`; an assignment to `CREW_ROLE`,
  `CREW_RUN`, `CREW_ACTOR` or `CREW_TEAM` (inline, `export`, `env` and `declare` forms all contain `CREW_X=`).
- On hub MCP tools from those callers: `as` other than `executive`, and any `run_id`.
- The refusal tells the caller to launch the role's agent instead.
- `SKILL.md`'s "Agents and the guard" paragraph and the `guard.ts` header comment say so.

**Out (explicitly not doing):**
- Injecting `--as executive` into those callers' hub calls. With a role set, `run --until-done` refuses to start
  (runner.ts: "started by a human … not by a crew agent"), and `next` / `context` follow the acting role, so injection
  would change what the main session sees and runs. A refused claim already gives the bug's expected result; the hub
  records the caller in no role (or as executive when it passes `--as executive`), and role gates refuse no role.
- Anything else for the main session: `--approved-by`, edits to protected paths and other subagent-only checks stay as
  they are (the main session is the human's own).
- Crew agents' identity rules (unchanged), `hubcall.ts` (not needed: the checks are on the command text, as the crew
  agents' are), a `CREW_RUNNER` variable (the hub reads none).
- Identity set outside the command text (the process environment, settings files).

## Acceptance criteria
- [ ] AC1 · From the main session (no `agent_type`) and from a subagent that isn't a crew agent (`agent_type: "Explore"`),
  each of these Bash commands is denied, with a reason naming the role's agent: `node .crew/bin/crew.mjs assign P-060
  --to developer --as pm` (the BUG-043 repro), `node .crew/bin/crew.mjs --as=pm next`. Regression test; fails before the
  fix (the guard returns null).
- [ ] AC2 · From both callers, each of these is denied with a reason that says not to pass `--run-id` or `CREW_*`
  variables: `node .crew/bin/crew.mjs next --run-id x`; `CREW_ROLE=pm node .crew/bin/crew.mjs next`;
  `export CREW_ROLE=pm && node .crew/bin/crew.mjs next`; `env CREW_RUN=x node .crew/bin/crew.mjs next`;
  `CREW_ACTOR=x node .crew/bin/crew.mjs next`; `CREW_TEAM=web node .crew/bin/crew.mjs next`.
- [ ] AC3 · From both callers, a hub MCP tool call (`mcp__plugin_crew_hub__next`) with `as: "pm"` is denied, and one with
  `run_id: "x"` is denied.
- [ ] AC4 · Still allowed (hook output `null`) from both callers: `node .crew/bin/crew.mjs next`,
  `node .crew/bin/crew.mjs context --as executive`, a non-hub command naming `CREW_ROLE=` text (`grep -rn CREW_ROLE= src`),
  and MCP calls with no `as` or with `as: "executive"`. From the main session only: the existing "the guard leaves the
  main session alone" case (`move … --approved-by`, an Edit of `.crew/policy.yaml`) passes unchanged.
- [ ] AC5 · Crew agents are unchanged: the existing cases in `test/hub/e2e/guard.test.ts` and
  `test/hub/e2e/guard-writes.test.ts` pass without edits (guard.test.ts's diff only adds the new case).
- [ ] AC6 · `plugins/crew/skills/hub/SKILL.md` no longer says the main session sets its own role: it says the main
  session and other non-crew agents act as the executive and that the guard refuses their role claims (check:
  `grep -n "main session" plugins/crew/skills/hub/SKILL.md` shows the new wording).

## Approach
One helper in `guard.ts`, used at both early returns:

```ts
/** The main session and subagents that aren't crew agents act as the executive (the human's role): they never claim a
 * crew role, a run or CREW_* identity (BUG-043). Returns a deny, or null. */
function unclaimed(h: HookInput): Decision
```

- Bash, when `CREW_CLI.test(cmd)`: the `--as[=\s]+(\S+)` matches (as the crew-agent block reads them) other than
  `executive` → deny `you aren't a crew agent: launch the ${c} role's agent (crew-${c}) instead of passing --as ${c}`
  (first claimed role); `/--run-id\b|\bCREW_(ROLE|RUN|ACTOR|TEAM)=/` → deny `you aren't a crew agent: don't pass
  --run-id or CREW_* variables; launch the role's agent to act in a role`.
- `HUB_MCP.test(h.tool_name)`: `as` defined and not `executive` → the same role message (`set as` wording); `run_id`
  defined → deny `don't pass run_id`.
- `decide()`: line 81 becomes `if (!h.agent_type) return unclaimed(h);` and line 147 `if (!role) return unclaimed(h);`
  (after the every-subagent checks, which keep their order). Nothing else in `decide()` changes; crew agents never reach
  `unclaimed`.
- Header comment: the main session is left alone except for the ui endpoint and role claims.

`executive` is a literal (the human's role, as `agents.ts` `HUMAN`). guard.ts stays under 300 lines
(K-2026-10-23-every-module-stays-under-300-lines).

SKILL.md line 40: replace "Humans and the main session use `--as ROLE` / `--run-id ID` (or `CREW_ROLE`/`CREW_RUN`)
themselves." with a sentence saying humans in their own terminal set their identity themselves, while the main session
and subagents that aren't crew agents act as the executive: the guard refuses their `--as` for another role, `--run-id`,
`CREW_*` assignments and MCP `as`/`run_id`, so a role's work goes to that role's agent.

## Design

## Tasks
- [x] T1: Regression test in `test/hub/e2e/guard.test.ts`, `it("callers that aren't crew agents can't claim a role (BUG-043)")`, covering AC1–AC4 for `who` in `[null, "Explore"]` (via `hook()` and `bash()`; `init(repo)` first), asserting the denied reasons' key words → verify: `npm run build`, then `npx vitest run test/hub/e2e/guard.test.ts -t "BUG-043"` fails on the current guard.ts (the AC1 repro returns null).
- [x] T2: Add `unclaimed()` to `guard.ts` and call it at both early returns; update the header comment → verify: `npm run build`, then `npx vitest run test/hub/e2e/guard.test.ts test/hub/e2e/guard-writes.test.ts` pass; `wc -l src/hub/commands/team/guard.ts` under 300.
- [x] T3: Update the SKILL.md sentence (AC6) → verify: `grep -n "main session" plugins/crew/skills/hub/SKILL.md` shows the new wording; `npx vitest run test/docs.test.ts` passes.

## Test plan
**Targeted checks:** (in the plan worktree, `cd packages/crew`; `npm ci --prefer-offline` first in a fresh worktree;
the e2e tests run the built bundle, so `npm run build` after source changes; built files are not part of the change,
K-2026-10-24-release-builds-the-generated-files-plans)
- AC1–AC4: `npx vitest run test/hub/e2e/guard.test.ts -t "BUG-043"` passes after T2 and fails before it (T1 verify).
- AC4 (main session alone), AC5: `npx vitest run test/hub/e2e/guard.test.ts test/hub/e2e/guard-writes.test.ts`, and
  `git diff main -- packages/crew/test/hub/e2e/guard-writes.test.ts` is empty; guard.test.ts's diff only adds the case.
- AC6: the T3 grep, and `npx vitest run test/docs.test.ts`.
- All: `npm run typecheck`.

## Rollout & rollback
Ships with the next vendored hub refresh (Release builds the bundle; `.crew/bin` is refreshed after merge). No data,
policy or config change. After it, the main session's hub calls with another role's `--as` are refused: the team session
already launches role agents instead (team SKILL.md uses only `--as executive`). Rollback: revert the commit and refresh
`.crew/bin`.

## Risks & open questions
- Text-level check, like the crew agents' rule: a main-session hub call whose text merely mentions `--as pm` or
  `CREW_ROLE=` (e.g. a `grep` piped from `crew.mjs`, or a `--note` quoting a command) is refused. Accepted: same false
  positives crew agents already have; the main session can reword.
- Identity that comes from the process environment (a `CREW_ROLE` exported before Claude Code started) isn't visible to
  the guard and still applies. Out of scope; noted for the human.
- Sequencing: starts only after P-063 lands (same file); rebase on its guard.ts.

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-065: Only crew agents act in a crew role [in-review] tasks 3/3 — claimed by Arpit Anand (developer:a67bd3212d31b5186)
- last checkpoint 2026-10-26 13:58 at T3 (8040e12) by Arpit Anand; since then 0 commit(s), 2 uncommitted file(s): plugins/crew/skills/hub/dist/crew.mjs, plugins/crew/skills/hub/dist/mcp.mjs
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —, AC6 —

Latest log:
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-065-only-crew-agents-act-in-a-crew-role
- 2026-10-26: status in-progress → in-review — T1-T3 done. Branch predates P-063 on main; no overlapping hunks in guard.ts

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-065-only-crew-agents-act-in-a-crew-role
- 2026-10-26: status in-progress → in-review — T1-T3 done. Branch predates P-063 on main; no overlapping hunks in guard.ts
- 2026-10-26: status in-review → accepted
- 2026-10-26: landed on main as 68a6a44
- 2026-10-26: Landed on main as 68a6a44; full suite 662/662 passed; refresh-bin reported .crew/bin already up to date, so no further rollout step
- 2026-10-26: status accepted → done

## Outcome

The main session and subagents that aren't crew agents now go through `unclaimed()` in `guard.ts`: a hub call claiming
another role (`--as`), a run (`--run-id`), `CREW_ROLE/RUN/ACTOR/TEAM=` or MCP `as`/`run_id` is refused with a reason
pointing at the role's agent; `--as executive` and plain calls pass. SKILL.md says so. The branch was cut before P-063
landed on main; the two changes touch different hunks of guard.ts.

Learnings: none
