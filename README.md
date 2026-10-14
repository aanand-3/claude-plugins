# Claude Plugins

A Claude Code plugin marketplace. It currently contains one plugin, **project-kit**, which takes the repeated manual setup out of starting a project.

## Install (local)

```bash
claude plugin marketplace add /Users/aanand/Documents/Projects/Personal/claude-plugins
claude plugin install project-kit@aanand-plugins
```

After editing skills here, start a new Claude Code session to pick up the changes. Run `claude plugin marketplace update aanand-plugins` if a session still shows the old version.

Once this is on GitHub: `claude plugin marketplace add aanand-3/claude-plugins`.

## project-kit

| Skill | Invoke | Purpose |
|---|---|---|
| research | `/project-kit:research <idea>` | Standalone, before or after kickoff. Finds competitors, open-source prior art and user complaints, lists features worth adopting, gives a rough bottom-up market estimate, and recommends **go / pivot / kill**. Every claim cites evidence that a script has fetched and checked. Writes `docs/research/` |
| kickoff | `/project-kit:kickoff <idea>` | Runs discover, design, guidelines, tracker, git and the project plan in order, and can resume after an interruption |
| discover | `/project-kit:discover` | Interview → `.project/config.yaml`, brief, architecture, ADRs |
| design | `/project-kit:design [init\|page\|review\|refresh]` | A gallery page of all of Sanzo Wada's *Dictionary of Color Combinations*, each previewed as UI with WCAG-checked roles for light and dark. You shortlist 2–4, and each becomes a full style tile to compare. The pick becomes `docs/design/DESIGN.md` (tokens, layout shell, component inventory, do's and don'ts). Pages are composed from it, and `check_design.py` flags drift |
| guidelines | `/project-kit:guidelines` | `CLAUDE.md`, path-scoped `.claude/rules/` from stack packs, settings, hygiene files |
| tracker | `/project-kit:tracker …` | Repo-local project management in `.project/`: project plan + RAID, milestones with forecasts, sprints (capacity, burndown, velocity, review/retro), a ranked backlog of FEAT/BUG/CHORE/SPIKE items with priority and story points, and plans with tasks (one branch and one PR per plan). Enforced gates: no skeletons, triage, Definition of Ready, WIP limit, exit criteria. Generated roadmap, backlog, status report and release notes |
| git-setup | `/project-kit:git-setup` | git init, `.gitignore`, PR template, hooks that protect `main` and enforce Conventional Commits |
| global-setup | `/project-kit:global-setup` | One-time install of the Karpathy-style working principles into `~/.claude/CLAUDE.md` |

### What a kicked-off project looks like

```
CLAUDE.md                      # project facts + "how we work"
.claude/
  settings.json                # plan-mode drafts in .project/drafts, tracker hook, safety denies
  rules/                       # base.md + project.md (always) + stack/arch packs (path-scoped)
.project/
  config.yaml                  # every stack/architecture decision, read by all skills
  project-plan.md              # charter: objectives, milestones, cadence & capacity (tracker settings)
  raid.md                      # risks, assumptions, issues, decisions
  milestones/M-01-<slug>.md    # release: goal, target date, exit criteria
  epics/EP-001-<slug>.md       # outcome; its breakdown becomes FEAT items
  items/FEAT-001-<slug>.md     # backlog: FEAT / BUG / CHORE / SPIKE with priority, points, severity
  plans/P-001-<slug>.md        # one plan = one branch = one PR; delivers items
  sprints/S-01.md              # goal, committed plans, daily log, review, retro, velocity
  ROADMAP.md BACKLOG.md STATUS.md releases/   # generated
  drafts/                      # plan-mode output before it becomes a tracked plan
  bin/tracker.py + trackerlib/ # vendored copy, so the repo works without the plugin
  bin/check_structure.py       # layout guard run by the pre-commit hook
  bin/check_design.py          # design-token drift check (design pack)
  templates/
docs/
  research/idea-research.md    # optional: /project-kit:research report + evidence.jsonl
  design/DESIGN.md             # UI projects: tokens, layout shell, component inventory (+ palettes.html, directions.html)
  project-brief.md
  architecture.md
  adr/0001-….md
.githooks/{pre-commit,commit-msg}
.github/pull_request_template.md
.gitignore .gitattributes .editorconfig .env.example README.md
```

### Stack packs (v0.6.0)

| Scope | Packs |
|---|---|
| any (always) | `base`: design principles (DRY for knowledge, pragmatic SOLID, functional core, parse-don't-validate), typed code, config, errors, external integrations, logging, DoD |
| backend | `python`, `node`, `fastapi`, `arch-layered` / `arch-hexagonal`, `postgres`, `redis`, `temporal`, `testing-python` |
| cli | `cli-python` (Typer + Rich, `cli → core → adapters`, stdout/stderr and exit-code contract, `--json`, config precedence) |
| frontend | `react` (includes the frontend architecture: feature modules and a service layer), `design` (use DESIGN.md tokens, the shell and the inventory; states; visual QA) |
| any | `docker`, `testing-js` |

In a monorepo, backend and frontend packs only apply under `architecture.backend_dir` / `frontend_dir`. Project-specific rules go in `.claude/rules/project.md`, never in a copy of a pack.

### Guards (enforced on every commit by `.githooks/`)
- **main protection:** only `.project/` planning commits are allowed on `main`.
- **Secrets:** a built-in scanner (`.project/bin/check_secrets.py`) blocks staged cloud keys, tokens, private keys and `.env` files from day one; gitleaks adds a broader scan in pre-commit and CI after P-001. Mark a known fake with `pk:allow-secret`.
- **Conventional Commits:** the commit message must use a type and scope, e.g. `feat(P-012): …`.
- **Module size (no god modules):** new or modified source files over `module_max_lines` (default 300 non-blank lines) are reported by the same check and mode; ruff/ESLint add function length, complexity and parameter limits (base pack → *Modules & size*).
- **Structure:** new files are checked against the high-level layout declared in `.project/config.yaml → structure:`. `structure_check: warn` (the default) reports drift without blocking, so it can be refactored later; `block` enforces it; `check_structure.py --all --strict` is the CI form once the layout settles. Tests live under allowed entries and are never flagged.
- **Design tokens:** once `design` is on, staged UI files are checked for raw colours, arbitrary Tailwind values, palette classes, gradient text, emoji icons and undeclared fonts. `design_check: warn` (default) or `block`. A deliberate exception gets a `design-ok` comment.
- **Lint/format/types/boundaries** (added by P-001 from the tooling templates): `.githooks/pre-commit` runs `pre-commit run` once `.pre-commit-config.yaml` exists. Never run `pre-commit install`; it would replace the project-kit hooks.
- **Format on edit:** a Claude Code hook formats each file right after Claude edits it (ruff / prettier), once those tools are installed.

### Tooling reference configs
`plugins/project-kit/skills/guidelines/tooling/` holds ruff/pyright/pytest, import-linter contracts per architecture, ESLint (with boundaries) + strict tsconfig, pre-commit, Makefile, VS Code extensions, and GitHub workflows (CI, PR title, Dependabot). The guidelines step copies the relevant subset into `.project/templates/tooling/`, and P-001 applies them and runs every tool once. See that folder's README.

### Environments
`local` and `test` from day one; `staging`/`production` once a deployment target is chosen. The same image is promoted through every environment, which differ only by env vars and secrets. See the `docker` pack.

### Upgrading an existing project after a plugin update

```bash
python3 <plugin>/skills/guidelines/scripts/compose_rules.py --root . --dry-run   # shows OK / WRITE / SKIP / STALE per file
python3 <plugin>/skills/tracker/scripts/tracker.py init                          # re-copies tracker.py and templates into .project/
```
Or ask Claude to run `/project-kit:guidelines --refresh`.

### Developing the plugin

Before changing the bundled scripts, run the local test suite:

```bash
uvx --with pyyaml pytest tests
```
The plugin follows the rules it ships: every script stays under 300 lines (tested), and the tracker is a package (`tracker/scripts/trackerlib/`) whose modules import only from earlier layers (order in `trackerlib/__init__.py`, enforced by `test_trackerlib_layers_are_acyclic`). Add a new module where it fits that order rather than growing an existing one.
### Extending

- **New stack** (e.g. Vue, Go): add `plugins/project-kit/skills/guidelines/stacks/<name>.md` with frontmatter `pack / description / scope / requires / paths`, then add it to the presets and pack mapping in `skills/discover/references/questions.md`.
- **Changing team standards:** edit the pack, bump `version` in `plugins/project-kit/.claude-plugin/plugin.json`, then run `claude plugin marketplace update aanand-plugins`.

### Third-party data
`skills/design/assets/wada/colors.json` is the colour data (Vol. 1: 159 colours, 348 combinations) from Sanzo Wada's *A Dictionary of Color Combinations*, taken from [mattdesl/dictionary-of-colour-combinations](https://github.com/mattdesl/dictionary-of-colour-combinations) (MIT; licence in that folder). No book content beyond colour values and names is included.
