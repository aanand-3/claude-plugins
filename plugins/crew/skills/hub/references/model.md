# Delivery model

Every piece of work has an ID, a document, a status, a priority and an estimate. **The plan is the unit of delivery** (1 plan = 1 branch = 1 PR). Everything else either plans work (milestones, goals, items, sprints) or governs it (project plan, RAID).

| Level | ID | What it is | Lives in |
|---|---|---|---|
| **Project plan** | — | Charter: objectives, success measures, milestones, cadence & capacity, working agreements. Its frontmatter holds the hub settings. | `.crew/project-plan.md` |
| **RAID log** | — | Risks, Assumptions, Issues, Decisions (tables) | `.crew/raid.md` |
| **Milestone** | `M-01` | A release: goal, target date, scope, exit criteria | `.crew/milestones/` |
| **Goal** | `G-001` | An outcome too big for one PR; belongs to a milestone | `.crew/goals/` |
| **Item** | `FEAT-001`, `BUG-001`, `CHORE-001`, `SPIKE-001` | A backlog entry with priority, points, severity (bugs), goal and milestone | `.crew/items/` |
| **Plan** | `P-001` | A shippable slice (≤ `max_plan_points`, one PR) that delivers one or more items | `.crew/plans/` |
| **Task** | `T1..Tn` | A step inside a plan, each with `→ verify:` | checklist in the plan |
| **Sprint** | `S-01` | A time-box committing plans against capacity | `.crew/sprints/` |

Generated, never hand-edited: `ROADMAP.md`, `BACKLOG.md`, `STATUS.md`, `releases/M-NN.md`, and `view/` (the HTML view from `export`; gitignored).

## Settings (`project-plan.md` frontmatter)
| Key | Default | Meaning |
|---|---|---|
| `sprint_length_days` | 7 | Sprint length |
| `capacity_points` | 20 | Points per sprint until there's velocity history |
| `points_scale` | 1, 2, 3, 5, 8, 13 | Allowed estimates (Fibonacci) |
| `max_plan_points` | 8 | A bigger plan must be split |
| `wip_limit` | 1 | Plans `in-progress` at once |

## Item types
| Type | Use for | Triage gate (must have content) |
|---|---|---|
| FEAT | New capability; goal slices | Summary, priority, points |
| BUG | Behavior that differs from what's expected | Steps to reproduce, Expected, Actual, severity, priority |
| CHORE | Tech debt, upgrades, tooling, retro actions | Summary, priority, points |
| SPIKE | A time-boxed question; its output is a decision or ADR, not shipped code | Question, Timebox, priority, points |

**Priority:** P0 drop everything · P1 needed for the current milestone, soon · P2 in the milestone · P3 someday.
**Severity (bugs):** S1 outage, data loss or security · S2 major, no workaround · S3 has a workaround · S4 cosmetic. The default priority follows severity (S1→P0, S2→P1, S3→P2, S4→P3).
**Milestone:** an item without its own `milestone:` belongs to its goal's milestone, so retargeting the goal moves its items. Set `milestone:` on an item only to override that.
**Ranking** (`BACKLOG.md`, `next`): P0 first, then milestone (by target date) → priority → goal → ID.

## Lifecycles

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

**Goal:** `proposed → active → done | dropped`. Run `move G-### active` when its first plan starts; it closes only after the user confirms its acceptance criteria.

**Milestone:** `planned → active → released | dropped`. `released` requires every exit criterion to be ticked.

**Sprint:** `planned → active → closed`. Only one sprint is active at a time.
- `sprint start` snapshots the committed points.
- `sprint close` requires Review and Retro. It then:
  - records `velocity` (points of committed plans that are done);
  - records `unplanned_points`;
  - records `carried_over`, which the next `sprint new` picks up;
  - turns each Retro "Try" into a CHORE item.

## Definition of Ready (plan → `ready`, enforced)
- Context, Scope (In/Out), Acceptance criteria and Test plan are written. Every criterion is observable and testable.
- 1–10 tasks (aim for 3–8), each ending `→ verify: <how>`.
- `points` is set, on the scale, and ≤ `max_plan_points`.
- Every linked item is triaged. A plan that fixes a BUG names its regression test.
- Dependencies are declared (`depends_on:`); risks and open questions are listed.

## Definition of Done (plan → `done`)
- Every acceptance criterion is verified with the named checks, and all tasks are ticked.
- The full check gate is green. Docs, `.env.example` and ADRs are updated where needed; rollout steps are documented.
- Outcome written: what shipped, deviations, follow-ups (captured as items on main).

## Estimation, capacity and forecasting
- Points measure relative size, not hours. Estimate items at triage, and plans at writing (the default is the sum of their items).
- **Velocity** is the average done points of the last 3 closed sprints. Until there is history, `capacity_points` is used.
- `sprint add` warns when committed points exceed min(capacity, velocity).
- **Milestone forecast:**
  - milestones are delivered in target-date order, so each one's remaining points queue behind the earlier ones';
  - queued points ÷ velocity = sprints needed, counted from the first open sprint's start (else today);
  - a milestone with no estimated scope shows ⚪ no scope instead of a date;
  - projected date vs target → 🟢 on track / 🟡 at risk (within one sprint) / 🔴 late;
  - unestimated items are flagged, because they make the forecast optimistic.
- Burndown: `sprint show` charts remaining committed points per day against the ideal line.

## Dependencies and WIP
- `depends_on: P-002, P-005` in the plan frontmatter. `start` refuses while a dependency isn't `done`; the roadmap shows `waits for …`.
- `start` refuses when `wip_limit` plans are already in progress. Finish before starting.
- Prefer ordering slices so that dependencies are rare. A long chain is a sign the slices are split by layer rather than vertically.

## Git mapping
- Branch per plan: `plan/P-012-<slug>`, created from an up-to-date `main`.
- Commits: Conventional Commits with the plan ID as the scope: `feat(P-012): add login endpoint`.
- PR title: `P-012: <plan title>`. The PR body links the plan, its items and the goal. Squash-merge, then delete the branch.
- **The final commit on the branch sets the plan to `done`** (tasks checked, outcome written), so merging the PR is what lands "done" on `main`.

### Where hub changes are committed
- **On `main`** (`chore(hub): …`, only `.crew/` files):
  - project plan and RAID;
  - milestones, goals, items, sprints;
  - plan drafts and creation; generated reports.
- **On the plan branch:** only *that plan's* file (status after `ready`, the progress log, ticked tasks, the outcome). This keeps parallel branches conflict-free; item statuses follow automatically.
- `roadmap`, `status` and `next` read `main` *and* every `plan/*` branch, so reports show live progress before merge.

### Exception: goal integration branch (opt-in)
Use only when a goal's plans **cannot** ship to `main` independently and a feature flag isn't an option:
1. Create `goal/G-003-<slug>` from `main`.
2. Branch plans from it and merge them into it.
3. PR the goal branch into `main`.

Record `integration_branch:` in the goal. Prefer feature flags.

## Cadence
| When | What | Command |
|---|---|---|
| Kickoff | Project plan, RAID, milestones, goals → items, P-001, Sprint 1 | `new-doc`, `new-milestone`, `new-goal`, `new-plan`, `sprint new/add/start` |
| Any time | Capture work; P0 bugs go to the expedite lane | `new-item`, `triage` |
| Sprint start | Close the last sprint, set a goal, pull ranked items into plans up to capacity | `sprint new/add/start` |
| Daily | Where am I, burndown, impediments | `current`, `sprint show`, `log` |
| Sprint end | Review, retro, velocity, status report | `sprint close`, `status --write` |
| Milestone | Exit criteria, release notes, release | `release-notes`, `move M-NN released` |
