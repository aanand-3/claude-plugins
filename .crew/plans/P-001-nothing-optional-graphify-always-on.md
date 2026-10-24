---
id: P-001
title: Nothing optional: graphify always on
goal:
items: CHORE-006
touches: .crew/config.yaml, README.md, plugins/crew/.claude-plugin/plugin.json, plugins/crew/skills/codemap/**, plugins/crew/skills/discover/**, plugins/crew/skills/git-setup/**, plugins/crew/skills/guidelines/**, plugins/crew/skills/kickoff/**, plugins/crew/skills/onboard/**, packages/hub/src/commands/checks.ts, packages/hub/src/commands/runs.ts, plugins/crew/skills/team/SKILL.md, packages/hub/test/**, packages/hub/scripts/sample-project.mjs, plugins/crew/skills/hub/dist/**, .crew/bin/crew.mjs, tests/crew/**
depends_on:
status: in-review
branch: plan/P-001-nothing-optional-graphify-always-on
pr: https://github.com/aanand-3/claude-plugins/pull/5
created: 2026-10-24
started: 2026-10-24
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
- [x] T1: setup_git.py and compose_rules.py drop `modules:` and the renderer; graphify-out always ignored → verify: `uvx --with pyyaml pytest tests/crew/test_git_setup.py tests/crew/test_guidelines.py`
- [x] T2: CLAUDE.project.md is unconditional; the template-block test becomes "no `{{` in any template" → verify: `uvx --with pyyaml pytest tests/crew/test_plugin_contents.py`
- [x] T3: skills and docs (kickoff, onboard, codemap, discover, git-setup, guidelines, README, plugin.json) and the config template → verify: the git grep in AC1 is empty
- [x] T4: hub `check` code-graph hint with a vitest case; rebuild dist and the vendored copy → verify: `cd packages/hub && npm test && npm run build && git diff --stat ../../plugins/crew/skills/hub/dist`
- [x] T5: full suites → verify: `for s in tests/*/; do uvx --with pyyaml pytest "$s" -q; done && (cd packages/hub && npm test)`

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

_Generated 2026-10-24 by `crew.mjs handoff` from the ledger._

- P-001: Nothing optional: graphify always on [in-review] tasks 5/5 — claimed by Arpit Anand (main-node-only)
- last checkpoint 2026-10-24 06:44 at done (03eb01a) by Arpit Anand; since then 1 commit(s), 1 uncommitted file(s): packages/hub/node_modules
- ✓ for s in tests/*/; do uvx --with pyyaml pytest $s -q; done (166 + 3 passed) (AC 2,3,5) (reported)
- ✓ cd packages/hub && npm run typecheck && npm test (48 passed, incl. test/codegraph.test.ts) (AC 4,5) (reported)
- ✓ git grep -nE '\{\{[#^/][a-z]+\}\}|modules\.graphify|--no-hub|[Oo]ptional modules' -- ':!.crew/knowledge' ':!.crew/plans' ':!.crew/items' && exit 1 || exit 0 (AC 1)
- ✗ cd tests/crew && uvx --with pyyaml pytest -q (AC 5) — 12 failed, 154 passed in 309.90s (0:05:09)
- ✗ (env | grep '^CREW' | sed 's/=.*/=<set>/'; cd tests/crew && uvx --with pyyaml pytest -q -rf) > /private/tmp/claude-502/-Users-aanand-Documents-Projects-Personal-claude-plugins/43bb9741-f43c-4234-b9c5-0ba9cb898763/scratchpad/crew-pytest.txt 2>&1; s=$?; tail -25 /private/tmp/claude-502/-Users-aanand-Documents-Projects-Personal-claude-plugins/43bb9741-f43c-4234-b9c5-0ba9cb898763/scratchpad/crew-pytest.txt; exit $s (AC 2,3,5) — 12 failed, 154 passed in 276.32s (0:04:36)
- ✓ cd tests/crew && uvx --with pyyaml pytest -q -k test_graph_output_always_ignored (AC 2)
- ✓ cd tests/crew && uvx --with pyyaml pytest -q -k 'test_templates_have_no_module_blocks or test_yaml_and_toml_templates_parse' (AC 3)
- ✓ cd tests/marketplace && uvx --with pyyaml pytest -q (AC 5)
- ✓ cd packages/hub && npm test (AC 4,5)
- ✓ cd packages/hub && npm run typecheck (AC 5)
- ✓ cd packages/hub && npm run build && test -z "$(git status --porcelain)" (AC 5)
- ✓ cd packages/hub && npx tsc --noEmit && npx vitest run (48 passed) (AC 4) (reported)
- evidence: AC1 ✓, AC2 ✓, AC3 ✓, AC4 ✓ (self), AC5 ✓

Latest log:
- 2026-10-24: review: changes requested — Two module-switch leftovers remain in skills: (1) plugins/crew/skills/guidelines/SKILL.md:43 still says 'resolve the module blocks; keep *How we work* verbatim (the variant for the chosen modules)' - the template has no blocks or variants now; reword to copy How we work verbatim. (2) plugins/crew/skills/team/SKILL.md:18 says 'or kickoff/onboard with the hub module' - the hub is not a module; reword to 'or kickoff/onboard'. Add plugins/crew/skills/team/** to touches (log it) for (2). Optional, same pass: packages/hub/src/commands/runs.ts:3 comment 'Replaces the kickoff.yaml / onboard.yaml progress files where the hub exists' is now stale (needs packages/hub/src/commands/runs.ts in touches and a dist rebuild, so skip if you prefer). Everything else is approved as is: scripts, template, check hint, tests, dist in sync.
- 2026-10-24: status in-review → in-progress — changes requested: Two module-switch leftovers remain in skills: (1) plugins/crew/skills/guidelines/SKILL.md:43 still says 'resolve the module blocks; keep *How we work* verbatim (the variant for the chosen modules)' - the template has no blocks or variants now; reword to copy How we work verbatim. (2) plugins/crew/skills/team/SKILL.md:18 says 'or kickoff/onboard with the hub module' - the hub is not a module; reword to 'or kickoff/onboard'. Add plugins/crew/skills/team/** to touches (log it) for (2). Optional, same pass: packages/hub/src/commands/runs.ts:3 comment 'Replaces the kickoff.yaml / onboard.yaml progress files where the hub exists' is now stale (needs packages/hub/src/commands/runs.ts in touches and a dist rebuild, so skip if you prefer). Everything else is approved as is: scripts, template, check hint, tests, dist in sync.
- 2026-10-24: review fixes: guidelines SKILL drops 'module blocks'/'variant'; team SKILL drops 'hub module'; runs.ts header no longer mentions kickoff.yaml (touches widened for team/SKILL.md and runs.ts)

## Progress log

- 2026-10-24: status draft → ready
- 2026-10-24: assigned to the developer role
- 2026-10-24: status ready → in-progress — branch plan/P-001-nothing-optional-graphify-always-on
- 2026-10-24: touches: brace globs aren't supported, listed each skill dir; added scripts/sample-project.mjs (the sample now has graphify's hook, as every crew project does)
- 2026-10-24: status in-progress → in-review
- 2026-10-24: BUG-004: tests/crew hub/team tests inherit CREW_ROLE/CREW_RUN, so the full suite fails 12/166 under checkpoint --run (passes 166 from a plain shell; pre-existing, not a P-001 regression)
- 2026-10-24: review: changes requested — Two module-switch leftovers remain in skills: (1) plugins/crew/skills/guidelines/SKILL.md:43 still says 'resolve the module blocks; keep *How we work* verbatim (the variant for the chosen modules)' - the template has no blocks or variants now; reword to copy How we work verbatim. (2) plugins/crew/skills/team/SKILL.md:18 says 'or kickoff/onboard with the hub module' - the hub is not a module; reword to 'or kickoff/onboard'. Add plugins/crew/skills/team/** to touches (log it) for (2). Optional, same pass: packages/hub/src/commands/runs.ts:3 comment 'Replaces the kickoff.yaml / onboard.yaml progress files where the hub exists' is now stale (needs packages/hub/src/commands/runs.ts in touches and a dist rebuild, so skip if you prefer). Everything else is approved as is: scripts, template, check hint, tests, dist in sync.
- 2026-10-24: status in-review → in-progress — changes requested: Two module-switch leftovers remain in skills: (1) plugins/crew/skills/guidelines/SKILL.md:43 still says 'resolve the module blocks; keep *How we work* verbatim (the variant for the chosen modules)' - the template has no blocks or variants now; reword to copy How we work verbatim. (2) plugins/crew/skills/team/SKILL.md:18 says 'or kickoff/onboard with the hub module' - the hub is not a module; reword to 'or kickoff/onboard'. Add plugins/crew/skills/team/** to touches (log it) for (2). Optional, same pass: packages/hub/src/commands/runs.ts:3 comment 'Replaces the kickoff.yaml / onboard.yaml progress files where the hub exists' is now stale (needs packages/hub/src/commands/runs.ts in touches and a dist rebuild, so skip if you prefer). Everything else is approved as is: scripts, template, check hint, tests, dist in sync.
- 2026-10-24: review fixes: guidelines SKILL drops 'module blocks'/'variant'; team SKILL drops 'hub module'; runs.ts header no longer mentions kickoff.yaml (touches widened for team/SKILL.md and runs.ts)
- 2026-10-24: status in-progress → in-review

## Outcome
- **What shipped:** graphify is always on.
  - `modules:` is gone from the config template and this repo's config.
  - `setup_git.py` and `compose_rules.py` lost `modules_from_config` and `render_blocks`. Templates are copied as-is, and `graphify-out/` is always ignored.
  - The CLAUDE.md code-map line is unconditional.
  - kickoff, onboard and codemap set up the graph every time. A declined install is not a failure.
  - `crew.mjs check` hints until graphify's hook is in `.githooks/post-commit`.
- **Beyond plan:**
  - kickoff's and onboard's `kickoff.yaml`/`onboard.yaml` progress files were a hub-optional leftover. Both now track progress only in the ledger.
  - The sample project now carries graphify's hook, as every crew project does.
- **Deviations:** the hub-optional template blocks were already gone on `main` (Workstream T), so the work was graphify plus a few stale hub-off mentions (`git-setup` `--no-hub`, the README, `plugin.json`, the kickoff/onboard descriptions).
- **Follow-ups:**
  - CHORE-007, CHORE-008, CHORE-009.
  - This repo itself has no graphify hook, so its own `check` shows the new hint until `/crew:codemap` runs here.
- **Verified:**
  - pytest: 166 + 3 passed.
  - vitest: 48 passed, including `test/codegraph.test.ts`.
  - `npm run build` is in sync with `dist/` and `.crew/bin/crew.mjs`.
  - The AC1 grep is empty.

Learnings: none
