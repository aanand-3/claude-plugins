---
id: P-012
title: Node only: one TypeScript package for the crew plugin
goal: 
items: CHORE-011
touches:
depends_on:
status: dropped
branch:
pr: 
created: 2026-10-23
started:
completed: 
---

# P-012: Node only: one TypeScript package for the crew plugin

## Context
The hub moved to Node (TypeScript) because of the UI, but the rest of the crew plugin is still Python:
- 11 skill scripts (~1,570 lines, stdlib only).
- The pytest suite (143 tests, ~2,360 lines).
- A few `python3` invocations.

Contributors need both runtimes, and so do user projects: the vendored `.crew/bin/*.py` run from the pre-commit hook, `settings.json` hooks, CI and the Makefile.

The repo also still models an "optional hub" (`modules.hub: false`) in 17 files, although the hub always ships. graphify is optional too.

**Outcome:**
- No `.py` file in the repo and no `python3` in anything crew runs.
- Nothing optional.
- One TS package, laid out by domain.
- No loss of functionality: every script is ported one-to-one (same flags, output text, exit codes), proven by its tests passing against both versions.

**Deliberate exceptions:**
- **graphify** (mandatory, external). It has no Node distribution: it is PyPI `graphifyy`, needs Python 3.10+ via uv, and the npm "graphify" packages are Pi-agent wrappers. User machines install it with `uv tool install graphifyy`. Its hooks (which pin a Python path) live in user projects, not in our repo.
- **Content shipped *for* Python user projects stays:**
  - `guidelines/stacks/{python,cli-python,testing-python,fastapi}.md`
  - `guidelines/tooling/python/*`
  - the Python jobs in `ci.yml`
  - `python.gitignore`
  - discover questions
  - `format_on_edit` calling ruff on `.py` files

  The hub's `pyRound`-style parity helpers (`core/text.ts`) define its output format and stay too.

**Delivery:** four crew plans, one PR each, in order. Each lands green on its own. The first starts after `feat/team-agents` merges, because PR 2 moves every hub file.

## Scope
**In:**
- Shipped: PR 1, nothing optional (P-001, #5); PR 2, the `packages/crew` restructure (P-014, #6, CHORE-007); PR 3, the skill scripts ported to Node (P-015, #7, CHORE-008); PR 4, the upgrade path off the vendored Python (P-016, #8, CHORE-009).
- Left: CHORE-011 — port the hub's pytest suites (`tests/crew`) to vitest and remove the last Python.

**Out (explicitly not doing):**
- graphify (external, Python-only) and the content shipped *for* Python user projects (see the deliberate exceptions above).

## Acceptance criteria
- [ ] `git ls-files '*.py'` is empty.
- [ ] `git grep -nE 'python3|\.py\b'` lists only the deliberate exceptions.
- [ ] `cd packages/crew && npm run typecheck && npm test && npm run build && git diff --exit-code ../../plugins/crew` passes.
- [ ] In a temp project with no Python on `PATH`, git-setup, guidelines, `crew.mjs init` and the hooks all work, and `crew.mjs check` reports nothing.

## What gets ported

| Skill | Script | Job | Runs from |
|---|---|---|---|
| git-setup | `setup_git.py` | git init, compose `.gitignore`, render `.githooks/*`, set hooksPath, vendor `check_secrets` | skill |
| git-setup | `check_secrets.py` | block staged keys or `.env`, warn on `password=` | pre-commit (vendored) |
| guidelines | `compose_rules.py` | `packs:` → `.claude/rules/*.md`, vendor helpers and tooling into `.crew/` | skill |
| guidelines | `check_structure.py` | `structure:` allow-list, module size, architecture-doc layout | pre-commit, CI, Makefile, hub finish (vendored) |
| guidelines | `format_on_edit.py` | PostToolUse hook: ruff or prettier on the edited file | settings.json (vendored) |
| guidelines | `track_plan_draft.py` | ExitPlanMode / SessionStart hook: nudge drafts → `crew.mjs new-plan` | settings.json (vendored) |
| design | `check_design.py` | lint DESIGN.md tokens and contrast, flag off-token UI values, Tailwind export | pre-commit (vendored), skill |
| design | `wada.py` | Wada palette suggest/show/roles (Lab/LCH maths) | skill |
| design | `gallery.py` | render `palettes.html` | skill |
| research | `verify_evidence.py` | fetch cited URLs, match quotes, GitHub stats | skill |
| global-setup | `install_global.py` | marker block in `~/.claude/CLAUDE.md`, with diff and backup | skill |

## PR 1: nothing optional (still Python)
This is the smallest PR, and it is independent of the rest. Doing it first means the port never carries switches.

- **Hub always on.**
  - Make every `{{#hub}}` block unconditional and delete the `{{^hub}}` variants in:
    - `githooks/{pre-commit,commit-msg}` and `pull_request_template.md`
    - `guidelines/templates/{CLAUDE,README}.project.md`
    - `tooling/ci/{ci.yml,pr-title.yml}`
  - Drop `--no-hub` from `setup_git.py` and the `flags["hub"]` checks from `compose_rules.py:70-71,146`.
  - Remove the hub-off instructions:
    - `git-setup/SKILL.md:10,21,36`
    - `guidelines/SKILL.md:47` ("Hub off: …")
    - `hub/SKILL.md:26`
    - `discover/SKILL.md:24` (`branch_pattern` is always `plan/P-###-<slug>`)
    - the kickoff and onboard module questions
    - the README "Optional modules" table
    - the `plugin.json` description
- **graphify always on.**
  - Make `{{#graphify}}` unconditional in `CLAUDE.project.md`, with wording that works before the first build: "query the graph when `graphify-out/` exists".
  - git-setup always ignores `graphify-out/`.
  - Kickoff and onboard always run codemap *enable*.
  - codemap drops *remove* and the "module" wording.
  - **A declined install is not a failure.** The skill records nothing, crew works without the graph, and `crew.mjs check` prints a `next:` line ("code graph not set up → /crew:codemap") until it's set up. Kickoff skips the first build until there's code, because the build is the only step that uses an LLM.
- **The `modules:` block goes.** It is removed from `discover/templates/config.yaml` and this repo's `.crew/config.yaml`. With no flags left, `render_blocks` in both scripts becomes a plain copy, and the "both renderers agree" test is deleted.
- Update the matching pytest cases.
- **Check:**
  - `git grep -nE '\{\{[#^/][a-z]+\}\}|modules[.:]|--no-hub|[Hh]ub off'` is empty;
  - pytest and vitest are green.

## PR 2: restructure, no behaviour change
- Rename `packages/hub` → `packages/crew`; it builds the whole plugin from now on.
- Lay out `src/` as below. Core and command groups use the same names, so a domain is one name in both layers:

```
src/
  shared/      git.ts text.ts secrets.ts (SECRET_PATTERNS, out of core/knowledge.ts) config.ts (added in PR 3)
  hub/
    main.ts cli.ts mcp.ts server.ts graph-types.ts
    core/      store.ts workspace.ts            # the hub's entry points stay at the root of core
      work/    model doc queries gates
      ledger/  ledger footprint
      policy/  policy knowledge
    commands/  migrate.ts checks.ts context.ts  # cross-cutting ones stay at the root
      work/    planning backlog workflow execution questions
      policy/  policy guard roles agents knowledge
      ledger/  ledger reports advisor
      view/    graph export
  tools/       (added in PR 3) git-setup/ guidelines/ design/ research/ global-setup/
```

- Before moving, check the grouping against the import graph. `checks`, `context` and `graph` import across several groups, which is why the first two stay at the root of `commands/`.
- `test/structure.test.ts` becomes recursive and enforces:
  - `shared/` imports nothing in `src/`;
  - `hub/core` never imports `hub/commands`, the CLI or the server;
  - `tools/*` import only `shared/` and their own folder;
  - ≤ 300 lines per module;
  - the UI contract is `hub/graph-types` and `hub/core/work/model`.
- Update `build.mjs` paths and banner text, `scripts/preview.sh`, `.claude/launch.json`, README paths, and the knowledge note that names the 300-line test.
- **Check:**
  - `npm run typecheck && npm test`;
  - `npm run build` leaves `dist/` unchanged apart from the banner path;
  - pytest is green.

## PR 3: tests first, then port (one commit per skill)
The test suite is the oracle for "no loss of functionality". So the black-box tests move to vitest *before* any implementation changes, and they are run against the Python scripts first.

1. **Harness.** `test/helpers/repo.ts` mirrors `tests/crew/conftest.py`:
   - built on `spawnSync`, never throws;
   - fixed `GIT_ENV`;
   - mutable `env`;
   - `mkdtemp` + `git init -b main`;
   - a `script(name)` that resolves to the `.py` or the `.mjs`, chosen by an env var during the transition.
   - Set `testTimeout` to about 30s.
2. **Hub and plugin tests.**
   - Port `test_hub.py` (90 tests) to `test/hub/e2e/*.test.ts`, one file per section (each under 300 lines), with shared draft fixtures.
   - Concurrency tests: `Promise.all` of 20 `spawn`s. Stale lock: `utimesSync`.
   - Port `test_marketplace.py` and the manifest parts of `test_plugin_contents.py` to `test/plugin/`. TOML needs `smol-toml` as a dev dependency.
   - Delete the pytest originals once the counts match.
3. **Per skill:** git-setup → guidelines → design → research → global-setup.
   1. Port the skill's CLI-level tests to `test/tools/<skill>/` and make them pass against the **`.py`**.
   2. Write `src/tools/<skill>/*.ts`. Config is read with `shared/config.ts` (the bundled `yaml`); `color.ts` is shared by `check_design` and `wada`; `verify_evidence` takes an injectable `fetch`.
   3. Make the same tests pass against the **`.mjs`**. Port the `load_script` unit tests (contrast, Lab, wada) as direct TS imports.
   4. Add the build entries.
      - Output: `plugins/crew/skills/<skill>/scripts/<same basename>.mjs`, with a "Do not edit" banner, a shebang and chmod 755, minified. Expect about 100 KB for the tools that bundle `yaml`, which is fine for hooks.
      - The freshness test covers every output.
   5. Switch every caller from `python3 …py` to `node …mjs`:
      - SKILL.md files;
      - `githooks/pre-commit`, `guidelines/templates/settings.json`, `tooling/ci/ci.yml:34`, `tooling/common/Makefile:33`;
      - `stacks/design.md`, the design templates, `hub/SKILL.md:127`, `hub/references/writing-guide.md`, `discover/templates/*`, README.
   6. Delete the `.py` and its pytest file.
   - Use only Node 20 APIs: no `fs.globSync`, which is 22+.
- **Check after each skill:**
  - `npm test`;
  - the remaining pytest is green;
  - `git grep -n '<script>.py'` is empty.

## PR 4: upgrade path and the last Python
**Existing projects.** Never delete a vendored `.py` while something still calls it.
- **Deleting the old files:** `compose_rules.mjs` and `setup_git.mjs` vendor the `.mjs`. They delete `.crew/bin/<name>.py` only after no file in `.githooks/`, `.claude/settings.json`, CI or the Makefile still references it.
- **What `setup_git` rewrites itself:** today it never overwrites existing hooks. It now rewrites a hook in place only when the sole difference from a fresh render is `python3 .crew/bin/X.py` → `node .crew/bin/X.mjs`. Any other difference is shown as a diff and needs a yes.
- **`settings.json`:** it is merged by the guidelines skill, not a script, so `guidelines --refresh` gains a step that rewrites those hook commands.
- **What `crew.mjs check` reports:** it lists every remaining `python3 .crew/bin/` reference, and any leftover `modules:` block, with `next:` lines. This follows the `migrate.ts` OLD_REFS precedent.
- **Test:** a fixture project with the old `.py` files, `python3` hooks, customised hooks and `modules: {hub: false}` ends up clean. No commit or edit hook fails at any step.

**The last Python.**
- Delete `tests/`, both `pytest.ini` files and the pytest lines in `.gitignore`.
- README testing becomes `npm test`.
- The requirement becomes "Node ≥ 20; uv and graphify for the code graph" (`kickoff/SKILL.md:25`, `onboard/SKILL.md:31`).
- Previews:
  - `.claude/launch.json` serves the preview with the existing `vite` dev dependency.
  - `design/SKILL.md:32` drops `python3 -m http.server`; `palettes.html` is self-contained, so open it directly.
- Optional: add a minimal GitHub Actions job running `npm ci && npm test && npm run build && git diff --exit-code`. The repo has no CI today.

## Verification (end to end, after PR 4)
- `cd packages/crew && npm run typecheck && npm test && npm run build && git diff --exit-code ../../plugins/crew`.
- `git ls-files '*.py'` is empty.
- `git grep -nE 'python3|\.py\b'` lists only the deliberate exceptions above.
- `git grep -nE '\{\{[#^/][a-z]+\}\}|modules[.:]|--no-hub'` is empty.
- In a temp project with `PATH` stripped of python:
  1. Run `setup_git.mjs`, `compose_rules.mjs --root .` (design pack) and `crew.mjs init`.
  2. A commit with a fake key is blocked.
  3. An off-token hex in a `.tsx` warns.
  4. A disallowed top-level dir is reported.
  5. Piped hook JSON works for `format_on_edit.mjs` and `track_plan_draft.mjs`.
- The old-project fixture ends clean and `crew.mjs check` reports nothing.

## Progress log
- 2026-10-24: imported from plan mode (`~/.claude/plans/what-would-it-take-rippling-quilt.md`); it predates the hub tracking plans, status draft from git history
- 2026-10-24: status draft → dropped — superseded: the plan-mode plan for the Node-only move, delivered as P-001 (#5), P-014 (#6), P-015 (#7), P-016 (#8) and the hub-test port planned next

## Outcome
Mostly delivered by P-001, P-014, P-015 and P-016 (PRs #5–#8). What remains is CHORE-011 (the hub's pytest suites to vitest, then the last Python); spec that as its own plan, then close this one.

Learnings: none
