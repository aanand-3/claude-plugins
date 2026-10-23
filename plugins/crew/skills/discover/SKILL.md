---
name: discover
description: Interview the user to capture a new project's requirements and technical decisions (project type, language/framework, database, cache, containers, architecture, auth) and record them as .crew/config.yaml, docs/project-brief.md, docs/architecture.md and ADRs. Use at the start of a new project, when the user says "start/kick off/set up a new project", or wants to (re)define the stack or architecture of a project that has no .crew/config.yaml yet.
argument-hint: "[project idea in a sentence]"
---

# Discover

Goal: turn a project idea into **explicit, recorded decisions** with as few questions as possible. Everything later (guidelines, hub, git) reads `.crew/config.yaml`, so it must be complete and accurate.

Question bank, presets and defaults: [references/questions.md](references/questions.md). Output templates: `templates/` in this skill directory (`${CLAUDE_SKILL_DIR}/templates`).

## Process

1. **Check state.** If `.crew/config.yaml` exists, show it and ask whether to revise it rather than start over. Note anything already in the directory (existing code, README) and infer what you can before asking.
   If `docs/research/idea-research.md` exists (from `/crew:research`), read it first. Pre-fill the idea, users and MVP capabilities from it, including its *Worth adopting* items as candidate capabilities and its open questions. Then confirm those instead of asking again. If its verdict is *kill*, say so and ask whether to continue.
2. **Round 1 — the idea** (free text, one message): name, one-line purpose, who uses it, 3–5 MVP capabilities, known constraints (deadline, hosting, compliance, integrations). If `$ARGUMENTS` already describes the idea, only ask for what's missing.
3. **Round 2 — preset.** Recommend the best-fitting preset from the question bank given the idea, and ask the user to confirm or pick another / custom. Use the AskUserQuestion tool (≤4 questions per call, recommended option first, labelled "(Recommended)").
4. **Round 3 — deltas only.** Ask only the questions whose answer isn't fixed by the preset or the idea: e.g. ORM, Redis uses, architecture style, repo layout, auth. Skip anything with an obvious default and state the default you chose instead.
5. **Confirm.** Show a compact decision summary (table) and get a yes before writing files.
6. **Write outputs** (create directories as needed; never overwrite without asking):
   - `.crew/config.yaml` — from `templates/config.yaml`; every key filled (`none` where not applicable). `packs:` lists the guideline packs to apply (see mapping in the question bank).
   - `docs/project-brief.md` — from `templates/project-brief.md`. Fill *Landscape & differentiation* only when a research report exists; otherwise delete that section.
   - `git.branch_pattern` in config is `plan/P-###-<slug>`.
   - `design:` and `research:` in config: fill `research:` from the report, or set `none`. Leave `design:` as `none`. The design step (`/crew:design init`) fills it for frontend and fullstack projects.
   - `docs/architecture.md` — from `templates/architecture.md`: context + container diagram (Mermaid), **Repository layout** (the designed tree with every directory declared in `structure:`, plus the *Where new code goes* table — this is the only place the layout is described), request/data flow, cross-cutting concerns. Concrete to *this* project, not generic.
   - `docs/adr/0001-record-architecture-decisions.md` plus one ADR per significant decision (stack, database, architecture style, Redis/job system if used, **environments & configuration strategy**) — from `templates/adr.md`. Short: context, decision, consequences, alternatives considered.
   - The `structure:` block in config: derive it from the chosen arch pack, backend package name, frontend modules and root files (see the template). Keep it to the high-level layout only (≤ ~6 governed dirs); it's what the pre-commit guard enforces.
7. Report the files written and hand back (the `kickoff` skill continues with guidelines; standalone, suggest `/crew:guidelines`).

## Inferred mode (called by `onboard`)
The project already exists, so the code is the main source of truth and the interview fills gaps:
- Fill config from the evidence onboard gathered (manifests, lockfiles, Docker/compose, migrations, CI, the graph report). Show the decision table with a *Source* column (`detected: pyproject.toml`, `assumed`) and ask only about `assumed` rows, in one round plus confirmation.
- `docs/architecture.md` describes the **as-is** system and layout. Note intended changes as *Direction* with an ADR, not as if they already exist.
- `structure:` mirrors the real top-level directories and `structure_check: warn`. The guard only checks new and changed files, so existing code never blocks a commit.
- The brief comes from the README and docs. Mark what you couldn't find as `TODO(owner)` rather than inventing it.
- ADRs: `0001-record-architecture-decisions` plus `0002-onboard-crew`, which records the detected stack. Don't backfill ADRs for past decisions unless the user asks.

## Rules
- Ask few, sharp questions; prefer recommending over enumerating. Never ask more than three rounds plus confirmation.
- Record *why* for each non-default choice (it goes into the ADR).
- Use current stable/LTS versions; record exact major versions in config so guidelines and later code agree.
- Don't write application code or install dependencies — this is scaffolding only.
