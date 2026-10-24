---
id: P-023
title: Bundles built at release; escalations hold only what they block
goal: G-001
items: FEAT-025, FEAT-026
touches: packages/crew/src/hub/commands/team/questions.ts, packages/crew/src/hub/commands/team/autonomy.ts, packages/crew/src/hub/core/work/footprint.ts, packages/crew/test/hub/run-check.test.ts, packages/crew/test/hub/generated-drift.test.ts, .gitattributes, .crew/config.yaml, plugins/crew/skills/hub/agents/release.md, plugins/crew/skills/hub/agents/developer.md, plugins/crew/skills/team/SKILL.md, README.md
depends_on: P-020
status: done
branch: plan/P-023-bundles-built-at-release-escalations
pr:
created: 2026-10-24
started: 2026-10-25
completed: 2026-10-25
assignee: developer
---

# P-023: Bundles built at release; escalations hold only what they block

## Context
Delivers FEAT-025 and FEAT-026 under G-001 (shared context: parallel agents don't collide). Both are ways one piece of work needlessly stops unrelated work.
- FEAT-025: every code plan must rebuild and commit plugins/crew/skills/hub/dist/*.mjs and ui.html with its source (convention K-2026-10-23-rebuild-the-bundles-and-commit-them; packages/crew/test/dist.test.ts fails when the committed bundles differ from a fresh build). So every code plan touches the same generated files and serializes: P-022 (a one-line text.ts fix) waits on P-020 only through dist/** and test/** (K-2026-10-24-p-022-waits-on-p-020-rather-than). Plans should change source and tests only; Release rebuilds dist/ in the plan's single commit and runs the bundle check then.
- FEAT-026: `run --check` (runState in packages/crew/src/hub/commands/team/autonomy.ts) stops the whole team on any open executive question. Today it reports STOP for two escalations about P-003, so the unattended loop cannot advance BUG-001 or anything else. Questions already block only their own document (`questions`: "an open one blocks only its document"); run should follow the same rule.

## Scope
**In:**
- FEAT-025: generated files (the hub's `dist/` and the skill scripts `plugins/crew/skills/*/scripts/*.mjs`) are no plan's footprint. They are marked `linguist-generated` in `.gitattributes`; `drift` (footprint.ts) ignores changed files git reports as generated, so a developer who runs the build to exercise the end-to-end checks (they run the bundle) gets no "changes outside its touches" hint for them. Plans list source and tests in `touches`, never generated paths.
- FEAT-025: Release rebuilds the generated files on top of the current base branch (`hub.build`, a new key in `.crew/config.yaml`) and puts them in the plan's one commit; `hub.full_suite` (unchanged: it ends with the bundle check `git diff --exit-code -- plugins/crew/skills`) and CI then verify them. Developer and Release instructions, the README's build paragraph and the bundle convention say so.
- FEAT-026: an open escalation whose ref is a plan or an item holds that document only; `run --check` reports GO while any open (not done/dropped, not wontfix/duplicate) plan or item is unheld, and lists what is held. An escalation with no ref, or on the idea or a goal, stops the team as today; so does "everything open is held".

**Out (explicitly not doing):**
- Changing `packages/crew/test/dist.test.ts` or `hub.full_suite`: the freshness test already runs only in the full suite, which only Release and CI run; it stays the bundle check.
- Building the bundles inside the test run (a vitest global setup) instead of from the committed files: a larger test refactor across files P-020, P-021 and P-022 touch.
- Treating generated files specially in `overlapping` / staffing: plans stop listing them, so there is nothing to ignore. P-020, P-021 and P-022 still list `dist/**` and are released under the current convention.
- Refreshing `.crew/bin/crew.mjs` at release (FEAT-027: a policy.change decision for the executive). Until it is refreshed, this repo's `check` runs the old drift rule.
- Re-rendering this repo's `.claude/agents/**` and `.crew/templates/agents/**` (protected: the human re-renders after merge).
- Flagging broad touches globs (FEAT-028), test-only overlaps (SPIKE-004), answering Q-d4e060 / Q-67af6f, changing P-021 or P-022.

## Acceptance criteria
- [ ] AC1 · A plan branch that changes hub source but not dist/ passes its targeted checks; the bundle check is run by Release on the plan's commit and fails there if the rebuilt bundles were not committed.
- [ ] AC2 · The Developer and Release agent instructions say who builds the bundles and when; the bundle convention is superseded by a new knowledge entry.
- [ ] AC3 · With an open escalation on plan A and a ready, unheld plan B, `run --check` exits 0 (GO) and mentions A as held.
- [ ] AC4 · With open escalations holding every plan and item that could move (or one with no ref), `run --check` exits 1 (STOP) and names them.
- [ ] AC5 · In a plan's worktree, a changed file that `.gitattributes` marks `linguist-generated` is not reported by `check` as outside the plan's touches; a changed non-generated file outside touches still is.

## Approach
- **Generated files are marked, not configured in code.** `.gitattributes` gets `plugins/crew/skills/hub/dist/** linguist-generated=true` and `plugins/crew/skills/*/scripts/*.mjs linguist-generated=true` (GitHub also collapses them in PR diffs). `drift()` asks git (`git -C <home> check-attr -z --stdin linguist-generated`) and drops files set to `true`. No new setting, no change to `drift`'s signature or its callers (context.ts, views/checks.ts). This works for any crew project, not only this repo.
- **Release builds.** `.crew/config.yaml` gets `hub.build: cd packages/crew && npm run build` (read by the Release agent, like `full_suite`; the hub code doesn't parse it). release.md step 3: discard the worktree's generated files (`git restore` / `git checkout --` on the generated paths), bring the plan's branch up to the current base, run `hub.build`, then make the plan's one commit and run `hub.full_suite` after it (K-2026-10-24-release-runs-hub-full-suite-after-making). A project with no `hub.build` skips the rebuild. The exact git steps are the developer's to write; the review checks they keep "one commit" and never skip hooks.
- **Developers:** developer.md says: list source and tests in `touches`, never generated files; run `hub.build` when a targeted check runs the bundle (the e2e tests run `dist/crew.mjs`); never keep or hand-edit what it writes.
- **Escalations hold their document.** questions.ts gets a small export (e.g. `escalationHolds(events)` → `{ held: Map<ref, qid[]>, stops: Question[] }`): open escalations (`escalation || to === executive`) with a plan or item ref (`kindOf`) are holds; the rest are stops. autonomy.ts `runState` adds a reason only for stops, then — when there are holds — counts the open plans (status not in `CLOSED`) and open items (status not in `ITEM_CLOSED`) that are not held; zero → a STOP reason naming every hold. `Stop` gains `held: string[]` (`"P-003 (Q-d4e060, Q-67af6f)"`); `run --check` prints `HELD  …` lines after `GO`, `--json` includes it, and `run`'s help text says "an escalation that holds everything". Pause, budget and focus-goal reasons are unchanged. autonomy.ts stays under 300 lines.
- **Ordering.** depends_on P-020: autonomy.ts is in P-020's touches by name and every new test file falls under its `packages/crew/test/**`; there is no honest route around either (runState has to change, and the criteria need tests). The new tests sit in `packages/crew/test/hub/`, outside P-021's `test/hub/e2e/**` and P-022's two test files. P-021 overlaps on the agent files, `team/SKILL.md`, `config.yaml` and `footprint.ts` (all inside its touches); no depends_on: staffing makes whichever starts second wait, and P-023 (focus goal G-001) ranks ahead of P-021 (G-003).

## Tasks
- [x] T1: questions.ts exports the holds/stops split; autonomy.ts `runState`/`run` hold plan- and item-scoped escalations, STOP only on stops or when nothing open is unheld, and print/return `held` → verify: `cd packages/crew && npx vitest run test/hub/run-check.test.ts` (AC3, AC4) and `npx vitest run test/hub/e2e/team-2.test.ts` still passes unchanged (goal-scoped escalation still stops)
- [x] T2: `run-check.test.ts` drives the built `dist/crew.mjs` in a throwaway repo (reuse `test/hub/e2e/helpers.ts`, `fixtures.ts`): escalation on plan A with ready plan B → exit 0, stdout has `HELD` and A's ID; escalations on every open plan and item → exit 1 naming them; an escalation with no ref → exit 1 → verify: the test fails against the current bundle and passes after `npm run build`
- [x] T3: `.gitattributes` marks the generated paths; `drift()` drops files git reports as `linguist-generated` → verify: `npx vitest run test/hub/generated-drift.test.ts` (AC5: a plan worktree with a changed generated file and a changed file outside touches; `check` names only the latter)
- [x] T4: `.crew/config.yaml` gains `hub.build`; release.md (rebuild on the current base before the one commit, full suite after) and developer.md (no generated paths in touches; build only to run checks) say who builds and when; README.md's "commit the rebuilt bundles with the source" becomes "Release rebuilds them"; team/SKILL.md's `run --check` wording says escalations hold their document → verify: `grep -n "hub.build" .crew/config.yaml plugins/crew/skills/hub/agents/release.md plugins/crew/skills/hub/agents/developer.md` finds each, `grep -n "commit the rebuilt bundles" README.md` finds nothing, and `npx vitest run test/plugin` passes (agent frontmatter and templates) (AC2)
- [x] T5: AC1 dry run in a scratch clone of the finished worktree (never the shared one): with the generated paths restored to the base, T1 and T3's unit-level changes typecheck (`npm run typecheck`) and `git diff --exit-code -- plugins/crew/skills` after `npm run build` fails; after committing the rebuilt files it passes → verify: both outputs quoted in the checkpoint note (AC1)

## Test plan
**Targeted checks** (from `packages/crew/`):
- AC1 → T5: the bundle check (`hub.full_suite`'s final `git diff --exit-code -- plugins/crew/skills`) fails with stale generated files and passes after `hub.build`; QA reproduces it in a scratch copy of the worktree, not in the shared worktree.
- AC2 → T4's greps, `npx vitest run test/plugin`, and the new knowledge entry: `node .crew/bin/crew.mjs --as architect --run-id architect:a4df029ffa51d7a3d recall --paths plugins/crew/skills/hub/dist/crew.mjs` shows the new convention and not K-2026-10-23-rebuild-the-bundles-and-commit-them.
- AC3, AC4 → `npx vitest run test/hub/run-check.test.ts` (after `npm run build`), plus `npx vitest run test/hub/e2e/team-2.test.ts` unchanged.
- AC5 → `npx vitest run test/hub/generated-drift.test.ts` (after `npm run build`).

## Rollout & rollback
- Bootstrap: P-023 changes bundled source but is itself released by the current Release instructions (this repo's rendered `.claude/agents/crew-release.md` keeps the old text until the human re-renders it). The Developer runs `npm run build` in the worktree to run T2/T3 (as today). **Release, for P-023:** restore the generated files, bring the branch up to the base, run `cd packages/crew && npm run build`, then commit once and run `hub.full_suite` — the Director passes this to Release with the merge; it is also the new release.md text this plan ships.
- After merge, the human re-renders `.claude/agents/**` and `.crew/templates/agents/**` (protected) so the team runs the new Developer and Release instructions. `.crew/bin/crew.mjs` keeps the old drift rule and the old `run --check` until it is refreshed (FEAT-027, human/policy decision).
- P-020, P-021 and P-022 were specced under the old convention (their touches list `dist/**`); they release as specced — Release's rebuild on the current base is harmless for them.
- Rollback: revert the plan's commit; the superseded convention K-2026-10-23-rebuild-the-bundles-and-commit-them reappears when the new entry is removed with it.

## Risks & open questions
- Settled — overlap with P-020: unavoidable (autonomy.ts by name; `packages/crew/test/**`), hence depends_on P-020. P-020 is in review, so the wait is its QA and release, not its build.
- Settled — overlap with P-021 (ready, G-003): on the hub agent files, team/SKILL.md, config.yaml and footprint.ts; sequenced by staffing (no depends_on). Whichever lands second takes the other's text when it updates to the base.
- Settled — the convention: K-2026-10-24-release-builds-the-generated-files-plans (recorded by the Architect at spec time, `--supersedes K-2026-10-23-rebuild-the-bundles-and-commit-them`) lives in this plan's worktree and is committed with the plan, but `recall` from the main checkout already returns it in place of the old entry. It says plans specced before P-023 (P-020, P-021, P-022) release as specced, and its Release step (rebuild on the current base) is harmless for them, so it is safe in force now. Developers of new plans may already leave generated paths out of touches; until this plan merges and `.crew/bin` is refreshed, `check` shows a drift hint for them.
- Generated files in the plan's worktree diff: the Architect's review and QA ignore `linguist-generated` paths; Release overwrites them.
- Human: re-render protected agent copies after merge; FEAT-027 (refresh `.crew/bin/crew.mjs`) is a policy.change decision.

## Handoff

_Generated 2026-10-25 by `crew.mjs handoff` from the ledger._

- P-023: Bundles built at release; escalations hold only what they block [in-review] tasks 5/5 — claimed by Arpit Anand (developer:a5f8c810cbdf6cf23)
- last checkpoint 2026-10-24 18:46 at T5 (78a3edf) by Arpit Anand; since then 0 commit(s), 26 uncommitted file(s): .crew/config.yaml, README.md, packages/crew/src/hub/commands/team/autonomy.ts, packages/crew/src/hub/commands/team/questions.ts, packages/crew/src/hub/core/work/footprint.ts, plugins/crew/skills/hub/agents/developer.md, plugins/crew/skills/hub/agents/release.md, plugins/crew/skills/hub/dist/crew.mjs
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —

Latest log:
- 2026-10-24: Director: ready, waits on P-020. At merge, Director must pass Release the P-023-specific Rollout step (restore generated files, update to base, rebuild, one commit, full_suite) since the rendered Release agent keeps old text until re-rendered.
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-023-bundles-built-at-release-escalations

## Progress log

- 2026-10-24: status draft → ready
- 2026-10-24: Director: ready, waits on P-020. At merge, Director must pass Release the P-023-specific Rollout step (restore generated files, update to base, rebuild, one commit, full_suite) since the rendered Release agent keeps old text until re-rendered.
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-023-bundles-built-at-release-escalations
- 2026-10-25: status in-progress → in-review
- 2026-10-25: QA: AC1-AC5 verified (checkpoints recorded). AC1 verify note and AC2 recall check text got identity flags injected inside the quoted argument by the guard (known BUG-017); checks themselves unaffected.
- 2026-10-25: status in-review → done

## Outcome
An open escalation about a plan or an item now holds only that document: `run --check` reports GO while any open plan or item is unheld and prints a `HELD` line per held document (`--json` carries `held`); it stops on an escalation with no ref or about the idea or a goal, and when holds cover everything open. `drift` leaves out changed files `.gitattributes` marks `linguist-generated` (the hub's dist/ and the skill scripts). Release rebuilds the generated files with the new `hub.build` on the current base and commits them in the plan's one commit; the Developer and Release instructions, README and team skill say so.
Learnings: K-2026-10-25-don-t-symlink-node-modules-into
