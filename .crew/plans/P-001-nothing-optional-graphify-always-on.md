---
id: P-001
title: Nothing optional: graphify always on
goal:
items: CHORE-006
touches: .crew/config.yaml, README.md, plugins/crew/.claude-plugin/plugin.json, plugins/crew/skills/{codemap, discover, git-setup, guidelines, kickoff, onboard}/**, packages/hub/src/commands/checks.ts, packages/hub/test/**, plugins/crew/skills/hub/dist/**, .crew/bin/crew.mjs, tests/crew/**
depends_on:
status: ready
branch: plan/P-001-nothing-optional-graphify-always-on
pr:
created: 2026-10-24
started:
completed:
assignee: developer
---

# P-001: Nothing optional: graphify always on

## Context
Nothing in crew is optional any more. Workstream T already made the hub unconditional. graphify is the last module behind a switch: `modules.graphify` in `.crew/config.yaml`, a `{{#graphify}}` block in the CLAUDE.md template, and the block renderer duplicated in `setup_git.py` and `compose_rules.py`. A few hub-off leftovers also remain:
- `git-setup/SKILL.md` still documents `--no-hub`.
- The README still has an "Optional modules" section.
- The `plugin.json` description says "optional modules".

This is CHORE-006, the first of four PRs that move crew to Node only (CHORE-007 to 009). Removing the switch first means the Node port in CHORE-008 never has to carry it.

graphify stays an external tool: PyPI `graphifyy`, installed with uv, the one deliberate Python dependency. "Mandatory" means every kickoff and onboard sets it up. It does not mean a commit or a hub command fails without it.

## Scope
**In:**
- Remove `modules:` from the discover config template and this repo's `.crew/config.yaml`.
- Remove `modules_from_config` and `render_blocks` from `setup_git.py` and `compose_rules.py`. Templates are copied as-is, and `graphify-out/` is always gitignored.
- Make the graphify line in `guidelines/templates/CLAUDE.project.md` unconditional, worded so it holds before the first build.
- kickoff and onboard always run codemap *enable*, with no module question. A declined install skips it.
- codemap drops *remove* and the module/config wording.
- Fix the docs: `git-setup`, `guidelines` and `discover` SKILL.md, the README "Optional modules" section, and the `plugin.json` description.
- `crew.mjs check` hints "code graph not set up — /crew:codemap" when the graphify hooks aren't installed.
- Update the matching pytest cases.

**Out (explicitly not doing):**
- Porting any script to Node (CHORE-008).
- Restructuring `packages/hub` (CHORE-007).
- Cleaning `modules:` out of existing user projects (CHORE-009). Until then the scripts simply ignore the key.
- Installing graphify in this repo.

## Acceptance criteria
- [ ] `git grep -nE '\{\{[#^/][a-z]+\}\}|modules\.graphify|--no-hub|[Oo]ptional modules'` returns nothing outside `.crew/knowledge/` and `.crew/plans/`.
- [ ] `setup_git.py` always adds the graphify `.gitignore` section, with or without a `modules:` key in config (pytest).
- [ ] No template under `plugins/crew/skills/` contains `{{`, and the CLAUDE.md template has the code-map line (pytest).
- [ ] `crew.mjs check` prints the code-graph hint when `.githooks/post-commit` doesn't run graphify, and not when it does (vitest).
- [ ] The pytest suites and `npm test` in `packages/hub` pass, and `npm run build` leaves `dist/` in sync.

## Approach
- **Scripts:** delete the renderer instead of keeping a no-op. `copy_if_changed` loses its `flags` parameter, and setup_git writes templates verbatim. The graphify stack is appended unconditionally after the packs.
- **CLAUDE.md template:** "Code map: `graphify-out/GRAPH_REPORT.md` (local, rebuilt on commit, once graphify is set up via `/crew:codemap`)…".
- **Hub hint:** in `hygiene()` (`commands/checks.ts`), read `.githooks/post-commit` through the workspace. If it doesn't mention `graphify`, push the hint. It is a hint, not an error, so CI isn't affected.
- **Rebuild:** `npm run build` regenerates `plugins/crew/skills/hub/dist/`. Refresh the vendored `.crew/bin/crew.mjs` from dist.

## Tasks
- [ ] T1: setup_git.py and compose_rules.py drop `modules:` and the renderer; graphify-out always ignored → verify: `uvx --with pyyaml pytest tests/crew/test_git_setup.py tests/crew/test_guidelines.py`
- [ ] T2: CLAUDE.project.md is unconditional; the template-block test becomes "no `{{` in any template" → verify: `uvx --with pyyaml pytest tests/crew/test_plugin_contents.py`
- [ ] T3: skills and docs (kickoff, onboard, codemap, discover, git-setup, guidelines, README, plugin.json) and the config template → verify: the git grep in AC1 is empty
- [ ] T4: hub `check` code-graph hint with a vitest case; rebuild dist and the vendored copy → verify: `cd packages/hub && npm test && npm run build && git diff --stat ../../plugins/crew/skills/hub/dist`
- [ ] T5: full suites → verify: `for s in tests/*/; do uvx --with pyyaml pytest "$s" -q; done && (cd packages/hub && npm test)`

## Test plan
- AC2: rewrite `test_graphify_module_ignores_graph_output` → `test_graph_output_always_ignored`, with config that has no `modules:`.
- AC3: replace `test_module_blocks_render_cleanly_and_both_renderers_agree` with a check that no template contains `{{` and that the CLAUDE.md template names the code map. `test_yaml_and_toml_templates_parse` parses the files directly, with no render.
- AC4: a vitest case in `packages/hub/test` that runs `check` on the sample project with and without a graphify post-commit hook.
- AC1 and AC5: the grep and the full suites.

## Rollout & rollback
- n/a for this repo; plugin users get it with the next release.
- Existing projects keep their `modules:` key harmlessly (ignored) until CHORE-009 cleans it.
- Rollback: revert the PR.

## Risks & open questions
- Projects that declined graphify see the `check` hint on every run. That is the intended nudge, but if it is noisy we can make it once-per-session later.
- The hint reads `.githooks/post-commit`, so it won't see projects that keep hooks elsewhere (Husky). Acceptable for a hint.

## Handoff

## Progress log

- 2026-10-24: status draft → ready
- 2026-10-24: assigned to the developer role

## Outcome
