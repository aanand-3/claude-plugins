---
id: P-027
title: Live agent activity in the hub
goal: G-007
items: FEAT-035, FEAT-019
touches: packages/crew/src/hub/core/memory/activity.ts, packages/crew/src/hub/core/memory/ledger.ts, packages/crew/src/hub/commands/team/activity.ts, packages/crew/src/hub/commands/team/autonomy.ts, packages/crew/src/hub/commands/memory/ledger.ts, packages/crew/src/hub/commands/views/reports.ts, packages/crew/src/hub/core/team/policy.ts, packages/crew/src/hub/commands/team/policy.ts, packages/crew/src/hub/server.ts, packages/crew/src/hub/cli.ts, packages/crew/ui/src/api.ts, packages/crew/ui/src/views/Overview.tsx, packages/crew/ui/src/components/LivePanel.tsx, packages/crew/ui/src/styles/**, packages/crew/test/activity.test.ts, packages/crew/test/hub/e2e/activity.test.ts, packages/crew/test/hub/e2e/live-ui.test.ts, packages/crew/test/plugin/contents.test.ts, plugins/crew/skills/guidelines/templates/settings.json, plugins/crew/skills/hub/agents/developer.md, plugins/crew/skills/hub/SKILL.md
depends_on:
status: in-review
branch: plan/P-027-live-agent-activity-in-the-hub
pr:
created: 2026-10-25
started: 2026-10-25
completed:
assignee: developer
---

# P-027: Live agent activity in the hub

## Context
Goal G-007 (Autonomous parallel delivery), design `.crew/drafts/the-crew-team-was-pure-reef.md` → W0-c. Delivers FEAT-035 and FEAT-019 (folded in).
Today the hub only learns what an agent does when the agent chooses to record it: a checkpoint when a task ends, `usage` when it stops. A pointer to a hub ID leads nowhere until the run finishes, and a long run looks stuck. This plan makes the hub capture progress itself: a PostToolUse hook writes a compact activity feed, the SubagentStop hook stores each agent's final report on its ref, and `status`, a new `watch` command and the `ui` server show who is doing what right now, with idle runs flagged.
It is the first plan the team builds after Wave 0 (P-026, merged), alone, so every later plan can be watched. It needs no other plan's code: P-026 (main-checkout store) is already on main. It overlaps P-024 (`policy.ts`, `cli.ts`) and P-025 (`ledger.ts`, `cli.ts`) only in small, separate edits, so no `depends_on`; the Director runs it alone anyway.

## Scope
**In:**
- `crew.mjs activity --hook` (PostToolUse): one compact event per tool call of a crew agent, appended to `activity.jsonl` next to the ledger (`<git common dir>/crew/activity.jsonl`), rotated by size. No tool arguments or file contents are stored.
- `usage --hook` (SubagentStop) also stores the agent's final report as a ledger `report` event on its ref.
- `status` gets a "Running now" section (role, run, ref, task, last action and its age, tokens recorded so far), with idle runs flagged after `limits.idle_minutes` (new policy key, default 20).
- `crew.mjs watch [--ref ID] [--limit N]`: prints the recent feed, then follows it in the terminal.
- `ui` server (FEAT-019): watches the ledger directory (ledger and activity) and the git common dir's refs and HEAD, so ledger-only changes and commits in linked worktrees refresh the page; a new `GET /api/activity`; a live "Running now" + recent-activity panel on the Overview when served.
- The guidelines settings template wires the new hook; the developer agent source checkpoints when it starts each task, not only when it finishes; the hub skill's command reference lists `watch` and `activity --hook`.

**Out (explicitly not doing):**
- Wiring the hook into this repo: `.claude/settings.json` is a protected guard file, `.crew/bin` is refreshed only through Release's `refresh-bin` (P-024 / FEAT-027) and `.claude/agents/**` is rendered by a human. These are escalations after merge (see Rollout), not tasks.
- Routing idle runs to the Director through `dispatch` (P-031 adds `dispatch`; it reads this plan's idle flag).
- Live token counts mid-run: "tokens so far" is the usage already recorded for the run (earlier stops of a resumed agent); reading a running transcript is a follow-up.
- The main session's own tool calls (no `agent_type`): left alone, as the guard and `usage --hook` do.
- Runner-pass outcomes as reports (W2-c, P-034).
- A graph schema change: activity is served by its own endpoint; `export` (static HTML) shows no live panel.
- Generated bundles (`plugins/crew/skills/hub/dist/**`, `.crew/bin/**`): Release builds them.

## Acceptance criteria
- [ ] AC1 · Given a PostToolUse payload on stdin whose `agent_type` is a crew agent (its `.claude/agents/<type>.md` has `crew-role`), `activity --hook` appends exactly one JSON line to `<git common dir>/crew/activity.jsonl` with `ts`, `run` (`<role>:<agent_id>`, the run the guard gives it), `role`, `ref`, `tool` and `target`, prints nothing and exits 0. A non-crew agent, a payload without `agent_type`, or malformed stdin writes nothing and exits 0. The ledger file is not written.
- [ ] AC2 · No arguments are stored. `target` is: for Read/Edit/Write/MultiEdit/NotebookEdit the file path relative to the repository root (basename only when outside it); for Bash the first segment's command word (after `cd` segments and `VAR=` assignments), or `crew.mjs <subcommand>` when the command runs the hub; nothing for any other tool (tool name only). A test feeds a Bash command carrying a token-like string and a URL, a Write with content, and a Grep pattern, and asserts none of those strings appear in the written line.
- [ ] AC3 · `ref` is: the first hub ID (P-###, G-###, or an item ID such as FEAT-###) among a `crew.mjs` command's arguments; else the plan whose worktree (`.claude/worktrees/P-###-…`) contains the payload's `cwd` or file path; else the ref of the same run's previous activity event; else null.
- [ ] AC4 · When `activity.jsonl` is at least 2 MB, the next append first moves it to `activity.1.jsonl` (replacing an older one) and starts a fresh file; every reader reads `activity.1.jsonl` then `activity.jsonl`. A torn last line is skipped on read and the next append starts on a fresh line.
- [ ] AC5 · `usage --hook` records a `report` event for a crew agent: its text is the last `SubagentHandback` tool call's `message` in the agent transcript, else the last assistant text; capped at 20,000 characters; matches of the secret patterns (`src/shared/secrets.ts`) replaced by `[secret withheld]`. Its ref is the usage event's ref, else the run's last activity ref, else null. It is recorded even when the transcript carries no token usage. `ledger --ref P-### --type report` shows it.
- [ ] AC6 · `status` has a "## Running now" section (omitted when empty) with one line per live run: role, run, ref, task (the run's latest checkpoint step on that ref, else "—"), last action (`tool target`) and how long ago, and tokens recorded for that run (else "—"). A live run is one with activity in the last 24 hours and no `usage` or `report` event of the same run after its last activity; a run that resumes after a report is live again.
- [ ] AC7 · A live run whose last activity is older than `limits.idle_minutes` is marked **idle** in "Running now". The default is 20 minutes; `limits.idle_minutes: 5` in `.crew/policy.yaml` is accepted by `policy check` and shown by `policy show`, and makes a 10-minute-quiet run idle (not idle at 10 minutes with the default).
- [ ] AC8 · `watch [--ref ID] [--limit N]` prints the last N (default 20) feed lines — activity events and ledger events merged by time, one line each, filtered by ref when given — then keeps following: an activity line appended by `activity --hook` while it runs is printed within 2 seconds. It runs until interrupted.
- [ ] AC9 · The `ui` server: `GET /api/activity` returns `{ running, recent }` (the AC6 runs and the last 50 activity events); `/api/events` sends a `change` event when `ledger.jsonl` or `activity.jsonl` changes (FEAT-019: e.g. after `pause`, which writes only the ledger, and after an `activity --hook` append), and, for a server started in a linked worktree, when a commit lands (the common dir's refs). Lock files don't trigger changes.
- [ ] AC10 · When served, the Overview shows a "Running now" panel (each live run, idle ones marked) and the most recent activity, refreshed on each change event without a page reload; the static `export` page renders without it and without errors. Checked at full size, with no overflow at desktop and phone widths.
- [ ] AC11 · `plugins/crew/skills/guidelines/templates/settings.json` has a PostToolUse entry with matcher `*` running `crew.mjs activity --hook` behind the same never-fail wrapper as the guard (`cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0; [ -f .crew/bin/crew.mjs ] && node .crew/bin/crew.mjs activity --hook >/dev/null 2>&1; exit 0`), after the existing entries (format_on_edit stays first); `developer.md` tells the developer to `checkpoint P-### --step T<n> --note "starting: …"` when it starts each task as well as when it finishes; `hub/SKILL.md` lists `watch` and `activity --hook`.

## Approach
- **Core (`src/hub/core/memory/activity.ts`, new):** the event type, `activityPath(ledgerPath)` (same directory, so no new location rules), `appendActivity` (rotation under `acquireLock` on `activity.jsonl.lock` with a short wait; on lock timeout the event is dropped — the hook never fails), `readActivity`, the pure `describe(hookInput, root)` → `{tool, target, ref}` (AC2/AC3; reuse the guard's segment/`hubCommand` idea but keep a local copy of the few lines rather than exporting guard internals), and the pure `liveRuns(activity, ledgerEvents, now, idleMinutes)` used by `status`, `watch` and the server. `src/core` never imports `src/commands`.
- **Commands (`src/hub/commands/team/activity.ts`, new):** `activityHook(store)` (reads stdin, resolves the role with `agentRole` from guard.ts, as `usageHook` does), `watch(store, o)` (polls file sizes every 500 ms; formats ledger lines with the existing `DETAIL` map from `commands/memory/ledger.ts`, which gains `report`), and the "Running now" lines `status` prints.
- **Report:** in `usageHook` (autonomy.ts), parse the transcript once more for the last `SubagentHandback` `tool_use` or assistant text; record `report` before the early return on zero tokens. `EventType` in ledger.ts gains `"report"`.
- **Policy:** `limits.idle_minutes` added to the GLOBAL schema, `Effective` and the resolver, on the existing lines (policy.ts is 295 lines and must stay under 300); the default 20 is applied where it's read (`?? 20`), not as a built-in layer value.
- **Server:** add `dirname(store.ledger.path)` (created if missing) and `git.commonDir`'s `refs` and `HEAD` to the watchers, replacing the `.git/refs` / `.git/HEAD` paths that don't exist in a linked worktree; ignore `*.lock` and `*.stale-*` names. `/api/activity` reads through `liveRuns`.
- **UI:** `LivePanel.tsx` fetches `api/activity` on mount and on each `onHubChange`; rendered from `Overview` only when `ix.served`. Reuse `Card`, `Chip`, `IdLink`, `fmtTokens` from primitives and existing tokens/styles.
- Every module stays under 300 lines; `cli.ts` (279 lines) gets two registry entries and two help lines.

## Tasks
- [x] T1: `core/memory/activity.ts` — event shape, path, append with rotation and torn-line handling, read, `describe` (target and ref), `liveRuns` (live, idle, task, last action, tokens). → verify: `npx vitest run test/activity.test.ts` (unit, imports src) covers AC2, AC3, AC4 and the AC6/AC7 rules.
- [x] T2: `commands/team/activity.ts` `activityHook` + `activity --hook` in cli.ts. → verify: `test/hub/e2e/activity.test.ts` hook cases (AC1, AC2 end to end).
- [x] T3: `report` event: ledger.ts `EventType`, `DETAIL.report` in commands/memory/ledger.ts (and an empty detail for an unknown type instead of a throw), report capture in `usageHook`. → verify: `test/hub/e2e/activity.test.ts` report cases with fake transcripts (handback message, plain text fallback, zero-usage transcript, secret masked, cap) and `ledger --ref P-### --type report` (AC5); `test/hub/e2e/team-2.test.ts` usage-hook cases still pass.
- [x] T4: "Running now" in `status` + `limits.idle_minutes` in policy.ts. → verify: e2e status cases with activity lines written at chosen timestamps (live, stopped, resumed, 24 h cutoff, idle with default and with `idle_minutes: 5`); `policy check`/`policy show` (AC6, AC7); `test/hub/e2e/policy.test.ts` still passes.
- [x] T5: `watch` command. → verify: e2e spawns `watch --limit 5`, checks the initial lines, appends via `activity --hook`, sees the new line within 2 s, kills it; `--ref` filter (AC8).
- [x] T6: server watchers + `/api/activity`; `LivePanel` on the Overview. → verify: `test/hub/e2e/live-ui.test.ts` (spawns `ui --no-open --port 0`; `/api/activity` shape; a `change` SSE after `pause` and after a hook append; a linked-worktree server gets a `change` after a commit) for AC9; manual UI check for AC10 (below).
- [x] T7: settings template entry, developer.md step-start checkpoint, hub SKILL.md command rows. → verify: `test/plugin/contents.test.ts` asserts the template's activity entry and that format_on_edit stays first (AC11).

## Test plan
**Targeted checks:** (the e2e suites drive the built bundle: run `cd packages/crew && npm run build` first, then discard the generated output — `git checkout -- plugins/crew/skills` and `git clean` of new dist files — since Release builds it)
- `cd packages/crew && npm run typecheck` — all tasks.
- `npx vitest run test/activity.test.ts` — AC2, AC3, AC4, AC6, AC7 rules (unit).
- `npx vitest run test/hub/e2e/activity.test.ts` — AC1, AC2, AC3, AC5, AC6, AC7, AC8.
- `npx vitest run test/hub/e2e/live-ui.test.ts test/view.test.ts` — AC9 (and the existing server/export checks still pass).
- `npx vitest run test/hub/e2e/team-2.test.ts test/hub/e2e/ledger.test.ts test/hub/e2e/policy.test.ts test/ledger.test.ts` — existing usage-hook, ledger and policy behaviour unchanged.
- `npx vitest run test/plugin/contents.test.ts test/structure.test.ts` — AC11 and the 300-line rule.
- Manual (QA), AC10: in a scratch repo built by `scripts/sample-project.mjs`, run `ui --no-open`, open it, then feed `activity --hook` payloads and a `usage --hook` stop from a terminal; the panel shows the run, then drops it after the report, without a reload. Judge from full-size screenshots at desktop and 375 px widths; open the `export` HTML and confirm no panel and no console errors.

## Rollout & rollback
- Ships in the plugin (templates, agent sources, bundle built by Release). New projects get the hook from the guidelines template; existing ones on `/crew:guidelines --refresh`.
- **In this repo, after merge (human / escalation):** (1) Release runs `refresh-bin` (P-024) so `.crew/bin/crew.mjs` has `activity` and `watch`; (2) the human adds the PostToolUse `activity --hook` entry to `.claude/settings.json` (protected; `/crew:guidelines --refresh` renders it from the template); (3) the human re-renders `.claude/agents/**` (`agents`) so the developer checkpoints at step start; new sessions pick them up. Then the design's live check: start a developer subagent on a test plan; `watch` and `status` show its tool calls within seconds, `ui` updates without a reload, `ledger --ref P-### --type report` holds its report after it stops.
- Rollback: remove the PostToolUse entry; `activity.jsonl` is then never written and every view treats a missing file as no activity. `showLedger` shows an unknown event type with an empty detail instead of throwing (T3), so a build reverted after this one still reads a ledger holding `report` events.

## Risks & open questions
- PostToolUse payloads for subagent tool calls are assumed to carry `agent_type` / `agent_id` like PreToolUse (the guard relies on that). If they don't, the hook records nothing; the tests use fixture payloads, so this is only confirmed by the post-merge live check. If it fails there, a follow-up item, not a reopen.
- The hook runs on every tool call: it must stay fast (one small append; read only the tail of the activity file for the previous ref). A slow or failing hook never blocks the tool call (exit 0, output discarded).
- Report text is agent prose and can be long or quote file contents; the cap and secret masking bound it, but it is stored in the shared ledger like `log` text.

## Handoff

_Generated 2026-10-25 by `crew.mjs handoff` from the ledger._

- P-027: Live agent activity in the hub [in-review] tasks 7/7 — claimed by Arpit Anand (developer:a2058a8bac29fad70)
- last checkpoint 2026-10-25 06:40 at T6 (f9cf69b) by Arpit Anand; since then 0 commit(s), 21 uncommitted file(s): packages/crew/src/hub/cli.ts, packages/crew/src/hub/commands/memory/ledger.ts, packages/crew/src/hub/commands/team/activity.ts, packages/crew/src/hub/commands/team/autonomy.ts, packages/crew/src/hub/commands/team/policy.ts, packages/crew/src/hub/commands/views/reports.ts, packages/crew/src/hub/core/memory/activity.ts, packages/crew/src/hub/core/memory/ledger.ts
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —, AC6 —, AC7 —, AC8 —, AC9 —, AC10 —, AC11 —

Latest log:
- 2026-10-25: status in-progress → in-review
- 2026-10-25: review: changes requested — Two small fixes, everything else matches the spec (typecheck, test/activity.test.ts and structure pass). (1) AC2 argument leak, packages/crew/src/hub/core/memory/activity.ts hubCall: any segment that merely mentions crew.mjs --as architect --run-id architect:a136db6240e5552a7 is treated as a hub call, so a lowercase word after it is stored as the subcommand — e.g. 'echo crew.mjs --as architect --run-id architect:a136db6240e5552a7 secretword' or 'grep x .crew/bin/crew.mjs --as architect --run-id architect:a136db6240e5552a7 token' records target 'crew.mjs --as architect --run-id architect:a136db6240e5552a7 secretword'/'crew.mjs --as architect --run-id architect:a136db6240e5552a7 token'. Only treat a segment as a hub call when its command word (after VAR= and prefixes, i.e. command(seg)[0]) is node/bun or itself ends in crew.mjs --as architect --run-id architect:a136db6240e5552a7; otherwise fall through to the plain first-word target. Add a unit case in test/activity.test.ts. (2) packages/crew/src/hub/server.ts watchers: outside git the ledger dir IS store.dir (Ledger.at → .crew/ledger.jsonl), the Set dedups them and 'p !== ledgerDir' then watches .crew NON-recursively, so plan/item edits stop refreshing the page. Only add ledgerDir when it differs from store.dir (or make recursive true for store.dir). Also: T5 (watch) has no checkpoint in the ledger; checkpoint it when you hand back.
- 2026-10-25: status in-review → in-progress — changes requested: Two small fixes, everything else matches the spec (typecheck, test/activity.test.ts and structure pass). (1) AC2 argument leak, packages/crew/src/hub/core/memory/activity.ts hubCall: any segment that merely mentions crew.mjs --as architect --run-id architect:a136db6240e5552a7 is treated as a hub call, so a lowercase word after it is stored as the subcommand — e.g. 'echo crew.mjs --as architect --run-id architect:a136db6240e5552a7 secretword' or 'grep x .crew/bin/crew.mjs --as architect --run-id architect:a136db6240e5552a7 token' records target 'crew.mjs --as architect --run-id architect:a136db6240e5552a7 secretword'/'crew.mjs --as architect --run-id architect:a136db6240e5552a7 token'. Only treat a segment as a hub call when its command word (after VAR= and prefixes, i.e. command(seg)[0]) is node/bun or itself ends in crew.mjs --as architect --run-id architect:a136db6240e5552a7; otherwise fall through to the plain first-word target. Add a unit case in test/activity.test.ts. (2) packages/crew/src/hub/server.ts watchers: outside git the ledger dir IS store.dir (Ledger.at → .crew/ledger.jsonl), the Set dedups them and 'p !== ledgerDir' then watches .crew NON-recursively, so plan/item edits stop refreshing the page. Only add ledgerDir when it differs from store.dir (or make recursive true for store.dir). Also: T5 (watch) has no checkpoint in the ledger; checkpoint it when you hand back.

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-027-live-agent-activity-in-the-hub
- 2026-10-25: Architect: touches widened to packages/crew/src/hub/commands/team/policy.ts (policy show limits row) for AC7, answering Q-562bf9.
- 2026-10-25: status in-progress → in-review
- 2026-10-25: review: changes requested — Two small fixes, everything else matches the spec (typecheck, test/activity.test.ts and structure pass). (1) AC2 argument leak, packages/crew/src/hub/core/memory/activity.ts hubCall: any segment that merely mentions crew.mjs --as architect --run-id architect:a136db6240e5552a7 is treated as a hub call, so a lowercase word after it is stored as the subcommand — e.g. 'echo crew.mjs --as architect --run-id architect:a136db6240e5552a7 secretword' or 'grep x .crew/bin/crew.mjs --as architect --run-id architect:a136db6240e5552a7 token' records target 'crew.mjs --as architect --run-id architect:a136db6240e5552a7 secretword'/'crew.mjs --as architect --run-id architect:a136db6240e5552a7 token'. Only treat a segment as a hub call when its command word (after VAR= and prefixes, i.e. command(seg)[0]) is node/bun or itself ends in crew.mjs --as architect --run-id architect:a136db6240e5552a7; otherwise fall through to the plain first-word target. Add a unit case in test/activity.test.ts. (2) packages/crew/src/hub/server.ts watchers: outside git the ledger dir IS store.dir (Ledger.at → .crew/ledger.jsonl), the Set dedups them and 'p !== ledgerDir' then watches .crew NON-recursively, so plan/item edits stop refreshing the page. Only add ledgerDir when it differs from store.dir (or make recursive true for store.dir). Also: T5 (watch) has no checkpoint in the ledger; checkpoint it when you hand back.
- 2026-10-25: status in-review → in-progress — changes requested: Two small fixes, everything else matches the spec (typecheck, test/activity.test.ts and structure pass). (1) AC2 argument leak, packages/crew/src/hub/core/memory/activity.ts hubCall: any segment that merely mentions crew.mjs --as architect --run-id architect:a136db6240e5552a7 is treated as a hub call, so a lowercase word after it is stored as the subcommand — e.g. 'echo crew.mjs --as architect --run-id architect:a136db6240e5552a7 secretword' or 'grep x .crew/bin/crew.mjs --as architect --run-id architect:a136db6240e5552a7 token' records target 'crew.mjs --as architect --run-id architect:a136db6240e5552a7 secretword'/'crew.mjs --as architect --run-id architect:a136db6240e5552a7 token'. Only treat a segment as a hub call when its command word (after VAR= and prefixes, i.e. command(seg)[0]) is node/bun or itself ends in crew.mjs --as architect --run-id architect:a136db6240e5552a7; otherwise fall through to the plain first-word target. Add a unit case in test/activity.test.ts. (2) packages/crew/src/hub/server.ts watchers: outside git the ledger dir IS store.dir (Ledger.at → .crew/ledger.jsonl), the Set dedups them and 'p !== ledgerDir' then watches .crew NON-recursively, so plan/item edits stop refreshing the page. Only add ledgerDir when it differs from store.dir (or make recursive true for store.dir). Also: T5 (watch) has no checkpoint in the ledger; checkpoint it when you hand back.
- 2026-10-25: status in-progress → in-review

## Outcome
Live activity feed (activity --hook), agent reports on SubagentStop, Running now in status/ui with idle flag (limits.idle_minutes), watch command, server watches ledger dir and common-dir refs. Awaiting QA.
Learnings: K-2026-10-25-the-guard-injects-the-agents-role
