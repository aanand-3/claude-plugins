---
id: P-034
title: Local runner: run --until-done
goal: G-007
items: FEAT-042, CHORE-005
touches: packages/crew/src/hub/commands/team/runner.ts, packages/crew/src/hub/commands/team/dispatch.ts, packages/crew/src/hub/commands/team/autonomy.reg.ts, packages/crew/src/hub/cli.ts, packages/crew/src/hub/core/team/policy.ts, packages/crew/test/hub/e2e/runner.test.ts, packages/crew/test/hub/e2e/dispatch.test.ts, plugins/crew/skills/team/SKILL.md, plugins/crew/skills/hub/references/model.md
depends_on: P-031, P-027
status: in-progress
branch: plan/P-034-local-runner-run-until-done
pr:
created: 2026-10-25
started: 2026-10-26
completed:
assignee: developer
---

# P-034: Local runner: run --until-done

## Context
W2-c of G-007 (design: `.crew/drafts/the-crew-team-was-pure-reef.md`, "W2-c: a local runner"). Delivers FEAT-042 and CHORE-005.

Today `run` only prints a shell loop (`while run --check; do claude -p "/crew:team continue"; done`), which never notices that a pass did nothing and never says why it stopped. `run --until-done [--max-passes N] [--command CMD]` becomes a real command. It checks the setup once (CHORE-005), then runs one `/crew:team` pass at a time. It records each pass as a ledger `report`. It stops on `runState`, on an empty dispatch, after two passes in a row that changed nothing in the ledger, or at the pass limit, and it notifies on stop.

**Code dependencies:**
- **P-031:** each pass is gated on `dispatch(store)` (an empty dispatch ends the run), and this plan adds the idle-run row to `commands/team/dispatch.ts`.
- **P-027:** the pass outcomes are ledger `report` events (the `report` type P-027 adds to `EventType`), and the idle row reads P-027's `liveRuns` (`core/memory/activity.ts`) with `limits.idle_minutes`. P-027 left that row to "P-031"; it lands here because this is the first plan with both pieces.

It reads `runState` as the base has it. With P-033 merged, a done focus moves on and "all approved goals done" is a stop reason; nothing here depends on that wording.

Overlaps, for staffing only: P-030 on `autonomy.reg.ts` (the `run` registration lives there once P-030 lands; in cli.ts before), and P-024 on `core/team/policy.ts`. `cli.ts`, `team/SKILL.md`, `model.md` and the test files are `hub.shared` once P-029 lands.

## Scope
**In:**
- `run --until-done [--max-passes N] [--command CMD]`, CLI only (a loop that runs for hours is not an MCP tool). `--max-passes` defaults to 20. `--command` defaults to `claude -p "/crew:team continue"` and runs through the shell, from the repository root.
- **Refused for crew agents:** when the run has a role (the guard injects one into every agent call), it refuses with "the runner is started by a human from a terminal". It writes nothing.
- **Preflight (CHORE-005)**, once, before any pass. Each problem prints `PREFLIGHT  <problem> → <fix>`; any FAIL exits 2 with no pass run and nothing recorded:
  - agents rendered and current: `agentProblems(store)` (agents.ts) is empty. Fix: the human runs `crew.mjs agents`.
  - agents loadable: each `.claude/agents/crew-*.md` has YAML front matter (the `yaml` package) that parses, with `name` equal to the file's stem and a non-empty `description`.
  - hooks: `.claude/settings.json` parses and has a PreToolUse command containing `crew.mjs guard` (FAIL) and a SubagentStop command containing `crew.mjs usage --hook` (FAIL). A missing PostToolUse `crew.mjs activity --hook` is a WARN, and the run goes on.
  - with `hub.plan_worktrees`, the main checkout is on the base branch (`requireBase`).
  - the pass command's first word is on PATH (`command -v`).
- **Each pass** (n = 1…max):
  1. Open a fresh `Store` (the last pass wrote through other processes).
  2. `runState(store)`: on a stop, finish with its reasons.
  3. `dispatch(store)`: when it has no entries, finish with "nothing to dispatch".
  4. Count the ledger events. Run the command (stdio inherited), wait, then count again. `progress` counts the new events whose type is not `notify` and that aren't the runner's own reports.
  5. Record `report` (ref null) `{ source: "runner", pass: n, exit, dispatched, progress, text: "pass n: <dispatched> dispatched, <progress> ledger events, exit <code>" }` and flush it (`ws.flush()`) before the next pass.
  6. When this pass and the one before both had `progress` 0, finish with "no progress in 2 passes". After pass `max`, finish with "max passes (N)".
- **Finish:** record `report` `{ source: "runner", stopped: "<reason>", passes }`. Call `notify(store, "stopped", null, "<reason> after N passes", <start timestamp>)`. Print `STOP  <reason>` and `passes: N, ledger events: M`. Exit 0 for a `runState` stop or nothing to dispatch; exit 1 for no progress or the pass limit; exit 2 for a failed preflight.
- `stopped` added to `NOTIFY_ON` (core/team/policy.ts), so `notify: {on: [stopped]}` passes `policy check`.
- **Idle runs → Director** in dispatch: a live run that `liveRuns` marks idle → director: "run <run> on <ref> idle for N min: resume or reassign". It sits with the other Director exceptions (P-031's row 2).
- **Team skill (CHORE-005):** in `team/SKILL.md`'s pass, before launching any agent, check that every `crew-<role>` the dispatch entries name is an agent type this session can launch. If one is missing, run `crew.mjs pause --reason "crew agents not loaded in this session: render them and start a new session"` and stop (the runner then stops on the pause). "Unattended" describes `run --until-done`, its preflight, its stop reasons and `--command`, replacing the hand-written loop.
- `model.md`: `stopped` in the notify row.

**Out (explicitly not doing):**
- The no-flag `run` printout (autonomy.ts) keeps showing the shell loop. Pointing it at `--until-done` is a one-line follow-up, after P-033 and P-027 are done with autonomy.ts.
- A per-pass timeout or killing a hung pass. Idle runs reach the Director through dispatch, and the human can interrupt the runner.
- Resuming agents across passes: each pass is a new `claude -p` session (P-031, Risks).
- Choosing `claude -p`'s permission mode for unattended passes: the human's settings, or their `--command` (see Rollout).
- `.claude/settings.json`, `.claude/agents/**`, `.crew/bin`, `.crew/policy.yaml` (human-reserved).
- Generated files: Release builds them.

## Acceptance criteria
- [ ] AC1 · In a throwaway repo with no rendered agents, `run --until-done --command "touch ran"` exits 2 and prints a `PREFLIGHT` line naming the missing agents and `crew.mjs agents`. `ran` doesn't exist, and the ledger has no new event.
- [ ] AC2 · An agent file whose front matter doesn't parse (an unquoted `description: a: b`) or whose `name` differs from its file name makes the preflight name that file, exit 2.
- [ ] AC3 · A `.claude/settings.json` without the guard hook → `PREFLIGHT` names the guard hook, exit 2. With guard and usage hooks but no activity hook → one WARN line, and passes run.
- [ ] AC4 · With a set-up repo (rendered agents, hooks in settings.json) and two `new` items, `--command` is a script that triages the first `new` item (`node <hub> --as pm triage <ID> --priority P2`), or pauses the team when none is left (`pause --reason "script done"`). The runner runs 3 passes and stops before the 4th with `STOP  paused by … script done`, exit 0. The ledger has three runner `report`s with `pass` 1–3, `exit`, `dispatched` and `progress` (1, 1, 1), then one with `stopped`.
- [ ] AC5 · A `--command` that changes nothing (`true`) stops after exactly 2 passes with `STOP  no progress in 2 passes`, exit 1.
- [ ] AC6 · `--max-passes 1` with work left runs one pass and stops with `max passes (1)`, exit 1.
- [ ] AC7 · With the team paused, the runner runs no pass, stops with the pause reason, and exits 0.
- [ ] AC8 · With `notify: {command: "cat >> notified.jsonl", on: [stopped]}` in the policy, a run writes exactly one `stopped` event whose text has the reason. `policy check` accepts `stopped`.
- [ ] AC9 · `--as developer run --until-done` refuses ("started by a human") and runs nothing.
- [ ] AC10 · With an activity line for run `developer:a1` on P-001 older than `limits.idle_minutes` and no report after it, `dispatch --json` has a director entry naming `developer:a1` and P-001.
- [ ] AC11 · `team/SKILL.md` documents `run --until-done` (preflight, stop reasons, `--command`) and the session's agent-type check with the pause; `model.md`'s notify row lists `stopped`.
- [ ] AC12 · `npm run typecheck` passes; runner.ts and dispatch.ts stay under 300 lines; the existing `run --check` suites pass unchanged.

## Approach
- **`commands/team/runner.ts` (new):** `preflight(store): { fails: string[]; warns: string[] }` and `untilDone(store, { maxPasses, command }): number`. The loop uses `spawnSync(command, { shell: true, stdio: "inherit", cwd: root })`. It re-opens the store with `Store.open(root)` per pass and flushes each pass's report itself (`store.ws.flush()`), so a crash mid-run keeps what was recorded. The runner's own events are told apart by `source: "runner"`.
- **Registration:** the `run` entry gains `flag: ["until-done", …]`, `int: ["max-passes"]` and `str: ["command"]`, and calls `untilDone` when `--until-done` is set, else today's `run`. This entry is in `commands/team/autonomy.reg.ts` if P-030 has landed when this branch updates to the base, else in cli.ts (P-030 then moves it). The help line is updated in the same place. autonomy.ts itself is not edited.
- **Settings parse:** read `.claude/settings.json` as JSON. Walk `hooks.<Event>[].hooks[].command` strings. Match on substrings (`crew.mjs guard`, `crew.mjs usage --hook`, `crew.mjs activity --hook`), the same commands the guidelines template writes.
- **Idle row:** in dispatch.ts, read `readActivity` + `liveRuns(activity, events, Date.now(), idle_minutes ?? 20)` (P-027) and add the entries in the Director-exceptions group.
- **Reuse:** `runState`, `notify` (autonomy.ts), `dispatch` (dispatch.ts), `agentProblems` (agents.ts), `requireBase` (hubstate.ts), `liveRuns`/`readActivity` (activity.ts). The test helpers render agents with `tr(repo, "agents")` and write settings.json from the guidelines template (`plugins/crew/skills/guidelines/templates/settings.json`).

## Tasks
- [ ] T1: `preflight` → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/runner.test.ts -t preflight` (AC1, AC2, AC3)
- [ ] T2: `untilDone` loop, pass reports, stop reasons, exit codes, the agent refusal; the `run` registration → verify: `npx vitest run test/hub/e2e/runner.test.ts -t loop` (AC4, AC5, AC6, AC7, AC9)
- [ ] T3: `stopped` notify kind → verify: `npx vitest run test/hub/e2e/runner.test.ts -t notify`; `npx vitest run test/hub/e2e/policy.test.ts` (AC8)
- [ ] T4: idle row in dispatch → verify: `npx vitest run test/hub/e2e/dispatch.test.ts -t idle` (AC10)
- [ ] T5: team/SKILL.md (pass agent check, Unattended) and model.md → verify: `grep -n "until-done" plugins/crew/skills/team/SKILL.md`; `grep -n "stopped" plugins/crew/skills/hub/references/model.md`; `npx vitest run test/plugin` (AC11)
- [ ] T6: types, sizes, unchanged suites → verify: `npm run typecheck`; `wc -l src/hub/commands/team/runner.ts src/hub/commands/team/dispatch*.ts`; `npx vitest run test/hub/run-check.test.ts test/hub/e2e/team-2.test.ts` (AC12)

## Test plan
**Targeted checks** (from `packages/crew/`; e2e suites drive the built `dist/crew.mjs`: `npm run build` first, then discard the generated output, which Release builds). The tests never run `claude`: every loop case passes `--command`.
- AC1–AC3 → `npx vitest run test/hub/e2e/runner.test.ts -t preflight`
- AC4–AC7, AC9 → `npx vitest run test/hub/e2e/runner.test.ts -t loop`
- AC8 → `npx vitest run test/hub/e2e/runner.test.ts -t notify test/hub/e2e/policy.test.ts`
- AC10 → `npx vitest run test/hub/e2e/dispatch.test.ts -t idle`
- AC11 → T5's greps; `npx vitest run test/plugin`
- AC12 → `npm run typecheck`; T6's `wc -l`; `npx vitest run test/hub/run-check.test.ts test/hub/e2e/team-2.test.ts`

## Rollout & rollback
- Ships in the bundle (Release builds it); this repo gets it through `refresh-bin` (P-024).
- **Human / escalation before the first unattended run here:** `claude -p` must be able to run the crew agents' tools without prompting. That is the human's permission settings (`.claude/settings.json`, protected) or their own `--command` (e.g. a permission-mode flag). The runner doesn't choose it. The PostToolUse activity hook (P-027's rollout) should be in settings.json so idle runs are seen. A `notify:` channel in `.crew/policy.yaml`, if wanted, is a policy change, also theirs.
- Rollback: revert the plan's commit; `run --check` and the printed loop are unchanged.

## Risks & open questions
- Ledger progress is a proxy: a pass that only wrote code (no checkpoint) counts as no progress. Agents checkpoint at each task start and end (P-027's developer text), so a working pass records events.
- A hung `claude -p` blocks the runner until the human interrupts it; a pass timeout is a follow-up if this happens.
- Concurrent runners on one repo aren't prevented. The ledger lock keeps writes safe, but passes would race on dispatch. The docs say to run one.

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-034: Local runner: run --until-done [in-progress] tasks 0/6 — claimed by Arpit Anand (developer:add085e9ca4500746)
- last checkpoint 2026-10-25 20:03 at T6 (8e07a10) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- next: T1: `preflight` → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/runner.test.ts -t preflight` (AC1, AC2, AC3)
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —, AC6 —, AC7 —, AC8 —, AC9 —, AC10 —, AC11 —, AC12 —

Latest log:
- 2026-10-25: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-034-local-runner-run-until-done

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-034-local-runner-run-until-done

## Outcome
