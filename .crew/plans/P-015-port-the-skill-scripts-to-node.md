---
id: P-015
title: Port the skill scripts to Node
goal:
items: CHORE-008
touches: packages/crew/**, plugins/crew/skills/git-setup/**, plugins/crew/skills/guidelines/**, plugins/crew/skills/design/**, plugins/crew/skills/research/**, plugins/crew/skills/global-setup/**, plugins/crew/skills/kickoff/SKILL.md, plugins/crew/skills/onboard/SKILL.md, plugins/crew/skills/discover/**, plugins/crew/skills/hub/dist/**, .crew/bin/crew.mjs, tests/**, README.md
depends_on:
status: in-progress
branch: plan/P-015-port-the-skill-scripts-to-node
pr:
created: 2026-10-24
started: 2026-10-24
completed:
assignee: developer
---

# P-015: Port the skill scripts to Node

## Context
CHORE-008, first half. The 11 skill scripts (about 1,700 lines of stdlib Python) are the only Python crew runs, apart from graphify, which is external. Five of them are copied into every project's `.crew/bin/` and run from its git hooks and Claude hooks. So today both contributors and user projects need python3.

This plan ports the scripts and their 57 tests to TypeScript and vitest in `packages/crew`, and stops at what P-004 is changing. P-004 is in progress in another session and edits `tests/crew/test_hub.py`, `plugins/crew/skills/hub/**` and `.crew/templates/**`. A second plan, after P-004 merges, will port `test_hub.py`/`test_team.py` and the hub skill docs, and move the secret patterns into `src/shared/`.

"No loss of functionality" is shown in two steps. Each skill's tests are ported first and run against the `.py` (`CREW_TOOLS=py`). Then the same tests run against the `.mjs`.

## Scope
**In:**
- `packages/crew/src/tools/<skill>/` holds a TS port of each script, with the same CLI flags, output text and exit codes:
  - `git-setup/`: `setup_git`, `check_secrets`
  - `guidelines/`: `compose_rules`, `check_structure`, `format_on_edit`, `track_plan_draft`
  - `design/`: `check_design`, `wada`, `studio`
  - `research/`: `verify_evidence`
  - `global-setup/`: `install_global`
- `build.mjs` bundles each one to `plugins/crew/skills/<skill>/scripts/<same name>.mjs`, standalone, with a shebang and a "Do not edit" banner. `dist.test.ts` covers their freshness.
- **Tests:** `test/tools/<skill>.test.ts` replace `tests/crew/test_{git_setup,guidelines,design,research}.py`. `test/plugin/*.test.ts` replace `test_plugin_contents.py` and `tests/marketplace/`. A `test/helpers/repo.ts` mirrors conftest's `Repo`, and it strips `CREW_*` from the environment (BUG-004).
- **Callers switch from `python3 …py` to `node …mjs`:**
  - `githooks/pre-commit`, `guidelines/templates/settings.json`, `tooling/ci/ci.yml`, `tooling/common/Makefile`;
  - the git-setup, guidelines, design, research, global-setup, kickoff, onboard and discover skill docs and templates, and `stacks/design.md`;
  - `scripts/sample-project.mjs`, plus the comments and UI text in the hub that name the scripts;
  - the README.
- Delete the `.py` scripts and their pytest files. `conftest.py` keeps only what `test_hub.py`/`test_team.py` use.
- `smol-toml` as a dev dependency, for the TOML template check.

**Out (explicitly not doing):**
- `test_hub.py`, `test_team.py`, `plugins/crew/skills/hub/**` (its SKILL.md and writing-guide name `check_structure.py`/`check_design.py`), `.crew/templates/**` and `src/shared/secrets.ts`. These go in the follow-up plan after P-004.
- Cleaning `.py` files and `python3` hooks out of existing projects (CHORE-009). Projects set up before this keep their working `.py` copies until then.

## Acceptance criteria
- [ ] Each skill's vitest tests pass against the original `.py` (`CREW_TOOLS=py npx vitest run test/tools`). They are the same assertions as the pytest cases they replace, with 57 tests accounted for.
- [ ] The same tests pass against the ported `.mjs` (`npx vitest run test/tools test/plugin`).
- [ ] `git ls-files 'plugins/**/*.py'` is empty, and `tests/` holds only `crew/{conftest,test_hub,test_team}.py` and `crew/pytest.ini`.
- [ ] `studio.mjs catalog --check` passes against the committed `assets/catalog.json`, so the ported generator reproduces it byte for byte.
- [ ] A fresh project with python removed from `PATH` can run `setup_git.mjs`, `compose_rules.mjs` and `crew.mjs init`, and a commit then:
  - is blocked by a staged fake key;
  - warns on an off-token hex;
  - reports a disallowed top-level dir.

  Piping hook JSON into `format_on_edit.mjs` and `track_plan_draft.mjs` works.
- [ ] `npm run typecheck && npm test` pass in `packages/crew`, `dist/` is in sync, and `test_hub.py`/`test_team.py` still pass (run without `CREW_*` set).

## Approach
- **Code sharing:** tools import only Node built-ins, `yaml` and their own skill folder. `structure.test.ts` adds that rule, so each `.mjs` stays a small standalone file that projects vendor. `check_design` and `wada` share `design/color.ts`. `check_secrets` keeps its own copy of the patterns until the follow-up moves them into `src/shared/`, which is the same duplication the Python has today.
- **Config:** `.crew/config.yaml` is read with the hand parsing each script already does. Swapping in a real YAML parser could change what is accepted, so it isn't part of a port.
- **Python behaviours the TS ports must match:**
  - round-half-to-even (the hub's `pyRound` pattern);
  - `json.dumps` formatting for `catalog.json`, `studio.json` and `evidence.jsonl`: `indent`, `ensure_ascii=False`, and the separators;
  - `difflib.unified_diff` output for `install_global --check`;
  - `fnmatch` semantics.
- **`verify_evidence`:** it takes an injectable `fetch`, so its tests stub the network as the pytest `monkeypatch` did.
- **Order:** for each skill, port its tests and get them green on `.py`, then write the TS, get them green on `.mjs`, then switch its callers and delete its `.py`. One commit per skill.

## Tasks
- [ ] T1: `test/helpers/repo.ts` and the `CREW_TOOLS` switch; port `test_plugin_contents` and `test_marketplace` to `test/plugin/` → verify: `cd packages/crew && npx vitest run test/plugin`
- [ ] T2: git-setup (`setup_git`, `check_secrets`): tests green on py, port, green on mjs, callers, delete → verify: `CREW_TOOLS=py npx vitest run test/tools/git-setup && npx vitest run test/tools/git-setup`
- [ ] T3: guidelines (four scripts) → verify: the same pair of commands for `test/tools/guidelines`
- [ ] T4: design (`check_design`, `wada`, `studio`, `color.ts`) → verify: the same pair for `test/tools/design`, and `node plugins/crew/skills/design/scripts/studio.mjs catalog --check`
- [ ] T5: research and global-setup → verify: the same pair for `test/tools/research` and `test/tools/global-setup`
- [ ] T6: `build.mjs` entries, `dist.test.ts` and the structure rule for tools; sample project and hub text → verify: `npm run typecheck && npm test && npm run build && git status --porcelain` is empty
- [ ] T7: the python-free end-to-end run and the hub's Python suites → verify: AC5's script in a temp project with a PATH that has no python; then `cd tests/crew && env -u CREW_ROLE -u CREW_RUN uvx --with pyyaml pytest -q`

## Test plan
- **AC1 and AC2:** the same vitest files run twice, with `CREW_TOOLS=py` and without. Each pytest function maps to an `it()` of the same name, so the 57 tests can be checked one for one.
- **AC4:** `studio.mjs catalog --check`, plus a vitest case that does the same.
- **AC5:** a shell script in the Test plan run, recorded as a checkpoint.
- **AC6:** the vitest suite, `dist.test.ts`, and `test_hub.py`/`test_team.py` without `CREW_*`.

## Rollout & rollback
- New projects vendor `.mjs` files and get `node` hooks.
- Existing projects keep their vendored `.py` copies and `python3` hooks, which still work, until CHORE-009.
- Rollback: revert the PR. The old `.py` files come back.

## Risks & open questions
- **Output parity in the details:** float formatting, JSON key order and spacing, and unified-diff headers. Running the tests against both implementations catches what the tests cover; the catalog byte check covers the largest generated file.
- **Hub docs out of step:** `plugins/crew/skills/hub/SKILL.md` keeps saying `python3 .crew/bin/check_structure.py` until the follow-up plan. A new project will have `check_structure.mjs`, so that one line is wrong for the short gap until P-004 lands. It's called out in the PR.
- **Bundle merge noise:** P-004 also rebuilds `dist/` and `.crew/bin/crew.mjs`. Whichever merges second rebuilds them.

## Handoff

## Progress log

- 2026-10-24: status draft → ready
- 2026-10-24: assigned to the developer role
- 2026-10-24: status ready → in-progress — branch plan/P-015-port-the-skill-scripts-to-node

## Outcome
