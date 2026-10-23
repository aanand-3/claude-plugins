# <Project name>

<One-line summary from the brief.>

Each fact has one home; read it on demand rather than copying it here:
- **Stack and settings:** `.crew/config.yaml`. The concrete choices that matter while coding are in `.claude/rules/project.md`, which is always loaded.
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
- **Approvals are the user's.** Steps the policy gates (`crew.mjs policy show`) need the user's explicit yes; only then pass `--approved-by <their name>`. Never approve on their behalf.
- **Start from context.** Every session begins with `crew.mjs context` (the hook prints it); work from `crew.mjs next --role <your role>`. Ask other roles with `crew.mjs ask … --to <role>` instead of guessing; escalate reserved decisions with `crew.mjs escalate`.
- **Resume, checkpoint, hand off.** Start picked-up work with `crew.mjs resume`; after each task or check `crew.mjs checkpoint --run "<check>" --ac <n>`; record failed approaches with `--attempt … --why …`; end a session with `crew.mjs handoff`.
- **Recall, then learn.** Before working in an area run `crew.mjs recall --plan P-###`; record what the next person must know with `crew.mjs learn` (gotchas, decisions, conventions).
- **No code without a plan.** Every change belongs to a plan in `.crew/plans/` (goals in `.crew/goals/`). Use `/crew:hub`. Check the active plan with `node .crew/bin/crew.mjs current`.
- **One plan = one branch = one PR.** Branch `plan/P-###-<slug>` from `main`; commits `type(P-###): summary` (Conventional Commits); squash-merge.
- On `main`, commit only hub/planning changes under `.crew/`. On a plan branch, edit only that plan's hub file.
- Tick tasks in the plan file as you complete them; log decisions and blockers with `crew.mjs log`.
- Bugs, ideas and tech debt found along the way are captured as items (`crew.mjs new-item bug|feat|chore … --why`) on `main`, not fixed silently. P0 bugs take the expedite lane.
- The shared context lives in `.crew/`: `idea.md` (what this is for, success criteria, the focus goal), goals, items, plans. Work toward the focus goal; `crew.mjs next` names the next step and `crew.mjs status` answers "where are we?".
- Before marking a plan done: all acceptance criteria verified, the full check is green, docs and `.env.example` updated, Outcome written.
- Significant technical decisions get an ADR in `docs/adr/`; changing an architecture rule updates `project.md` and the boundary lint config together.
- Never commit secrets or `.env`. Never bypass git hooks (`--no-verify`).
