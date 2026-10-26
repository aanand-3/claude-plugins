---
id: P-056
title: Guard labels every agent command
goal: G-007
items: FEAT-050
touches: packages/crew/src/hub/commands/team/guard.ts, packages/crew/src/hub/core/memory/activity.ts, packages/crew/src/hub/commands/team/activity.ts, packages/crew/ui/src/api.ts, packages/crew/ui/src/components/LivePanel.tsx, packages/crew/test/activity.test.ts, packages/crew/test/hub/e2e/activity.test.ts, packages/crew/test/hub/e2e/guard.test.ts, packages/crew/test/hub/e2e/guard-writes.test.ts
depends_on:
status: in-progress
branch: plan/P-056-guard-labels-every-agent-command
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
---

# P-056: Guard labels every agent command

## Context
FEAT-050 (G-007). The executive watches agents live (G-007's outcome), but background tasks show raw commands like `W=/Users/...; node ... checkpoint ...` that cannot be read. The PreToolUse guard already sees and rewrites every crew agent's Bash call, including its `description`, so it can label each command. This is built-in guard behaviour, not a policy permission.

## Scope
**In:**
- The guard sets each agent command's description to `<role> <plan>: <what>` (for example `qa P-054: build + suite/land tests`); "what" comes from the agent's own description, or is derived from the command (checkpoint P-###, land P-###, vitest run ...).
- A long or background Bash call with no description is refused with a one-line fix, as a hub path in a shell variable already is.
- The hub's live activity feed shows the same label.

**Out (explicitly not doing):**
- Any `.crew/policy.yaml` permission or setting.
- Labelling calls from non-crew sessions.

## Acceptance criteria
- [ ] AC1 · Every Bash call by a crew agent that the guard allows leaves it with `updatedInput.description` = `<role> <plan>: <what>`, or `<role>: <what>` when no plan is known. This holds whether or not the command also gets the identity flags. A call with `--as`/`--run-id` injected still has them. The main session and non-crew agents are left alone (no `updatedInput` from labelling).
- [ ] AC2 · "What" is the agent's description when it gave one, with any leading `<role>[ <plan>]:` prefix stripped, so relabelling an already labelled call returns it unchanged. Otherwise it is derived from the command (see Approach). The plan is the hub call's ref, else the plan worktree of the command's paths or the hook's `cwd`, else the run's previous ref in the activity feed.
- [ ] AC3 · A Bash call with `run_in_background: true`, or with `timeout` over 120000 ms, and no description (missing or blank) is refused with `crew guard: a background or long Bash call needs a description: add "description": "<what it does>" (the guard prefixes "<role> <plan>:")`. A foreground call within the default timeout with no description is allowed and labelled from the command.
- [ ] AC4 · The live feed shows the label. Each Bash activity event records `label` (computed by the activity hook with the same function, so it doesn't depend on the hook seeing the guard's rewrite). The following show it instead of `Bash <target>`, and fall back to `tool target` for events without a label: `watch`, `feedEntries` (`/api/activity?ref=`), `status`'s "Running now" (`LiveRun.label`) and the UI's Live panel (Running now and Recent activity).
- [ ] AC5 · Tests: guard e2e (AC1–AC3), a unit table for the derivation (AC2), activity unit and e2e for the feed (AC4). `npm run typecheck` passes, and guard.ts and core/memory/activity.ts stay under 300 lines.

## Approach
- **Where.** `label(role, ref, description, command)` and `deriveWhat(command)` go in `core/memory/activity.ts`. They are pure, beside `describe`, and reuse its private `segments`, `command` and `hubCall`. The guard (`commands/team/guard.ts`) and the activity hook (`commands/team/activity.ts`) both call them.
- **Derivation (`deriveWhat`)**, per `&&`/`;`/`|` segment, skipping `cd`/`pushd`, env assignments (`X=…`) and `export`:
  - a hub call → `<sub> <ref>` (`checkpoint P-054`, `land P-054`, `suite P-054`; `<sub>` alone without a ref);
  - `npx vitest run <files…>` / `vitest run` → `vitest <basename of each file>`, up to 2 then `+N`, or `vitest (all)` with no file;
  - `npm run <script>` → `npm run <script>`; `npm test` / `npm ci` / `npm install` as written;
  - `git <sub>` → `git <sub>`;
  - anything else → the basename of its first word (`sed`, `grep`, `python3`).
  - Up to 3 segments joined with ` + `, the rest as `+N`; the whole "what" is capped at 80 characters with `…`.
- **"Long".** `run_in_background === true`, or a `timeout` above Claude Code's default of 120000 ms. These are the calls the executive sees as background or long-running tasks. Nothing else is refused, so short foreground calls keep working without a description.
- **Guard flow (`decide`).** All existing denies run first, unchanged. The AC3 refusal goes just before the identity block, for Bash calls of a crew role only. The identity block stops returning early: it computes the rewritten `command`. Then, for Bash with a role, it returns `{ input: { ...input, command, description: label(...) } }`. The plan for the label comes from `describe(h, root).ref ?? previousRef(feedPath, run)`. The `HUB_MCP` branch is unchanged. guard.ts grows by about 15 lines (204 now).
- **Feed.** `ActivityEvent` gets an optional `label?: string`. `activityHook` sets it for Bash (`label(role, ref, tool_input.description, command)`). `LiveRun` gets `label: string | null` from the last event. `fromActivity` and `runningLines` use `label ?? action(tool, target)`. In the UI, `api.ts`'s `ActivityEvent`/`LiveRun` types gain `label`, and `LivePanel.tsx` shows `r.label ?? action(r.tool, r.target)` in both lists. No `design.ui_paths` is set, so this is not a UI plan.
- **Overlaps.** None with P-055 (backlog.ts, policy.ts, presets.ts). No generated doc block changes: no command, tool, ledger event, hook or gate is added. The guard and activity tests are `hub.shared`.

## Tasks
- [ ] T1: `deriveWhat` and `label` in core/memory/activity.ts → verify: `cd packages/crew && npx vitest run test/activity.test.ts -t "label"`. A table: hub calls with and without a ref, a `cd … && npx vitest run a.test.ts b.test.ts c.test.ts`, `npm run build && npx vitest run x.test.ts`, git, env-prefixed commands, an 80-character cap, and an already labelled description returned unchanged (AC2)
- [ ] T2: Guard labelling and the AC3 refusal in `decide` → verify: `npm run build && npx vitest run test/hub/e2e/guard.test.ts -t "label"`. Cases:
  - a qa agent's `checkpoint P-001` gets `qa P-001: checkpoint P-001` and its identity flags;
  - a description `build + suite tests` from a P-054 worktree cwd gets `qa P-054: build + suite tests`;
  - no plan gives `pm: grep`;
  - the main session gets no `updatedInput`;
  - background with no description is refused, with a timeout of 300000 and no description refused, and a foreground call with no description is labelled (AC1–AC3)
- [ ] T3: The feed label (activity hook, `LiveRun.label`, `fromActivity`, `runningLines`) → verify: `npx vitest run test/activity.test.ts test/hub/e2e/activity.test.ts`. A Bash hook payload yields a `label` in the feed; `watch`, `status` and `/api/activity` show it; an event without a label still shows `Bash <target>` (AC4)
- [ ] T4: UI Live panel and `api.ts` types → verify: `npm run typecheck`; `npm run build` (the UI bundle builds); then `git checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md` (AC4, AC5)
- [ ] T5: Existing guard tests still green → verify: `npx vitest run test/hub/e2e/guard.test.ts test/hub/e2e/guard-writes.test.ts`. Expectations that compare a whole `updatedInput` (identity injection) gain the description (AC1, AC5)

## Test plan
**Targeted checks** (from `packages/crew/`; the e2e suites drive the built `dist/crew.mjs`: `npm run build` first, then `git checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md`):
- AC1–AC3 → `npx vitest run test/hub/e2e/guard.test.ts test/hub/e2e/guard-writes.test.ts`
- AC2 derivation → `npx vitest run test/activity.test.ts -t "label"`
- AC4 → `npx vitest run test/activity.test.ts test/hub/e2e/activity.test.ts`
- AC5 → `npm run typecheck`; `wc -l src/hub/commands/team/guard.ts src/hub/core/memory/activity.ts` (each under 300)
- Manual (QA, `--verify`): `crew.mjs ui --no-open` on a scratch repo with a recorded Bash activity event; the Live panel shows the label, judged from a full-size screenshot.

## Rollout & rollback
Ships in the bundle; reaches this repo through refresh-bin. Rollback: revert the commit.

## Risks & open questions
- The refusal could block agent calls that lack a description. It applies only to background calls and calls with a timeout over 2 minutes, and its message is the fix. Claude Code's Bash tool usually sends a description, so few calls should hit it.
- Whether Claude Code shows the rewritten `description` from `updatedInput` in its task list is assumed, not tested here. The hub's own feed (AC4) doesn't depend on it, because the activity hook computes the label itself. QA confirms the task-list text by hand once (Manual check).
- Queued after P-052 (landed) and FEAT-048 (P-055). It has no file overlap with P-055.

## Handoff

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-056-guard-labels-every-agent-command

## Outcome
