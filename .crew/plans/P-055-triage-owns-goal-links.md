---
id: P-055
title: Triage owns goal links
goal: G-007
items: FEAT-048, BUG-037
touches: packages/crew/src/hub/commands/work/backlog.ts, packages/crew/src/hub/commands/work/backlog.reg.ts, packages/crew/src/hub/core/team/policy.ts, packages/crew/src/hub/core/team/presets.ts, packages/crew/scripts/sample-project.mjs, plugins/crew/skills/hub/agents/pm.md, plugins/crew/skills/hub/references/model.md, plugins/crew/docs/reference.md, plugins/crew/docs/policy.md, packages/crew/test/hub/e2e/goal-links.test.ts, packages/crew/test/hub/e2e/basics.test.ts, packages/crew/test/hub/e2e/dispatch.test.ts, packages/crew/test/hub/e2e/doctor.test.ts, packages/crew/test/hub/e2e/items.test.ts, packages/crew/test/hub/e2e/sparse-worktrees.test.ts, packages/crew/test/hub/e2e/worktrees.test.ts, packages/crew/test/hub/e2e/runner.test.ts, packages/crew/test/hub/e2e/policy.test.ts, packages/crew/test/hub-worktrees.test.ts, packages/crew/test/mcp.test.ts, packages/crew/test/hub/registry.test.ts
depends_on:
status: ready
branch: plan/P-055-triage-owns-goal-links
pr:
created: 2026-10-26
started:
completed:
---

# P-055: Triage owns goal links

## Context
FEAT-048 and BUG-037 (G-007). Goal links should be decided at triage, not capture. BUG-037: `triage --goal none` errors ("Goal NONE does not exist") and `--goal ""` reports updated but changes nothing, so an item cannot be unlinked. Today a plan's goal is also fixed at `new-plan`.

**Approval needed before a developer starts:** the capture rule (items are captured with no goal; a suggested goal goes in Notes) and the PM re-goal rule change role permissions. The executive must approve them first. The architect should spec the plan and raise that approval as one escalation naming the exact rules.

## Scope
**In:**
- `new-item` captures with no goal; a filer's suggested goal is recorded in Notes.
- `new-item bug` is refused when Steps to reproduce, Expected or Actual is empty.
- `triage` can clear a goal (fixes BUG-037); `--goal ""` never reports updated while changing nothing.
- The PM can re-goal items and plans, with a required `--note`; every re-goal is logged.
- Limits: done or dropped goals and their work are frozen; a plan in flight moves only as a whole with its items.

**Out (explicitly not doing):**
- The overlap check at triage (FEAT-049).
- Changing who may create or approve goals.

## Acceptance criteria
- [ ] AC1 · Capture without a goal. `new-item feat "x" --why "y" --goal G-001` (G-001 exists) creates the item with an empty `goal:`. Its Notes get `- <date>: suggested goal G-001 (by <actor>)`, and the command prints `note: FEAT-### is captured without a goal; G-001 is suggested in Notes — the PM links it at triage`. An unknown goal still fails as today (`Goal G-009 does not exist.`). The MCP `new_item` tool behaves the same. A goal's Breakdown (`breakdownToItems`) still links the items it creates to that goal.
- [ ] AC2 · Bug capture. `new-item bug` whose body leaves Steps to reproduce, Expected or Actual empty fails with `A bug needs Steps to reproduce, Expected and Actual; empty: <names>. Nothing was created.` That includes every `--why` bug. Nothing is created and the draft is kept. A bug from a draft with the three sections filled is created as today.
- [ ] AC3 · BUG-037. `triage FEAT-### --goal none --note "off G-001"` on an item linked to G-001 clears `goal:`, appends a Notes line naming the old goal and the note, and records a `log` ledger event. `--goal ""` does the same, or fails with `use --goal none to clear the goal` if the parser drops the empty value; it is never reported as updated with no change. A regression test asserts the cleared front matter.
- [ ] AC4 · Re-goal. `regoal <ID> <G-###|none> --note TXT` (CLI) and the `regoal` MCP tool change the goal of an item or a plan. `--note` is required. Each re-goal appends `re-goaled <old|none> → <new|none> by <actor>: <note>` to the document (Notes for items, Progress log for plans) and records a `log` ledger event on the ref. Changing an existing goal through `triage --goal` counts as a re-goal: it needs `--note` and passes the AC5 and AC6 checks. Linking a goal-less item at triage needs no note.
- [ ] AC5 · Frozen work. A re-goal is refused, with nothing changed, when the document's current goal is `done` or `dropped`, when the target goal is `done` or `dropped`, or when the document itself is closed (item `done`/`wontfix`/`duplicate`, plan `done`/`dropped`). Each refusal names the reason.
- [ ] AC6 · Plans move whole. Re-goaling an item whose `plan:` names an open plan is refused with `FEAT-### is in P-###: re-goal the plan, which moves its items with it`. `regoal P-### G-002 --note …` moves the plan and every item in its `items:`, all or nothing: if any of them fails AC5, nothing changes.
- [ ] AC7 · Permissions. `item.regoaled` and `plan.regoaled` are gated actions (`ACTIONS`), and the lifecycle preset gives both to `pm`. `regoal` run as another role is refused by the policy, while a human with no role and the executive pass, as with other role gates. `policy show` lists both. The PM template, `references/model.md` and the generated doc blocks describe the capture, bug and re-goal rules.

## Approach
- **Capture (backlog.ts `newItem`).** `--goal` is checked with `checkRef`, then kept out of `fields`. After `createItem`, `it.appendLog("suggested goal G-### (by <actor>)", "Notes")` and save. Intake triage (priority/severity at capture) still runs, without a goal. The CLI flag and the MCP `goal` input stay: their spec, schema, help line and description are pinned by `test/hub/registry-before.json` (frozen, K-2026-10-25-approved-with-one-change-do-not-edit), so only the behaviour changes.
- **Bug capture.** Before `createItem`, for `BUG` check `probe.missing(TRIAGE_SECTIONS.BUG)` (core/work/model.ts, the same sections `triageProblems` checks) and fail with AC2's text.
- **One goal-link helper** in backlog.ts: `relink(store, doc, target: string | null, note, actor)`. It applies the AC5 checks, the AC6 item-in-open-plan refusal, `authorize(store, doc.id, "<kind>.regoaled", undefined, undefined, "regoal …")`, the set, the log line and `store.ledger.record("log", doc.id, { text })`. For a plan it first checks every linked item, then writes all of them (all or nothing). `parseGoal(value)` maps `none`/`""` to null, else `checkRef`.
  - `triage`: when `o.goal` is given (including `""` or `none`) and the item already has a goal different from the target, it calls `relink` (note required). When the item has no goal, it sets it as today. The `if (value)` skip no longer applies to `goal`.
  - `regoal ID TARGET --note TXT`: new, for items and plans, through `relink`.
- **Registration (backlog.reg.ts).**
  - CLI `regoal` (`pos: ["id", "goal"]`, `str: ["note"]`), with the usage line `  regoal ID G-###|none --note TXT                  move an item or plan (with its items) to another goal, or off it (PM)`.
  - MCP tool `regoal` (`id`, `goal`, `note`; all required).
  - `new-item` and `triage` registrations are unchanged (pinned).
- **Policy.** `core/team/policy.ts` `ACTIONS` gains `item.regoaled` and `plan.regoaled`. `core/team/presets.ts` lifecycle `role_gates` gains `"item.regoaled": "pm"` and `"plan.regoaled": "pm"`. No new ledger event type (re-goals are `log` events), so `diagrams.ts` and the ledger command need no change.
- **Docs (K-2026-10-26-add-plugins-crew-docs-reference-md).** `npm run build` regenerates `plugins/crew/docs/reference.md` (`regoal` command and tool) and `plugins/crew/docs/policy.md` (transition gates); both are checkpointed with `test/docs.test.ts` green. Hand text:
  - `references/model.md`: an "Goal links" paragraph covering the capture, bug and re-goal rules.
  - `agents/pm.md`: the triage line, plus `regoal … --note`.
- **Existing tests and the sample.** These break under the new rules and are updated to keep what they test:
  - Bugs captured with `--why` switch to `newBug` (helpers.ts) or a filled draft: basics, dispatch, doctor, items, sparse-worktrees, worktrees.
  - Items captured with `--goal` and expected linked get `triage --goal` by the PM after capture: dispatch, runner.
  - `scripts/sample-project.mjs` triages its two bugs onto their goals after capture, so the sample's state (which `view.test.ts` and `mcp.test.ts` read) is unchanged.
- backlog.ts is 119 lines and stays under 300.

## Tasks
- [ ] T1: Capture without a goal and the bug capture rule (`newItem`) → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/goal-links.test.ts -t "capture"` (AC1, AC2)
- [ ] T2: `relink`, `parseGoal`, triage's goal handling (BUG-037) → verify: `npx vitest run test/hub/e2e/goal-links.test.ts -t "triage"` (AC3, AC4 triage part)
- [ ] T3: `regoal` command, MCP tool, `ACTIONS`, preset gates; `regoal` added to `test/mcp.test.ts`'s sorted tool list → verify: `npx vitest run test/hub/e2e/goal-links.test.ts -t "regoal" test/mcp.test.ts test/hub/registry.test.ts test/hub/e2e/policy.test.ts`; `git diff --quiet main -- test/hub/registry-before.json` (AC4–AC7)
- [ ] T4: Existing tests and `sample-project.mjs` moved to the new rules → verify: `npx vitest run test/hub/e2e/basics.test.ts test/hub/e2e/dispatch.test.ts test/hub/e2e/doctor.test.ts test/hub/e2e/items.test.ts test/hub/e2e/sparse-worktrees.test.ts test/hub/e2e/worktrees.test.ts test/hub/e2e/runner.test.ts test/hub-worktrees.test.ts test/view.test.ts test/mcp.test.ts`
- [ ] T5: Docs and templates (`model.md`, `pm.md`, regenerated `reference.md` and `policy.md`) → verify: `npx vitest run test/docs.test.ts test/hub/e2e/agents.test.ts`; read the PM template and model.md against AC7

## Test plan
**Targeted checks** (from `packages/crew/`; the e2e suites drive the built bundles: `npm run build` first, then `git checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md`):
- AC1, AC2 → `npx vitest run test/hub/e2e/goal-links.test.ts -t "capture"`
- AC3 (BUG-037 regression) → `npx vitest run test/hub/e2e/goal-links.test.ts -t "triage"`
- AC4–AC6 → `npx vitest run test/hub/e2e/goal-links.test.ts -t "regoal"`
- AC7 → `npx vitest run test/hub/e2e/policy.test.ts test/hub/registry.test.ts test/mcp.test.ts test/docs.test.ts`
- Tests touched by the new rules → T4's command; `npm run typecheck`

## Rollout & rollback
- Ships in the bundle and reaches this repo through refresh-bin.
- The executive's approval of the rules is a gate before a developer starts: the escalation on P-055 holds it.
- The PM template text reaches this repo after the executive re-vendors `.crew/templates/agents/pm.md` (protected), runs `agents` with their approval, and starts a fresh session.
- Existing projects' policy files that override `role_gates` keep working; without an entry, `item.regoaled`/`plan.regoaled` come from the preset.
- Rollback: revert the commit. Re-goal `log` events stay readable.

## Risks & open questions
- Executive approval of the capture and re-goal rules is required first (see Context).
- Existing items keep their goals; only new captures start goal-less.

## Handoff

## Progress log

- 2026-10-26: status draft → ready

## Outcome
