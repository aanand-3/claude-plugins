---
id: P-082
title: Ignore packages/crew/.vitest/ so QA reporter output is never committed
goal:
items: CHORE-032
touches: packages/crew/.gitignore
depends_on:
status: draft
branch: plan/P-082-ignore-packages-crew-vitest-so-qa
pr:
created: 2026-10-27
started:
completed:
---

# P-082: Ignore packages/crew/.vitest/ so QA reporter output is never committed

## Context
CHORE-032 (G-007, found on P-062): QA ran vitest with `--reporter=json` / `--reporter=junit`, which wrote
`packages/crew/.vitest/json/output.json` and `packages/crew/.vitest/junit/output.xml`. Nothing ignores that directory, so
checkpoints 672a8f0 and 1b5be25 committed the reports on plan/P-062 and the plan bounced in review. With several plans
in flight and QA running reporters in every plan worktree, this will recur until the directory is ignored.

Checkpoint staging already honours ignore rules: `commitWork` (packages/crew/src/hub/commands/work/execution.ts) commits
only `git.codeChanges`, which lists files from `git status --porcelain --untracked-files=all`
(packages/crew/src/hub/core/git.ts `changed`), and that skips ignored untracked files; `git add -A -- <files>` then
adds only those listed paths. So the fix is the ignore rule; no hub code changes.

## Scope
**In:**
- Add `.vitest/` to `packages/crew/.gitignore` (the package's own ignore file, next to `node_modules/`, `.sample/`,
  `preview/`).

**Out (explicitly not doing):**
- Changing checkpoint staging, `git.codeChanges` or vitest's config/reporter output paths.
- Removing the reports already committed on plan/P-062 (that branch's own review handles it; main never tracked them).

## Acceptance criteria
- [ ] AC1: In the plan worktree, `git check-ignore -q packages/crew/.vitest/json/output.json` and
  `git check-ignore -q packages/crew/.vitest/junit/output.xml` both exit 0.
- [ ] AC2: After a vitest run with the json and junit reporters in packages/crew (one small test file, e.g.
  `npx vitest run test/text.test.ts --reporter=json --outputFile.json=.vitest/json/output.json --reporter=junit --outputFile.junit=.vitest/junit/output.xml`),
  the files exist under packages/crew/.vitest/ yet `git status --porcelain --untracked-files=all -- packages/crew/.vitest`
  prints nothing, so a checkpoint has nothing of them to commit.
- [ ] AC3: The plan's diff against main changes only `packages/crew/.gitignore`, by one added line `.vitest/`
  (`git diff --stat main` lists only that file).

## Approach
One line in `packages/crew/.gitignore`. Directory-relative pattern `.vitest/` in the package's ignore file matches
only packages/crew/.vitest/ (and any nested one, which is also fine). No hub code changes: staging already follows
`git status`, which applies ignore rules (see Context). Run AC2's vitest in the plan worktree after
`npm ci --prefer-offline` in packages/crew (a fresh worktree has no node_modules), and delete the generated
packages/crew/.vitest/ afterwards.

## Design

## Tasks
- [ ] T1: Add `.vitest/` to packages/crew/.gitignore → verify: AC1's two `git check-ignore -q` commands exit 0.
- [ ] T2: Produce real reporter output and confirm git ignores it → verify: AC2's vitest command, then
  `git status --porcelain --untracked-files=all -- packages/crew/.vitest` is empty; `git diff --stat main` shows only
  packages/crew/.gitignore (AC3).

## Test plan
**Targeted checks:**
- AC1: `git check-ignore -q packages/crew/.vitest/json/output.json && git check-ignore -q packages/crew/.vitest/junit/output.xml`
  (manual command check, in the plan worktree).
- AC2: the vitest reporter run from AC2 in packages/crew, then the `git status --porcelain` check is empty.
- AC3: `git diff --stat main` in the plan worktree lists only packages/crew/.gitignore.

## Rollout & rollback
n/a: an ignore rule for local test output; revert the line to back out.

## Risks & open questions
- None: no tracked file lives under packages/crew/.vitest/ on main (`git ls-files | grep .vitest/` is empty), so the
  rule hides nothing that is committed.

## Handoff

## Progress log

## Outcome
