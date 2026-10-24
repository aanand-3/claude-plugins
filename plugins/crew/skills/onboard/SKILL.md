---
name: onboard
description: Bring crew into an existing codebase — map the repo with a graphify code graph, infer the stack, architecture and layout and confirm them, record them in .crew/config.yaml, the brief, the architecture doc and ADRs, then merge in CLAUDE.md, engineering rules, git guards and the hub. Works on a branch and merges into existing files instead of overwriting them. Use when the user wants to use crew, set up CLAUDE.md and guidelines, or "initialize/onboard/adopt" in a project that already has code, or resume an interrupted onboarding.
argument-hint: "[path, default: current directory]"
---

# Onboard an existing project

The existing-code counterpart of `kickoff`. Kickoff interviews and creates; onboard **reads, infers, confirms and merges**. It sequences the same skills, so each step stays usable on its own. No application code changes, no dependency installs (the one exception is the graphify CLI, installed only with a yes).

## Progress
The hub's ledger tracks the run, so an interrupted onboarding resumes. The steps are `preflight`, `map`, `discover`,
`design`, `guidelines`, `hub`, `git` and `graph`. After each step,
`node .crew/bin/crew.mjs checkpoint --workflow onboard --step <step>` (`--skip` for a skipped one), recording the steps
done before the hub existed right after `init`. On start, if the `chore/crew-onboard` branch exists, switch to it and run
`node .crew/bin/crew.mjs resume --workflow onboard` to see what's done and continue from the next step.

## Steps

0. **Preflight**
   - **The repo.** It must be a git repo with application code. If it's empty or has no code, suggest `/crew:kickoff` instead. The working tree must be clean: if not, ask the user to commit or stash, and don't do it for them.
   - **Branch.** `git switch -c chore/crew-onboard` from the default branch. Never commit to `main`/`master` here.
   - **Inventory**, shown to the user as a short table of found / not found:
     - `CLAUDE.md`, `.claude/` (settings, rules) and `.crew/`. If `.crew/config.yaml` exists, the project was already set up: offer `/crew:guidelines --refresh` instead.
     - hooks: `core.hooksPath`, `.husky/`, `.pre-commit-config.yaml`, real files in `.git/hooks`;
     - CI (`.github/workflows/`, others), README, `docs/`, ADRs;
     - the default branch and remote.
   - **Tools:** `git`, `node` ≥ 20 (every crew script), `uv` (installs graphify for the code graph).
   - **Code graph:** graphify maps the codebase for this onboarding and for every later session. It's an external tool, installed in step 1 only with the user's yes. A project-kit `.project/` folder is migrated by the hub step (`crew.mjs migrate`).

1. **Map** — gather evidence before asking anything.
   - **Graph first:** follow the `codemap` skill (`${CLAUDE_PLUGIN_ROOT}/skills/codemap/SKILL.md`). Install the CLI if needed and **build** with `/graphify .`, but don't wire the hooks yet (step 7 does, once `.githooks` exists). `GRAPH_REPORT.md` (god nodes, communities) is the main input for the architecture and `structure:`. If the user declines the install, map from the files below alone and skip step 7.
   - Always read:
     - manifests and lockfiles (`pyproject.toml`, `uv.lock`, `package.json`, the pnpm/npm lock, `go.mod`, …);
     - `Dockerfile`/`compose.yaml`, migrations (`alembic/`, `prisma/`, `drizzle/`), env files (`.env.example` only, never `.env`), CI workflows;
     - the top two levels of the tree (`git ls-files | cut -d/ -f1-2 | sort -u`) and the README.
   - From these, derive: project type, languages and versions, frameworks, ORM, database, cache/queue, containers, repo layout (single app or monorepo, and the backend/frontend dirs), the architecture style that best matches the code (layered, hexagonal or none), auth, deployment hints.
   - Note what isn't covered by a pack, e.g. Go or Django. Those get rules in `.claude/rules/project.md` and no pack. Never force a pack that doesn't fit.

2. **Discover (inferred)** — follow the `discover` skill in **inferred mode** (its *Inferred mode* section). Output: `.crew/config.yaml`, `docs/project-brief.md`, `docs/architecture.md` (as-is), `docs/adr/0001…` and `0002-onboard-crew`.
   - Pick `packs:` only where the code matches the pack. Ask before adding an arch pack whose rules the current code clearly breaks: adopting it means planned refactoring, recorded as an ADR and a CHORE item.
   - Existing docs win. If `docs/architecture.md` or ADRs exist, merge into them and show the diff rather than replacing them.

3. **Design** (UI projects only, and only if the user wants it): `design` skill. Offer `review` of the existing UI first; `init` only if there's no established look worth keeping.

4. **Guidelines** — follow the `guidelines` skill.
   - Run `compose_rules.mjs --dry-run` first and show the result.
   - **Merge, never replace:** keep everything in the existing `CLAUDE.md` that is still true, move stack facts to their home (config, `project.md`) and show the diff.
   - The same goes for `.claude/settings.json` (merge the keys), the README (keep the content, add the *Where to find things* map and link instead of copying) and `.env.example`.

5. **Hub**: `node "${CLAUDE_PLUGIN_ROOT}/skills/hub/dist/crew.mjs" init`.
   - **Mode** (one AskUserQuestion): who approves what from here on. *AI-assisted (Recommended)*: agents do the work, a human approves each plan before it starts and before it's done. *AI-native*: agents run everything after the idea is decided; humans answer escalations. *Human-led*: humans drive and also approve triage. *Agent team*: the crew agents run the build loop (`/crew:team`), each step owned by one role; the user approves the goal set and every reserved decision — write `preset: lifecycle` instead of a mode. Write `.crew/policy.yaml` with `mode: <choice>` (or the preset) and, if the user names any, budgets (`budgets: {max_agents: N, run: {max_cost: USD}}`). Run `crew.mjs policy check`. Reserved decisions (deciding or killing the idea, production deploys, publishing, spending, deleting data, policy changes) always need the user, whatever the mode.
   Then offer, one question with multiSelect and nothing forced:
   - the idea (`new-idea`), from the brief: what the project is for and the success criteria the user agrees to;
   - a goal for the work currently in progress, set as the focus (`focus G-001`);
   - **import work in flight:** open GitHub issues (`gh issue list`, if a remote and `gh` are available) and TODO/FIXME clusters, as `new-item … --why` items left `new` for triage;
   - a CHORE item to apply the tooling reference configs (`.crew/templates/tooling/`) where the repo lacks lint, type-check or CI.
   Planning normally happens on main; during onboarding it rides along on the onboard branch and lands with its PR.

6. **Git** — follow the `git-setup` skill. `setup_git.mjs` never re-inits, never overwrites existing files, and leaves existing hooks alone unless `--take-over-hooks` (ask first; offer to merge the guard lines into the existing hooks instead).
   - Existing `.gitignore`: only the missing sections are appended. Review them.
   - Commit on the onboard branch: `chore: onboard crew`. The main guard doesn't apply on a branch.

7. **Graph:** with `.githooks` active, run the `codemap` skill's *enable* steps 2–4 (hooks, ignore, CLAUDE.md section). Amend or add a commit, `chore: wire graphify code graph`.

8. **Wrap-up**
   - Record the last step (`checkpoint --workflow onboard --step graph`).
   - Show: the files added and merged (`git diff --stat main...HEAD`), the detected stack table with anything still `assumed`, the packs applied, whether the code graph is set up, and existing hooks or CI left as they were.
   - Offer to push and open a PR (`gh pr create`) or, without a remote, to review the diff. Merging is the user's call.
   - Next actions:
     - triage the imported items, then `/crew:hub plan` for the next change;
     - once the graph exists: `/graphify query "…"` before broad reads.

## Rules
- Infer first, ask second. Every question must name the evidence that left it open.
- Ask before overwriting anything; merge and show diffs.
- Never touch application code, CI behaviour or existing hooks without an explicit yes.
- One short line when moving between steps ("Step 4/8 — guidelines"; count only the steps that will run).
