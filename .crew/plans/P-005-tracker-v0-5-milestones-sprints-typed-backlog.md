---
id: P-005
title: Tracker v0.5: milestones, sprints, typed backlog
goal: 
items: 
touches:
depends_on:
status: done
branch:
pr: 
created: 2026-10-14
started:
completed: 2026-10-14
---

# P-005: Tracker v0.5: milestones, sprints, typed backlog

## Context
The tracker skill (`plugins/project-kit/skills/tracker/`) handles execution well. It has epics, plans and tasks, no skeletons, Definition of Ready and Done checks, dependencies, branch-per-plan and a generated roadmap. It falls short as a project-management system:
- The backlog is untyped bullets in `backlog.md`. There are no IDs, priority, estimate or severity, and bugs have no repro, expected or actual.
- There's no time or release dimension: no milestones, sprints, capacity, velocity, burndown or forecast.
- Kickoff produces epics plus P-001, but no project plan: objectives, release plan, cadence, RAID or a first sprint commitment.
- There's no stakeholder status report and no release notes.

**Goal:** when a project kicks off, there's a concrete, reviewable plan: milestones with target dates, epics broken into estimated backlog items, Sprint 1 committed, and RAID started. From then on, progress, bugs and the backlog are tracked with real PM signals: priority, points, velocity, burndown and milestone forecast.

**Decisions (user, 2026-10-14):**
- Milestones + time-boxed sprints.
- Keep Epic → Plan → Task, and add typed backlog items (FEAT, BUG, CHORE, SPIKE).
- One file per item.
- Story points (Fibonacci).

**Unchanged:**
- Repo-local only.
- No skeletons; content-first `--from` drafts.
- Rolling wave for *plans*.
- 1 plan = 1 branch = 1 PR.
- Conflict-free rule: on a plan branch only that plan's file is edited, and everything else happens on main.
- Ferry is not touched.

## Model (new `references/model.md`)

| Level | ID | File | Purpose |
|---|---|---|---|
| Project plan | — | `.project/project-plan.md` | Charter: objectives, success metrics, milestones table, cadence/capacity, working agreements, DoR/DoD. Frontmatter holds tracker settings (`sprint_length_days: 7`, `capacity_points: 20`, `points_scale: 1,2,3,5,8,13`, `max_plan_points: 8`, `wip_limit: 1`). |
| RAID log | — | `.project/raid.md` | Risks (prob/impact/owner/mitigation/status), Assumptions, Issues, Decisions (→ ADR links). Hand-edited tables, parsed by `status`/`check`. |
| Milestone | `M-01` | `.project/milestones/M-01-<slug>.md` | Release scope: goal, target date, exit criteria, in/out, epics. `planned → active → released \| dropped`. |
| Epic | `EP-001` | `.project/epics/` | Outcome container; gains `milestone:` and `priority:`. |
| Item | `FEAT-/BUG-/CHORE-/SPIKE-###` | `.project/items/<ID>-<slug>.md` | Backlog unit with type, priority P0–P3, points, severity S1–S4 (bugs), epic, milestone. Stored status: `new → triaged → wontfix \| duplicate`. Once linked to a plan (`plan: P-###`), the status is **derived** from the plan (planned, in-progress or done), so items never need editing on plan branches. |
| Sprint | `S-01` | `.project/sprints/S-01.md` | Time-box: dates, goal, capacity, committed plans, Review, Retro, computed velocity. `planned → active → closed`; one active at a time. |
| Plan | `P-###` | `.project/plans/` | Unchanged role; gains `items:`, `points:`, `sprint:`. |
| Task | `T1..n` | inside plan | Unchanged. |

**Rules:**
- Item types:
  - FEAT: user story + acceptance criteria.
  - BUG: environment, steps to reproduce, expected, actual, evidence, impact.
  - CHORE: why, what.
  - SPIKE: question, timebox, expected output (an ADR or a decision).
- Triage gate (`new → triaged`) enforces the type's required sections and priority. Points are required for FEAT, CHORE and SPIKE. Bugs need severity, and severity sets the default priority (S1→P0 … S4→P3).
- **Expedite lane:** a P0 or S1 bug may start outside the sprint (logged as unplanned work, counted separately in the sprint review).
- **Plan DoR additions:**
  - `points` set and ≤ `max_plan_points` (13 → split).
  - Linked items must be triaged.
  - A plan containing a BUG must name a regression test in its AC or tasks.
  - New required `## Test plan` section.
- **Plan DoD additions:** linked items are closed automatically by derivation; release notes come from done plans and items.
- **Rolling wave:** plans are written for the current and next sprint only. `check` warns beyond that, which replaces the fixed `MAX_WRITTEN_AHEAD=3`.
- **Epic breakdown:**
  - The draft's `## Candidate plans` bullets, e.g. `- Signup endpoint — … (5 pts) (after Login)`, are converted on `new-epic` into FEAT items linked to the epic. Items with a point estimate are `triaged`; the rest stay `new`.
  - The epic's section becomes `## Breakdown`, listing item IDs.
  - This replaces fuzzy `strike_candidate()` title matching with explicit `--items` links.
- **Ordering** for `next`, the backlog view and sprint planning: milestone order → priority → epic order → ID.

## Templates (redefine in `tracker/templates/`)
- **New:**
  - `project-plan.md`
  - `raid.md`
  - `milestone.md`
  - `sprint.md`, with Goal, Committed, Daily log, Review (shipped / not shipped / unplanned) and Retro (keep / stop / try → action items become CHORE items)
  - `item-feat.md`, `item-bug.md`, `item-chore.md`, `item-spike.md`
- **Revise:**
  - `epic.md`: milestone, priority, Breakdown, Risks, Success metrics.
  - `plan.md`: items, points, sprint, plus new `## Test plan` and `## Rollout & rollback` (migrations, flags, config, backout; "n/a — reason" accepted).
- **Remove:** `backlog.md`. A generated `.project/BACKLOG.md` (ranked by type and priority) replaces it. `check` hints if a legacy `backlog.md` exists.
- Every template keeps `<!-- guidance -->` comments that the existing `has_content()` ignores, so skeleton detection still works.

## Script changes (`tracker/scripts/tracker.py`, stdlib only, single vendored file)
**Reuse:** `Doc` (parse, set, section, has_content, missing, bullets, tasks, append_log), `assemble()`, `next_id()` (generalize the prefix and directory), `slugify`, the flow-dict pattern, `plans(include_branches=True)` and the git helpers.

**Commands:**
- `new-item TYPE TITLE (--from DRAFT | --why TEXT) [--epic] [--milestone]` creates a `new` item for quick intake. `--why` gives a one-line description, which replaces the backlog bullets.
- `triage ID --priority P1 [--points 3] [--severity S2] [--milestone M-01] [--epic EP-001]` and `triage ID --reject wontfix|duplicate --note …` validate the triage gate.
- `new-milestone TITLE --from DRAFT --target YYYY-MM-DD`
- `new-epic`, which now converts candidates to items and accepts `--milestone`.
- `new-plan … [--items FEAT-003,BUG-007] [--points N] [--sprint S-02]`:
  - links the items, setting `plan:` on each item (on main);
  - plan points default to the sum of the item points.
- `sprint new --goal TEXT [--start DATE] [--length N]`, `sprint add S-NN P-###…`, `sprint start S-NN`, `sprint close S-NN`, `sprint show [S-NN]`:
  - `add` warns when the committed points exceed the lower of capacity and rolling velocity (the average of the last 3 closed sprints).
  - `close` refuses while Review or Retro is empty. It records `velocity` (done points), carries unfinished plans to the next sprint with a log note, and turns retro "try" lines into CHORE items.
  - `show` prints a text burndown, from the sprint dates and the plans' `completed` dates and points.
- `status [--write]` prints a stakeholder report and optionally writes `.project/STATUS.md`. It covers:
  - the active sprint: goal, day x/y, points done/committed, burndown;
  - milestone progress and forecast: remaining points ÷ velocity → projected date vs target → on track / at risk / late;
  - blocked plans, open bugs by severity, and top open RAID risks;
  - unplanned work.
- `release-notes M-01 [--write]` groups the done plans and items by type (Features / Fixes / Chores) for the milestone.
- **Extended commands:**
  - `roadmap --write`: milestones → epics → plans, plus sprint history, and writes `BACKLOG.md`.
  - `next`: active → sprint-committed ready → expedite bugs → drafts → untriaged items → highest-priority triaged items.
  - `check`: item gate violations, items linked to missing plans, P0 bugs with no plan, a sprint over capacity, milestones past their target, risks without an owner, an active sprint past its end date.
  - `current`: adds the sprint and day.
  - `move`: handles the M- and S- prefixes.
- Status flows stay in dicts (`ITEM_FLOW`, `MILESTONE_FLOW`, `SPRINT_FLOW`) next to `PLAN_FLOW` and `EPIC_FLOW`.
- `init`:
  - creates `items/`, `milestones/` and `sprints/`;
  - vendors all templates;
  - no longer writes `backlog.md`;
  - writes `project-plan.md` and `raid.md` only via `--from` drafts at kickoff (no skeleton).
- **Line budget:** ~1,300 lines. Keep it one file, organized into sections: items, milestones, sprints, reports.

## Skill docs
- `tracker/SKILL.md`: rewrite the command table and add these workflows:
  - Capture & triage (features, bugs, chores, spikes);
  - Release planning (milestones);
  - Sprint planning, which pulls ranked triaged items into plans and fits them to capacity;
  - Daily (`current`, log);
  - Sprint review & retro (`sprint close`);
  - Bug intake & expedite;
  - Status report;
  - Milestone release (`release-notes`, `move M-01 released`).
  - Update the argument-hint.
- `tracker/references/model.md`: the rewritten model, lifecycles for all five flows, git mapping (items, sprints, milestones, RAID and project plan are edited on main only).
- `tracker/references/writing-guide.md`:
  - add a quality bar and a worked example for the project plan, a milestone, a bug report, a feature item, a spike and a sprint review/retro;
  - update the epic example to the `(5 pts)` candidates;
  - add a `Test plan` / `Rollout` section to the plan example.
- `kickoff/SKILL.md` step 5 becomes **"Project plan & Sprint 1"**:
  1. `project-plan.md` from the brief: objectives, success measures, cadence and initial capacity (ask).
  2. `raid.md`, seeded from the brief's constraints and open questions plus the ADRs' consequences.
  3. Milestones: M-01 MVP from the brief's MVP capabilities with a target date (ask), and later phases as M-02+.
  4. Epics mapped to milestones, with estimated candidates → FEAT items.
  5. P-001 tooling plan (as today, plus points and a test plan).
  6. `sprint new` S-01 with a goal, `sprint add` P-001 plus the first epic slice's plan if it fits capacity.
  7. `check`, `roadmap --write`, `status`, then commit.
- `README.md`: update the tracker row and the `.project/` tree. `git-setup/SKILL.md`: note that the hook still permits only `.project/` commits on main; verify that the hook's path check covers the new dirs.
- `plugin.json`: bump the version to 0.5.0.

## Tests (`tests/test_tracker.py`, extend; pattern = `Repo` fixture + `run()` of the script)
New tests:
1. Item intake → triage gate (bug missing repro rejected; severity → priority default; feature needs points).
2. Epic draft candidates → FEAT items, with points parsed.
3. `new-plan --items` links items; the item status derives through plan start and done (and from a live plan branch).
4. DoR: points required and capped; a BUG plan needs a regression test; `Test plan` required.
5. Sprint: new/add over capacity warns; a second active sprint is refused; close refuses an empty Review/Retro, records velocity, carries over unfinished work, creates CHOREs from retro.
6. Milestone forecast: on track vs at risk from velocity.
7. `next` ordering by milestone and priority, plus the expedite bug.
8. `release-notes` groups by type.
9. `check` flags: a P0 bug without a plan, a sprint past its end, a risk without an owner.

Existing tests are updated for the removed `backlog.md` and the strike → link change.

## Verification
- `uvx --with pyyaml pytest tests` passes. Add a `test_plugin_contents.py` check that every template referenced in SKILL.md exists.
- End-to-end dry run in a scratch repo (`$SCRATCHPAD/demo`):
  1. `git init`, then `tracker.py init`.
  2. Write drafts and run:
     - `new-milestone`
     - `new-epic` (candidates with points)
     - `new-item bug --from` and `triage`
     - `new-plan --items`
     - `sprint new`, `sprint add`, `sprint start`
     - `start P-001`
  3. Tick tasks, then `move` in-review → done, `sprint close`.
  4. Inspect `status`, `roadmap --write`, `BACKLOG.md` and `release-notes M-01`. They should read like a real PM report.
- Update the memory file `project-kit-plugin.md` with the v0.5.0 decisions.

## Progress log
- 2026-10-24: imported from plan mode (`~/.claude/plans/lets-review-the-tracker-jiggly-panda.md`); it predates the hub tracking plans, status done from git history

## Outcome
Shipped in the first commit of this repository, `6981ad7` (2026-10-14): the tracker's milestones, sprints, RAID log and typed backlog (`skills/tracker/scripts/trackerlib/milestones.py`, `sprints.py`, templates). Later replaced by the TypeScript tracker (P-007) and renamed the hub.

Learnings: none
