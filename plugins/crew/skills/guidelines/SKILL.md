---
name: guidelines
description: Generate a project's Claude Code setup and engineering guidelines from its recorded stack — project CLAUDE.md, path-scoped .claude/rules/ per technology and architecture (Python, FastAPI, Node, React, Postgres, Redis, Temporal, Docker, layered/hexagonal, testing), a project-specific rules file, .claude/settings.json, .editorconfig, .env.example and README. Use after discovery, when the user asks to scaffold or refresh CLAUDE.md / engineering guidelines / best practices, or after the stack in .crew/config.yaml changes.
argument-hint: "[--refresh]"
---

# Guidelines

Turns `.crew/config.yaml` into the files that make Claude (and humans) follow the team's standards from the first line of code.

## Where each kind of rule lives
| Layer | File | Holds | Example |
|---|---|---|---|
| Behavior (all projects) | `~/.claude/CLAUDE.md` (global-setup) | How Claude works | think first, simplicity, surgical changes, verify goals |
| Engineering principles | `.claude/rules/base.md` (always) | Language-agnostic design & quality rules | DRY (knowledge), pragmatic SOLID, parse-don't-validate, typed code, config via typed settings, external-integration discipline, DoD |
| Language | `python.md`, `node.md` | Tooling, typing, settings, model categories | pyright strict, pydantic-settings, NewType IDs |
| Framework / infra | `fastapi.md`, `react.md`, `postgres.md`, `redis.md`, `temporal.md`, `docker.md` | How to use that tool well | thin routers, TanStack Query, migrations, activity idempotency |
| Architecture | `arch-layered.md` or `arch-hexagonal.md` (backend); frontend architecture is in `react.md` | Structure + dependency rules + how they're enforced | domain imports nothing; feature modules; only services touch the network |
| Testing | `testing-python.md`, `testing-js.md` | Pyramid, isolation, boundary/handoff tests | port conformance suites, page smoke tests |
| Project | `.claude/rules/project.md` (always) | Concrete choices, actual layout, contexts/modules, domain vocabulary, project-only rules | "SQLAlchemy not SQLModel"; `ferry.domain` contexts; IdXref |

Packs are versioned in `${CLAUDE_SKILL_DIR}/stacks/` and copied verbatim; **only `project.md` is hand-written per project.** Backend/frontend packs are path-scoped to `architecture.backend_dir` / `frontend_dir`, so they never load for the other side.

## Prerequisite
`.crew/config.yaml` exists with `packs:` and (for monorepos) `architecture.backend_dir` / `frontend_dir`. If not, run `discover` first.

## Steps

1. **Read** `.crew/config.yaml`, `docs/project-brief.md`, `docs/architecture.md`.
2. **Compose rules** (deterministic):
   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/compose_rules.mjs" --root . --dry-run
   node "${CLAUDE_SKILL_DIR}/scripts/compose_rules.mjs" --root .
   ```
   It also copies helper scripts to `.crew/bin/` (`check_structure.mjs` for the pre-commit layout and module-size check, `format_on_edit.mjs` for the format-after-edit hook, `track_plan_draft.mjs` for the plan-mode hook) and the matching **tooling reference configs** (ruff/pyright/import-linter, ESLint+boundaries, tsconfig, pre-commit, Makefile, CI, Dependabot, VS Code) to `.crew/templates/tooling/` for P-001 to apply.
   Output per file: `WRITE`, `OK (unchanged)`, `SKIP` (hand-edited — show the diff; `--force` only with the user's agreement), `STALE` (pack no longer selected — `--prune` removes it).
3. **Write `.claude/rules/project.md`** (no `paths`, always loaded, ≤ ~70 lines). Never restate pack content; only what is specific to this project:
   - **Concrete choices** where packs offer options (ORM, sync/async, PK type, Redis uses, job system, auth, styling).
   - **Backend layout**: the real package path and how it instantiates the arch pack (e.g. bounded contexts and their public contracts, allowed cross-context imports).
   - **Frontend modules**: the module list (mirroring backend contexts/features), allowed module→module imports, and project-specific shared components/patterns once they exist.
   - **Domain vocabulary**: one line per core term.
   - **Project-only rules** (data handling, compliance, integration-specific constraints).
4. **Project `CLAUDE.md`** from `${CLAUDE_SKILL_DIR}/templates/CLAUDE.project.md`. Fill every `<placeholder>`; keep *How we work* verbatim. Same no-duplication rule: point to the home of each fact (config, `project.md`, architecture, `make help`) rather than restating the stack, layout or commands. Link docs instead of `@`-importing them (keeps every session's context small). Target < 60 lines. If a `CLAUDE.md` exists, merge and show the diff.
5. **`.claude/settings.json`** from `templates/settings.json`: plan-mode drafts → `.crew/drafts`; SessionStart hook activates `.githooks` in every clone, shows the active plan and lists unconverted drafts; PostToolUse hooks format each file Claude edits (no-op until formatters are installed) and, when plan mode exits, tell Claude to turn the draft into a tracked plan (`new-plan`), or fold it into the current plan's file on a plan branch; denies reading `.env`, force-push and `--no-verify`. Merge with an existing file.
6. **`README.md`** from `${CLAUDE_SKILL_DIR}/templates/README.project.md`. **No duplication:** the README owns only the tagline, the status line and *Getting started* (prerequisites, clone, hooks, `.env`, first run). Everything else is a link in the *Where to find things* map: brief, architecture (layout), ADRs, config, rules, roadmap, workflow, `make help`. Never copy the layout, stack, scope or commands into it. If a README exists, merge: keep the user's content, replace copied sections with links, and show the diff.
7. **Repo hygiene files** (skip any that exist):
   - `.editorconfig`, from the template;
   - `.env.example`: the variables the stack needs, with safe local defaults and a comment each, only for components in config.
8. **Report**: files written, packs applied, and any conflicts between packs and project decisions (resolve them in `project.md`, never by editing a pack copy).

## Refresh (`--refresh` or stack changed)
Re-run step 2 (reports drift and stale packs). Then update `project.md`, and `docs/architecture.md → Repository layout` whenever `structure:` changed. Run `node .crew/bin/check_structure.mjs --all` to confirm the architecture layout has no gaps. Never silently overwrite hand-edited files.

**A project set up before crew went Node-only** (`crew.mjs check` names `.crew/bin/*.py` leftovers or files that still run them):
1. Run git-setup's script (`node "${CLAUDE_PLUGIN_ROOT}/skills/git-setup/scripts/setup_git.mjs" --root .`) and step 2's `compose_rules.mjs`. They move crew's own hooks and `.claude/settings.json` from `python3 .crew/bin/X.py` to `node .crew/bin/X.mjs` (`UPGRADE`), and remove each `.py` once nothing calls it (`REMOVE`).
2. For every `KEEP` line, the named file still calls the `.py`. It's either the project's own file (CI, `Makefile`, `.claude/settings.local.json`, another hooks setup) or a call written another way. Show the user the one-line change to `node .crew/bin/X.mjs`, make it on their yes, and re-run step 2 so the `.py` goes.
3. If `.crew/config.yaml` still has a `modules:` block, delete it: nothing in crew is optional any more.
4. Run `crew.mjs check` again; none of these hints should be left. Commit `chore: move crew's scripts to Node`.

## Adding a stack pack (maintainers)
`stacks/<name>.md` with frontmatter `pack`, `description`, `scope` (`backend` | `frontend` | `any`), `requires`, `paths` (globs relative to the app root; empty = always loaded). Add it to the pack mapping in `discover/references/questions.md`. Packs hold enforceable, reusable rules — never project specifics.
