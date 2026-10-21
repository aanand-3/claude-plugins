# <Project name>

<One-line summary from the brief.>

Each fact has one home; read it on demand rather than copying it here:
- **Stack and settings:** `.project/config.yaml`. The concrete choices that matter while coding are in `.claude/rules/project.md`, which is always loaded.
- **Layout and where new code goes:** [docs/architecture.md → Repository layout](docs/architecture.md#repository-layout).
- **Purpose and scope:** [docs/project-brief.md](docs/project-brief.md). **Decisions:** [docs/adr/](docs/adr/).
{{#graphify}}
- **Code map:** `graphify-out/GRAPH_REPORT.md` (local, rebuilt on commit). Query it (`/graphify query "…"`) before reading files broadly.
{{/graphify}}
- **Commands:** `make help`, where the Makefile is the source of truth. The full gate is `make check`. <Until the project tooling lands: "no commands yet".>

## Engineering rules
Rules live in `.claude/rules/`. `base.md` and `project.md` always load; the others load when you touch matching files:
<list each generated rules file with one line on what it covers>

## How we work
{{#tracker}}
- **No code without a plan.** Every change belongs to a plan in `.project/plans/` (epics in `.project/epics/`). Use `/project-kit:tracker`. Check the active plan with `node .project/bin/tracker.mjs current`.
- **One plan = one branch = one PR.** Branch `plan/P-###-<slug>` from `main`; commits `type(P-###): summary` (Conventional Commits); squash-merge.
- On `main`, commit only tracker/planning changes under `.project/`. On a plan branch, edit only that plan's tracker file.
- Tick tasks in the plan file as you complete them; log decisions and blockers with `tracker.mjs log`.
- Bugs, ideas and tech debt found along the way are captured as items (`tracker.mjs new-item bug|feat|chore … --why`) on `main`, not fixed silently. P0 bugs take the expedite lane.
- Planning lives in `.project/`: `project-plan.md` (cadence, capacity), `raid.md`, milestones, sprints, `BACKLOG.md` (ranked). `tracker.mjs status` answers "are we on track?".
- Before marking a plan done: all acceptance criteria verified, the full check is green, docs and `.env.example` updated, Outcome written.
{{/tracker}}
{{^tracker}}
- **One change = one branch = one PR.** Branch `feat|fix|chore/<slug>` from `main`; commits `type(scope): summary` (Conventional Commits); squash-merge. Nothing is committed directly to `main`.
- Keep a PR to one concern. Bugs, ideas and tech debt found along the way go into the PR's Follow-ups, not fixed silently.
- Before opening the PR: acceptance criteria verified, the full check is green, docs and `.env.example` updated.
{{/tracker}}
- Significant technical decisions get an ADR in `docs/adr/`; changing an architecture rule updates `project.md` and the boundary lint config together.
- Never commit secrets or `.env`. Never bypass git hooks (`--no-verify`).
