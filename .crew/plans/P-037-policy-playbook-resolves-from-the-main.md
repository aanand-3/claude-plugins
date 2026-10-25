---
id: P-037
title: Policy playbook resolves from the main checkout
goal: G-007
items: CHORE-019
touches: packages/crew/src/hub/core/store.ts, packages/crew/src/hub/commands/team/policy.ts, packages/crew/src/hub/commands/team/agents.ts, packages/crew/src/hub/commands/team/guard.ts, packages/crew/test/hub/e2e/playbook-home.test.ts
depends_on:
status: in-review
branch: plan/P-037-policy-playbook-resolves-from-the-main
pr:
created: 2026-10-25
started: 2026-10-25
completed:
assignee: developer
---

# P-037: Policy playbook resolves from the main checkout

## Context
Follow-up to P-026 (W0-b in `.crew/drafts/the-crew-team-was-pure-reef.md`), CHORE-019. P-026 made `.crew/` (config, policy, ledger, documents) live in the main checkout, `store.home`, whichever checkout a command runs in. But every caller of `resolvePolicy(root, crewDir, …)` and `playbook(root, crewDir)` still passes `store.ws.root`, the checkout the command runs in, and `playbook()` resolves a relative `playbook.path` from `.crew/config.yaml` against that root (core/team/policy.ts: `resolve(root, path)`). The config is the main checkout's, so its relative path is meant from there. From a plan worktree (`.claude/worktrees/P-###-…`), `playbook: {path: ../org-playbook}` points to `.claude/worktrees/org-playbook`. The org layer is then skipped ("playbook … not found"), and its ceilings, role defaults and lessons are lost for every agent working in a worktree: the guard, `policy show/check`, `agents`, `recall`.

## Scope
**In:**
- Every policy and playbook resolution passes the hub's home: `Store.policy` and `Store.knowledge` (store.ts), `policyShow`/`policyFindings` (commands/team/policy.ts), `agents` (commands/team/agents.ts) and the guard's `decide` (commands/team/guard.ts) call `resolvePolicy(store.home, …)` / `playbook(store.home, …)`.
- An absolute path or `CREW_PLAYBOOK` behaves as today.

**Out (explicitly not doing):**
- Changing core/team/policy.ts (its `root` parameter keeps its meaning: the directory a relative playbook path is resolved from). That keeps this plan off P-024's and P-027's file.
- `agentRole(root, …)` in the guard: agent definitions (`.claude/agents/`) are per checkout and stay so.
- Any change to `.crew/policy.yaml`, `.crew/bin/**` or `.claude/agents/**` (human-reserved).

## Acceptance criteria
- [ ] AC1 · In a throwaway repo with plan worktrees and `.crew/config.yaml` setting `playbook: {path: ../<pb>}` (a sibling of the main checkout), `crew.mjs policy show`, run inside a plan worktree, lists the `org` layer and prints no "playbook … not found" hint, the same as from the main checkout.
- [ ] AC2 · From the same plan worktree, `crew.mjs recall --all` includes a playbook lesson (`lessons/**.md`), and `policy check` passes with an org ceiling applied.
- [ ] AC3 · The guard run with a plan worktree as `cwd` (hook JSON for a crew agent) applies an org-layer rule: a `tools.deny` entry set only in the playbook's `policy/global.yaml` is denied.
- [ ] AC4 · `agents --check`, run in the plan worktree, renders the same role definitions as in the main checkout (an org-layer model setting shows in both).
- [ ] AC5 · The existing policy, knowledge and guard tests pass unchanged (`test/hub/e2e/policy.test.ts`, `knowledge.test.ts`, `guard.test.ts`, `agents.test.ts`).

## Approach
- Replace `store.ws.root` / `this.ws.root` with `store.home` / `this.home` in the six calls: store.ts (`policy` getter, `knowledge`), commands/team/policy.ts (four `resolvePolicy` calls), agents.ts (two), guard.ts (`decide`'s `resolvePolicy`). `store.home` equals `ws.root` in the main checkout and in projects without plan worktrees, so nothing changes there.
- New test file `test/hub/e2e/playbook-home.test.ts`: reuse the playbook setup from `policy.test.ts` (a sibling repo with `policy/global.yaml` and `lessons/…`), plus a plan worktree created through `new-plan` with `hub.plan_worktrees: true` (as `test/hub/e2e/worktrees.test.ts` does). Run `policy show`, `recall --all`, `policy check`, `agents --check` and the guard (`hook()` from `sections.ts`) with `cwd` inside the worktree.

## Tasks
- [x] T1: the regression test file, failing on today's code for AC1–AC4 → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/playbook-home.test.ts` fails with "not found" from the worktree
- [x] T2: the six calls pass the home → verify: `npm run build && npx vitest run test/hub/e2e/playbook-home.test.ts` passes (AC1, AC2, AC3, AC4)
- [x] T3: nothing else moved → verify: `npx vitest run test/hub/e2e/policy.test.ts test/hub/e2e/knowledge.test.ts test/hub/e2e/guard.test.ts test/hub/e2e/agents.test.ts`; `npm run typecheck`; `grep -n "ws.root" src/hub/core/store.ts src/hub/commands/team/policy.ts src/hub/commands/team/agents.ts | grep -i "polic\|playbook"` finds nothing (AC5)

## Test plan
**Targeted checks** (from `packages/crew/`, after `npm run build`):
- AC1–AC4 → `npx vitest run test/hub/e2e/playbook-home.test.ts`. It fails before the change (from the worktree the org layer is missing) and passes after.
- AC5 → `npx vitest run test/hub/e2e/policy.test.ts test/hub/e2e/knowledge.test.ts test/hub/e2e/guard.test.ts test/hub/e2e/agents.test.ts`
- `npm run typecheck`

## Rollout & rollback
- Takes effect in this repo once `.crew/bin/crew.mjs` is refreshed (P-024 / the human). This repo sets no playbook today, so nothing changes here; projects with a relative `playbook.path` get their org layer back in plan worktrees.
- Rollback: revert the plan's commit.

## Risks & open questions
- A project that set `playbook.path` relative to a worktree on purpose: none known; the config lives in the main checkout, so the main checkout is the only sensible base.
- Shares no file with P-027, P-028, P-029, P-030 or P-038, so it runs beside any of them. Overlaps P-039 on store.ts (different functions); staffing sequences them, and neither needs the other's code.

## Handoff

_Generated 2026-10-25 by `crew.mjs handoff` from the ledger._

- P-037: Policy playbook resolves from the main checkout [in-review] tasks 3/3 — claimed by Arpit Anand (developer:a110ffe59fe21f853)
- last checkpoint 2026-10-25 07:11 at T3 (f7c315a) by Arpit Anand; since then 0 commit(s), 5 uncommitted file(s): packages/crew/src/hub/commands/team/agents.ts, packages/crew/src/hub/commands/team/guard.ts, packages/crew/src/hub/commands/team/policy.ts, packages/crew/src/hub/core/store.ts, packages/crew/test/hub/e2e/playbook-home.test.ts
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —

Latest log:
- 2026-10-25: status draft → ready
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-037-policy-playbook-resolves-from-the-main

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-037-policy-playbook-resolves-from-the-main
- 2026-10-25: status in-progress → in-review

## Outcome
Policy and playbook resolution (Store.policy, Store.knowledge, policy show/check, agents, the guard) pass store.home, so a relative playbook.path resolves from the main checkout in plan worktrees too. Regression test test/hub/e2e/playbook-home.test.ts. Awaiting QA.
Learnings: K-2026-10-25-the-guard-reads-a-sed-i-expression-s-old
