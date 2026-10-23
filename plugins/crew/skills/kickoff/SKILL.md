---
name: kickoff
description: Kick off a new software project end to end — interview for requirements and stack, generate CLAUDE.md and engineering guidelines, initialize git with branch conventions, and optionally the shared-context hub (the idea with its success criteria, goals, a ranked backlog and the first plan) and a graphify code graph. Use when the user wants to start, bootstrap, scaffold, or set up a new project (before any code is written), or resume an interrupted kickoff. For a repo that already has code, use onboard instead.
argument-hint: "[project idea in a sentence]"
---

# Project kickoff

Orchestrates the crew skills in order. Each step is also usable on its own; this skill only sequences them, tracks progress and keeps the user oriented. **Scaffolding only — no application code, no dependency installs** (the one exception is the graphify CLI, a machine-level tool installed only with the user's yes).

## Progress file
Track steps in `.crew/kickoff.yaml` so an interrupted kickoff can resume:
```yaml
started: YYYY-MM-DD
modules: {hub: true, graphify: false}
steps: {preflight: done, discover: done, design: pending, guidelines: pending, hub: pending, git: pending, graph: pending, idea-and-plan: pending}
```
A step for a module the user didn't choose is `skipped`.
On start, if it exists, show what's done and continue from the first `pending` step.

**With the hub, the ledger tracks the run instead** (no `kickoff.yaml`): after each step,
`node .crew/bin/crew.mjs checkpoint --workflow kickoff --step <step>` (`--skip` for a skipped one); on start,
`node .crew/bin/crew.mjs resume --workflow kickoff` shows what's done and the next step. The hub's ledger lives in the git
repository, so with the hub chosen run `git init -b main` in preflight if there is no repository yet (git-setup completes
it later), and record the steps done before the hub existed right after `init`. Any session or agent can then resume.

## Steps

0. **Preflight**
   - Confirm the target directory (default: current). If it already has application code (source files, a package manifest, commits beyond a scaffold), stop and suggest `/crew:onboard`, which maps and merges instead of interviewing from scratch. Docs or an empty repo are fine.
   - Check tools: `git --version`, `node --version` (the hub, if chosen, needs Node.js ≥ 20), `python3 --version` (the other scripts need Python ≥ 3.9). `gh` only if the user wants GitHub now.
   - Check `~/.claude/CLAUDE.md` for `<!-- crew:global:start -->`. If missing, mention once that `/crew:global-setup` installs the global working principles (one-time per machine) — don't run it from here.
   - If there's no `docs/research/idea-research.md`, mention once that `/crew:research` can check competitors and prior art before committing to the idea. It's optional and standalone; don't run it from here.
   - **Optional modules** (one AskUserQuestion, multiSelect):
     - *Hub (Recommended)*: the team's shared context in `.crew/`: the idea and its success criteria, goals, a ranked backlog and plans, with one branch and one PR per plan.
     - *Code graph (graphify)*: a knowledge graph of the code that Claude queries instead of reading files. It's an external tool, installed only with a yes (see the `codemap` skill).
     Record the answer in `kickoff.yaml` and pass it to discover, which writes it to `modules:` in config. **With the hub off, generate nothing hub-related**: skip steps 4 and 6, and the guidelines and git-setup steps render their no-hub variants.
   - Tell the user the plan in a few lines: discover → design (UI projects) → guidelines → hub (if chosen) → git → graph (if chosen) → idea, goals & first plan (with the hub).

1. **Discover** — follow the `discover` skill (`${CLAUDE_PLUGIN_ROOT}/skills/discover/SKILL.md`), passing `$ARGUMENTS` as the idea. Output: `.crew/config.yaml`, `docs/project-brief.md`, `docs/architecture.md`, `docs/adr/`.

2. **Design** (only when `project.type` is `fullstack` or `frontend`; otherwise mark it `skipped`). Ask whether to set the visual direction now (recommended) or later. If now, follow the `design` skill in `init` mode (`${CLAUDE_PLUGIN_ROOT}/skills/design/SKILL.md`). Output: `docs/design/DESIGN.md`, `docs/design/directions.html`, the `design:` block and the `design` pack in config, and an ADR. No application code.

3. **Guidelines** — follow the `guidelines` skill. Output: `CLAUDE.md`, `.claude/rules/*.md`, `.claude/settings.json`, `.editorconfig`, `.env.example`, `README.md`.

4. **Hub** (only with `modules.hub`; otherwise `skipped`) — initialize:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/hub/dist/crew.mjs" init
   ```
   (Vendors the hub into `.crew/bin/` and templates into `.crew/templates/`.)
   - **Mode** (one AskUserQuestion): who approves what from here on. *AI-assisted (Recommended)*: agents do the work, a human approves each plan before it starts and before it's done. *AI-native*: agents run everything after the idea is decided; humans answer escalations. *Human-led*: humans drive and also approve triage. *Agent team*: the crew agents run the build loop (`/crew:team`), each step owned by one role; the user approves the goal set and every reserved decision — write `preset: lifecycle` instead of a mode. Write `.crew/policy.yaml` with `mode: <choice>` (or the preset) and, if the user names any, budgets (`budgets: {max_agents: N, run: {max_cost: USD}}`). Run `crew.mjs policy check`. Reserved decisions (deciding or killing the idea, production deploys, publishing, spending, deleting data, policy changes) always need the user, whatever the mode.

5. **Git** — follow the `git-setup` skill and run its setup script.
   - **Graph** (only with `modules.graphify`): now that `.githooks` is active, follow the `codemap` skill (`${CLAUDE_PLUGIN_ROOT}/skills/codemap/SKILL.md`), *enable* only. There's no code to map yet, so don't build. Mark the `graph` step done.
   - Review the staged files with the user, then make the initial commit `chore: project scaffold (crew)`. GitHub remote only if the user asks.

6. **Idea, goals & first plan** (only with `modules.hub`; otherwise `skipped`). **With the Agent team mode** (`preset: lifecycle`), deciding the idea stays with the user here; the rest is the team's first job: hand it to `/crew:team "kickoff: goals and the first plans from the decided idea"` — the PM drafts the goals and the backlog, the Architect specs P-001 and the focus goal's first plan, the Director checks and records the step; the user approves the goal set (`goal.active` is their gate). Otherwise: Follow the hub skill's workflows 1 and 3, and its writing guide (`${CLAUDE_PLUGIN_ROOT}/skills/hub/references/writing-guide.md`). The result is a concrete, reviewable plan, not just a list of goals.
   - **Idea:** draft `idea.md` from the brief: the problem, the outcome, **success criteria as a checklist** the user can verify, the direction chosen in discover (and the alternatives weighed), constraints. With `docs/research/idea-research.md`, put its verdict and key findings under Research and its open assumptions under Constraints. Create it with `crew.mjs new-idea "<title>" --from .crew/drafts/idea.md`. Ask the user to confirm the success criteria, then `move IDEA decided --approved-by <their name>` on their yes (a reserved decision: the user decides, never you).
   - **Goals:** propose 1–3 from the brief's MVP capabilities. With research, its *Worth adopting* features become candidate goal slices or FEAT items. For each goal the user approves:
     - write a complete draft whose **Breakdown** lists vertical slices (`Title — what it delivers`);
     - create it with `new-goal "<title>" --from … --priority P1`;
     - the slices become FEAT items. **Don't write plan files for them yet.**
   - **Focus:** `focus G-001` (or the goal the user wants first).
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
     - `touches:` covers the tooling files, the app shells and the Makefile.
     - Capture it first as `new-item chore "Project tooling & dev environment" --why … --priority P0` (that triages it). Create the plan with `new-plan "Project tooling & dev environment" --from … --items CHORE-001 --touches "…"`, then `move P-001 ready` once the user agrees (adding `--approved-by <their name>` when the mode gates it).
   - Write the plan for the focus goal's first slice too, only if the user wants two plans ready.
   - Capture deferred ideas as items with `new-item … --why`; no backlog bullets.
   - Run `crew.mjs check` (it must report no errors) and `status`. Show the user the status output. Commit `chore(hub): idea, goals and P-001`.

7. **Wrap-up** — mark all steps done in `kickoff.yaml`, then show:
   - a tree of generated files (`git ls-files | head -50`),
   - the decision summary (stack + architecture),
   - the plan at a glance: the idea and its success criteria, the focus goal, goals → item counts, the plans written;
   - next actions, with the hub:
     - review `P-001` → `/crew:hub start P-001`;
     - `crew.mjs next` names the next plan to write once P-001 is underway.
   - next actions, without the hub:
     - `git switch -c chore/tooling`, then set up the tooling from `.crew/templates/tooling/` (see its README) and open a PR;
     - every later change goes through its own branch and PR;
     - the hub can be added later with `/crew:hub init` and a guidelines refresh.
   - with graphify: the graph builds on the first code commit; `/graphify query "…"` once it exists.

## Rules
- Ask before overwriting any existing file; merge where possible.
- Keep the user oriented: one short line when moving between steps ("Step 3/6 — guidelines"; count only the steps that will run).
- If the user changes a decision late, update `.crew/config.yaml`, the affected ADR and re-run the guidelines refresh, rather than patching files by hand.
