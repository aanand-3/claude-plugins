---
id: P-053
title: A stopped agent's run stops staying live
goal: G-007
items: BUG-034
touches: packages/crew/src/hub/core/memory/activity.ts, packages/crew/src/hub/core/memory/ledger.ts, packages/crew/src/hub/commands/team/activity.ts, packages/crew/src/hub/commands/team/liveness.ts, packages/crew/src/hub/commands/team/liveness.reg.ts, plugins/crew/skills/hub/agents/director.md, packages/crew/test/activity.test.ts, packages/crew/test/hub/e2e/activity.test.ts, packages/crew/test/mcp.test.ts, packages/crew/test/hub/registry.test.ts, plugins/crew/docs/reference.md, plugins/crew/docs/context-and-memory.md, packages/crew/src/docs/diagrams.ts, packages/crew/src/hub/commands/memory/ledger.ts
depends_on:
status: in-review
branch: plan/P-053-a-stopped-agents-run-stops-staying-live
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
---

# P-053: A stopped agent's run stops staying live

## Context
BUG-034 (G-007). A stopped agent (TaskStop, a crashed session) writes no usage or report event, so `liveRuns()` keeps its run live for 24h and `dispatch` keeps routing "run ... idle: resume or reassign" to the Director, even though the plan is done and merged. It held a dispatch slot and staffing most of 2026-10-26, and a Director run was spent concluding nothing was wrong.

## Scope
**In:**
- A run that was stopped, or whose plan is done or merged, stops being listed as live and stops producing a Director dispatch entry, without waiting 24h. The architect picks the mechanism (item options: skip idle runs on a done plan; a hub command that ends a run; a closing event from the stop path).
- A regression test: activity for a run on a done plan, no stop event, idle past `limits.idle_minutes` gives no Director entry.

**Out (explicitly not doing):**
- Changing the idle threshold or the 24h window for runs on open plans.

## Acceptance criteria
- [ ] AC1 · A run whose last activity names a plan that is `done` or `dropped`, or an item that is closed (`done`, `wontfix`, `duplicate`), with no `usage`/`report` event and idle past `limits.idle_minutes`, is not in `status`'s "Running now", `/api/activity`'s `running`, or `dispatch --json`. A landed plan reaches `done` through the PM, which ends its runs this way.
- [ ] AC2 · `end-run <run> --note "<why>"` (CLI) and the `end_run` MCP tool, run by the director or the executive, record an `end-run` event naming the run. After it, the run is not live and gives no dispatch entry, even on an open plan. Activity of that run after the event makes it live again, as after a `report`. Any other role is refused with `Only the executive or the director ends a run; this run is the <role> role.`, and a run that isn't live fails with `<run> is not running.` Neither writes an event.
- [ ] AC3 · An idle run on an open plan (in-progress), with no `end-run`, still gives `run <run> on P-### idle for <n> min: resume or reassign` to the director.
- [ ] AC4 · Regression tests: the AC1 case in `test/activity.test.ts` (unit, `liveRuns`) and `test/hub/e2e/activity.test.ts` (e2e, through `dispatch --json`) fail on main and pass after the fix.

## Approach
- **Closed refs (AC1).** `liveRuns` (core/memory/activity.ts, pure) takes an optional `closed: (ref: string) => boolean` (default: nothing is closed) and skips a run whose last activity's `ref` is closed. `running(store)` (commands/team/activity.ts) passes a predicate over the store. A plan is closed when its status is in `CLOSED`, an item when its status is in `ITEM_CLOSED` (core/work/model.ts), and other refs never are. So `status`, `/api/activity`, the UI and dispatch's idle row all follow, with no change to dispatch.ts. The ref is the run's last activity's ref, as today.
- **Ending a run (AC2).** This is the item's option (b), a hub command. A closing event from the stop path isn't possible: TaskStop fires no hook. The new event type `end-run` goes in ledger.ts's `EventType`, with fields `{ ended: <run>, note }`; its `run` is the caller's run. In `liveRuns`, a run is stopped when the ledger has a STOPS event of its own run **or** an `end-run` event with `ended === run` after its last activity. `endRun(store, run, note?)` goes in commands/team/liveness.ts. It allows the director, the executive, or a human with no role (the same check as `mayPause`, with its own message), and requires the run to be in `running(store)`. It records the event and says `<run> ended: no longer live.`. It is registered in liveness.reg.ts: CLI `end-run` (`pos: ["run"]`, `str: ["note"]`), a usage line `  end-run RUN [--note TXT]                            mark a stopped agent's run ended (executive or director)`, and an MCP tool `end_run` (`run`, `note`).
- **Director's instructions.** `plugins/crew/skills/hub/agents/director.md` step 2 gets the entry it lacks: **`run … idle`**. Check `crew.mjs resume <ref>` and the run's last activity in `status`. If the run was stopped or crashed, `end-run <run> --note "<why>"`, then `reassign` the plan if its claim is stale. If the run is still working, report it and leave it.
- No module passes 300 lines (activity.ts 185, liveness.ts 79). core imports no commands.

## Tasks
- [x] T1: `liveRuns` closed-ref predicate and `end-run` stops; `running()` passes the predicate → verify: `cd packages/crew && npx vitest run test/activity.test.ts` with new cases (a closed plan's run, a closed item's run, an open plan's run still live and idle, an `end-run` after the last activity, activity after `end-run` live again) (AC1, AC3, AC4 unit)
- [x] T2: `end-run` command, event type, registration (CLI, usage line, MCP `end_run`), add `end_run` to `test/mcp.test.ts`'s sorted tool list → verify: `npm run build && npx vitest run test/hub/e2e/activity.test.ts test/mcp.test.ts test/hub/registry.test.ts`, then `git checkout -- plugins/crew/skills/hub/dist` (AC2)
- [x] T3: e2e cases in `test/hub/e2e/activity.test.ts`. A run on P-001, then P-001 moved done: `dispatch --json` has no director entry, and `status` has no "Running now" line for it. A run idle on an in-progress plan gives the `resume or reassign` entry. `end-run` by the director removes it. `end-run` by QA is refused, and an unknown run fails, with no event written → verify: `npx vitest run test/hub/e2e/activity.test.ts` (AC1–AC4)
- [x] T4: Director template entry → verify: read step 2 of `director.md` against the Approach; `npx vitest run test/hub/e2e/agents.test.ts` green (the render still works)

## Test plan
**Targeted checks** (from `packages/crew/`; the e2e suites and mcp.test.ts use the built bundles, so `npm run build` first, then `git checkout -- plugins/crew/skills/hub/dist`):
- AC1, AC3, AC4 → `npx vitest run test/activity.test.ts test/hub/e2e/activity.test.ts`
- AC2 → `npx vitest run test/hub/e2e/activity.test.ts -t "end-run"`; `npx vitest run test/mcp.test.ts test/hub/registry.test.ts` (new tool and help line; registry-before.json unchanged: `git diff --quiet main -- test/hub/registry-before.json`)
- Template → `npx vitest run test/hub/e2e/agents.test.ts`; `npm run typecheck`
- Docs → `npx vitest run test/docs.test.ts`. `npm run build` (or `npm run docs`) regenerates `reference.md` (`end-run`, `end_run`) and the `ledger-events` block of `context-and-memory.md` (`end-run`); they are source, not generated files, so the checkpoint commits them with the code

## Rollout & rollback
- The hub change ships in the bundle (Release builds it; it reaches `.crew/bin` through `refresh-bin`). Old ledgers have no `end-run` events, so nothing changes for them. An old hub reading a new `end-run` event ignores it.
- The Director's new entry text reaches this repo only after the executive re-vendors `.crew/templates/agents/director.md` (protected) and runs `agents` with their approval, followed by a fresh session. Until then the command works, but the Director's instructions don't mention it.
- Rollback: revert the commit. `end-run` events left in the ledger are ignored.

## Risks & open questions
- A run with no ref (`ref: null`) is never closed by AC1. `end-run` covers it (resolves the item's option-b question).
- `end-run` on a run that is in fact still working hides it until its next activity, which makes it live again. That is low risk and visible in the ledger (who ended it, and why).

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-053: A stopped agent's run stops staying live [in-review] tasks 4/4 — claimed by Arpit Anand (developer:a36d2c9d3bfb216a2)
- last checkpoint 2026-10-26 07:04 at T2 (970bb1c) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-053-a-stopped-agents-run-stops-staying-live/packages/crew && npx vitest run test/activity.test.ts (AC 1)
- ✗ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-053-a-stopped-agents-run-stops-staying-live/packages/crew && npm run build >/dev/null 2>&1 && npx vitest run test/hub/e2e/activity.test.ts test/mcp.test.ts test/hub/registry.test.ts ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-053-a-stopped-agents-run-stops-staying-live checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md plugins/crew/docs; exit $r (AC 2)
- ✗ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-053-a-stopped-agents-run-stops-staying-live/packages/crew && node build.mjs >/dev/null 2>&1 && npx vitest run test/hub/e2e/agents.test.ts ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-053-a-stopped-agents-run-stops-staying-live checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md plugins/crew/docs; exit $r — ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-053-a-stopped-agents-run-stops-staying-live/packages/crew && node build.mjs >/dev/null 2>&1 && npx vitest run test/hub/e2e/activity.test.ts test/mcp.test.ts test/hub/registry.test.ts test/hub/e2e/agents.test.ts test/activity.test.ts ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-053-a-stopped-agents-run-stops-staying-live checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md; exit $r (AC 2)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-053-a-stopped-agents-run-stops-staying-live/packages/crew && node build.mjs >/dev/null 2>&1 && npx vitest run test/hub/e2e/activity.test.ts test/activity.test.ts ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-053-a-stopped-agents-run-stops-staying-live checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md; exit $r (AC 3)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-053-a-stopped-agents-run-stops-staying-live/packages/crew && node build.mjs >/dev/null 2>&1 && npx vitest run test/hub/e2e/agents.test.ts ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-053-a-stopped-agents-run-stops-staying-live checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md; exit $r (AC 4)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-053-a-stopped-agents-run-stops-staying-live/packages/crew && npm run build >/dev/null 2>&1 && npx tsc --noEmit -p . && npx vitest run test/docs.test.ts test/activity.test.ts test/hub/e2e/activity.test.ts test/mcp.test.ts test/hub/registry.test.ts test/hub/e2e/agents.test.ts && git diff --quiet main -- test/hub/registry-before.json ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-053-a-stopped-agents-run-stops-staying-live checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md; exit $r (AC 1,2,3,4)
- evidence: AC1 ✓ (self), AC2 ✓ (self), AC3 ✓ (self), AC4 ✓ (self)

Latest log:
- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-053-a-stopped-agents-run-stops-staying-live

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-053-a-stopped-agents-run-stops-staying-live
- 2026-10-26: status in-progress → in-review

## Outcome
A run whose last activity names a done or dropped plan, or a closed item, is no longer live: it drops out of `status`, `/api/activity` and dispatch's idle row. `end-run <run> --note` (CLI) and `end_run` (MCP), for the executive or the director, record an `end-run` event that ends a live run until it acts again. The Director's step 2 gained a `run … idle` entry. The ledger docs and reference were regenerated. registry.test.ts now accepts a tool enum that gained values, because the ledger tool's `type` enum lists the event types.
Learnings: a new ledger event type also touches src/docs/diagrams.ts (EVENT_NOTES), commands/memory/ledger.ts (DETAIL), the generated docs pages and the frozen registry check on the ledger tool's enum (K-2026-10-26-a-plan-that-adds-a-ledger-event-type).
