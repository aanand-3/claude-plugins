---
name: kickoff
description: Kick off a new software project end to end — interview for requirements and stack, generate CLAUDE.md and engineering guidelines, produce a project plan (milestones, RAID, estimated backlog, Sprint 1) in the repo-local tracker, and initialize git with branch-per-plan conventions. Use when the user wants to start, bootstrap, scaffold, or set up a new project (before any code is written), or resume an interrupted kickoff.
argument-hint: "[project idea in a sentence]"
---

# Project kickoff

Orchestrates the project-kit skills in order. Each step is also usable on its own; this skill only sequences them, tracks progress and keeps the user oriented. **Scaffolding only — no application code, no dependency installs.**

## Progress file
Track steps in `.project/kickoff.yaml` so an interrupted kickoff can resume:
```yaml
started: YYYY-MM-DD
steps: {preflight: done, discover: done, design: pending, guidelines: pending, tracker: pending, git: pending, project-plan: pending}
```
On start, if it exists, show what's done and continue from the first `pending` step.

## Steps

0. **Preflight**
   - Confirm the target directory (default: current). If it contains files other than dotfiles, list them and ask how to proceed (existing code → this is an adoption, not greenfield; still OK).
   - Check tools: `git --version`, `node --version` (the tracker needs Node.js ≥ 20), `python3 --version` (the other scripts need Python ≥ 3.9). `gh` only if the user wants GitHub now.
   - Check `~/.claude/CLAUDE.md` for `<!-- project-kit:global:start -->`. If missing, mention once that `/project-kit:global-setup` installs the global working principles (one-time per machine) — don't run it from here.
   - If there's no `docs/research/idea-research.md`, mention once that `/project-kit:research` can check competitors and prior art before committing to the idea. It's optional and standalone; don't run it from here.
   - Tell the user the plan in 6 lines: discover → design (UI projects) → guidelines → tracker → git → project plan & Sprint 1.

1. **Discover** — follow the `discover` skill (`${CLAUDE_PLUGIN_ROOT}/skills/discover/SKILL.md`), passing `$ARGUMENTS` as the idea. Output: `.project/config.yaml`, `docs/project-brief.md`, `docs/architecture.md`, `docs/adr/`.

2. **Design** (only when `project.type` is `fullstack` or `frontend`; otherwise mark it `skipped`). Ask whether to set the visual direction now (recommended) or later. If now, follow the `design` skill in `init` mode (`${CLAUDE_PLUGIN_ROOT}/skills/design/SKILL.md`). Output: `docs/design/DESIGN.md`, `docs/design/directions.html`, the `design:` block and the `design` pack in config, and an ADR. No application code.

3. **Guidelines** — follow the `guidelines` skill. Output: `CLAUDE.md`, `.claude/rules/*.md`, `.claude/settings.json`, `.editorconfig`, `.env.example`, `README.md`.

4. **Tracker** — initialize:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/tracker/dist/tracker.mjs" init
   ```
   (Vendors the tracker into `.project/bin/` and templates into `.project/templates/`.)

5. **Git** — follow the `git-setup` skill: run its setup script, review staged files with the user, make the initial commit `chore: project scaffold (project-kit)`. GitHub remote only if the user asks.

6. **Project plan & Sprint 1.** Follow the tracker skill's workflows 1 and 3, and its writing guide (`${CLAUDE_PLUGIN_ROOT}/skills/tracker/references/writing-guide.md`). The result is a concrete, reviewable plan, not just a list of epics.
   - **Ask once** (one message): sprint length (default 1 week), starting capacity in points (default 20; explain the 1/3/5/8 reference scale), and the target date for the MVP. Offer sensible defaults from the brief's constraints.
   - **Project plan:** draft the objectives, success measures, milestones table, cadence & capacity, working agreements and stakeholders from the brief. Create it with `tracker.mjs new-doc project-plan --from .project/drafts/project-plan.md --capacity N --sprint-length N`.
   - **RAID:** seed risks from the brief's constraints and open questions and from the ADRs' consequences, each with P/I, an owner and a mitigation. Add assumptions and decisions. Create it with `new-doc raid --from …`.
   - **Milestones:**
     - M-01 MVP from the brief's MVP capabilities, with exit criteria covering function, quality, operations and docs;
     - later phases (the brief's "out of scope for now") as M-02 and onwards;
     - create each with `new-milestone "<title>" --from … --target YYYY-MM-DD`.
   - **Research input** (only if `docs/research/idea-research.md` exists): its *Worth adopting* features become candidate FEAT items or epic slices, and its risks and open assumptions go into RAID.
   - **Epics:** propose 1–3 per milestone from the MVP capabilities. For each one the user approves:
     - write a complete draft with an estimated **Breakdown** (`Title — what it delivers (5 pts) (after X)`);
     - create it with `new-epic "<title>" --from … --milestone M-01 --priority P1`;
     - the slices become FEAT items. **Don't write plan files for them yet.**
   - **`P-001: Project tooling & dev environment`** (standalone, written in full from the decisions already made):
     - **Scope:**
       - apply the reference configs in `.project/templates/tooling/` (see its README);
       - a minimal *working* backend (`/health`, `/ready`, settings, logging) and frontend shell, or a CLI entry point with `--version`;
       - frontend API types generated from the backend's OpenAPI spec;
       - per-app Dockerfiles and `compose.yaml` with the selected services, plus `.env` from `.env.example`;
       - Makefile targets with `##` help text (`make help` is the command reference), and README *Getting started* updated with the real first-run steps.
     - if `docs/design/DESIGN.md` exists: apply its tokens with `python3 .project/bin/check_design.py --export tailwind` in the frontend's global CSS, and build the layout shell from DESIGN.md → Layout;
     - **No empty placeholder folders.**
     - **Acceptance criteria** include `make check` green from a clean checkout, with every configured tool run at least once.
     - Every task ends with `→ verify:`. The Test plan says how each tool is exercised; Rollout & rollback is "n/a — local tooling only".
     - Capture it first as `new-item chore "Project tooling & dev environment" --why … --priority P0 --points 5` (that triages it). Create the plan with `new-plan "Project tooling & dev environment" --from … --items CHORE-001`, then `move P-001 ready` once the user agrees.
   - **Sprint 1:**
     - ask the user which day Sprint 1 begins (default: today), then `sprint new --goal "<e.g. dev environment up and the first slice of EP-001 working>" --start <YYYY-MM-DD>`;
     - write the plan for the top-ranked FEAT item only if it fits the remaining capacity;
     - commit with `sprint add S-01 P-001 [P-002]`, then `sprint start S-01` once every committed plan is `ready`. If Sprint 1 begins on a later day, leave S-01 `planned` and tell the user to run `sprint start S-01` that day.
   - Capture deferred ideas as items with `new-item … --why`; no backlog bullets.
   - Run `tracker.mjs check` (it must report no errors), `roadmap --write` and `status`. Show the user the status output: milestones with forecast, Sprint 1 and top risks. Commit `chore(tracker): project plan, M-01 and sprint S-01`.

7. **Wrap-up** — mark all steps done in `kickoff.yaml`, then show:
   - a tree of generated files (`git ls-files | head -50`),
   - the decision summary (stack + architecture),
   - the plan at a glance: milestones with target dates and forecast, epics → item counts and points, Sprint 1 goal and committed plans, top risks;
   - next actions:
     - review `P-001` → `/project-kit:tracker start P-001`;
     - the next plan comes from the top of `.project/BACKLOG.md` when P-001 is underway;
     - close Sprint 1 with a review and retro at its end date.

## Rules
- Ask before overwriting any existing file; merge where possible.
- Keep the user oriented: one short line when moving between steps ("Step 3/6 — guidelines").
- If the user changes a decision late, update `.project/config.yaml`, the affected ADR and re-run the guidelines refresh, rather than patching files by hand.
