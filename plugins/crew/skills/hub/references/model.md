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
- `start` refuses when `wip_limit` plans are already in progress. Finish before starting.
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
