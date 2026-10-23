---
name: kickoff
description: Kick off a new software project end to end — interview for requirements and stack, generate CLAUDE.md and engineering guidelines, initialize git with branch conventions, and optionally a project plan (milestones, RAID, estimated backlog, Sprint 1) in the repo-local hub and a graphify code graph. Use when the user wants to start, bootstrap, scaffold, or set up a new project (before any code is written), or resume an interrupted kickoff. For a repo that already has code, use adopt instead.
argument-hint: "[project idea in a sentence]"
---

# Project kickoff

Orchestrates the crew skills in order. Each step is also usable on its own; this skill only sequences them, tracks progress and keeps the user oriented. **Scaffolding only — no application code, no dependency installs** (the one exception is the graphify CLI, a machine-level tool installed only with the user's yes).

## Progress file
Track steps in `.crew/kickoff.yaml` so an interrupted kickoff can resume:
```yaml
started: YYYY-MM-DD
modules: {hub: true, graphify: false}
steps: {preflight: done, discover: done, design: pending, guidelines: pending, hub: pending, git: pending, graph: pending, project-plan: pending}
```
A step for a module the user didn't choose is `skipped`.
On start, if it exists, show what's done and continue from the first `pending` step.

## Steps

0. **Preflight**
   - Confirm the target directory (default: current). If it already has application code (source files, a package manifest, commits beyond a scaffold), stop and suggest `/crew:onboard`, which maps and merges instead of interviewing from scratch. Docs or an empty repo are fine.
   - Check tools: `git --version`, `node --version` (the hub, if chosen, needs Node.js ≥ 20), `python3 --version` (the other scripts need Python ≥ 3.9). `gh` only if the user wants GitHub now.
   - Check `~/.claude/CLAUDE.md` for `<!-- crew:global:start -->`. If missing, mention once that `/crew:global-setup` installs the global working principles (one-time per machine) — don't run it from here.
   - If there's no `docs/research/idea-research.md`, mention once that `/crew:research` can check competitors and prior art before committing to the idea. It's optional and standalone; don't run it from here.
   - **Optional modules** (one AskUserQuestion, multiSelect):
     - *Hub (Recommended)*: plans, sprints and a backlog in `.crew/`, with one branch and one PR per plan.
     - *Code graph (graphify)*: a knowledge graph of the code that Claude queries instead of reading files. It's an external tool, installed only with a yes (see the `codemap` skill).
     Record the answer in `kickoff.yaml` and pass it to discover, which writes it to `modules:` in config. **With the hub off, generate nothing hub-related**: skip steps 4 and 6, and the guidelines and git-setup steps render their no-hub variants.
   - Tell the user the plan in a few lines: discover → design (UI projects) → guidelines → hub (if chosen) → git → graph (if chosen) → project plan & Sprint 1 (with the hub).

1. **Discover** — follow the `discover` skill (`${CLAUDE_PLUGIN_ROOT}/skills/discover/SKILL.md`), passing `$ARGUMENTS` as the idea. Output: `.crew/config.yaml`, `docs/project-brief.md`, `docs/architecture.md`, `docs/adr/`.

2. **Design** (only when `project.type` is `fullstack` or `frontend`; otherwise mark it `skipped`). Ask whether to set the visual direction now (recommended) or later. If now, follow the `design` skill in `init` mode (`${CLAUDE_PLUGIN_ROOT}/skills/design/SKILL.md`). Output: `docs/design/DESIGN.md`, `docs/design/directions.html`, the `design:` block and the `design` pack in config, and an ADR. No application code.

3. **Guidelines** — follow the `guidelines` skill. Output: `CLAUDE.md`, `.claude/rules/*.md`, `.claude/settings.json`, `.editorconfig`, `.env.example`, `README.md`.

4. **Hub** (only with `modules.hub`; otherwise `skipped`) — initialize:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/hub/dist/crew.mjs" init
   ```
   (Vendors the hub into `.crew/bin/` and templates into `.crew/templates/`.)

5. **Git** — follow the `git-setup` skill and run its setup script.
   - **Graph** (only with `modules.graphify`): now that `.githooks` is active, follow the `codemap` skill (`${CLAUDE_PLUGIN_ROOT}/skills/codemap/SKILL.md`), *enable* only. There's no code to map yet, so don't build. Mark the `graph` step done.
   - Review the staged files with the user, then make the initial commit `chore: project scaffold (crew)`. GitHub remote only if the user asks.

6. **Project plan & Sprint 1** (only with `modules.hub`; otherwise `skipped`). Follow the hub skill's workflows 1 and 3, and its writing guide (`${CLAUDE_PLUGIN_ROOT}/skills/hub/references/writing-guide.md`). The result is a concrete, reviewable plan, not just a list of goals.
   - **Ask once** (one message): sprint length (default 1 week), starting capacity in points (default 20; explain the 1/3/5/8 reference scale), and the target date for the MVP. Offer sensible defaults from the brief's constraints.
   - **Project plan:** draft the objectives, success measures, milestones table, cadence & capacity, working agreements and stakeholders from the brief. Create it with `crew.mjs new-doc project-plan --from .crew/drafts/project-plan.md --capacity N --sprint-length N`.
   - **RAID:** seed risks from the brief's constraints and open questions and from the ADRs' consequences, each with P/I, an owner and a mitigation. Add assumptions and decisions. Create it with `new-doc raid --from …`.
   - **Milestones:**
     - M-01 MVP from the brief's MVP capabilities, with exit criteria covering function, quality, operations and docs;
     - later phases (the brief's "out of scope for now") as M-02 and onwards;
     - create each with `new-milestone "<title>" --from … --target YYYY-MM-DD`.
   - **Research input** (only if `docs/research/idea-research.md` exists): its *Worth adopting* features become candidate FEAT items or goal slices, and its risks and open assumptions go into RAID.
   - **Goals:** propose 1–3 per milestone from the MVP capabilities. For each one the user approves:
     - write a complete draft with an estimated **Breakdown** (`Title — what it delivers (5 pts) (after X)`);
     - create it with `new-goal "<title>" --from … --milestone M-01 --priority P1`;
     - the slices become FEAT items. **Don't write plan files for them yet.**
   - **`P-001: Project tooling & dev environment`** (standalone, written in full from the decisions already made):
     - **Scope:**
       - apply the reference configs in `.crew/templates/tooling/` (see its README);
       - a minimal *working* backend (`/health`, `/ready`, settings, logging) and frontend shell, or a CLI entry point with `--version`;
       - frontend API types generated from the backend's OpenAPI spec;
       - per-app Dockerfiles and `compose.yaml` with the selected services, plus `.env` from `.env.example`;
       - Makefile targets with `##` help text (`make help` is the command reference), and README *Getting started* updated with the real first-run steps.
     - if `docs/design/DESIGN.md` exists: apply its tokens with `python3 .crew/bin/check_design.py --export tailwind` in the frontend's global CSS, and build the layout shell from DESIGN.md → Layout;
     - **No empty placeholder folders.**
     - with `modules.graphify`: build the code graph once the shells exist (`/graphify .`) and confirm the post-commit hook updates it;
     - **Acceptance criteria** include `make check` green from a clean checkout, with every configured tool run at least once.
     - Every task ends with `→ verify:`. The Test plan says how each tool is exercised; Rollout & rollback is "n/a — local tooling only".
     - Capture it first as `new-item chore "Project tooling & dev environment" --why … --priority P0 --points 5` (that triages it). Create the plan with `new-plan "Project tooling & dev environment" --from … --items CHORE-001`, then `move P-001 ready` once the user agrees.
   - **Sprint 1:**
     - ask the user which day Sprint 1 begins (default: today), then `sprint new --goal "<e.g. dev environment up and the first slice of G-001 working>" --start <YYYY-MM-DD>`;
     - write the plan for the top-ranked FEAT item only if it fits the remaining capacity;
     - commit with `sprint add S-01 P-001 [P-002]`, then `sprint start S-01` once every committed plan is `ready`. If Sprint 1 begins on a later day, leave S-01 `planned` and tell the user to run `sprint start S-01` that day.
   - Capture deferred ideas as items with `new-item … --why`; no backlog bullets.
   - Run `crew.mjs check` (it must report no errors), `roadmap --write` and `status`. Show the user the status output: milestones with forecast, Sprint 1 and top risks. Commit `chore(hub): project plan, M-01 and sprint S-01`.

7. **Wrap-up** — mark all steps done in `kickoff.yaml`, then show:
   - a tree of generated files (`git ls-files | head -50`),
   - the decision summary (stack + architecture),
   - the plan at a glance: milestones with target dates and forecast, goals → item counts and points, Sprint 1 goal and committed plans, top risks;
   - next actions, with the hub:
     - review `P-001` → `/crew:hub start P-001`;
     - the next plan comes from the top of `.crew/BACKLOG.md` when P-001 is underway;
     - close Sprint 1 with a review and retro at its end date.
   - next actions, without the hub:
     - `git switch -c chore/tooling`, then set up the tooling from `.crew/templates/tooling/` (see its README) and open a PR;
     - every later change goes through its own branch and PR;
     - the hub can be added later with `/crew:hub init` and a guidelines refresh.
   - with graphify: the graph builds on the first code commit; `/graphify query "…"` once it exists.

## Rules
- Ask before overwriting any existing file; merge where possible.
- Keep the user oriented: one short line when moving between steps ("Step 3/6 — guidelines"; count only the steps that will run).
- If the user changes a decision late, update `.crew/config.yaml`, the affected ADR and re-run the guidelines refresh, rather than patching files by hand.
