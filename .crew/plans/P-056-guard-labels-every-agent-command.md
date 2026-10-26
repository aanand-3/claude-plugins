---
id: P-056
title: Guard labels every agent command
goal: G-007
items: FEAT-050
touches: packages/crew/src/hub/commands/team/guard.ts, packages/crew/src/hub/core/memory/activity.ts, packages/crew/src/hub/commands/team/activity.ts, packages/crew/ui/src/api.ts, packages/crew/ui/src/components/LivePanel.tsx, packages/crew/test/activity.test.ts, packages/crew/test/hub/e2e/activity.test.ts, packages/crew/test/hub/e2e/guard.test.ts, packages/crew/test/hub/e2e/guard-writes.test.ts, packages/crew/test/hub/e2e/live-ui.test.ts
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
- [x] T1: `deriveWhat` and `label` in core/memory/activity.ts → verify: `cd packages/crew && npx vitest run test/activity.test.ts -t "label"`. A table: hub calls with and without a ref, a `cd … && npx vitest run a.test.ts b.test.ts c.test.ts`, `npm run build && npx vitest run x.test.ts`, git, env-prefixed commands, an 80-character cap, and an already labelled description returned unchanged (AC2)
- [x] T2: Guard labelling and the AC3 refusal in `decide` → verify: `npm run build && npx vitest run test/hub/e2e/guard.test.ts -t "label"`. Cases:
  - a qa agent's `checkpoint P-001` gets `qa P-001: checkpoint P-001` and its identity flags;
  - a description `build + suite tests` from a P-054 worktree cwd gets `qa P-054: build + suite tests`;
  - no plan gives `pm: grep`;
  - the main session gets no `updatedInput`;
  - background with no description is refused, with a timeout of 300000 and no description refused, and a foreground call with no description is labelled (AC1–AC3)
- [x] T3: The feed label (activity hook, `LiveRun.label`, `fromActivity`, `runningLines`) → verify: `npx vitest run test/activity.test.ts test/hub/e2e/activity.test.ts`. A Bash hook payload yields a `label` in the feed; `watch`, `status` and `/api/activity` show it; an event without a label still shows `Bash <target>` (AC4)
- [x] T4: UI Live panel and `api.ts` types → verify: `npm run typecheck`; `npm run build` (the UI bundle builds); then `git checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md` (AC4, AC5)
- [x] T5: Existing guard tests still green → verify: `npx vitest run test/hub/e2e/guard.test.ts test/hub/e2e/guard-writes.test.ts`. Expectations that compare a whole `updatedInput` (identity injection) gain the description (AC1, AC5)

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

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-056: Guard labels every agent command [in-review] tasks 5/5 — claimed by Arpit Anand (developer:a903b303fd5033b36)
- last checkpoint 2026-10-26 08:23 at T3 (8aa8f85) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-056-guard-labels-every-agent-command/packages/crew && npx vitest run test/activity.test.ts -t label (AC 2)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-056-guard-labels-every-agent-command/packages/crew && npm run build >/dev/null 2>&1 && npx vitest run test/hub/e2e/guard.test.ts -t label ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-056-guard-labels-every-agent-command checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md plugins/crew/docs; exit $r (AC 1)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-056-guard-labels-every-agent-command/packages/crew && npm run build >/dev/null 2>&1 && npx vitest run test/activity.test.ts test/hub/e2e/activity.test.ts ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-056-guard-labels-every-agent-command checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md plugins/crew/docs; exit $r (AC 4)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-056-guard-labels-every-agent-command/packages/crew && npm run typecheck && npm run build >/dev/null 2>&1 ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-056-guard-labels-every-agent-command checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md plugins/crew/docs; exit $r (AC 5)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-056-guard-labels-every-agent-command/packages/crew && npm run build >/dev/null 2>&1 && npx vitest run test/hub/e2e/guard.test.ts test/hub/e2e/guard-writes.test.ts ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-056-guard-labels-every-agent-command checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md plugins/crew/docs; exit $r (AC 3)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-056-guard-labels-every-agent-command/packages/crew && npm run build >/dev/null 2>&1 && npx vitest run test/activity.test.ts test/hub/e2e/activity.test.ts test/hub/e2e/live-ui.test.ts ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-056-guard-labels-every-agent-command checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md plugins/crew/docs; exit $r (AC 4)
- evidence: AC1 ✓ (self), AC2 ✓ (self), AC3 ✓ (self), AC4 ✓ (self), AC5 ✓ (self)

Latest log:
- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-056-guard-labels-every-agent-command

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-056-guard-labels-every-agent-command
- 2026-10-26: status in-progress → in-review
- 2026-10-26: status in-review → accepted
- 2026-10-26: status accepted → in-progress — land: merging main conflicts in packages/crew/test/hub/e2e/guard.test.ts

## Outcome
The guard now labels every allowed crew-agent Bash call `<role> <plan>: <what>` (identity flags still injected) and refuses a background or >120 s call with no description. `deriveWhat`/`label` live in core/memory/activity.ts, and `describe` also takes the plan from a worktree path in the command. The activity hook records `label` on Bash events, and `watch`, `status` Running now, `/api/activity` and the UI Live panel show it, falling back to `tool target`. guard.ts is 217 lines, activity.ts 235. live-ui.test.ts was added to touches (Q-2f4b62).
Learnings: any guard change that returns `updatedInput` for more calls breaks every e2e expectation of `toBeNull()` for an allowed crew Bash call. Assert "not denied, command unchanged" instead. Fixtures that contain another role's hub claim must be written with Edit/Write, not a Bash heredoc (K-2026-10-26-test-code-holding-a-hub-call-that-claims).
