---
id: P-054
title: suite --ref runs in the plan's worktree
goal: G-007
items: BUG-035
touches: packages/crew/src/hub/commands/work/suite.ts, packages/crew/src/hub/commands/work/suite.reg.ts, packages/crew/src/hub/commands/work/land.ts, packages/crew/test/hub/e2e/suite.test.ts, packages/crew/test/hub/e2e/land.test.ts, plugins/crew/docs/reference.md
depends_on:
status: in-review
branch: plan/P-054-suite-ref-runs-in-the-plans-worktree
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
---

# P-054: suite --ref runs in the plan's worktree

## Context
BUG-035 (G-007, S2/P1). `suite --ref P-###` runs `hub.full_suite` in the caller's checkout, so from the main checkout it tests main, not the plan, yet records a green suite for the plan. P-049 merged (b249d20) on such a run; nothing in the hub reads the record before a merge, and the record carries no sha. The quality gate can pass without testing the plan.

## Scope
**In:**
- `suite --ref P-###` runs in that plan's worktree, or refuses when the plan has none; without `--ref` it keeps the caller's checkout.
- The suite record carries the tested HEAD sha and branch.
- The merge step accepts only a green suite for the plan's ref, its worktree and the plan branch's current sha. The merge step is `land` (P-032), which runs the suite itself in the plan's worktree. It now also checks that the branch tip it squashes is the sha the suite tested.
- Release's instructions: nothing left to drop. Since P-032, `release.md` lands through `land` and no longer runs `suite --ref` by hand or names a worktree precondition (checked 2026-10-26).

**Out (explicitly not doing):**
- Changing what `hub.full_suite` runs, or the suite slot and queueing.

## Acceptance criteria
- [ ] AC1 · `suite --ref P-001` from the main checkout, for a plan with a worktree, runs `hub.full_suite` with cwd in that worktree (a suite command `pwd > where.txt` writes the file there). The `suites --json` record has `worktree` = the plan's worktree, `sha` = its HEAD and `branch` = the plan's branch. `suites` text shows the short sha.
- [ ] AC2 · `suite --ref P-001` for a plan with no worktree runs in the caller's checkout only when that checkout is on the plan's branch. Otherwise it fails with `P-001 has no worktree and this checkout is on <branch>, not <plan branch>: run it where the plan's branch is checked out.`, runs nothing and writes no record. An unknown plan fails as `checkRef` does. `suite` without `--ref`, or with a non-plan ref, runs in the caller's checkout as today, and its record carries that checkout's sha and branch.
- [ ] AC3 · `land`: if the plan's branch tip is no longer the sha its suite tested when the squash starts, it stops with `<P-###>: its branch moved during the full suite (tested <short>, now <short>); run \`land <P-###>\` again`. The plan stays accepted, and main and the worktree are unchanged. Otherwise it lands as today, and the suites record for that land has the sha of the commit it squashed.
- [ ] AC4 · Regression test: AC1's case in `test/hub/e2e/suite.test.ts` fails on main (the suite runs in the main checkout) and passes after the fix.

## Approach
- **suite.ts.**
  - `SuiteRecord` gains `sha: string | null` and `branch: string | null`. `runSuite` reads both from `cwd` before running: `git -C cwd rev-parse HEAD`, then `git -C cwd branch --show-current` (null when detached or outside git). It writes them to the record and returns `sha`. Old records without the fields still parse.
  - `suiteCmd(store, ref)`: for a `P-###` ref, `store.checkRef(ref, "plan")`, then cwd = `store.planWorktrees().get(pid)`. Failing that, the caller's checkout when its current branch is the plan's `branch`; failing that, the AC2 refusal, before any slot is taken. Other refs and no ref keep `store.ws.root`.
  - `suitesCmd` text adds the 7-character sha after the ref.
  - suite.ts stays under 300 lines (193 now).
- **land.ts.** After step 5's `runSuite` (cwd = the plan worktree, as today), and before `squash`, compare `git rev-parse <branch>` with the suite's `sha`. On a mismatch, throw `Stop` with AC3's text: a Stop leaves the plan accepted, like "base kept moving". This is a few lines; land.ts is 200.
- **suite.reg.ts.** The usage line becomes `  suite [--ref P-###]   run hub.full_suite under a slot shared by every worktree, in P-###'s worktree (Release)`, aligned with the others. The `suites` tool description lists `sha, branch`. Neither `suite` nor `suites` is in `test/hub/registry-before.json` (added by P-043), so the registry test is unaffected, and no tool is added (mcp.test.ts unchanged).
- Tests: suite.test.ts uses its existing repo helpers plus a plan with a worktree (the `start` flow land.test.ts uses for its worktree cases).

## Tasks
- [x] T1: `sha`/`branch` in `SuiteRecord` and `runSuite`; the `suites` text sha → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/suite.test.ts` (AC1 record fields)
- [x] T2: `suite --ref P-###` resolves the plan's worktree, the branch fallback and the refusal → verify: `npx vitest run test/hub/e2e/suite.test.ts -t "worktree"`. Cases: from main with a worktree (pwd file in the worktree, record fields); no worktree on another branch (refusal, no record, no slot left); no worktree but on the plan's branch (runs there); no `--ref` (caller's checkout, as before) (AC1, AC2, AC4)
- [x] T3: `land`'s tested-sha check → verify: `npx vitest run test/hub/e2e/land.test.ts`. A new case uses a `full_suite` that commits to the plan branch in the worktree (`git commit --allow-empty -m moved`): land stops with AC3's text, the plan stays accepted, main is unchanged. The existing land cases stay green, and a landed plan's suites record has the squashed sha (AC3)
- [x] T4: usage line and `suites` tool description → verify: `npx vitest run test/hub/registry.test.ts`; `npm run typecheck`

## Test plan
**Targeted checks** (from `packages/crew/`; the e2e suites drive the built `dist/crew.mjs`: `npm run build` first, then `git checkout -- plugins/crew/skills/hub/dist`):
- AC1, AC2, AC4 → `npx vitest run test/hub/e2e/suite.test.ts`
- AC3 → `npx vitest run test/hub/e2e/land.test.ts`
- Registration → `npx vitest run test/hub/registry.test.ts test/docs.test.ts`; `npm run typecheck`. `npm run build` (or `npm run docs`) regenerates the `mcp-tools` and `commands` blocks of `plugins/crew/docs/reference.md`; they are source, not generated files, so the checkpoint commits them with the code

## Rollout & rollback
n/a — internal hub change; ships in the bundle. Rollback: revert the commit.

## Risks & open questions
- Where the gate lives: `land`, which already runs the suite itself in the plan's worktree. A separate check on `suites.jsonl` records before a merge would add a second gate that `land` doesn't need. Hand merges (plans completed before `accepted` existed) stay outside the gate, as they are today.
- `suite --ref` for a non-plan ref keeps the caller's checkout. Such records are labels only, and nothing reads them as a merge gate.

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-054: suite --ref runs in the plan's worktree [in-review] tasks 4/4 — claimed by Arpit Anand (developer:a9f31b43a22b088e2)
- last checkpoint 2026-10-26 07:05 at T4 (8281fe5) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-054-suite-ref-runs-in-the-plans-worktree/packages/crew && npm run build >/dev/null 2>&1 && npx vitest run test/hub/e2e/suite.test.ts ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-054-suite-ref-runs-in-the-plans-worktree checkout -- plugins; exit $r (AC 1,2,4)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-054-suite-ref-runs-in-the-plans-worktree/packages/crew && npm run build >/dev/null 2>&1 && npx vitest run test/hub/e2e/land.test.ts ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-054-suite-ref-runs-in-the-plans-worktree checkout -- plugins; exit $r (AC 3)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-054-suite-ref-runs-in-the-plans-worktree/packages/crew && npx vitest run test/hub/registry.test.ts && npm run typecheck
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-054-suite-ref-runs-in-the-plans-worktree/packages/crew && npm run build >/dev/null 2>&1 && npx vitest run test/docs.test.ts test/hub/registry.test.ts test/mcp.test.ts test/hub/e2e/suite.test.ts test/hub/e2e/land.test.ts ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-054-suite-ref-runs-in-the-plans-worktree checkout -- plugins/crew/skills; exit $r (AC 1,2,3,4)
- evidence: AC1 ✓ (self), AC2 ✓ (self), AC3 ✓ (self), AC4 ✓ (self)

Latest log:
- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-054-suite-ref-runs-in-the-plans-worktree

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-054-suite-ref-runs-in-the-plans-worktree
- 2026-10-26: status in-progress → in-review

## Outcome
`suite --ref P-###` now runs `hub.full_suite` in the plan's worktree (else this checkout when it is on the plan's branch, else it refuses before taking a slot); every suite record carries the tested HEAD `sha` and `branch`, and `suites` shows the short sha. `land` stops (plan stays accepted) when the plan branch's tip is not the sha its suite tested. The AC1 regression case fails against main's suite.ts (where.txt not in the worktree) and passes now. Note on AC3's text: `land` prints every Stop as `P-###: not landed — <reason>; it stays accepted with its worktree`, so the line reads `P-001: not landed — its branch moved during the full suite (tested …, now …); run \`land P-001\` again; …`. Existing suite tests switched from P-00n to BUG-00n refs, since a P-### ref is now checked as a plan.
Learnings: K-2026-10-26-since-p-025-npm-run-build-also
