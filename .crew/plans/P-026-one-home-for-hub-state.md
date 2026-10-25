---
id: P-026
title: One home for hub state
goal: G-007
items: FEAT-034, BUG-018
touches: packages/crew/src/hub/core/store.ts, packages/crew/src/hub/core/git.ts, packages/crew/src/hub/core/workspace.ts, packages/crew/src/hub/core/work/worktrees.ts, packages/crew/src/hub/core/work/hubstate.ts, packages/crew/src/hub/commands/work/planning.ts, packages/crew/src/hub/commands/work/workflow.ts, packages/crew/src/hub/commands/work/gather.ts, packages/crew/src/hub/mcp.ts, packages/crew/src/hub/server.ts, packages/crew/src/hub/commands/team/guard.ts, packages/crew/src/hub/cli.ts, packages/crew/test/hub-worktrees.test.ts, packages/crew/test/hub/e2e/worktrees.test.ts, plugins/crew/skills/hub/agents/director.md, plugins/crew/skills/hub/agents/architect.md, plugins/crew/skills/team/SKILL.md, plugins/crew/skills/hub/SKILL.md
depends_on:
status: done
branch: plan/P-026-one-home-for-hub-state
pr:
created: 2026-10-25
started: 2026-10-25
completed: 2026-10-25
assignee: developer
---

# P-026: One home for hub state

## Context
Wave 0 of G-007 (design: `.crew/drafts/the-crew-team-was-pure-reef.md`); delivers BUG-018 and FEAT-034. With `plan_worktrees`, every plan worktree has its own copy of `.crew/`: `new-plan` writes the plan file inside the new worktree (planning.ts `newPlan`), `carryHub` moves main's uncommitted items, goals, knowledge and idea there, and the store overlays worktree copies on reads (`WorktreeCopies`, store.ts `overlay`, `plans`). State reaches main only when Release commits the plan, so it forks: BUG-018 itself lived only in P-023's worktree, P-021, P-024 and P-025 exist only in their worktrees, IDs get reused (BUG-015/BUG-018, SPIKE-003/SPIKE-004), and Q-d4e060 came from it. Executive decision 2026-10-25: hub state lives in the main checkout only; worktrees carry code only.

## Scope
**In:**
- The store reads and writes `.crew/` in the main checkout (the repository's first worktree), whichever checkout runs the command. Code, drift and checks still run where the plan's work is (`planHome`).
- With `plan_worktrees`, every command that changed hub documents (`.crew/{plans,items,goals,knowledge}/**`, `.crew/idea.md`) commits them on the base branch in the main checkout, `chore(hub): <command> <refs>`, with only those paths (`git commit --only`), under a lock. If the main checkout is not on the base branch, the command refuses before writing.
- `new-plan` writes the plan in the main checkout; `carryHub`, `restore` and the `start` carry are removed; `WorktreeCopies` and the overlays go.
- `migrate --gather`: copies every hub document a worktree holds that main lacks or has older, into main; clashing IDs (same ID, different document) are renumbered and reported; the worktree copies are then removed so Release never commits them; the result is committed like any hub change.
- The guard refuses Write/Edit of hub documents inside a plan worktree (they live in the main checkout).
- Agent and skill text that describes the old model (director, architect, team skill, hub skill).

**Out (explicitly not doing):**
- Live activity, dispatch, merge queue, WIP commits (later G-007 plans).
- Reading plans from committed `plan/*` branches (`plans(true)`): left as is for legacy branches; a follow-up can remove it once nothing uses it.
- Cross-machine sync (SPIKE-001); pushing.

## Acceptance criteria
- [ ] AC1 · From a plan worktree, `new-item`, `move` and `log` change the files in the main checkout's `.crew`, and `git status` in the worktree shows no `.crew` change.
- [ ] AC2 · `new-plan` with plan_worktrees writes the plan file in the main checkout's `.crew/plans` and still creates the worktree; main's uncommitted hub files stay in main.
- [ ] AC3 · With plan_worktrees, each hub write is committed on the base branch as `chore(hub): …` with only hub document paths; other uncommitted files in the main checkout stay uncommitted; with the main checkout off the base branch the command refuses and writes nothing.
- [ ] AC4 · `migrate --gather` brings worktree-only and newer worktree copies into main, renumbers a clashing ID, removes the worktree copies, and a second run reports nothing to gather.
- [ ] AC5 · The guard refuses an agent's Write to `<plan worktree>/.crew/items/X.md` and allows a Write to the same path in the main checkout.

## Approach
- **Home.** `git.mainWorktree()` = the first `git worktree list` entry (falls back to the root). `Store.home` is that path; `dir`, `dirs`, `ideaPath`, `knowledgeDir`, config, policy and the ledger root on it. `ws.root` stays the checkout the command runs in (code, `planHome`, drift). `rel()` shows hub paths relative to the home so messages read `.crew/plans/…` from any checkout.
- **Commit.** Workspace gains an after-flush step; the store registers one that, when plan_worktrees is on, lists hub document paths dirty in the home (`git status` on the doc dirs and idea.md), `git add` and `git commit --only -m "chore(hub): …" -- <paths>` in the home, under a lock beside the ledger's (`acquireLock`). Before any write, the store checks the home is on the base branch (a pre-flush hook, so a refusal writes nothing). Hand edits to hub documents in the main checkout are swept into the next hub commit: they are hub state too.
- **Gather.** In gather.ts (migrate.ts stays the project-kit conversion), `migrate --gather`: for each plan worktree, its dirty hub documents; same path absent in main or older → copy; same ID under a different path with different content → renumber with `nextId` and report. Then remove the worktree copies (`git checkout --` for tracked, delete for untracked).
- **Guard.** guard.ts: a Write/Edit/MultiEdit/NotebookEdit target, or a Bash write target, under `<a plan worktree>/.crew/(plans|items|goals|knowledge|idea.md)` is refused with the main checkout's path in the message.
- **Reuse:** `acquireLock`/`releaseLock` (ledger.ts), `git.dirty`, `git.worktrees`, `nextId`.

## Tasks
- [x] T1: `git.mainWorktree()`; Store roots hub paths at the home; overlays and `WorktreeCopies` removed → verify: `npx vitest run test/hub-worktrees.test.ts test/hub/e2e/worktrees.test.ts` (updated for the new model) (AC1)
- [x] T2: `new-plan` writes in the home; `carryHub`/`restore`/start carry removed → verify: e2e worktrees test asserts the plan file in main and none in the worktree (AC2)
- [x] T3: after-flush hub commit and the base-branch refusal → verify: "one home" cases in `test/hub-worktrees.test.ts` and the off-base case in the e2e worktrees test (AC3)
- [x] T4: `migrate --gather` → verify: the gather case in `test/hub-worktrees.test.ts` (AC4)
- [x] T5: guard refuses hub document writes in plan worktrees → verify: "the guard keeps hub documents in the main checkout" in the e2e worktrees test (AC5)
- [x] T6: agent and skill text: director.md, architect.md, team/SKILL.md, hub/SKILL.md describe the main-checkout model; knowledge superseded → verify: `grep -rn "travel with the next plan\|nothing is committed to main on its own" plugins/crew/skills` finds nothing

## Test plan
**Targeted checks** (from `packages/crew/`, after `npm run build`):
- Regression test (BUG-018): `test/hub/e2e/worktrees.test.ts` "a hub write from a plan worktree lands in the main checkout" fails before the fix (the item is written in the worktree) and passes after
- AC1, AC2 → `npx vitest run test/hub-worktrees.test.ts test/hub/e2e/worktrees.test.ts`
- AC3 → `npx vitest run test/hub-worktrees.test.ts -t "one home"` and `test/hub/e2e/worktrees.test.ts -t "off the base branch"`
- AC4 → `npx vitest run test/hub-worktrees.test.ts -t "gather"`
- AC5 → `npx vitest run test/hub/e2e/worktrees.test.ts -t "keeps hub documents in the main checkout"`
- `npm run typecheck`

## Rollout & rollback
- After merge: refresh `.crew/bin/crew.mjs` (P-024 / human), re-render `.claude/agents/**` (protected), then run `migrate --gather` once in this repo and close BUG-015 and SPIKE-003 as duplicates.
- Projects without plan_worktrees are unchanged (the home is their only checkout; no auto-commit).
- Rollback: revert the plan's commit; hub commits already on main stay valid documents.

## Risks & open questions
- Concurrent hub commits from parallel agents: serialized by the lock; `git commit --only` never takes another file.
- A user who keeps the main checkout on a feature branch: hub writes refuse with the reason; they switch back or turn plan_worktrees off.
- Open plan worktrees created before this plan still hold `.crew` copies until gather runs.

## Handoff

_Generated 2026-10-25 by `crew.mjs handoff` from the ledger._

- P-026: One home for hub state [in-review] tasks 6/6 — claimed by Arpit Anand (developer:p026-main)
- last checkpoint 2026-10-25 04:42 at T6 (5fd068b) by Arpit Anand; since then 0 commit(s), 35 uncommitted file(s): .crew/items/BUG-018-plan-state-forks-across-worktree-copies.md, packages/crew/src/hub/cli.ts, packages/crew/src/hub/commands/team/guard.ts, packages/crew/src/hub/commands/work/planning.ts, packages/crew/src/hub/commands/work/workflow.ts, packages/crew/src/hub/core/git.ts, packages/crew/src/hub/core/store.ts, packages/crew/src/hub/core/work/worktrees.ts
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —

Latest log:
- 2026-10-25: review: changes requested — AC3 / convention 'A refused command writes nothing': the off-base refusal runs too late. In core/workspace.ts flush(), the beforeFlush hooks run before the watchers' before(), and Ledger.commit (core/memory/ledger.ts, appendFileSync) and notify's announcement (commands/team/autonomy.ts) are beforeFlush hooks. So with the main checkout off the base branch, 'move P-001 ready' and 'log P-001 note' exit 1 with the refusal, yet append 'move draft->ready' and 'log' events to the ledger (reproduced with the rebuilt bundle: ledger went 0 -> 2 events, plan stayed draft), and notify.command would announce a change that never happened; 'start' on a legacy plan would record its claim the same way. Fix: in flush(), run every watcher's before(paths) ahead of the beforeFlush hooks, inside the same try so a refusal aborts (no hook stages hub documents, so the paths are already complete then). Test: extend 'plan worktrees refuse hub writes while the main checkout is off the base branch' in test/hub/e2e/worktrees.test.ts with a 'move' (or 'log') on an existing plan and assert the exit code is non-zero, the plan file is unchanged, and the ledger ('ledger --json') has no new events. Non-blocking, take or leave: the hub commit subject for new-plan names no plan ID ('chore(hub): new-plan' / 'new-plan BUG-001', because the label is built from argv), so consider appending the created ID.
- 2026-10-25: status in-review → in-progress — changes requested: AC3 / convention 'A refused command writes nothing': the off-base refusal runs too late. In core/workspace.ts flush(), the beforeFlush hooks run before the watchers' before(), and Ledger.commit (core/memory/ledger.ts, appendFileSync) and notify's announcement (commands/team/autonomy.ts) are beforeFlush hooks. So with the main checkout off the base branch, 'move P-001 ready' and 'log P-001 note' exit 1 with the refusal, yet append 'move draft->ready' and 'log' events to the ledger (reproduced with the rebuilt bundle: ledger went 0 -> 2 events, plan stayed draft), and notify.command would announce a change that never happened; 'start' on a legacy plan would record its claim the same way. Fix: in flush(), run every watcher's before(paths) ahead of the beforeFlush hooks, inside the same try so a refusal aborts (no hook stages hub documents, so the paths are already complete then). Test: extend 'plan worktrees refuse hub writes while the main checkout is off the base branch' in test/hub/e2e/worktrees.test.ts with a 'move' (or 'log') on an existing plan and assert the exit code is non-zero, the plan file is unchanged, and the ledger ('ledger --json') has no new events. Non-blocking, take or leave: the hub commit subject for new-plan names no plan ID ('chore(hub): new-plan' / 'new-plan BUG-001', because the label is built from argv), so consider appending the created ID.
- 2026-10-25: Review fix: Workspace.flush runs the base-branch check before the beforeFlush hooks, so an off-base refusal appends no ledger event and sends no notify; the off-base e2e test now asserts an unchanged plan and ledger for move and log. new-plan's hub commit names the new plan. Full suite 278/279 before the test fix, worktree suites 19/19 after.

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-026-one-home-for-hub-state
- 2026-10-25: status in-progress → in-review
- 2026-10-25: review: changes requested — AC3 / convention 'A refused command writes nothing': the off-base refusal runs too late. In core/workspace.ts flush(), the beforeFlush hooks run before the watchers' before(), and Ledger.commit (core/memory/ledger.ts, appendFileSync) and notify's announcement (commands/team/autonomy.ts) are beforeFlush hooks. So with the main checkout off the base branch, 'move P-001 ready' and 'log P-001 note' exit 1 with the refusal, yet append 'move draft->ready' and 'log' events to the ledger (reproduced with the rebuilt bundle: ledger went 0 -> 2 events, plan stayed draft), and notify.command would announce a change that never happened; 'start' on a legacy plan would record its claim the same way. Fix: in flush(), run every watcher's before(paths) ahead of the beforeFlush hooks, inside the same try so a refusal aborts (no hook stages hub documents, so the paths are already complete then). Test: extend 'plan worktrees refuse hub writes while the main checkout is off the base branch' in test/hub/e2e/worktrees.test.ts with a 'move' (or 'log') on an existing plan and assert the exit code is non-zero, the plan file is unchanged, and the ledger ('ledger --json') has no new events. Non-blocking, take or leave: the hub commit subject for new-plan names no plan ID ('chore(hub): new-plan' / 'new-plan BUG-001', because the label is built from argv), so consider appending the created ID.
- 2026-10-25: status in-review → in-progress — changes requested: AC3 / convention 'A refused command writes nothing': the off-base refusal runs too late. In core/workspace.ts flush(), the beforeFlush hooks run before the watchers' before(), and Ledger.commit (core/memory/ledger.ts, appendFileSync) and notify's announcement (commands/team/autonomy.ts) are beforeFlush hooks. So with the main checkout off the base branch, 'move P-001 ready' and 'log P-001 note' exit 1 with the refusal, yet append 'move draft->ready' and 'log' events to the ledger (reproduced with the rebuilt bundle: ledger went 0 -> 2 events, plan stayed draft), and notify.command would announce a change that never happened; 'start' on a legacy plan would record its claim the same way. Fix: in flush(), run every watcher's before(paths) ahead of the beforeFlush hooks, inside the same try so a refusal aborts (no hook stages hub documents, so the paths are already complete then). Test: extend 'plan worktrees refuse hub writes while the main checkout is off the base branch' in test/hub/e2e/worktrees.test.ts with a 'move' (or 'log') on an existing plan and assert the exit code is non-zero, the plan file is unchanged, and the ledger ('ledger --json') has no new events. Non-blocking, take or leave: the hub commit subject for new-plan names no plan ID ('chore(hub): new-plan' / 'new-plan BUG-001', because the label is built from argv), so consider appending the created ID.
- 2026-10-25: Review fix: Workspace.flush runs the base-branch check before the beforeFlush hooks, so an off-base refusal appends no ledger event and sends no notify; the off-base e2e test now asserts an unchanged plan and ledger for move and log. new-plan's hub commit names the new plan. Full suite 278/279 before the test fix, worktree suites 19/19 after.
- 2026-10-25: status in-progress → in-review
- 2026-10-25: BUG-023: guard splices identity flags into quoted text that names the hub CLI (older than P-026, not an AC failure)
- 2026-10-25: status in-review → done

## Outcome
Hub documents now have one home. The store roots `.crew` at the main checkout from any checkout (`core/work/hubstate.ts`: `hubHome`). With plan_worktrees, every command that writes hub documents commits only those, on the base branch (`chore(hub): <command> <IDs>`, under a lock), and refuses before writing while the main checkout is off the base branch. `new-plan` writes the spec in the main checkout; `carryHub`, the start-time spec move and `WorktreeCopies` are gone; `start` on a legacy branch brings the branch's live plan home. `migrate --gather` (`commands/work/gather.ts`) brings worktree copies home, renumbers clashing IDs and cleans the worktrees. The guard refuses agents' writes to hub documents in other checkouts. Agent and skill text describe the new model.
Deviations: the tests for AC3–AC5 live in `test/hub-worktrees.test.ts` and `test/hub/e2e/worktrees.test.ts` instead of new files; gather is its own module rather than part of migrate.ts. Follow-ups: CHORE-017 (keep stale hub copies out of plan worktrees), CHORE-018 (gather once in this repo, close duplicates, supersede overlay-era knowledge, drop plans(true)).
Learnings: K-2026-10-25-hub-documents-have-one-home-the-main
