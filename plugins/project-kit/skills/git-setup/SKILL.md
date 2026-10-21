---
name: git-setup
description: Initialize git for a project with the team's conventions — main branch, stack-aware .gitignore, .gitattributes, PR template, versioned hooks that protect main and enforce Conventional Commits, branch-per-plan (or branch-per-change without the tracker) workflow, initial scaffold commit, and optionally a GitHub remote. Respects an existing repo's hooks. Use when setting up a new project's repository, when asked about branching/commit/PR conventions, or to connect the project to GitHub later.
argument-hint: "[--github]"
---

# Git setup

## Conventions (what the hooks and tracker assume)
With `modules.tracker: true` (the default):

| Item | Rule |
|---|---|
| Default branch | `main` — always releasable |
| Work branch | `plan/P-###-<slug>` (one per plan, created by `tracker.mjs start`); rare opt-in `epic/EP-###-<slug>` integration branch |
| Commits | Conventional Commits; plan ID as scope on plan branches: `feat(P-012): add signup endpoint`; planning on main: `chore(tracker): …` |
| On `main` | only `.project/` planning commits (hook-enforced); everything else via a plan branch |
| PR | title `P-###: <plan title>`; body from `.github/pull_request_template.md` |
| Merge | squash-merge, delete branch; the plan is marked `done` in the last branch commit |

With `modules.tracker: false`, the hooks and PR template carry nothing tracker-related:

| Item | Rule |
|---|---|
| Work branch | `feat/<slug>`, `fix/<slug>`, `chore/<slug>`; any name is accepted |
| Commits | Conventional Commits, e.g. `feat(auth): add signup endpoint` |
| On `main` | nothing after the first commit (hook-enforced); every change via a branch and PR |
| PR | title is a Conventional Commit; body from `.github/pull_request_template.md` |

## Steps
1. Run (idempotent, never commits):
   ```bash
   python3 "${CLAUDE_SKILL_DIR}/scripts/setup_git.py" --root .
   ```
   (Clones don't inherit `core.hooksPath`; the project's SessionStart hook in `.claude/settings.json` re-activates `.githooks` automatically, and the README tells humans to run `git config core.hooksPath .githooks`.)
   It derives `.gitignore` sections from `.project/config.yaml` packs (or `--stacks python,node,docker`), plus `graphify-out/` when `modules.graphify` is on. It adds `.gitattributes`, the PR template and `.githooks/{pre-commit,commit-msg}`, rendered for `modules.tracker` (`--no-tracker` forces the plain variant), and sets `core.hooksPath`.
   **Existing repo:** it never re-inits and never overwrites existing files. If the repo already has hooks (`core.hooksPath` set elsewhere, e.g. Husky, or real hooks in `.git/hooks`), it leaves them active and says so. Then ask the user whether to merge the project-kit checks into their hooks, or take over with `--take-over-hooks`.
2. Review `git status` with the user. Make sure no secrets or `.env` are staged.
3. Initial commit (first commit on main is allowed by the hook; in an existing repo, commit on the adopt branch instead):
   `git add -A && git commit -m "chore: project scaffold (project-kit)"`
4. **GitHub remote (only if `$ARGUMENTS` has `--github` or the user asks — confirm visibility and name first):**
   `gh repo create <name> --private --source . --push` (or `--public`). Then suggest enabling branch protection on `main` (require PR, squash-only) — this replaces the local pre-commit guard for collaborators. Update `git.remote: github` in `.project/config.yaml`.

## Opening and merging a plan PR
- With a GitHub remote: `git push -u origin <branch>` then `gh pr create --title "P-###: <title>" --body-file <filled template>`; record the URL in the plan's `pr:` field.
- Without a remote: summarize `git diff main...HEAD --stat` plus key changes for review, then on approval: `git switch main && git merge --squash <branch> && git commit -m "P-###: <title>" && git branch -D <branch>`.
- Always ask before merging, pushing, or deleting branches.

## Notes
- `.githooks/pre-commit` runs, in order: main-branch guard → secret scan (`.project/bin/check_secrets.py`, blocks) → structure check (warns) → `pre-commit run` if `.pre-commit-config.yaml` exists (added by P-001 from the tooling templates). **Never run `pre-commit install`** — it would replace `core.hooksPath` and drop the project-kit guards.
- Never use `--no-verify`, never force-push `main`.
