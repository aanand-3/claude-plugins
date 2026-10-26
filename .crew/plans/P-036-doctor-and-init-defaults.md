---
id: P-036
title: Doctor and init defaults
goal: G-007
items: FEAT-044
touches: packages/crew/src/hub/commands/views/doctor.ts, packages/crew/src/hub/commands/views/doctor.reg.ts, packages/crew/src/hub/commands/work/setup.ts, packages/crew/src/hub/commands/work/planning.reg.ts, packages/crew/src/hub/commands/index.ts, packages/crew/src/hub/cli.ts, packages/crew/src/hub/mcp.ts, packages/crew/src/hub/core/work/hubstate.ts, packages/crew/test/hub/e2e/doctor.test.ts, packages/crew/test/hub/e2e/helpers.ts, packages/crew/test/hub/e2e/basics.test.ts, packages/crew/test/mcp.test.ts, plugins/crew/skills/team/SKILL.md, plugins/crew/skills/hub/SKILL.md
depends_on: P-029, P-031
status: done
branch: plan/P-036-doctor-and-init-defaults
pr:
created: 2026-10-25
started: 2026-10-25
completed: 2026-10-26
assignee: developer
---

# P-036: Doctor and init defaults

## Context
W2-d of G-007 (design: `.crew/drafts/the-crew-team-was-pure-reef.md`, "W2-d: ready for other projects"). Delivers FEAT-044, plus the work SPIKE-005 adds.

To run the autonomous loop, another project needs several things in place:
- a base branch, with the main checkout on it;
- `hub.plan_worktrees`;
- rendered agents and the guard/usage/activity hooks;
- the generated and shared globs;
- a policy preset;
- since P-026, git hooks that accept the hub's `chore(hub)` commits on the base branch.

Today nothing checks these in one place, and `init` writes none of the config. After this plan, `crew.mjs doctor [--json]` checks each one and says how to fix it, and `init` writes commented defaults for the hub config and the policy when they are missing. It never overwrites a file and never makes a policy choice for the human.

**SPIKE-005** (decision K-2026-10-25-hub-commits-stay-ordinary-git-commits): hub commits stay ordinary commits that run every hook. A project allows them with a path rule in its own pre-commit (all staged paths under `.crew/`, as crew's git-setup hook already does). That adds two pieces here:
- `doctor` probes the project's hooks without committing: a temporary index, then `git hook run`.
- The hub's commit-failure message names the hook's refusal and points to `doctor`.

**Code dependency: P-029.** `doctor` reads `hub.shared` with P-029's `sharedGlobs` (core/work/footprint.ts) and reports the same type error `check` does.

**Code dependency: P-031** (Q-d084f1). Adding `doctor` breaks `test/hub/registry.test.ts` as it is on main (an exact compare with `registry-before.json`). P-031 rewrites it into subset checks (decision K-2026-10-25-approved-with-one-change-do-not-edit), so later command-adding plans need no edit there. P-036 therefore builds on P-031: update the branch to the base once P-031 has merged, and never edit `registry.test.ts` or `registry-before.json`. `test/mcp.test.ts` keeps an exact sorted tool list, so this plan adds `doctor` to it (after P-031, the list already has `dispatch`).

**Test default** (Q-f37203). `init` writing `plan_worktrees: true` would switch every e2e suite that calls the shared `init` helper to plan-worktree mode. The suites keep today's branch-per-plan default instead: the helper `init` in `test/hub/e2e/helpers.ts` takes `defaults = false`; it notes which of `.crew/config.yaml` and `.crew/policy.yaml` exist before running `init`, and afterwards removes those `init` created, unless `defaults: true`. A file the test wrote before `init` is never removed. The doctor suite's `init` tests run `crew.mjs --as architect --run-id architect:a9fcb966f29e84cca init` directly or pass `defaults: true`. AC6 is unchanged.

Overlaps, for staffing only: P-030 on `planning.reg.ts` (the `init` registration once P-030 lands; cli.ts before). `cli.ts`, `mcp.ts`, `commands/index.ts`, both `SKILL.md`s and the test files are `hub.shared`.

## Scope
**In:**
- `crew.mjs doctor [--json]` and an MCP tool `doctor` (same JSON). One line per check, `OK|WARN|FAIL  <check>: <detail>`, with ` → <fix>` on WARN and FAIL. Exit 1 if any check FAILs, else 0. JSON: `{ checks: [{ id, level, detail, fix }] }`. The checks:
  1. `base-branch`: `store.baseBranch()` exists as a local branch. FAIL if not; fix: set `git.default_branch` in `.crew/config.yaml`.
  2. `main-checkout`: with `hub.plan_worktrees`, the main checkout (`hubHome`) is on the base branch. FAIL if not; fix: switch it back.
  3. `plan-worktrees`: WARN when `hub.plan_worktrees` is off ("plans can't run side by side").
  4. `vendored-hub`: `.crew/bin/crew.mjs` exists. FAIL if not; fix: `crew.mjs init`.
  5. `agents`: `agentProblems(store)` is empty. WARN per problem; fix: the human runs `crew.mjs agents` and starts a new session.
  6. `hooks`: `.claude/settings.json` has the PreToolUse guard (FAIL if missing), the SubagentStop `usage --hook` (WARN) and the PostToolUse `activity --hook` (WARN). Fix: `/crew:guidelines --refresh` (the human; the file is protected).
  7. `generated`: when `hub.build` is set, `.gitattributes` marks at least one tracked file `linguist-generated`. WARN if not ("Release can't tell generated files from source").
  8. `shared`: `hub.shared` is a list. FAIL when it's not a list (as `check`); WARN when it's missing ("every overlap on a registry or doc blocks staffing").
  9. `policy`: the policy resolves with no errors (FAIL with the first error); a `preset` is set (WARN: "the team runs best under `preset: lifecycle` — a policy change, yours").
  10. `hub-commits` (SPIKE-005), only with `hub.plan_worktrees`, run in the main checkout. Build a temporary index from HEAD plus one existing blob at `.crew/.doctor-probe`; run `git hook run pre-commit` with `GIT_INDEX_FILE` set to it; run `git hook run commit-msg -- <temp file "chore(hub): doctor probe">`. FAIL when either refuses, with the hook's first stderr line and this fix: "allow commits on <base> whose staged paths are all under .crew/ in your pre-commit (crew's git-setup hook does), or turn hub.plan_worktrees off". OK when there is no hook. Nothing is committed: the real index, working tree and refs are untouched, and the temp files are removed. With git older than 2.36 (no `git hook run`), it runs the hook files under `git rev-parse --git-path hooks` directly.
- **`init` defaults**, written only when the file is missing, after today's `init`:
  - `.crew/config.yaml`: a commented file with `git: default_branch: <current branch, else main>`, `hub: plan_worktrees: true` and `wip_limit: 1`, plus commented examples for `build`, `full_suite` and `shared` (exact files, not directories).
  - `.crew/policy.yaml`: a header that explains presets, and `# preset: lifecycle` commented out (choosing it is the human's policy decision; `doctor` reminds them).
  - Each written file is reported. Existing files are left as they are, and so are `.gitattributes`, `.claude/**` and git hooks.
- **Hub commit failure message** (core/work/hubstate.ts `commitState`): when `git commit` fails, the error carries git's first stderr line (the hook's refusal) and ends with "`crew.mjs doctor` checks the hooks". The commit runs through `spawnSync` there, to read stderr.
- `team/SKILL.md`, "Before the first run": a first step, "run `crew.mjs doctor` and fix what it reports". `hub/SKILL.md`: a `doctor` row if it still has a command table.

**Out (explicitly not doing):**
- Editing a project's git hooks, `.gitattributes`, `.claude/settings.json` or agents: `doctor` reports and points to the owner (the human, `/crew:guidelines`, `crew.mjs agents`).
- Choosing a preset or budgets in the generated policy (human).
- project-kit's hooks (another plugin, not in this repo).
- A `--fix` mode.
- Generated files: Release builds them.

## Acceptance criteria
- [ ] AC1 · In a throwaway repo set up for the loop (base branch main, `plan_worktrees: true`, rendered agents, settings.json from the guidelines template, `hub.build` with one `linguist-generated` tracked file, `hub.shared` list, `preset: lifecycle`, crew's git-setup hooks under `core.hooksPath`), `doctor` prints only OK lines and exits 0. `doctor --json` has the 10 check ids with `level: "ok"`.
- [ ] AC2 · With the main checkout on another branch, `main-checkout` FAILs naming both branches, exit 1. With `git.default_branch: trunk` and no trunk branch, `base-branch` FAILs.
- [ ] AC3 · Missing guard hook → `hooks` FAIL; a missing activity hook alone → WARN, exit 0. Unrendered agents → `agents` WARN naming `crew.mjs agents`.
- [ ] AC4 · `hub.build` set and nothing marked `linguist-generated` → `generated` WARN. No `hub.shared` → `shared` WARN; `hub.shared: "x"` → FAIL. No preset → `policy` WARN that says it's the human's choice.
- [ ] AC5 · `hub-commits`: with a pre-commit that refuses every commit on main, it FAILs with the hook's message and the allowance fix. With crew's git-setup hooks it is OK. With a commit-msg hook that rejects `chore(hub): …`, it FAILs. In every case, afterwards `git status --porcelain` and `git rev-parse HEAD` are as before, and no temp file is left in the repo.
- [ ] AC6 · `init` in a fresh repo writes `.crew/config.yaml` (with `default_branch` set to the current branch and `plan_worktrees: true`) and `.crew/policy.yaml` (preset commented out), and reports both. Running `init` again changes neither. An existing config or policy is left byte-for-byte unchanged. `policy check` passes on the generated policy.
- [ ] AC7 · With `plan_worktrees` on and a pre-commit that refuses main commits, a hub write (`new-item … --why x`) fails. Its stderr has the hook's message and "`crew.mjs doctor`", and the item file is written but not committed (today's behaviour, clearer message).
- [ ] AC8 · The MCP tool `doctor` returns the JSON of `doctor --json`; `doctor` is in `crew.mjs help`; `team/SKILL.md`'s "Before the first run" starts with `doctor`.
- [ ] AC10 · The e2e `init` helper removes only the defaults `init` created (a config or policy the test wrote first survives), and `defaults: true` keeps them; with it, the basics, worktrees and branch-copies suites pass unchanged in behaviour. `test/mcp.test.ts` lists `doctor`. `git diff --quiet <base> -- packages/crew/test/hub/registry.test.ts packages/crew/test/hub/registry-before.json` holds (after the branch is updated onto a base that has P-031).
- [ ] AC9 · `npm run typecheck` passes; doctor.ts, setup.ts and hubstate.ts stay under 300 lines; the worktrees, basics and branch-copies suites pass.

## Approach
- **`commands/views/doctor.ts` (new):** `doctorChecks(store): Check[]` (each check a small function), `doctor(store, json)`, and `probeHubCommit(home, base)`.
  - Temp index and message files go under the git common dir's `crew/` directory (as the ledger does), so nothing lands in the working tree.
  - The probe blob is an existing one: any `HEAD:.crew/…` file's blob, else `git hash-object -w` of an empty string.
  - Reuse: `agentProblems` (agents.ts), `sharedGlobs` (footprint.ts, P-029), `hubHome`/`baseBranch`/`settings` (store.ts), `requireBase`'s branch read, and `check-attr -z linguist-generated` as `drift` uses it. Read the settings.json hooks as P-034 does; if P-034 is already on the base, import its helper, else keep a local one.
- **`commands/work/setup.ts` (new):** `initDefaults(store)`, writing through `store.ws` so a refused command writes nothing.
- **Registration:** `init` runs `init(s); initDefaults(s)`, and `doctor` registers its CLI spec, help line and MCP tool.
  - If P-030 has landed when this branch updates to the base: the `init` entry is in `commands/work/planning.reg.ts`, and `doctor` gets `commands/views/doctor.reg.ts` plus an index line.
  - Otherwise both go in cli.ts and mcp.ts.
  - planning.ts itself is not edited (P-038/P-039's file).
- **hubstate.ts:** `commitState` runs the `commit` step with `spawnSync("git", [...], { cwd: home })` and puts the first stderr line in the `fail` message. git.ts isn't changed (P-028's file).
- **Tests (`test/hub/e2e/doctor.test.ts`, new):** throwaway repos via `Repo.create()`. Hooks are written into `.githooks/` from `plugins/crew/skills/git-setup/assets/githooks`, plus a strict variant, with `git config core.hooksPath .githooks`.

## Tasks
- [x] T1: `probeHubCommit` + the `hub-commits` check → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/doctor.test.ts -t hooks` (AC5)
- [x] T2: checks 1–9, `doctor` command and MCP tool → verify: `npx vitest run test/hub/e2e/doctor.test.ts -t "doctor"` (AC1–AC4, AC8)
- [x] T3: `initDefaults` and the `init` registration → verify: `npx vitest run test/hub/e2e/doctor.test.ts -t init` (AC6)
- [x] T4: hubstate.ts failure message → verify: `npx vitest run test/hub/e2e/doctor.test.ts -t "commit message"`; `npx vitest run test/hub/e2e/worktrees.test.ts test/hub/e2e/branch-copies.test.ts` (AC7)
- [x] T5: team/SKILL.md (and hub/SKILL.md's row if the table remains) → verify: `grep -n "doctor" plugins/crew/skills/team/SKILL.md`; `npx vitest run test/plugin` (AC8)
- [x] T7: the helper `init` `defaults` option (helpers.ts), `doctor` in mcp.test.ts's tool list; update the branch to the base after P-031 merges → verify: `npx vitest run test/hub/e2e/basics.test.ts test/hub/e2e/worktrees.test.ts test/hub/e2e/branch-copies.test.ts test/mcp.test.ts test/hub/registry.test.ts`; `git diff --quiet main -- test/hub/registry.test.ts test/hub/registry-before.json` (AC10)
- [x] T6: types and sizes → verify: `npm run typecheck`; `wc -l src/hub/commands/views/doctor.ts src/hub/commands/work/setup.ts src/hub/core/work/hubstate.ts`; `npx vitest run test/hub/e2e/basics.test.ts` (AC9)

## Test plan
**Targeted checks** (from `packages/crew/`; e2e suites drive the built `dist/crew.mjs`: `npm run build` first, then discard the generated output, which Release builds):
- AC1–AC5, AC8 → `npx vitest run test/hub/e2e/doctor.test.ts`
- AC6 → `npx vitest run test/hub/e2e/doctor.test.ts -t init`
- AC7 → `npx vitest run test/hub/e2e/doctor.test.ts -t "commit message" test/hub/e2e/worktrees.test.ts test/hub/e2e/branch-copies.test.ts`
- AC10 → `npx vitest run test/hub/e2e/basics.test.ts test/hub/e2e/worktrees.test.ts test/hub/e2e/branch-copies.test.ts test/mcp.test.ts test/hub/registry.test.ts`; `git diff --quiet main -- test/hub/registry.test.ts test/hub/registry-before.json`
- AC9 → `npm run typecheck`; T6's `wc -l`; `npx vitest run test/hub/e2e/basics.test.ts`

## Rollout & rollback
- Ships in the bundle (Release builds it); this repo gets `doctor` through `refresh-bin` (P-024). Running it here is a good post-merge check. Expect WARNs for the activity hook until the human adds it (P-027's rollout).
- Rollback: revert the plan's commit. Files `init` wrote stay (they're ordinary config).

## Risks & open questions
- The probe runs the project's own hooks, which git runs on every commit anyway. A slow hook (lint via pre-commit) makes `doctor` slow; `doctor` says which check is running.
- A hook that inspects something other than the index (the branch name only, a remote) is probed faithfully, because `git hook run` runs it as git would.

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-036: Doctor and init defaults [in-review] tasks 7/7 — claimed by Arpit Anand (developer:acc7d2e166eea7b0c)
- last checkpoint 2026-10-25 20:22 at BUG-032 (c42910c) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/doctor.test.ts -t AC1 (AC 1)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/doctor.test.ts -t AC2 (AC 2)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/doctor.test.ts -t AC3 (AC 3)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/doctor.test.ts -t AC4 (AC 4)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/doctor.test.ts -t AC5 (AC 5)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/doctor.test.ts -t AC6 (AC 6)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/doctor.test.ts -t AC7 (AC 7)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/doctor.test.ts -t AC8 (AC 8)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/worktrees.test.ts test/hub/e2e/branch-copies.test.ts (AC 7)
- ✓ team/SKILL.md Before the first run step 1 is Doctor (grep); doctor listed in mcp.test.ts tool list; e2e AC8 test passed (AC 8) (reported)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/basics.test.ts test/hub/e2e/worktrees.test.ts test/hub/e2e/branch-copies.test.ts test/mcp.test.ts test/hub/registry.test.ts && git diff --quiet main -- test/hub/registry.test.ts test/hub/registry-before.json (AC 9)
- ✓ cd packages/crew && npm run typecheck && test $(wc -l < src/hub/commands/views/doctor.ts) -lt 300 && test $(wc -l < src/hub/commands/work/setup.ts) -lt 300 && test $(wc -l < src/hub/core/work/hubstate.ts) -lt 300 (AC 10)
- evidence: AC1 ✓, AC2 ✓, AC3 ✓, AC4 ✓, AC5 ✓, AC6 ✓, AC7 ✓, AC8 ✓, AC9 ✓, AC10 ✓

Latest log:
- 2026-10-26: status in-progress → in-review
- 2026-10-26: status in-review → done
- 2026-10-26: status done → in-progress — Release's suite failed: crew init exits 1 outside git (BUG-032); reopened under the executive's standing approval on G-007

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-036-doctor-and-init-defaults
- 2026-10-26: status in-progress → in-review
- 2026-10-26: status in-review → done
- 2026-10-26: status done → in-progress — Release's suite failed: crew init exits 1 outside git (BUG-032); reopened under the executive's standing approval on G-007
- 2026-10-26: status in-progress → in-review — BUG-032 fixed: init writes plan_worktrees: false outside git; regression test added
- 2026-10-26: status in-review → done
- 2026-10-26: merged to main as 8be0bec (squash; rebuilt bundle after BUG-032 fix; full suite green: 430 tests, exit 0); no rollout steps beyond merge

## Outcome
`crew.mjs doctor [--json]` (views/doctor.ts) runs the 10 readiness checks, among them `hub-commits`, which probes a hub commit through the repo's git hooks without touching HEAD or the working tree. It is also an MCP tool and appears in help. `init` now writes a commented default `.crew/config.yaml` (current branch, `plan_worktrees: true`) and `.crew/policy.yaml` (preset commented out) when they are missing (work/setup.ts). A hub commit refused by a hook now names the hook's message and `crew.mjs doctor`. team/SKILL.md's "Before the first run" now starts with `doctor`. The e2e `init` helper takes `defaults` and otherwise removes only the defaults `init` created. The branch has main merged in (P-031, P-046), and registry.test.ts and registry-before.json are identical to main. Note: merge commit db3a692 is missing P-031's code, because a checkpoint run mid-merge unstaged it. The next checkpoint (7b07f9f) restored it, and the plan squashes to one commit anyway.
Learnings: K-2026-10-26-finish-a-merge-of-the-base-into-a-plan
