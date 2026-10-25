---
id: SPIKE-002
type: spike
title: Non-developer agents must work on the plan's branch to move or review it
status: new
priority:
goal: G-003
plan:
created: 2026-10-23
closed:
---

# SPIKE-002: Non-developer agents must work on the plan's branch to move or review it

## Summary
store.find reads plans from the current worktree only, so the PM completing, QA recording evidence on and the Architect reviewing a plan in progress must switch the shared checkout to its branch, or run in their own worktree (found in T4). Decide: isolation: worktree for QA/Architect/PM too, or let moves write plan files on their branch.

## Question
Can the PM, QA and the Architect move, record evidence on and review a plan in progress without switching the shared checkout to its branch? If not, which fix: `isolation: worktree` for those roles, or moves writing the plan file on its branch?

**Already answered by the plan-worktree work, so this spike is obsolete (Architect, 2026-10-26).** Checked against main a4a4f99:
- Hub documents have one home, the main checkout, committed on the base branch by every hub write (P-026, K-2026-10-25-hub-documents-have-one-home-the-main). `Store.find` → `docs` → `plans()` reads that home (`hubHome`, core/work/hubstate.ts) from any checkout, so a move, a checkpoint or `review` run in the main checkout or in any worktree reads and writes the same plan file.
- With `hub.plan_worktrees` (on in this repo; `init` writes `true` in any git repo, commands/work/setup.ts) every plan has one shared worktree for its code. `review` and the checks run there through `store.planHome` (commands/work/review.ts, execution.ts), so no role needs a switched checkout or a worktree of its own. That is why `agents.ts` gives `isolation: worktree` only to the developer, and only when plan worktrees are off.
- P-039 dropped the branch-copy overlay when plan worktrees are on (K-2026-10-25-plan-branch-reads-store-plans-true-apply), so there are no stale branch copies left to read.
- The original problem remains only in the legacy branch-per-plan mode (`hub.plan_worktrees: false`, still the in-code default in core/work/model.ts for configs without the key), where a started plan's state lives on its `plan/*` branch (K-2026-10-25-without-hub-plan-worktrees-the-default). `doctor` already warns on that mode ("plan-worktrees"), and the fix chosen for it is to turn plan worktrees on, not either option this spike proposed.

Suggested triage: reject as obsolete (answered by P-026, P-036 and P-039). Should branch-per-plan mode later need non-developer moves from the main checkout, that is a new item scoped to that mode.

## Timebox
None needed if rejected. If the PM wants the branch-per-plan residue confirmed first: 1 hour, one e2e scenario in a `plan_worktrees: false` repo (developer starts a plan in a worktree, PM runs `move … done` and QA runs `checkpoint` from the main checkout), recorded under Findings.

## Output

## Findings

## Notes
