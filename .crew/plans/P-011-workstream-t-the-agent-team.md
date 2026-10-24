---
id: P-011
title: Workstream T: the agent team
goal: G-003
items: FEAT-006, FEAT-007, FEAT-008, FEAT-009, FEAT-010, FEAT-011, FEAT-012
touches:
depends_on:
status: done
branch:
pr: 
created: 2026-10-23
started:
completed: 2026-10-24
---

# P-011: Workstream T: the agent team

## Context
docs/vision.md plans a team of role agents — Director, PM, Architect, Developer, QA, Release — that takes a decided idea to a
shipped product through the hub, with humans (the executive) only where the policy's mode and reserved decisions say.
Workstream C built the shared context they need (ledger, policy, knowledge, evidence, context, roles, questions), but the
agents themselves were deferred to this workstream (G-003 in this repo's hub: FEAT-006…012, FEAT-020).

Claude Code facts that shape the design (docs checked today):
- subagents can't set their own environment variables, so `CREW_ROLE`/`CREW_RUN` can't identify them;
- a settings-level PreToolUse hook sees every tool call with `agent_type` (the agent's name) and `agent_id`;
- plugin agents ignore their own `hooks`/`permissionMode`/`mcpServers`; project agents (`.claude/agents/`) override plugin
  agents of the same name and keep their hooks; frontmatter supports `model`, `tools`, `disallowedTools`, `isolation:
  worktree`, `maxTurns`, `skills`, `color`, `memory`;
- subagents can spawn subagents up to 3 levels below the main session.

Decisions (user): the Director is a subagent (main session → Director → role agents); identity is harness-verified; agents
are rendered into the project from the policy; one plan for all roles, in phases, each phase its own branch.

## The lifecycle (user direction)
```
Human (executive)          idea → research → finalise ──────────────────────────────► validates all goals done
                                         │ decided idea                                  → new goals, repeat
Director (owns delivery)                 ▼ kickoff ── goals, plans, tasks ── human approves the goal set
                                               │
               ┌───────────────────────────────▼───────────────────────────────────────────────┐
build loop:    │ PM: ranks the backlog → Architect: specs the top items (plan → ready)              │
               │ Director: staffs (how many in parallel, which team) → PM: opens the plan (assign)  │
               │ Developer: implements → hands to test → QA: tests, records evidence, logs bugs     │
               │ PM: completes the plan once QA's evidence is complete → Release: merges            │
               │ bugs / new features found → items → PM: triages & ranks → Architect: specs → …    │
               └─► Director + PM: goal reached? all plans complete? no drift? → goal done → next focus
```

## RACI — one Accountable per activity; every R/A line is enforced by a hub gate
R responsible (does it) · A accountable (owns the outcome, signs off) · C consulted · I informed. `Exec` is the human.

| # | Activity | Exec | Director | PM | Architect | Developer | QA | Release | Enforced by |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Define the idea; research; finalise (decide) | **A/R** | C | C | C | | | | reserved `idea.decided` |
| 2 | Kick off from the decided idea | I | **A/R** | R | R | | | | ledger workflow run |
| 3 | Architecture, stack, ADRs, rules | I | A | C | **R** | C | | | — (Architect's skills) |
| 4 | Goals and initial backlog | C | A | **R** | C | | | | `new-goal`/`new-item` by role |
| 5 | Approve the goal set | **A/R** | R | C | | | | | human gate `goal.active` |
| 6 | Capture items (features, bugs found) | | I | **A** | R | R | R | R | anyone captures; only PM triages |
| 7 | Triage and rank the backlog | | C | **A/R** | C | | | | `item.triaged: pm` |
| 8 | Write the spec: plan, touches, AC, tasks, test plan | | I | C | **A/R** | C | C | | `plan.ready: architect` (fast lane: PM, for small CHORE/BUG) |
| 9 | Staff: parallelism, team, budget | | **A/R** | C | | | | | `staff`, `max_agents` |
| 10 | Open the plan (assign to a developer) | | C | **A/R** | | I | | | new `assign`: `plan.assigned: pm` |
| 11 | Implement (claim, branch, code, checkpoints, gotchas) | | | A | C | **R** | | | `start`: assigned developer only |
| 12 | Hand over to test | | | A | | **R** | I | | `plan.in-review: developer` |
| 13 | Test, record evidence per criterion | | | A | | I | **R** | | evidence counts from QA runs only |
| 14 | Log bugs with reproductions | | | A | | I | **R** | | `new-item bug` (PM triages) |
| 14b | Code review: diff vs spec, rules, architecture | | | A | **R** | I | | | new `review --approve\|--changes`; required for `plan.done`; reviewer ≠ implementer |
| 15 | Fix bugs (sent back to in-progress) | | | A | C | **R** | C | | `plan.in-progress` from review: developer |
| 16 | Complete the plan | | I | **A/R** | C | I | C | | `plan.done: pm` + QA evidence complete + approving review |
| 17 | Merge, rollout and rollback | | I | **A** | C | | | **R** | `merge-order`; prod deploy reserved |
| 18 | Goal done: reached, plans complete, no drift | I | **A/R** | R | C | | | | `goal.done: director` + PM's goal evidence |
| 19 | All goals done → idea's success criteria; new goals | **A/R** | R | C | | | | | reserved; the cycle repeats |
| 20 | Escalate reserved decisions | **A** | R | C | C | C | C | C | `escalate`; answers need the human |
| 21 | Detect stuck work; reassign stale claims | I | **A/R** | C | | I | | | stale-claim, bounce and attempt limits → auto-escalate to the Director |
| 22 | Pause / resume the team | **A/R** | R | | | | | | `pause`/`resume`: no new staffing or starts while paused |
| 23 | Define extra roles (e.g. designer, security) | **A** | R | C | C | | | | `roles:` in the policy; rendered like the built-in six |

Rules that keep roles apart:
- **Developer** never opens or completes a plan, never triages, never records evidence that counts. It implements what it's
  assigned, hands over to test, fixes what QA sends back.
- **QA** never edits code, never moves a plan to done; its evidence and bug reports are what the PM completes against.
- **PM** owns the backlog *and* each plan's lifecycle (open → complete); it never writes specs or code.
- **Architect** owns specs and technical answers; it never implements or completes.
- **Director** owns goals and delivery (staffing, flow, goal sign-off with the PM, escalation); it never writes code or
  specs and never approves on the executive's behalf.
- **Release** only merges and rolls out completed plans.

The `lifecycle` policy preset (written by kickoff; mode `ai-native` + `human_gates: [goal.active]` + these `role_gates`)
turns the table into gates. Goal validation reuses the evidence machinery: PM records `checkpoint G-### --verify … --ac …`
per goal criterion; `goal.done` needs every criterion verified by the PM, every plan complete, no open items in the goal,
and no drift findings.

Hub changes the RACI needs (beyond what C built): an `assign` step (ledger event + plan `assignee:`) that only the PM
makes and that `start` requires; role-based evidence (checks count only from the QA role, never from the implementer);
transitions gated per *from → to* where it matters (in-review → in-progress is the developer's; ready → in-progress needs
an assignment); goal evidence and the goal.done gate.

## Autonomy additions (user: include all)
- **Roles as data.** `ROLES` (core/model.ts) becomes the built-in six plus any `roles.<name>` declared in the policy with a
  `charter:` (what it owns and never does); custom roles render from a generic template with that charter and can be named
  in role gates, `ask --to`, `next --as`.
- **Code review.** `review P-### --approve | --changes "<what>"` (ledger event; Architect role; never the implementer);
  `plan.done` requires an approving review newer than the last code change (checkpoint sha), and `--changes` sends the plan
  back to in-progress for the developer.
- **Liveness.** Policy `limits: {stale_claim_hours, max_bounces, max_attempts}`. A claim with no checkpoint for
  `stale_claim_hours` is stale: `check`, the Director's queue and the executive view flag it and the Director may `reassign`
  it. A plan sent back from review more than `max_bounces` times, or with more than `max_attempts` recorded failed attempts,
  auto-escalates to the Director (an `ask` it must answer).
- **Pause / kill switch.** `pause [--reason]` / `resume` (ledger events; executive or Director). While paused, `staff` and
  `start` refuse; runs in flight finish their current step and hand off. The executive view shows the state.
- **Unattended runner and alerts.** A runner (`crew.mjs run` prints the command; scheduled or looping headless `claude -p
  "/crew:team continue"`) keeps the Director going until there is an escalation, a pause, an exhausted budget or a done
  goal. Policy `notify: {command: "<shell>", on: [escalation, budget, stale, goal-done]}`; the hub runs the command with
  the event as JSON on stdin (ntfy, Slack webhook, email — the user's choice).
- **Usage capture.** T0 investigates where token and cost data is available (hook payloads, SubagentStop, transcripts,
  OpenTelemetry); the runner/hooks then record `usage` per run and role automatically so budgets bite.
- **Fast lane.** Policy `fast_lane: {types: [CHORE, BUG], max_tasks: 3}`: small items may be specced by the PM (no
  Architect step) and skip the rollout step (Release still merges); QA evidence, code review and PM completion still apply.

## How an agent is defined
One Markdown file per role. Frontmatter is what Claude Code applies (rendered from the policy by `crew.mjs agents`); the
body is the role itself — its charter, loop, rules and report — and `crew-role` (ignored by Claude Code, read by the hub's
guard) ties the agent to its hub role:
```markdown
---
name: crew-qa
description: QA for this crew project. Use to test a plan in review: run its checks, record evidence per acceptance criterion, and log bugs with reproductions. Never edits code and never completes the plan (the PM does).
crew-role: qa
model: sonnet                        # from the policy (models.default for the qa role)
tools: Read, Grep, Glob, Bash        # from the policy (tools.allow minus tools.deny)
disallowedTools: Edit, Write
color: green
---
You are QA on a crew team. You own evidence: nothing is done until you have verified it yourself.

Loop: `crew.mjs context --as qa` → `crew.mjs next --as qa` → for the plan you're given: run each check named in its test
plan with `crew.mjs checkpoint P-### --run "<check>" --ac <n>`; file a BUG item with a reproduction for each failure …
Rules: never pass --approved-by; never edit code; ask the architect (`crew.mjs ask … --to architect`) when a criterion is
ambiguous …
Report to the Director (and the PM, who completes the plan): verified / failed per criterion, bugs filed.
```

## Design
```
You (executive) ── main session ── /crew:team "<ask>" ──► crew-director (subagent)
                                                           ├─► crew-pm         ┐
                                                           ├─► crew-architect  │ role subagents: read `context --as R`,
                                                           ├─► crew-developer  │ work from `next --as R`, report back
                                                           ├─► crew-qa         │ to the Director; questions go through
                                                           └─► crew-release    ┘ the hub (ask/answer/escalate)
PreToolUse guard (settings hook → `crew.mjs guard`): every crew call's role must match the calling agent; no subagent
may pass --approved-by; each role's tools and write paths come from the policy.
```
- **Identity.** The hub gets explicit identity: global `--as ROLE` / `--run ID` on the CLI and `as`/`run` fields on MCP tools
  (override the env; `Who` gains a source). The guard finds the calling agent's definition (`.claude/agents/<agent_type>.md`)
  and reads its `crew-role`, then checks every crew call:
  claimed role = agent role (else deny); run defaults to `<role>:<agent_id>` so parallel developers are distinct runs. If
  PreToolUse can rewrite tool input, the guard injects `--as`/`--run` itself; otherwise agents pass them and the guard
  only verifies (phase T0 decides). The main session with no agent_type is the human's own session: unaffected.
- **Approvals stay human.** The guard denies `--approved-by` from any subagent; escalations go up to the executive.
- **The guard protects itself.** Built-in `paths.protected` adds `.claude/settings*.json`, `.claude/agents/**`,
  `.crew/policy.yaml` and `.crew/bin/**`, so no agent can remove the hook, rewrite its own definition or loosen the policy.
  Path rules are exact for Edit/Write/MultiEdit/NotebookEdit and best-effort for Bash (redirections and common write
  commands); code review and the drift check are the backstop for the rest.
- **One identity flag.** `--as ROLE` everywhere; `next --role` / `context --role` stay as aliases.
- **Stateless Director.** Each Director cycle starts from `context --as director` and `staff`; the hub is its only memory, so
  long runs don't fill its context and the runner can restart it at any time. Agents don't use Claude Code's `memory:`
  field — the hub's knowledge is the team's one memory.
- **Policy adapter, two halves.** `crew.mjs agents` renders `.claude/agents/crew-<role>.md` from templates + the role's
  effective policy (model, tools allow/deny, `isolation: worktree` for developers, `maxTurns`); `agents --check` (also in
  `check`) flags agents that are stale against the policy. At runtime the guard enforces what frontmatter can't:
  Bash patterns from `tools.deny`, `paths.write` scope and `paths.protected` (Edit/Write/MultiEdit/NotebookEdit),
  and `secrets.files` (Read).
- **Templates.** `plugins/crew/skills/hub/agents/<role>.md`, vendored by `init` into `.crew/templates/agents/`: mission,
  loop (`context` → `next` → work → `checkpoint`/`learn`/`handoff` → report), rules (never approve; ask, don't guess;
  stay in your touches), report format back to the Director.
- **Entry point.** A `team` skill (`/crew:team <ask>`): renders agents if missing/stale, then hands the ask to crew-director.

## Phases (each a branch stacked on the previous, in a worktree; base: fix/hub-review)
0. **Spike: hook capabilities.** In a throwaway project, confirm what PreToolUse receives for plugin vs project agents
   (`agent_type` values, nesting) and whether `updatedInput` can rewrite a Bash command and MCP arguments. Record the
   result as an ADR-style decision entry in this repo's hub; it fixes inject-vs-verify for T1. Also find where token and
   cost data is available (hook payloads, SubagentStop, transcripts, OpenTelemetry) for usage capture in T7; confirm the
   nesting depth main → director → role → (Explore) fits the 3-level limit, and how `isolation: worktree` names branches,
   cleans up, and sees the ledger (git common dir).
1. **Identity & guard** (packages/hub): `--as`/`--run` (cli.ts parse layer, mcp.ts tool schemas, ledger.ts `whoAmI` →
   explicit identity first), `guard` command (reads hook JSON on stdin; prints the hook decision JSON), the PreToolUse
   entry in `plugins/crew/skills/guidelines/templates/settings.json`, policy checks (core/policy.ts effective policy per
   role; knowledge.ts `globRe` for paths); roles as data (`ROLES` = the built-in six + policy `roles.<name>` with a
   `charter:`). Tests: hook-payload fixtures (allow, wrong role, --approved-by from a subagent, protected path, Bash deny
   pattern, main session untouched); a custom role usable in gates and `ask --to`.
2. **Agent rendering**: role templates; `agents [--check]` (new commands/agents.ts) rendering frontmatter from
   `resolvePolicy(root, dir, role)`; `init` vendors templates; `check` hint for stale agents. Tests: model/tools follow a
   role override; developer gets `isolation: worktree`; a custom role renders from the generic template with its charter;
   `--check` after a policy change.
3a. **Director & PM, plan ownership**: director.md and pm.md bodies; `assign P-### --to developer
   [--team T]` (ledger event + plan `assignee:`; PM only) which `start` requires; `plan.done` gated to the PM and requiring
   complete QA evidence; role gates on *from → to* transitions where the RACI needs it (core/policy.ts `role_gates` keys
   like `plan.in-review>in-progress`); `staff` command (commands/staff.ts): the ready,
   non-overlapping frontier (reuse queries.ts `unmetDeps`, footprint.ts `overlapping`), capped by `max_agents` minus live
   claims, routed to teams by `touches` vs `teams.<t>.scope` (knowledge.ts `globsOverlap`); the `lifecycle` policy preset
   (core/policy.ts) that kickoff writes; `team` skill. Tests: frontier, cap, team routing, assign required by start, only
   the PM completes, preset gates.
3b. **Goal validation, liveness, pause**: goal evidence — `checkpoint G-### --verify … --ac …` recorded by the PM role — and
   a `goal.done` gate (Director; every criterion PM-verified, plans complete, no open items, no drift) in
   workflow.ts/execution.ts; liveness (policy `limits`, stale claims flagged, `reassign`, bounce/attempt limits
   auto-escalating to the Director); `pause`/`resume`. Tests: goal.done refused until PM-verified and clean, a stale claim
   flagged and reassigned, the third bounce escalates, staff/start refused while paused.
4. **Architect & kickoff as the team's first job**: architect.md (stack decisions from the discover references, ADRs,
   guidelines, git-setup, plans with touches); kickoff runs as a ledger workflow when the hub is present —
   `checkpoint --workflow kickoff --step S` / `resume --workflow kickoff` (execution.ts) — replacing kickoff.yaml there
   (no-hub projects keep the yaml); kickoff/onboard SKILL.md hand their steps to the Director when `modules.hub`; code
   review (`review --approve|--changes`, Architect role, never the implementer; `plan.done` needs an approving review newer
   than the last code change).
5. **Developer & QA**: developer.md (resume, start only what's assigned to it, checkpoint after each task, learn gotchas,
   hand over to test, fix what QA sends back; `isolation: worktree`), qa.md (`checkpoint --run … --ac` per criterion, bugs
   with reproductions, report to PM and Director); role-based evidence in execution.ts: checks count only when recorded by
   the QA role (and never by an implementer run).
6. **Release**: `merge-order` command (done plans in dependency order, branches still present); release.md (merge,
   rollout/rollback from the plan, production deploy is reserved → escalate).
7. **Autonomy**: the unattended runner (`crew.mjs run`; a scheduled or looping headless `/crew:team continue` that stops on
   escalation, pause, exhausted budget or a done goal); `notify` (policy command run with the event JSON); automatic usage
   capture per run and role from what T0 found; the fast lane (policy `fast_lane`: PM may spec small CHOREs/BUGs, no
   Release step; evidence, review and PM completion still apply). Tests: runner stop conditions, notify invoked on an
   escalation, captured usage reaching budgets, fast-lane item completed without an Architect spec but not without QA.
8. **Docs & dogfood**: hub SKILL.md/model.md (identity flags, guard, agents, staff), README, vision status; render the
   agents in this repo and run `/crew:team` on one real item (e.g. BUG-001) as the first team run.

## Out of scope (other workstreams / items)
- scoring team runs on golden projects (Workstream E); cross-project lessons (L); cross-machine ledger (SPIKE-001).

## Verification
- `npm test` and all pytest suites after every phase; dist rebuilt and checked by test/dist.test.ts.
- T1: guard fixtures as above; the same calls over MCP and CLI are allowed/denied identically; an agent's Edit of
  `.claude/settings.json`, its own definition or the policy is denied.
- T2: rendered frontmatter matches `policy show --role R` for every role.
- T3: `staff` on the sample project proposes P-007 only after P-006 and never two overlapping plans.
- T4–T6: unit tests for workflow runs and merge order; each agent template passes a lint test (frontmatter valid,
  mentions only real crew commands).
- RACI: one test per enforced row — under the preset a Developer can't triage, spec, assign or complete; it can only start
  what's assigned to it; QA can't edit (guard) or complete; only the PM completes, and only with full QA evidence;
  only the Architect makes a plan ready; the Director can't close a goal the PM hasn't verified; activating the
  kickoff's goals waits for the executive.
- End to end (manual, recorded in the hub): `/crew:team "fix BUG-001"` in this repo — PM triages and ranks,
  Architect specs, Director staffs, PM assigns, Developer fixes in a worktree, QA tests and records evidence, PM completes,
  Release merges; the executive approves where the policy says. `crew.mjs ledger --ref P-…` shows every role's events with verified identities.

## Progress log
- 2026-10-24: imported from plan mode (`~/.claude/plans/the-tracker-works-fine-declarative-kahn.md`); it predates the hub tracking plans, status done from git history

## Outcome
Shipped as T1–T8 (`b2a4227`, `dfb4c22`, `e1f1563`, `cd0df6a`, `b50ebef`, `65ac91f`, `2dbdb3f`, `cace7f3`, `8b38739`), merged into main as `7b24f00` (2026-10-24).

Learnings: none
