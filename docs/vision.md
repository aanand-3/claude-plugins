# crew: vision and roadmap

## Context
`project-kit` started as kickoff tooling plus a human-oriented tracker. The goal has grown into **crew**, a single agent harness that carries a project from
**idea → decided direction → implementation plan → built, tested and shipped by a team of role agents**, with humans as executives.
This document is the master roadmap and the design of the first workstream (C, the hub). Every plan links back to it.
Each other workstream gets its own detailed plan when it starts; a change of direction updates this file first.

## Operating model
```
Executive (human)   initiates the idea, adds context, decides go / pivot / kill; answers escalations
      │  decided idea + success criteria
Director (agent)    turns the idea into the focus goal, staffs teams, accepts results, reports, escalates
      │
Team (agents)       PM · Architect · Developer · QA · Release, in one or more teams (e.g. backend / frontend)
```
- **`mode`** (`ai-native | ai-assisted | human-led`) decides where humans sit. It sets the defaults for human gates and lesson review.
  - ai-native: the human is involved until the idea is decided, then only for escalations.
  - ai-assisted: + plan `ready`/`done` approval.
  - human-led: humans drive.
- **Reserved decisions** are always escalated:
  - changing the idea's outcome or success criteria;
  - irreversible or outward-facing actions (production deploy, publish, spend, delete data);
  - the goal at risk;
  - loosening a guardrail.
- **Done** = the idea's success criteria are met, verified through QA evidence, and reported by the Director.

## Names (decided: product `crew`, internals renamed to match)
| Today | New | Why |
|---|---|---|
| plugin `project-kit` | **`crew`** | an agent team, idea to ship |
| marketplace `aanand-plugins` | unchanged | it's the publisher, not the product |
| tracker (package `packages/tracker`, skill `tracker`, MCP server `tracker`) | **hub** (`packages/hub`, skill `crew:hub`, MCP server `hub`) | it's the team's shared context, not a PM tracker |
| `.project/` | **`.crew/`** | |
| `.project/bin/tracker.mjs` | **`.crew/bin/crew.mjs`** (CLI `crew <cmd>`) | |
| epic `EP-###` | **goal `G-###`** | executives set goals; `focus` points at one |
| item FEAT/BUG/CHORE/SPIKE, plan `P-###` | unchanged | names still fit |
| (new) | `idea.md`, knowledge `K-<date>-<slug>`, **ledger**, **playbook**, **policy** | |
| skills `research` + the interview half of `discover` | **`ideate`** | stage 1: idea → decided |
| `kickoff` | **`kickoff`** (the team's first job) | |
| `adopt` | **`onboard`** | the team onboarding onto an existing codebase |
| the stack/architecture half of `discover` | **`architecture`** (an Architect skill) | |
| `graph` (graphify) | **`codemap`** | avoids a clash with the hub's graph export |
| `design`, `guidelines`, `git-setup`, `global-setup` | unchanged | names still fit |

The footprint is about 108 files and 600 references. The rename is its own mechanical PR (Phase 1). The lean model follows, and **both ship together as one breaking
release (crew 1.0)**, so users migrate once. `crew migrate` moves `.project/` → `.crew/`, `EP-` → `G-`, and converts the removed documents.

## Policy: one central place for models, tool permissions, budgets and guardrails
**Layers** (later layers override earlier ones, within the limits below):
```
built-in defaults (crew)
  └─ org policy        playbook repo: policy/global.yaml, policy/roles/<role>.yaml   (shared, PR-reviewed, versioned)
       └─ project      .crew/policy.yaml: global section + roles.<role> section
            └─ team    .crew/policy.yaml: teams.<team> (e.g. frontend developers get web/** write scope)
```
**What it configures:**
| Section | Global | Per role / team | Examples |
|---|---|---|---|
| `mode`, `human_gates`, role gates | ✓ | — | `in-review→done: qa`; `done` needs a human in ai-assisted mode |
| `reserved` actions | ✓ | — | prod deploy, publish, spend, delete data, policy change |
| `models` | default model | per role | Architect on the strongest model, PM triage on a cheaper one; fallback model |
| `tools` | allow/deny baseline | allow/deny per role | QA: read + run tests, no deploy; Release: deploy only via escalation; PM: no code edits |
| `paths` | protected paths | write scope per role/team | developers on the backend team write `services/**`; nobody writes `.crew/policy.yaml` |
| `budgets` | per project: max agents, cost | per run / per role | `max_agents: 4`, `run.max_tokens` |
| `git` | protected branches, no force push, no `--no-verify` | — | |
| `secrets` | patterns, files never read | — | `.env`, keys |
| `escalation` | where and how to ask the executive | — | |

**Rules:**
- **Guardrails only tighten downward.** A project can tighten org guardrails but not loosen them. `reserved`, `secrets`, `git` and protected `paths`
  merge as unions, and a deny always wins over an allow. Loosening one is itself a reserved decision.
- **Models, budgets and the human-gate settings** can be overridden per project, role or team, within the org's ceilings.
- **One resolver:** `crew policy show [--role R] [--team T]` prints the effective policy and the layer each value came from. `crew policy check` validates it, and CI runs it.
- **Harness-neutral source, enforced through adapters:**
  - the hub enforces gates, reserved actions and budgets itself (ledger `usage` events vs `budgets`);
  - the Claude Code adapter renders the effective policy into the agent definitions' `model`/`tools` front matter, `settings.json` permissions, and a PreToolUse hook that
    checks each tool call against the acting role's `tools`/`paths`. Agents can't edit policy files: the guard denies it, and changing them is reserved.
  - Other harnesses get their own adapters later; the policy file doesn't change.
- **Policy lives in C, applied in T:** C owns the schema, the resolver, `policy show/check` and hub-side enforcement. T owns the adapter that renders agents and hooks.
  `mode`, `human_gates`, `reserved` and role gates move out of `config.yaml` into policy.

## Workstreams
| # | Workstream | Delivers | Builds on |
|---|---|---|---|
| **C** | **Shared context: the hub** (below) | project state, ledger, memory, context assembly, team primitives, policy | — |
| A | Ideation (`ideate`) | idea → research → human context → proposed direction → executive decision → decided `idea.md` | C |
| T | Agent team | Director + roles as plugin agents rendered from policy; `kickoff`/`onboard` as the first job; staffing and teams; integration and merge order | C (A for real ideas) |
| L | Self-learning roles | a cross-project playbook per role in the shared repo (beside org policy); mistake → lesson loop; recurrence tracking; per-role metrics | C, T, E |
| E | Evaluation | golden sample projects plus end-to-end scenario evals; every change to agents, policy or playbook lessons is scored against them | C, T |

Order: **C** → **A ∥ T** (role by role: Director + PM → Architect → Developer → QA → Release) with **E** alongside T → **L**.

### Principles (settled)
- **Agent-first, lean.** The human-only PM layer is removed. Humans get an executive view of the same data: goal progress, escalations waiting, spend.
- **Parallelism by decomposition.** One plan has one owner (one branch, one worktree). Staffing is the width of the ready, non-overlapping frontier, capped by `budgets.max_agents`.
- **Portable core.** The CLI and MCP tools carry everything. Harness adapters and hooks only render and automate.
- **Two memory tiers, one format.** Project knowledge stays in the repo; the role playbook lives in the shared repo, with review following `mode`.
- **Nothing important lives only in chat.** Questions, decisions, escalations, checkpoints and evidence are recorded.

---

## Status (Workstream C built)
Phases 0–7 and the dogfood step are built on stacked branches (`refactor/rename-crew` → `feat/hub-lean-model` →
`feat/hub-ledger` → `feat/hub-policy` → `feat/hub-knowledge` → `feat/hub-execution` → `feat/hub-context` →
`chore/dogfood-crew` → `fix/hub-review`), with `docs/vision` merged into the dogfood branch. What changed from the plan:
- **Recovery view:** `resume` (Phase 6) shows where work stopped; `context` (Phase 7) includes it.
- **Evidence:** a check covers acceptance criteria by their text (a fingerprint), not their position; every run that
  claimed a plan or moved it to in-progress is an implementer, and their checks never count as independent evidence.
- **Teams:** `CREW_TEAM` selects a run's team, whose policy section (models, tools, paths, run budgets) then applies.
- **Questions:** an `ask` records who must answer; only that role (or a human with `--approved-by`) answers, never the asker.
- **Default mode** is `ai-assisted` (a breaking change): without `.crew/policy.yaml`, plan ready/done and goal done need a human.
- **Secrets in knowledge** are an error in `check`, not a hint: knowledge is committed.
- **Deferred:** `ideate`/`architecture` skills (A, T); kickoff/onboard as ledger runs (T); the Claude Code policy adapter that
  applies models, tools, paths and secrets per role (T); automatic `usage` capture (budgets bite only when runs record usage);
  cross-machine ledger sync (SPIKE-001 in this repo's hub). The rest is tracked in `.crew/` on `chore/dogfood-crew`.

## Status (Workstream T built)
Phases T0–T8 are built on stacked branches (`feat/team-identity` → `feat/team-agents` → `feat/team-director` →
`feat/team-liveness` → `feat/team-architect` → `feat/team-dev-qa` → `feat/team-release` → `feat/team-autonomy` →
`feat/team-docs`), following the approved Workstream T plan (RACI, role charters, lifecycle, autonomy); the T0 spike's
findings are decisions and learnings in this repo's hub knowledge. What changed from the plan:
- **Gates are opt-in by policy:** assignment before `start`, a review before `done`, PM-verified goals and QA-only evidence
  apply when the policy gates `plan.assigned`, `plan.reviewed`, `goal.done` and sets `evidence.role` — all of which
  `preset: lifecycle` does. Projects without the preset keep the Workstream C behaviour.
- **Team resume** is `resume --team` (plain `resume` stays the work-state view).
- **Takeover:** after `reassign`, `start` switches to the plan's existing branch (even if the gone run's worktree still has
  it) and claims it; uncommitted work in the old worktree isn't carried over.
- **Usage capture** records tokens from each subagent's transcript, not cost (no price table yet); the main session isn't
  captured.
- **Found and logged for after the plan** (G-003 in this repo's hub): CHORE-002 (no MCP `agents` tool), BUG-002 (`init`
  from a subagent rewrites `.crew/bin`), CHORE-003 (a wrong-role move hears about content gates first), SPIKE-002 (agents
  other than developers must work on a plan's branch to move or review it), CHORE-004 (captured usage has no cost).

# Workstream C: the hub

## The model
| Layer | Answers | Where | Lifetime |
|---|---|---|---|
| **Project state** | what is the work and what's next | `.crew/{idea.md,goals,items,plans}/`, committed and reviewed with the code | the project |
| **Ledger** | who holds what, where each run stopped, what was verified, what happened | append-only `ledger.jsonl` in `$(git rev-parse --git-common-dir)/crew/`, shared live by every worktree and subagent on the machine | the project |
| **Memory** | what was learned | `.crew/knowledge/K-<date>-<slug>.md`, committed | until superseded |
| **Policy** | what each role may do, with which model, within which budget | org layer in the playbook repo + `.crew/policy.yaml` | versioned |
| **Context** | what I need right now | computed by `crew context [--role R] [ID]`, never stored | one turn |

**Ledger.**
- **Events:** `claim`, `release`, `move`, `log`, `checkpoint` (step, sha, verify results, attempts), `ask` (an escalation is an `ask` to the executive), `answer`, `learn`, `usage` (tokens/cost per run and role, recorded by `crew.mjs usage`, and for crew agents by the SubagentStop hook).
- Live status, claims, WIP, recovery, handoffs, metrics, budget checks and the audit trail are all derived from it.
- One writer path with a lock and atomic append. JSONL merges by union.
- Later, for cross-machine and cloud agents: sync the ledger to `refs/crew/ledger` without changing the format.
- `move` writes both the front-matter status (for git history) and the event.

### Project state
- **Keep:**
  - items (FEAT/BUG/CHORE/SPIKE), triage, priority;
  - plans (Context/Scope/AC/Tasks `→ verify`/Test plan/Rollout/Risks), the DoR/DoD gates, `depends_on`, `max_tasks`;
  - `next`, `check`.
- **Add:**
  - `idea.md` (problem, outcome, success criteria; `exploring → researching → proposed → decided`);
  - `focus: G-###`, with `check` warning when an active plan is off-focus (BUG/CHORE excepted);
  - `touches:` on plans (recall, the drift check, overlap warnings, team routing, QA scope).
- **Rename and slim:** epic → **goal** (outcome + AC + breakdown, linked to the idea).
- **Remove:**
  - points/capacity/velocity;
  - sprints/burndown;
  - milestones/release-notes/forecast;
  - the project-plan charter;
  - the RAID doc. Its contents move as follows:
    - risks → knowledge `type: risk`;
    - decisions/assumptions → knowledge;
    - issues → items.
- **Replace:**
  - `log` becomes a ledger event (the Progress log is rendered from it);
  - `context` replaces `current` in the SessionStart hook (`current` stays as a one-line status for hooks rendered before 1.0);
  - `roadmap`+`status` become one `status`;
  - the UI's Overview becomes the executive view;
  - the Roadmap and Timeline views and the charts are removed.

### Execution state (ledger)
- `checkpoint` after each task or verify; the Stop/PreCompact hooks also call it.
- Recovery compares the checkpoint with git (HEAD, dirty tree), plus the last verify and the attempts to avoid.
- `## Handoff` is generated from the ledger at session end and on `in-review`.
- `done` requires evidence for every AC (a passing verify event or an `evidence:` note), recorded by a different run from the implementer.
- `kickoff`/`onboard` progress becomes ledger runs — done in Workstream T (T4): with the hub they record each step with `checkpoint --workflow kickoff|onboard --step S` and resume with `resume --workflow`; without the hub they keep their yaml progress files.

### Memory (project tier)
- An entry has:
  - `type: decision|learning|gotcha|convention|risk`;
  - `scope:` globs;
  - `source:`;
  - `supersedes:`;
  - `tier: project|playbook-candidate`.
- It is written when a costly failed attempt happens, when a decision is made, and at `in-review` (learnings captured, or "none").
- `recall` by path or topic; `context` pulls in entries whose scope matches `touches`. `check` reports dead globs, superseded entries still referenced, and secret patterns.
- `playbook: {path, ref}` in config (a local clone of the shared repo; `CREW_PLAYBOOK` overrides the path) pins the version read with `git show`, for both org policy and lessons.

### Team primitives
- `next --role R` and `context --role R [ID]`: a per-role queue and slice, under a budget. Recovery and open questions come first.
- `ask`/`answer` between roles, and `escalate` to the executive. Either one blocks only the work that depends on it, and a durable answer becomes a decision entry.
- Gates come from policy. A human approval needs `--approved-by`, which is CLI-only.
- Not in C (they belong to T): team routing and staffing, sizing, agent definitions, and the Claude Code policy adapter.

## Phases (each one a plan / PR; Phases 1–2 ship together as crew 1.0)
0. **Roadmap**: this document.
1. **Rename**: `project-kit` → `crew`, `packages/tracker` → `packages/hub`, MCP server → `hub`, `.project/` → `.crew/`, `tracker.mjs` → `crew.mjs`,
   epic → goal, the skill renames (`onboard`, `codemap`, `hub`; merging research + discover into `ideate` and splitting out `architecture` rewrites skill content, so it moved to Workstreams A and T), the marketplace entry, README, and all references (~108 files).
   No behaviour change; tests are updated for the names only.
2. **Lean model**:
   - remove sprints/milestones/points/charter/RAID (`model.ts`, `queries.ts`, `gates.ts`, `reports.ts`, `planning.ts`, `backlog.ts`, `advisor.ts`,
     `graph.ts`, `graph-types.ts`, `cli.ts`, `mcp.ts`, the templates, and the UI's `Roadmap.tsx`/`Timeline.tsx`/`charts.tsx`);
   - add `idea.md`, `focus`, `touches`;
   - `crew migrate` (from `.project/`: rename, `EP-`→`G-`, convert RAID and milestones, archive);
   - rewrite the hub skill docs and the kickoff/onboard/guidelines text.
   - **Dogfood (right after crew 1.0):** run `crew onboard` on this repo (`claude-plugins`).
     - Seed `idea.md` from the vision.
     - Seed goals from the workstreams (C, A, T, L, E), and plans for C Phases 3–7.
     - Seed knowledge entries for the decisions recorded in this document: names, ledger, policy layering, decomposition, the two memory tiers, review per mode.
     - Use the **vendored, pinned** `.crew/bin/crew.mjs`, not the working source, so a broken change can't break the tool used to fix it. Re-vendor after each phase passes its tests.
3. **Ledger**: the event log in the git common dir with lock + atomic append; derived status/claims/WIP; `claim` on `start`; `log` and `usage` as events.
4. **Policy**: the schema, layered resolution (built-in → org → project → team, guardrails only tighten), `policy show/check`, and hub-side enforcement
   of gates, reserved actions and budgets. `mode`/`human_gates`/`reserved` move into it.
5. **Knowledge**: the store, `learn`/`recall`, the `risk` type, the `tier` field, the rot and secret checks, the DoD learnings gate, the `playbook` pin.
6. **Execution & evidence**: `checkpoint`, recovery, the generated Handoff, the AC evidence gate with separation of duties, the Stop/PreCompact hooks, workflows as runs.
7. **Context & roles**: `context [--role]` with a budget (in SessionStart), `next --role`, `ask`/`answer`/`escalate`, the overlap and drift checks, and the executive view.

## Verification
- After every phase: `npm test` in `packages/hub` (tests for removed features rewritten, not skipped). Rebuild `dist/*` via `build.mjs`; `test/dist.test.ts` checks it.
- Phase 1:
  - `git grep -nE "project-kit|\.project/|tracker"` returns only intentional hits (migrate code, changelog);
  - the plugin installs from the marketplace as `crew`;
  - the MCP server lists its tools under `hub`.
- Phase 2:
  - the updated `scripts/sample-project.mjs` gives a clean `check`, and `export`/`ui` render;
  - `crew migrate` on an old `.project/` fixture produces a valid `.crew/`.
- Phase 3: a claim in one worktree is visible to and refused in another; parallel appends lose no events; the derived status matches the front matter.
- Phase 4:
  - `policy show --role qa` reports each value's source layer;
  - a project that loosens an org guardrail fails `policy check`;
  - an MCP `move … done` is refused under a human gate, while the CLI `--approved-by` succeeds;
  - a run over budget is refused.
- Phase 5: `learn` → `recall` round trip; a dead glob or secret pattern makes `check` report a HINT; `in-review` is refused without a learnings line.
- Phase 6: simulated crash, then `context` shows the dirty tree, the last failing verify and the attempts to avoid; `done` is refused without evidence, or when the implementer recorded it.
- Phase 7: `context --role qa P-001` stays under budget and in order; an `ask` blocks only its plan.
- Dogfood: in this repo, `crew check` is clean, `crew next` points at C Phase 3, and `crew recall ledger` returns the decision entry.
- Workstream E seeds its first scenarios from these: crash resume, gotcha recall, budget, policy denial.
