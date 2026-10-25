---
id: P-038
title: Plan worktrees check out no hub documents
goal: G-007
items: CHORE-017
touches: packages/crew/src/hub/commands/work/planning.ts, packages/crew/test/hub/e2e/sparse-worktrees.test.ts
depends_on:
status: ready
branch: plan/P-038-plan-worktrees-check-out-no-hub
pr:
created: 2026-10-25
started:
completed:
---

# P-038: Plan worktrees check out no hub documents

## Context
Follow-up to P-026 (W0-b in `.crew/drafts/the-crew-team-was-pure-reef.md`), CHORE-017. Since P-026 the hub documents (`.crew/{plans,items,goals,knowledge}/`, `.crew/idea.md`) live in the main checkout only, and every hub command reads and writes them there. But a plan worktree is a full checkout of the plan branch, so it still holds main's committed copies as of the moment it was cut. They are read-only (the guard refuses writes) and go stale at the next hub commit. An agent that reads `.crew/plans/P-###.md` in its worktree instead of running `crew.mjs context` sees old state: an old status, missing items, superseded knowledge.

The fix: plan worktrees are sparse checkouts that leave those paths out. The setup files stay (`.crew/config.yaml`, `.crew/policy.yaml`, `.crew/templates/`, `.crew/bin/`), and git still tracks the hub paths on the branch, so merges and the squash behave as before.

## Scope
**In:**
- `openPlanWorktree` (planning.ts), used by `new-plan` and by `start` for a plan with no worktree yet, creates the worktree as a sparse checkout (non-cone patterns) that includes everything except the hub's state paths (`STATE_PATHS` in core/work/hubstate.ts: `.crew/plans/`, `.crew/items/`, `.crew/goals/`, `.crew/knowledge/`, `.crew/idea.md`).
- The main checkout stays a full checkout, and its `git status` is unchanged.
- A refusal later in the command still removes the worktree (the existing `ws.onAbort`).

**Out (explicitly not doing):**
- Converting worktrees that already exist (this repo's open plan worktrees): Rollout gives the one-line command; no code path rewrites a live worktree.
- Hiding `.crew/templates`, `.crew/config.yaml` or `.crew/policy.yaml` (setup, not state; agents and tests read them).
- Solo mode (`plan_worktrees` off): no worktree, nothing changes.
- The guard's refusal of hub-document writes in worktrees (P-026) stays as a second line of defence.

## Acceptance criteria
- [ ] AC1 · In a throwaway repo with `hub.plan_worktrees: true` and committed hub documents, `new-plan` creates a worktree in which `.crew/plans/`, `.crew/items/`, `.crew/goals/`, `.crew/knowledge/` and `.crew/idea.md` don't exist, while `.crew/config.yaml`, `.crew/templates/` and every non-hub tracked file do.
- [ ] AC2 · `git status --porcelain` is empty in the new worktree and unchanged in the main checkout, and `ls .crew/plans` in the main checkout still lists every plan.
- [ ] AC3 · Hub commands run from inside the sparse worktree work as before: `context`, `checkpoint` and `log` on the plan, and `new-item`, all read and write the main checkout's documents.
- [ ] AC4 · A commit made on the plan branch in the sparse worktree and merged (or squash-merged) into main leaves main's `.crew/plans` and `.crew/items` exactly as they were. The excluded paths are neither deleted nor changed by it.
- [ ] AC5 · `start` of a plan specced before plan worktrees (no worktree yet) opens its worktree sparse too; a `new-plan` refused after the worktree was created (e.g. an unknown item) leaves no worktree and no branch behind.
- [ ] AC6 · The existing worktree tests pass unchanged: `test/hub/e2e/worktrees.test.ts` and `test/hub-worktrees.test.ts`.

## Approach
- In `openPlanWorktree`: `git worktree add --no-checkout …` (same arguments as today), then in the new worktree `git sparse-checkout set --no-cone '/*' '!/.crew/plans/' '!/.crew/items/' '!/.crew/goals/' '!/.crew/knowledge/' '!/.crew/idea.md'` (patterns built from `STATE_PATHS`), then `git checkout` there to populate it. In a linked worktree git keeps the sparse patterns per worktree (`<gitdir>/info/sparse-checkout`, `core.sparseCheckout` in its `config.worktree`, enabling `extensions.worktreeConfig` once), so the main checkout isn't affected. Check AC2 against git 2.39 (this repo's version) in the test.
- If `sparse-checkout` fails (very old git), fall back to a full checkout and print one line saying so; the worktree still works, with stale copies, as today.
- planning.ts is 181 lines; the change stays a few lines plus a small helper.
- **Reuse:** `STATE_PATHS` (hubstate.ts, imported only), `git.git`, the plan-worktree setup in `test/hub/e2e/worktrees.test.ts` (copy it into the new test file; don't edit that file).

## Tasks
- [ ] T1: the test file with AC1–AC5, failing on today's code (the worktree holds `.crew/plans`) → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/sparse-worktrees.test.ts` fails on AC1
- [ ] T2: sparse `openPlanWorktree` with the fallback → verify: `npm run build && npx vitest run test/hub/e2e/sparse-worktrees.test.ts` passes (AC1–AC5)
- [ ] T3: nothing else moved → verify: `npx vitest run test/hub/e2e/worktrees.test.ts test/hub-worktrees.test.ts`; `npm run typecheck` (AC6)

## Test plan
**Targeted checks** (from `packages/crew/`, after `npm run build`):
- AC1–AC5 → `npx vitest run test/hub/e2e/sparse-worktrees.test.ts`
- AC6 → `npx vitest run test/hub/e2e/worktrees.test.ts test/hub-worktrees.test.ts`
- `npm run typecheck`

## Rollout & rollback
- Takes effect in this repo once `.crew/bin/crew.mjs` is refreshed (P-024 / the human). Worktrees opened before that keep their full checkout. To make one sparse by hand (safe: the hub paths there are read-only copies), run in it: `git sparse-checkout set --no-cone '/*' '!/.crew/plans/' '!/.crew/items/' '!/.crew/goals/' '!/.crew/knowledge/' '!/.crew/idea.md'`.
- Rollback: revert the plan's commit; in a sparse worktree, `git sparse-checkout disable` restores the files.

## Risks & open questions
- Non-cone sparse patterns are deprecated-in-favour-of-cone but supported; cone mode can't exclude a single file (`idea.md`) below the root. If git ever drops non-cone, the fallback keeps worktrees working.
- `extensions.worktreeConfig` gets set in the repository's shared config the first time; it is harmless for the main checkout and for git ≥ 2.20.
- Shares no file with P-027, P-028, P-029, P-030 or P-037, so it runs beside any of them. Overlaps P-039 on planning.ts (different functions); staffing sequences them, and neither needs the other's code.

## Handoff

## Progress log

- 2026-10-25: status draft → ready

## Outcome
