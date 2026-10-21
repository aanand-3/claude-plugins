---
name: adopt
description: Bring project-kit into an existing codebase — map the repo (optionally with a graphify code graph), infer the stack, architecture and layout and confirm them, record them in .project/config.yaml, the brief, the architecture doc and ADRs, then merge in CLAUDE.md, engineering rules and git guards, and optionally the tracker. Works on a branch and merges into existing files instead of overwriting them. Use when the user wants to use project-kit, set up CLAUDE.md and guidelines, or "initialize/onboard/adopt" in a project that already has code, or resume an interrupted adoption.
argument-hint: "[path, default: current directory]"
---

# Adopt an existing project

The existing-code counterpart of `kickoff`. Kickoff interviews and creates; adopt **reads, infers, confirms and merges**. It sequences the same skills, so each step stays usable on its own. No application code changes, no dependency installs (the one exception is the graphify CLI, installed only with a yes).

## Progress file
`.project/adopt.yaml`, written on the adopt branch, so an interrupted run resumes:
```yaml
started: YYYY-MM-DD
branch: chore/project-kit-adopt
modules: {tracker: true, graphify: false}
steps: {preflight: done, map: pending, discover: pending, design: pending, guidelines: pending, tracker: pending, git: pending, graph: pending}
```
On start, if it exists, switch to its branch, show what's done and continue from the first `pending` step. A step for a module the user didn't choose is `skipped`.

## Steps

0. **Preflight**
   - **The repo.** It must be a git repo with application code. If it's empty or has no code, suggest `/project-kit:kickoff` instead. The working tree must be clean: if not, ask the user to commit or stash, and don't do it for them.
   - **Branch.** `git switch -c chore/project-kit-adopt` from the default branch. Never commit to `main`/`master` here.
   - **Inventory**, shown to the user as a short table of found / not found:
     - `CLAUDE.md`, `.claude/` (settings, rules) and `.project/`. If `.project/config.yaml` exists, the project was already set up: offer `/project-kit:guidelines --refresh` instead.
     - hooks: `core.hooksPath`, `.husky/`, `.pre-commit-config.yaml`, real files in `.git/hooks`;
     - CI (`.github/workflows/`, others), README, `docs/`, ADRs;
     - the default branch and remote.
   - **Tools:** `git`, `python3` ≥ 3.9, `node` ≥ 20 (only with the tracker).
   - **Optional modules** (one AskUserQuestion, multiSelect):
     - *Tracker (Recommended)*: plans, sprints and a backlog in `.project/`, with one branch and one PR per plan;
     - *Code graph (graphify)*: maps the codebase for this adoption and for every later session.
     **With the tracker off, nothing tracker-related is generated.**

1. **Map** — gather evidence before asking anything.
   - With graphify: follow the `graph` skill (`${CLAUDE_PLUGIN_ROOT}/skills/graph/SKILL.md`). Install the CLI if needed and **build** with `/graphify .`, but don't wire the hooks yet (step 7 does, once `.githooks` exists). `GRAPH_REPORT.md` (god nodes, communities) is the main input for the architecture and `structure:`.
   - Always read:
     - manifests and lockfiles (`pyproject.toml`, `uv.lock`, `package.json`, the pnpm/npm lock, `go.mod`, …);
     - `Dockerfile`/`compose.yaml`, migrations (`alembic/`, `prisma/`, `drizzle/`), env files (`.env.example` only, never `.env`), CI workflows;
     - the top two levels of the tree (`git ls-files | cut -d/ -f1-2 | sort -u`) and the README.
   - From these, derive: project type, languages and versions, frameworks, ORM, database, cache/queue, containers, repo layout (single app or monorepo, and the backend/frontend dirs), the architecture style that best matches the code (layered, hexagonal or none), auth, deployment hints.
   - Note what isn't covered by a pack, e.g. Go or Django. Those get rules in `.claude/rules/project.md` and no pack. Never force a pack that doesn't fit.

2. **Discover (inferred)** — follow the `discover` skill in **inferred mode** (its *Inferred mode* section). Output: `.project/config.yaml` (with `modules:`), `docs/project-brief.md`, `docs/architecture.md` (as-is), `docs/adr/0001…` and `0002-adopt-project-kit`.
   - Pick `packs:` only where the code matches the pack. Ask before adding an arch pack whose rules the current code clearly breaks: adopting it means planned refactoring, recorded as an ADR and, with the tracker, as a CHORE item.
   - Existing docs win. If `docs/architecture.md` or ADRs exist, merge into them and show the diff rather than replacing them.

3. **Design** (UI projects only, and only if the user wants it): `design` skill. Offer `review` of the existing UI first; `init` only if there's no established look worth keeping.

4. **Guidelines** — follow the `guidelines` skill.
   - Run `compose_rules.py --dry-run` first and show the result.
   - **Merge, never replace:** keep everything in the existing `CLAUDE.md` that is still true, move stack facts to their home (config, `project.md`) and show the diff.
   - The same goes for `.claude/settings.json` (merge the keys), the README (keep the content, add the *Where to find things* map and link instead of copying) and `.env.example`.

5. **Tracker** (only with `modules.tracker`): `node "${CLAUDE_PLUGIN_ROOT}/skills/tracker/dist/tracker.mjs" init`. Then offer, one question with multiSelect and nothing forced:
   - a light project plan and RAID, from the brief and the risks found while mapping;
   - M-01 for the release currently in progress, with exit criteria;
   - **import work in flight:** open GitHub issues (`gh issue list`, if a remote and `gh` are available) and TODO/FIXME clusters, as `new-item … --why` items left `new` for triage;
   - a CHORE item to apply the tooling reference configs (`.project/templates/tooling/`) where the repo lacks lint, type-check or CI.
   No Sprint 1 unless the user asks. Planning normally happens on main; during adoption it rides along on the adopt branch and lands with its PR.

6. **Git** — follow the `git-setup` skill. `setup_git.py` never re-inits, never overwrites existing files, and leaves existing hooks alone unless `--take-over-hooks` (ask first; offer to merge the guard lines into the existing hooks instead).
   - Existing `.gitignore`: only the missing sections are appended. Review them.
   - Commit on the adopt branch: `chore: adopt project-kit`. The main guard doesn't apply on a branch.

7. **Graph** (only with `modules.graphify`): with `.githooks` active, run the `graph` skill's *enable* steps 2–5 (hooks, ignore, CLAUDE.md section, config). Amend or add a commit, `chore: wire graphify code graph`.

8. **Wrap-up**
   - Mark the steps done in `adopt.yaml`.
   - Show: the files added and merged (`git diff --stat main...HEAD`), the detected stack table with anything still `assumed`, the packs applied, the modules enabled, and existing hooks or CI left as they were.
   - Offer to push and open a PR (`gh pr create`) or, without a remote, to review the diff. Merging is the user's call.
   - Next actions:
     - with the tracker: triage the imported items, then `/project-kit:tracker plan` for the next change;
     - without the tracker: every change on its own branch and PR;
     - with graphify: `/graphify query "…"` before broad reads.

## Rules
- Infer first, ask second. Every question must name the evidence that left it open.
- Ask before overwriting anything; merge and show diffs.
- Never touch application code, CI behaviour or existing hooks without an explicit yes.
- One short line when moving between steps ("Step 4/8 — guidelines"; count only the steps that will run).
