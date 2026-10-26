---
id: P-068
title: QA scratch folder per plan, ignored and cleared at done
goal:
items: CHORE-029
touches: packages/crew/src/hub/core/team/presets.ts, packages/crew/src/hub/core/git.ts, packages/crew/src/hub/commands/work/workflow.ts, packages/crew/src/hub/commands/work/planning.ts, .crew/.gitignore, plugins/crew/skills/hub/agents/qa.md, plugins/crew/skills/hub/references/model.md, packages/crew/test/hub/e2e/team.test.ts, packages/crew/test/hub/e2e/guard-writes.test.ts, packages/crew/test/hub/e2e/scratch.test.ts
depends_on:
status: ready
branch: plan/P-068-qa-scratch-folder-per-plan-ignored
pr:
created: 2026-10-26
started:
completed:
---

# P-068: QA scratch folder per plan, ignored and cleared at done

## Context
CHORE-029 (goal G-007). QA writes its hands-on check scripts as files, since the guard refuses inline scripts for
drafts-only roles (P-051), and its paths.write (lifecycle preset, `packages/crew/src/hub/core/team/presets.ts`) is only
`.crew/drafts/**`. So the scripts land in `.crew/drafts/`, nothing removes them (13 stale QA files for done plans on
2026-10-26, cleared by hand), and the SessionStart "unconverted drafts" warning (`views/checks.ts`) loses its meaning.
Convention K-2026-10-25-qa-and-other-roles-keep-throwaway-check sent them to the scratchpad or the plan's worktree,
neither of which QA may write under the guard; this plan replaces it with a per-plan scratch folder.

This repository's `.crew/policy.yaml` does not override QA's paths.write (`policy show --role qa`: preset lifecycle), so
no escalation is needed.

## Scope
**In:**
- `.crew/scratch/**` added to the QA role's paths.write in the lifecycle preset (QA only; director, pm and release keep
  `.crew/drafts/**` alone).
- `.crew/scratch/` is never committed: a tracked `.crew/.gitignore` with the line `scratch/` (in this repository, and
  written by `crew.mjs init` for new projects, appending the line if the file exists without it), and `scratch/` added to
  `NOT_CODE` in `core/git.ts` so `commitWork` (checkpoints, hand-over) never takes it even where the ignore is missing.
- `move P-### done` and `move P-### dropped` remove the main checkout's `.crew/scratch/P-###/` (the plan worktree is
  already gone by done: Release removes it at land, so scratch lives in the main checkout).
- QA's agent template (`plugins/crew/skills/hub/agents/qa.md`) says check scripts go in the main checkout's
  `.crew/scratch/P-###/`, never in `.crew/drafts/` (drafts stay for documents that become hub documents, e.g. BUG drafts).
- `references/model.md`: the `.crew/` layout lists `scratch/`, and the line on drafts-only roles mentions QA's scratch.

**Out (explicitly not doing):**
- Any change to the guard's inline-script rule (scripts still run as files) or to how the guard matches paths.write.
- Enforcing that QA writes only its own plan's folder (a glob cannot name the plan; the template sets the convention).
- Rendering `.claude/agents/crew-qa.md` and refreshing `.crew/templates/agents/qa.md` (both protected: the human runs
  `crew.mjs init`/`agents` after landing; see Rollout).
- Scratch for other roles; cleaning existing files in `.crew/drafts/`.

## Acceptance criteria
- [ ] AC1: Under the lifecycle preset, `crew.mjs policy show --role qa` lists paths.write `.crew/drafts/**, .crew/scratch/**`, and the guard allows the QA role a Write tool call and a Bash file write to `.crew/scratch/P-001/check.sh` and running `bash .crew/scratch/P-001/check.sh`.
- [ ] AC2: The guard still denies the QA role a write to any path outside `.crew/drafts/**` and `.crew/scratch/**` (e.g. `src/x.ts`, `.crew/plans/x.md`), and the pm, director and release roles a write to `.crew/scratch/P-001/x.sh`.
- [ ] AC3: After `crew.mjs init`, `.crew/.gitignore` contains `scratch/` (created, or the line appended to an existing file, never duplicated), and a file under `.crew/scratch/P-001/` does not appear in `git status --porcelain`.
- [ ] AC4: `git.codeChanges` never returns a path under `.crew/scratch/`, even with no ignore rule: a checkpoint/hand-over commit in a plan worktree holding `.crew/scratch/P-001/x.sh` (unignored) does not include it.
- [ ] AC5: `move P-### done` removes the main checkout's `.crew/scratch/P-###/` and leaves other plans' scratch folders; `move P-### dropped` does the same; a move with no scratch folder succeeds as before.
- [ ] AC6: `plugins/crew/skills/hub/agents/qa.md` tells QA to write check scripts to the main checkout's `.crew/scratch/P-###/` and not to `.crew/drafts/`; this repository's `.crew/.gitignore` holds `scratch/`.

## Approach
- presets.ts: keep `DRAFTS` for director/pm/release; QA gets `{ paths: { write: [".crew/drafts/**", ".crew/scratch/**"] } }`.
- Ignore rule: `.crew/.gitignore` (tracked, so every checkout and worktree has it; not `.crew/scratch/.gitignore`, which
  `NOT_CODE` would keep out of the plan's commit). `init` in `commands/work/planning.ts` ensures the line.
- git.ts: `NOT_CODE` becomes `/^\.crew\/((plans|items|goals|knowledge|drafts|view|scratch)\/|idea\.md$)/`; update its doc comment.
- workflow.ts `move`: after the move is saved, for a plan reaching `done` or `dropped`, remove `<store.home>/.crew/scratch/<id>/`
  recursively if it exists (from any checkout; the path is the main checkout's, like hub documents). Removal failure is
  reported with `store.say`, never fails the move.
- Reuses: the guard's paths.write matching (works in every checkout), `store.home`.

## Design

## Tasks
- [ ] T1: Add `.crew/scratch/**` to QA's paths.write in presets.ts; update the team.test.ts policy-show expectation → verify: `cd packages/crew && npx vitest run test/hub/e2e/team.test.ts`
- [ ] T2: Guard tests for QA writing/running in `.crew/scratch/P-001/` allowed and other paths and other drafts-only roles denied → verify: `cd packages/crew && npx vitest run test/hub/e2e/guard-writes.test.ts`
- [ ] T3: `init` ensures `scratch/` in `.crew/.gitignore`; add `.crew/.gitignore` with `scratch/` to this repository → verify: `cd packages/crew && npx vitest run test/hub/e2e/scratch.test.ts -t gitignore`
- [ ] T4: Add `scratch` to `NOT_CODE` in git.ts → verify: `cd packages/crew && npx vitest run test/hub/e2e/scratch.test.ts -t commit`
- [ ] T5: `move` to done/dropped removes the main checkout's `.crew/scratch/P-###/` → verify: `cd packages/crew && npx vitest run test/hub/e2e/scratch.test.ts -t move`
- [ ] T6: QA template and model.md point scratch scripts to `.crew/scratch/P-###/`; record a convention superseding K-2026-10-25-qa-and-other-roles-keep-throwaway-check → verify: `grep -n "crew/scratch" plugins/crew/skills/hub/agents/qa.md plugins/crew/skills/hub/references/model.md` shows the lines

## Test plan
**Targeted checks:**
- AC1: `test/hub/e2e/team.test.ts` (policy show for qa) and `test/hub/e2e/guard-writes.test.ts` (QA Write/Bash write/run in `.crew/scratch/P-001/` allowed).
- AC2: `test/hub/e2e/guard-writes.test.ts` (QA write to `src/x.ts` and `.crew/plans/x.md` denied; pm/director/release write to `.crew/scratch/P-001/x.sh` denied).
- AC3: `test/hub/e2e/scratch.test.ts` — "gitignore": init creates/appends the line once; a scratch file is absent from `git status --porcelain`.
- AC4: `test/hub/e2e/scratch.test.ts` — "commit": with `.crew/.gitignore` removed, an in-progress plan's checkpoint commit in its worktree does not contain `.crew/scratch/P-001/x.sh`.
- AC5: `test/hub/e2e/scratch.test.ts` — "move": done and dropped remove only that plan's folder; done without a folder succeeds.
- AC6: manual — read `plugins/crew/skills/hub/agents/qa.md` and `.crew/.gitignore` in the plan's diff.
Run with `cd packages/crew && npm ci --prefer-offline` first in a fresh worktree (K-2026-10-26-a-fresh-plan-worktree-has-no-packages).

## Rollout & rollback
After landing, the human refreshes the vendored template and the rendered agent (`crew.mjs init` refreshes
`.crew/templates/agents/qa.md`; `crew.mjs agents` renders `.claude/agents/crew-qa.md`), both protected paths. Until then
QA's prompt still says drafts, but the guard already allows scratch. Rollback: revert the commit; leftover
`.crew/scratch/` folders are ignored files and can be deleted by hand.

## Risks & open questions
- QA writing to a plan worktree's own `.crew/scratch/` instead of the main checkout's would not be cleared at done; the
  worktree's removal at land deletes it anyway, so nothing accumulates.
- `move` from a plan worktree must resolve the main checkout (`store.home`), not the worktree's `.crew/`.

## Handoff

## Progress log

- 2026-10-26: status draft → ready

## Outcome
