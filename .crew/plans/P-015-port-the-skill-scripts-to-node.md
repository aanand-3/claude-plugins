---
id: P-015
title: Port the skill scripts to Node
goal:
items: CHORE-008
touches: packages/crew/**, plugins/crew/skills/git-setup/**, plugins/crew/skills/guidelines/**, plugins/crew/skills/design/**, plugins/crew/skills/research/**, plugins/crew/skills/global-setup/**, plugins/crew/skills/kickoff/SKILL.md, plugins/crew/skills/onboard/SKILL.md, plugins/crew/skills/discover/**, plugins/crew/skills/hub/dist/**, .crew/bin/crew.mjs, tests/**, README.md
depends_on:
status: in-review
branch: plan/P-015-port-the-skill-scripts-to-node
pr: https://github.com/aanand-3/claude-plugins/pull/7
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
- [x] T1: `test/helpers/repo.ts` and the `CREW_TOOLS` switch; port `test_plugin_contents` and `test_marketplace` to `test/plugin/` → verify: `cd packages/crew && npx vitest run test/plugin`
- [x] T2: git-setup (`setup_git`, `check_secrets`): tests green on py, port, green on mjs, callers, delete → verify: `CREW_TOOLS=py npx vitest run test/tools/git-setup && npx vitest run test/tools/git-setup`
- [x] T3: guidelines (four scripts) → verify: the same pair of commands for `test/tools/guidelines`
- [x] T4: design (`check_design`, `wada`, `studio`, `color.ts`) → verify: the same pair for `test/tools/design`, and `node plugins/crew/skills/design/scripts/studio.mjs catalog --check`
- [x] T5: research and global-setup → verify: the same pair for `test/tools/research` and `test/tools/global-setup`
- [x] T6: `build.mjs` entries, `dist.test.ts` and the structure rule for tools; sample project and hub text → verify: `npm run typecheck && npm test && npm run build && git status --porcelain` is empty
- [x] T7: the python-free end-to-end run and the hub's Python suites → verify: AC5's script in a temp project with a PATH that has no python; then `cd tests/crew && env -u CREW_ROLE -u CREW_RUN uvx --with pyyaml pytest -q`

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

_Generated 2026-10-24 by `crew.mjs handoff` from the ledger._

- P-015: Port the skill scripts to Node [in-review] tasks 7/7 — claimed by Arpit Anand (main-node-only)
- last checkpoint 2026-10-24 08:45 at done (4a50099) by Arpit Anand; since then 1 commit(s), 0 uncommitted file(s)
- ✓ git-setup: CREW_TOOLS=py vitest test/tools/git-setup (7 passed on .py), then 7 passed on .mjs (AC 1,2) (reported)
- ✓ CREW_TOOLS=py vitest test/tools/{guidelines,design-cli,global-setup} — 26 passed on the .py (14 + 9 + 3) (AC 1) (reported)
- ✓ guidelines: vitest test/tools/guidelines — 14 passed on the .py, then 14 on the .mjs; track_plan_draft output byte-identical to the .py (AC 1,2) (reported)
- ✓ design: 9 CLI tests green on the .py then the .mjs; 11 function tests on the TS port; 14 wada/studio commands and check_design --all/--staged/--export output identical to the .py; catalog equal value for value (only Python's 0.0 vs 0 differs), regenerated (AC 1,2,4) (reported)
- ✓ research + global-setup: 4 function tests on the TS port, 3 install_global CLI tests; --check diff, verify_evidence --no-fetch/--report output identical to the .py (AC 1,2) (reported)
- ✓ npm run typecheck && npm test in packages/crew: 17 files, 110 tests (incl. dist freshness for every skill script and the tools-never-import-the-hub rule); npm run build leaves the tree clean (AC 2,6) (reported)
- ✓ python-free run (python/pip shims that log and fail first on PATH): crew init, setup_git, compose_rules, scaffold commit; fake key blocked; off-token hex warns; scripts/ reported; both Claude hooks answer; 0 python calls (AC 5) (reported)
- ✓ cd tests/crew && env -u CREW_ROLE -u CREW_RUN uvx --with pyyaml pytest -q — 112 passed (test_hub + test_team) (AC 6) (reported)
- ✓ test -z "$(git ls-files 'plugins/**/*.py')" && test "$(git ls-files tests | sort | tr '\n' ' ')" = "tests/crew/conftest.py tests/crew/pytest.ini tests/crew/test_hub.py tests/crew/test_team.py " (AC 3)
- ✓ node plugins/crew/skills/design/scripts/studio.mjs catalog --check (AC 4)
- ✓ cd packages/crew && npm run typecheck && npm test (AC 2,6)
- ✓ cd packages/crew && npm run build && test -z "$(git status --porcelain)" (AC 6)
- ✓ out=$(bash /private/tmp/claude-502/-Users-aanand-Documents-Projects-Personal-claude-plugins/43bb9741-f43c-4234-b9c5-0ba9cb898763/scratchpad/e2e-nopython.sh "$PWD" 2>&1); echo "$out"; echo "$out" | grep -Eq '^== python calls: *0$' && echo "$out" | grep -q 'AWS access key' && echo "$out" | grep -q 'crew structure check' && echo "$out" | grep -q 'crew design check' (AC 5)
- ✓ cd /private/tmp/claude-502/-Users-aanand-Documents-Projects-Personal-claude-plugins/43bb9741-f43c-4234-b9c5-0ba9cb898763/scratchpad/qa-py/packages/crew && git rev-parse --short HEAD && CREW_TOOLS=py npx vitest run test/tools/git-setup.test.ts test/tools/guidelines.test.ts test/tools/design-cli.test.ts test/tools/global-setup.test.ts (AC 1)
- ✓ Mapped the 57 pytest functions at d8bafad (tests/crew/test_{design,git_setup,guidelines,plugin_contents,research}.py, tests/marketplace/test_marketplace.py) to the 59 it() cases in test/tools + test/plugin: 56 reworded one for one, test_plugin_scripts_stay_small -> 'the plugin ships no Python scripts', plus 2 new (wada roles YAML, install_global --check diff). 33 command-level cases ran green on the .py at d8bafad (CREW_TOOLS=py); the function-level cases (design.test.ts, research.test.ts) import TS and cannot target .py, as the Outcome states. it() names are reworded, not identical to the pytest names. (AC 1) (reported)
- ✓ Exploratory: temp git repo with .crew/config.yaml (packs: [base]); compose_rules.mjs --root . --packs base,react,design exits 0 and vendors .crew/bin/{check_structure,format_on_edit,track_plan_draft,check_design}.mjs; check_structure.mjs --bogus and check_design.mjs --bogus print an argparse-style usage + error line and exit 2 (no stack trace); format_on_edit/track_plan_draft ignore unknown flags and exit 0, same as the .py at d8bafad (no argparse there). (AC 2) (reported)
- ✓ cd tests/crew && env -u CREW_ROLE -u CREW_RUN uvx --with pyyaml pytest -q (AC 6)
- ✓ npm run typecheck && npx vitest run — 17 files, 115 tests; build clean; no /Users paths in bundles (AC 2,6) (reported)
- evidence: AC1 ✓, AC2 ✓ (self), AC3 ✓, AC4 ✓, AC5 ✓, AC6 ✓ (self)

Latest log:
- 2026-10-24: review: changes requested — 1) packages/crew/src/tools/research/verify_evidence.ts:40-50 fetchPage ignores HTTP_PROXY/HTTPS_PROXY/NO_PROXY, which urllib honoured: behind a proxy (corporate egress, sandboxed sessions) every URL fails and all rows come out 'unverified'. Verified: with HTTPS_PROXY=http://127.0.0.1:9 python refuses and node fetch goes direct. Honour the proxy env (e.g. bundle undici EnvHttpProxyAgent as the dispatcher when a *_PROXY var is set, pinned) and add a test. 2) verify_evidence.ts:54 decodeHTML(text) is not html.unescape ('&ampx' and '&notit;' stay undecoded); decodeHTML(text, DecodingMode.Legacy) matched html.unescape on all 29 cases I tried. 3) verify_evidence.ts:134,135,139,140 print 'undefined' where Python printed None for a row with no url (e.g. 'E3 is broken: undefined'); use row.url ?? 'None' as line 163 does. 4) packages/crew/src/tools/global-setup/install_global.ts:24-28 when END comes before START, rest.indexOf(end) is -1 and --apply writes a corrupted merge (Python raised); only take the in-place branch when END follows START. 5) install_global.ts:38-66 the LCS diff is not difflib.unified_diff: it diverged from the Python output on 1 of 300 realistic block edits and 126 of 300 shuffled ones. Port SequenceMatcher's matching, or record it under Deviations and drop the 'byte-identical' claim for install_global --check in the Outcome. 6) README.md:96 still says check_structure.py --all --strict.
- 2026-10-24: status in-review → in-progress — changes requested: 1) packages/crew/src/tools/research/verify_evidence.ts:40-50 fetchPage ignores HTTP_PROXY/HTTPS_PROXY/NO_PROXY, which urllib honoured: behind a proxy (corporate egress, sandboxed sessions) every URL fails and all rows come out 'unverified'. Verified: with HTTPS_PROXY=http://127.0.0.1:9 python refuses and node fetch goes direct. Honour the proxy env (e.g. bundle undici EnvHttpProxyAgent as the dispatcher when a *_PROXY var is set, pinned) and add a test. 2) verify_evidence.ts:54 decodeHTML(text) is not html.unescape ('&ampx' and '&notit;' stay undecoded); decodeHTML(text, DecodingMode.Legacy) matched html.unescape on all 29 cases I tried. 3) verify_evidence.ts:134,135,139,140 print 'undefined' where Python printed None for a row with no url (e.g. 'E3 is broken: undefined'); use row.url ?? 'None' as line 163 does. 4) packages/crew/src/tools/global-setup/install_global.ts:24-28 when END comes before START, rest.indexOf(end) is -1 and --apply writes a corrupted merge (Python raised); only take the in-place branch when END follows START. 5) install_global.ts:38-66 the LCS diff is not difflib.unified_diff: it diverged from the Python output on 1 of 300 realistic block edits and 126 of 300 shuffled ones. Port SequenceMatcher's matching, or record it under Deviations and drop the 'byte-identical' claim for install_global --check in the Outcome. 6) README.md:96 still says check_structure.py --all --strict.
- 2026-10-24: review fixes: verify_evidence through undici (proxy env, per-step timeouts, 2 MB cap, redirect loop = 302); legacy entity decoding; None for missing urls; install_global difflib port (764/764 fuzzed cases identical) and refusal of out-of-order markers; int/float flags and exclusive-flag errors as argparse; tools may import only their own skill and tools/cli; README

## Progress log

- 2026-10-24: status draft → ready
- 2026-10-24: assigned to the developer role
- 2026-10-24: status ready → in-progress — branch plan/P-015-port-the-skill-scripts-to-node
- 2026-10-24: status in-progress → in-review
- 2026-10-24: review: changes requested — 1) packages/crew/src/tools/research/verify_evidence.ts:40-50 fetchPage ignores HTTP_PROXY/HTTPS_PROXY/NO_PROXY, which urllib honoured: behind a proxy (corporate egress, sandboxed sessions) every URL fails and all rows come out 'unverified'. Verified: with HTTPS_PROXY=http://127.0.0.1:9 python refuses and node fetch goes direct. Honour the proxy env (e.g. bundle undici EnvHttpProxyAgent as the dispatcher when a *_PROXY var is set, pinned) and add a test. 2) verify_evidence.ts:54 decodeHTML(text) is not html.unescape ('&ampx' and '&notit;' stay undecoded); decodeHTML(text, DecodingMode.Legacy) matched html.unescape on all 29 cases I tried. 3) verify_evidence.ts:134,135,139,140 print 'undefined' where Python printed None for a row with no url (e.g. 'E3 is broken: undefined'); use row.url ?? 'None' as line 163 does. 4) packages/crew/src/tools/global-setup/install_global.ts:24-28 when END comes before START, rest.indexOf(end) is -1 and --apply writes a corrupted merge (Python raised); only take the in-place branch when END follows START. 5) install_global.ts:38-66 the LCS diff is not difflib.unified_diff: it diverged from the Python output on 1 of 300 realistic block edits and 126 of 300 shuffled ones. Port SequenceMatcher's matching, or record it under Deviations and drop the 'byte-identical' claim for install_global --check in the Outcome. 6) README.md:96 still says check_structure.py --all --strict.
- 2026-10-24: status in-review → in-progress — changes requested: 1) packages/crew/src/tools/research/verify_evidence.ts:40-50 fetchPage ignores HTTP_PROXY/HTTPS_PROXY/NO_PROXY, which urllib honoured: behind a proxy (corporate egress, sandboxed sessions) every URL fails and all rows come out 'unverified'. Verified: with HTTPS_PROXY=http://127.0.0.1:9 python refuses and node fetch goes direct. Honour the proxy env (e.g. bundle undici EnvHttpProxyAgent as the dispatcher when a *_PROXY var is set, pinned) and add a test. 2) verify_evidence.ts:54 decodeHTML(text) is not html.unescape ('&ampx' and '&notit;' stay undecoded); decodeHTML(text, DecodingMode.Legacy) matched html.unescape on all 29 cases I tried. 3) verify_evidence.ts:134,135,139,140 print 'undefined' where Python printed None for a row with no url (e.g. 'E3 is broken: undefined'); use row.url ?? 'None' as line 163 does. 4) packages/crew/src/tools/global-setup/install_global.ts:24-28 when END comes before START, rest.indexOf(end) is -1 and --apply writes a corrupted merge (Python raised); only take the in-place branch when END follows START. 5) install_global.ts:38-66 the LCS diff is not difflib.unified_diff: it diverged from the Python output on 1 of 300 realistic block edits and 126 of 300 shuffled ones. Port SequenceMatcher's matching, or record it under Deviations and drop the 'byte-identical' claim for install_global --check in the Outcome. 6) README.md:96 still says check_structure.py --all --strict.
- 2026-10-24: review fixes: verify_evidence through undici (proxy env, per-step timeouts, 2 MB cap, redirect loop = 302); legacy entity decoding; None for missing urls; install_global difflib port (764/764 fuzzed cases identical) and refusal of out-of-order markers; int/float flags and exclusive-flag errors as argparse; tools may import only their own skill and tools/cli; README
- 2026-10-24: status in-progress → in-review

## Outcome
- **What shipped:** the 11 skill scripts are TypeScript in `packages/crew/src/tools/<skill>/`, each bundled to a standalone `skills/<skill>/scripts/<name>.mjs`.
  - Their 57 pytest cases are in vitest (`test/tools/`, `test/plugin/`), plus 2 new ones: the `wada roles` output and the `install_global --check` diff.
  - Every caller runs `node … .mjs`: the pre-commit hook, `settings.json`, CI, the Makefile, the skill docs and templates, and the sample project.
  - No `.py` is left under `plugins/`. `tests/crew/` keeps only the hub's `test_hub.py`/`test_team.py`.
- **Parity, beyond the tests:**
  - These outputs are byte-identical to the Python: `track_plan_draft` hook output; 14 `wada`/`studio` commands with their exit codes; `check_design --all/--staged/--export`; `install_global --check` on 5 files; `verify_evidence --no-fetch/--report`.
  - The regenerated `catalog.json` equals the Python one value for value (348 palettes, every role colour and score). Only Python's integral floats (`0.0`) now print as `0`.
- **Deviations:**
  - AC1 runs the command-level tests against both the `.py` and the `.mjs`. The function-level tests imported the Python modules, so they run against the TS port; their pytest originals had passed on the `.py`.
  - AC4's "byte for byte" became "value for value", because JS prints `0` where Python printed `0.0`. The catalog is regenerated by `studio.mjs`, and `--check` compares against that.
  - `tools/cli.ts` makes bad flags end the way argparse ended them, with usage and exit 2 and the same error text: unknown flags, `invalid int/float value`, and `not allowed with argument` in argv order. Only argparse's line wrapping and its subcommand prefix (`wada.py suggest:`) differ.
  - The `it()` names are reworded into sentences. Each still maps one to one to its pytest case; QA matched all 57.
  - **New dependencies:**
    - `entities` 8.1.0, bundled. Its legacy decoding mode matches `html.unescape`, including unterminated entities such as `&ampx`.
    - `undici` 7.30.1, bundled. It gives `verify_evidence` what urllib did: `HTTP(S)_PROXY`/`NO_PROXY`, the timeout on each connect/headers/body step, at most 2 MB read, and a redirect loop counted as broken. 7.30.1 is the release that fixes 7.29's audit advisories.
    - `smol-toml` 1.9.0, a dev dependency for the TOML template check.
  - `install_global --check` uses a step-for-step port of difflib's SequenceMatcher. It is identical to Python's `unified_diff` on 764 fuzzed cases, including shuffled lines and the autojunk path for 200+ lines.
  - `install_global` refuses a file whose end marker comes before its start marker (exit 1, file untouched); the Python crashed with a traceback.
- **Follow-ups (after P-004 merges):**
  - port `test_hub.py`/`test_team.py` to vitest, which closes BUG-004;
  - move the secret patterns to `src/shared/` (`check_secrets` and the hub's `knowledge.ts` each have a copy, as before);
  - `plugins/crew/skills/hub/SKILL.md:130` and both `writing-guide.md` copies still say `python3 .crew/bin/check_structure.py`/`check_design.py`;
  - CHORE-009: clean old `.py` files and `python3` hooks out of existing projects.

Learnings: none
