---
id: P-014
title: Restructure packages/hub into packages/crew by domain
goal:
items: CHORE-007
touches: packages/**, .claude/launch.json, README.md, .crew/config.yaml, .crew/knowledge/**, docs/vision.md, plugins/crew/skills/hub/dist/**, .crew/bin/crew.mjs
depends_on:
status: in-progress
branch: plan/P-014-restructure-packages-hub-into-packages
pr:
created: 2026-10-24
started: 2026-10-24
completed:
assignee: developer
---

# P-014: Restructure packages/hub into packages/crew by domain

## Context
CHORE-007, the second of four PRs that move crew to Node only. The others are CHORE-006 (done in P-001), CHORE-008 and CHORE-009.

`packages/hub/src/commands/` (26 files) and `src/core/` (13 files) are flat, so nothing shows which module belongs to which part of the hub. The package will also build the ported skill scripts (CHORE-008), so `packages/hub` becomes `packages/crew` with the hub under `src/hub/`. Tools get their own `src/tools/` later.

This PR only moves files: no behaviour changes. The dist bundles stay byte-identical, apart from esbuild's module-path comments if any.

The other session's P-004 (in review) edits `core/git.ts`, `commands/workflow.ts` and `tests/crew/test_hub.py`. It also adds `.github/workflows/ci.yml`. Whichever of P-004 and this plan merges second has to carry the other's edits across the move, because git follows the renames.

## Scope
**In:**
- `git mv packages/hub packages/crew`; rename the npm package to `@crew/crew` and update its description.
- Group the hub sources by domain under `src/hub/`. Core and commands use the same group names:
  - `src/hub/`: `main` `cli` `mcp` `server` `graph-types`
  - `src/hub/core/`: `store` `workspace` `git` `text` (used by everything)
    - `work/`: `model` `doc` `queries` `gates` `footprint`
    - `team/`: `policy` `presets`
    - `memory/`: `ledger` `knowledge`
  - `src/hub/commands/`:
    - `work/`: `planning` `backlog` `goals` `workflow` `execution` `review` `release` `migrate`
    - `team/`: `roles` `agents` `team` `autonomy` `liveness` `runs` `questions` `guard` `policy`
    - `memory/`: `knowledge` `ledger` `context`
    - `views/`: `advisor` `reports` `checks` `graph` `export` `design`
- Fix every relative import in `src/`, `ui/` and `test/`.
- `test/structure.test.ts` walks `src/` and `ui/src/` recursively, and enforces:
  - core never imports commands, the CLI or the server;
  - ≤ 300 lines per module;
  - the UI reaches the hub only through `src/hub/graph-types` and `src/hub/core/work/model`.
- Paths elsewhere:
  - `build.mjs` entry points and the banner text;
  - `ui/tsconfig.json`;
  - `.claude/launch.json`;
  - the README *Development* section;
  - the `.crew/config.yaml` comment;
  - `docs/vision.md` (current-state mentions only);
  - `packages/crew/docs/design/DESIGN.md`;
  - the knowledge entries' `scope:` globs, which `check` flags when they match no file.

**Out (explicitly not doing):**
- `src/shared/` and `src/tools/` (CHORE-008 adds them along with the code that needs them).
- Splitting `text.ts` or `policy.ts`, and any behaviour change.
- Porting `tests/` (CHORE-008).

## Acceptance criteria
- [ ] `packages/hub` no longer exists, and `git grep -n 'packages/hub'` finds only history (`.crew/plans/`, `.crew/items/`, `docs/vision.md`'s rename log).
- [ ] No `.ts` file sits directly in `src/hub/commands/`, and only `store`, `workspace`, `git` and `text` sit directly in `src/hub/core/`.
- [ ] `test/structure.test.ts` checks every directory under `src/` and `ui/src/`, and passes.
- [ ] `npm run typecheck && npm test` pass in `packages/crew`.
- [ ] `npm run build` leaves `plugins/crew/skills/hub/dist/` unchanged apart from the banner.
- [ ] The pytest suites pass from a plain shell, and `crew.mjs check` reports no knowledge scope that matches no file.

## Approach
- Do the move with `git mv`, so that history and P-004's merge follow the renames.
- Rewrite imports with a small one-off script that resolves each module's new path. Then let `tsc` find anything missed.
- `structure.test.ts` uses a recursive file walk instead of the hard-coded directory list. The UI contract check matches `src/hub/graph-types` and `src/hub/core/work/model`.
- Rebuild, and diff `dist/` against the pre-move build. Copy `dist/crew.mjs` into `.crew/bin/` only if it changed.

## Tasks
- [ ] T1: `git mv` the package and the source files into the groups; update `package.json` → verify: `test ! -e packages/hub && ls packages/crew/src/hub/core packages/crew/src/hub/commands`
- [ ] T2: rewrite imports in `src/`, `ui/` and `test/`; fix `build.mjs` and `ui/tsconfig.json` → verify: `cd packages/crew && npm run typecheck`
- [ ] T3: make `structure.test.ts` recursive, with the new contract paths → verify: `cd packages/crew && npx vitest run test/structure.test.ts`
- [ ] T4: build and compare `dist/` → verify: `cd packages/crew && npm test && npm run build && git diff --stat ../../plugins/crew/skills/hub/dist`
- [ ] T5: repo paths (launch.json, README, config comment, vision.md, DESIGN.md, knowledge scopes) → verify: `git grep -n 'packages/hub' -- ':!.crew/plans' ':!.crew/items'` lists only the vision.md rename log, and `node .crew/bin/crew.mjs check` has no scope hints
- [ ] T6: full suites → verify: `for s in tests/*/; do (cd $s && env -u CREW_ROLE -u CREW_RUN uvx --with pyyaml pytest -q); done`

## Test plan
- AC3 and AC4: the existing vitest suite, plus the stricter, recursive `structure.test.ts`.
- AC5: `dist.test.ts`'s freshness check, plus a manual diff of the rebuilt `dist/` against the pre-move build.
- AC6: the pytest suites drive the shipped `dist/crew.mjs` end to end. Run them without `CREW_*` set (BUG-004).
- AC1 and AC2: the greps and the `ls`.

## Rollout & rollback
n/a: internal layout only. The plugin ships `dist/`, which doesn't change. Rollback: revert the PR.

## Risks & open questions
- Merging P-004 after this means carrying its edits into `src/hub/core/git.ts` and `src/hub/commands/work/workflow.ts`, and its new `ci.yml` (if it names `packages/hub`) needs the new path. Git's rename detection handles the file moves; the CI path needs a manual fix.
- The groups are a judgement call. `checks`, `context` and `graph` read across groups, and they sit where their output goes.

## Handoff

## Progress log

- 2026-10-24: status draft → ready
- 2026-10-24: assigned to the developer role
- 2026-10-24: status ready → in-progress — branch plan/P-014-restructure-packages-hub-into-packages

## Outcome
