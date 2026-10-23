# The hub model

The hub is the team's shared context: one place every agent and human reads and writes, so nobody drifts from the goal.
**The plan is the unit of delivery** (1 plan = 1 branch = 1 PR). The idea and goals say what the work is for; items hold
what is wanted but not yet planned. Design and roadmap: `docs/vision.md` in the crew repository.

| Level | ID | What it is | Lives in |
|---|---|---|---|
| **Idea** | `IDEA` | The project's one idea: problem, outcome, success criteria, direction. Holds `focus:` | `.crew/idea.md` |
| **Goal** | `G-001` | An outcome too big for one PR; serves the idea | `.crew/goals/` |
| **Item** | `FEAT-001`, `BUG-001`, `CHORE-001`, `SPIKE-001` | A backlog entry with priority, severity (bugs) and goal | `.crew/items/` |
| **Plan** | `P-001` | A shippable slice (≤ `max_tasks` tasks, one PR) that delivers one or more items | `.crew/plans/` |
| **Task** | `T1..Tn` | A step inside a plan, each with `→ verify:` | checklist in the plan |

Also in `.crew/`: `knowledge/` (decisions, learnings, risks; written by `migrate` today, by `learn` later), `archive/`
(what `migrate` carried over from project-kit), `drafts/`, `templates/`, `bin/` (the vendored CLI). Generated, never
hand-edited: `STATUS.md` (`status --write`) and `view/` (`export`, gitignored).

## Ledger
Documents hold the *content* (reviewed in git); the ledger holds *what is happening*. It is an append-only JSON-lines log at
`<git common dir>/crew/ledger.jsonl`, shared live by every worktree and agent on the machine, never committed.

| Event | Written by | Fields |
|---|---|---|
| `claim` | `start` | `branch` (and `force` when overriding) |
| `release` | `done`/`dropped`, `release` | `reason` |
| `move` | every status change | `from`, `to`, `note` |
| `log` | `log` | `text` |
| `usage` | `usage` | `tokens_in`, `tokens_out`, `cost`, `model` |

Every event carries `ts`, `ref`, `run` (`CREW_RUN`, else one per worktree), `actor` (`CREW_ACTOR`, else the git author) and
`worktree`. Events are written only when the command succeeds, under a lock, and claims are re-checked inside it, so two runs
can't both claim a plan. Derived from it: live claims (owner in `status` and the view), each run's WIP, spend, and a `check`
hint when a plan file disagrees with the ledger's last move or a closed plan is still claimed.

## Knowledge (project memory)
`.crew/knowledge/K-<yyyy-mm-dd>-<slug>.md` — collision-free across branches, committed, reviewed with the code.

| Field | Meaning |
|---|---|
| `type` | `decision`, `learning`, `gotcha`, `convention` or `risk` (risks add `likelihood`, `impact`, `owner`) |
| `scope` | path globs it applies to; empty = everywhere |
| `source` | the plan, item or idea it came from (defaults to the plan of the current branch) |
| `supersedes` | the entry it replaces; superseded entries drop out of `recall` (`--all` shows them) |
| `tier` | `project`, or `playbook-candidate` for a lesson worth promoting to the org playbook |

`recall` matches a plan's `touches:` or concrete paths against scopes, plus words in the title or body; the org playbook's
`lessons/**.md` (at the pinned ref) are recalled with project entries. `check` reports scopes that match no file, superseded
entries still cited by open work, risks with no owner, and — as errors — anything that looks like a secret. Definition of Done:
the Outcome's `Learnings:` line lists the entries captured, or `none`, before `in-review`.

## Policy
`.crew/policy.yaml`, layered over the built-in defaults and the org playbook (`playbook: {path, ref}` in config.yaml, or
`CREW_PLAYBOOK`): built-in → org → org role → project → project role → project team.

| Key | Where | Merge |
|---|---|---|
| `mode` | global | override; sets the default `human_gates` |
| `human_gates`, `reserved` | global | `<kind>.<status>` transitions needing `--approved-by`; the org's are a floor, reserved is a union |
| `role_gates` | global | `{plan.done: qa}` — the transition needs `CREW_ROLE` to match |
| `models`, `tools.allow`, `paths.write` | global, role, team | override |
| `tools.deny`, `paths.protected`, `secrets.*`, `git.protected_branches` | (as above) | union — a deny always beats an allow |
| `git.force_push`, `git.no_verify` | global | can only be turned off |
| `budgets.run`, `budgets.project`, `budgets.max_agents` | run also per role/team | override, but never above an org ceiling |

| Mode | Human gates by default |
|---|---|
| `ai-native` | none (only reserved decisions) |
| `ai-assisted` (default) | plan `ready`, plan `done`, goal `done` |
| `human-led` | those, plus item `triaged` |

The hub enforces gates, reserved transitions and budgets; models, tools and paths are applied by the agent harness
(Workstream T). An invalid policy blocks every move until `policy check` passes.

## Focus
`focus G-###` records one goal on the idea. Everything orients to it:
- `next` and the backlog ranking put focus work first;
- `check` warns when a ready or active plan does not serve the focus goal. Bugs and chores may run off focus;
- the overview (executive view) leads with the focus goal's outcome and progress.

When the focus goal is done, set the next one. There is exactly one focus at a time.

## Settings (`hub:` in `.crew/config.yaml`)
| Key | Default | Meaning |
|---|---|---|
| `wip_limit` | 1 | Plans `in-progress` at once |
| `max_tasks` | 10 | A plan with more tasks must be split |

## Item types
| Type | Use for | Triage gate (must have content) |
|---|---|---|
| FEAT | New capability; goal slices | Summary, priority |
| BUG | Behavior that differs from what's expected | Steps to reproduce, Expected, Actual, severity, priority |
| CHORE | Tech debt, upgrades, tooling | Summary, priority |
| SPIKE | A time-boxed question; its output is a decision or ADR, not shipped code | Question, Timebox, priority |

**Priority:** P0 drop everything · P1 needed for the focus goal, soon · P2 planned · P3 someday.
**Severity (bugs):** S1 outage, data loss or security · S2 major, no workaround · S3 has a workaround · S4 cosmetic. The default priority follows severity (S1→P0, S2→P1, S3→P2, S4→P3).
**Ranking** (`next`, `status`): P0 first, then the focus goal, then priority → goal → ID.

## Lifecycles

**Idea:** `exploring → researching → proposed → decided`, or `killed` from any open state. `decided` needs Problem,
Outcome and Success criteria written, with the criteria as a checklist. A pivot moves `decided → proposed`.

**Item** (stored): `new → triaged → wontfix | duplicate`. Once a plan links it (`plan: P-###`), its status is *derived* from the plan:

| Plan status | Item status |
|---|---|
| draft, ready | `planned` |
| in-progress, blocked, in-review | `in-progress` |
| done | `done` |

Items are therefore never edited on plan branches. If a plan is dropped, clear the item's `plan:` to return it to the backlog.

**Plan**
```
draft ──► ready ──► in-progress ──► in-review ──► done
  │          │            │   ▲
  │          │            ▼   │
  │          │          blocked
  └──────────┴────────────────────► dropped   (from any non-done state; record why)
```

**Goal:** `proposed → active → done | dropped`. Run `move G-### active` when its first plan starts; it closes only after its acceptance criteria are confirmed.

## Definition of Ready (plan → `ready`, enforced)
- Context, Scope (In/Out), Acceptance criteria and Test plan are written. Every criterion is observable and testable.
- `touches:` lists the paths (globs) the plan expects to change.
- 1–`max_tasks` tasks (aim for 3–8), each ending `→ verify: <how>`.
- Every linked item is triaged. A plan that fixes a BUG names its regression test.
- Dependencies are declared (`depends_on:`); risks and open questions are listed.

## Definition of Done (plan → `done`)
- Every acceptance criterion is verified with the named checks, and all tasks are ticked.
- The full check gate is green. Docs, `.env.example` and ADRs are updated where needed; rollout steps are documented.
- Outcome written: what shipped, deviations, follow-ups (captured as items on main).

## Size, dependencies and WIP
- Size a plan by its tasks: more than `max_tasks`, or work in unrelated areas, means split it. Parallel work comes from splitting
  into plans with separate `touches:`, not from more people on one plan.
- `depends_on: P-002, P-005` in the plan frontmatter. `start` refuses while a dependency isn't `done`; `status` shows `waits for …`.
- `start` refuses when *this run* already holds `wip_limit` plans in progress (in-progress plans with no claim count for every run). Finish before starting. Parallel agents each have their own WIP.
- Prefer ordering slices so that dependencies are rare. A long chain is a sign the slices are split by layer rather than vertically.

## Git mapping
- Branch per plan: `plan/P-012-<slug>`, created from an up-to-date `main`.
- Commits: Conventional Commits with the plan ID as the scope: `feat(P-012): add login endpoint`.
- PR title: `P-012: <plan title>`. The PR body links the plan, its items and the goal. Squash-merge, then delete the branch.
- **The final commit on the branch sets the plan to `done`** (tasks checked, outcome written), so merging the PR is what lands "done" on `main`.

### Where hub changes are committed
- **On `main`** (`chore(hub): …`, only `.crew/` files): the idea and focus, goals, items, plan drafts and creation, generated reports.
- **On the plan branch:** only *that plan's* file (status after `ready`, the progress log, ticked tasks, the outcome). This keeps parallel branches conflict-free; item statuses follow automatically.
- `status` and `next` read `main` *and* every `plan/*` branch, so they show live progress before merge.

### Exception: goal integration branch (opt-in)
Use only when a goal's plans **cannot** ship to `main` independently and a feature flag isn't an option:
1. Create `goal/G-003-<slug>` from `main`.
2. Branch plans from it and merge them into it.
3. PR the goal branch into `main`.

Record `integration_branch:` in the goal. Prefer feature flags.
