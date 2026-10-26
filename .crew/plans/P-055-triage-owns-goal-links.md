---
id: P-055
title: Triage owns goal links
goal: G-007
items: FEAT-048, BUG-037
touches: packages/crew/src/hub/commands/work/backlog.ts, packages/crew/src/hub/commands/work/backlog.reg.ts, packages/crew/src/hub/core/team/policy.ts, packages/crew/src/hub/core/team/presets.ts, packages/crew/scripts/sample-project.mjs, plugins/crew/skills/hub/agents/pm.md, plugins/crew/skills/hub/references/model.md, plugins/crew/docs/reference.md, plugins/crew/docs/policy.md, packages/crew/test/hub/e2e/goal-links.test.ts, packages/crew/test/hub/e2e/basics.test.ts, packages/crew/test/hub/e2e/dispatch.test.ts, packages/crew/test/hub/e2e/doctor.test.ts, packages/crew/test/hub/e2e/items.test.ts, packages/crew/test/hub/e2e/sparse-worktrees.test.ts, packages/crew/test/hub/e2e/worktrees.test.ts, packages/crew/test/hub/e2e/runner.test.ts, packages/crew/test/hub/e2e/policy.test.ts, packages/crew/test/hub-worktrees.test.ts, packages/crew/test/mcp.test.ts, packages/crew/test/hub/registry.test.ts, packages/crew/src/docs/diagrams.ts, plugins/crew/docs/plan-lifecycle.md, packages/crew/test/docs.test.ts
depends_on:
status: accepted
branch: plan/P-055-triage-owns-goal-links
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
---

# P-055: Triage owns goal links

## Context
FEAT-048 and BUG-037 (G-007). Goal links should be decided at triage, not capture. BUG-037: `triage --goal none` errors ("Goal NONE does not exist") and `--goal ""` reports updated but changes nothing, so an item cannot be unlinked. Today a plan's goal is also fixed at `new-plan`.

**Approved by the executive (Q-fcec4f), with rule 1 changed:** at capture an item records its origin, not a goal. The origin is the plan it was found in (`found in P-###`) or the item it came from (`from BUG-###`); the hub fills it in when an agent files from inside a plan's work. At triage the hub suggests the origin's goal, and the PM confirms it or picks another. `--goal` at capture is only a hint, because its schema is frozen. Rules 2–5 are approved as specced below.

## Scope
**In:**
- `new-item` captures with no goal and records the item's origin (`origin: P-###` or an item ID): explicit `--origin` (CLI), else the caller's plan worktree, else the caller's run's single open plan claim. A `--goal` hint goes in Notes. At triage the hub suggests a goal: the origin plan's or origin item's goal, else the hint.
- `new-item bug` is refused when Steps to reproduce, Expected or Actual is empty.
- `triage` can clear a goal (fixes BUG-037); `--goal ""` never reports updated while changing nothing.
- The PM can re-goal items and plans, with a required `--note`; every re-goal is logged.
- Limits: done or dropped goals and their work are frozen; a plan in flight moves only as a whole with its items.

**Out (explicitly not doing):**
- The overlap check at triage (FEAT-049).
- Changing who may create or approve goals.

## Acceptance criteria
- [ ] AC1 · Capture records origin, not goal.
  - `new-item feat "x" --why "y"` run from P-003's worktree (or by a run whose only open claim is P-003) creates the item with an empty `goal:` and `origin: P-003`.
  - `--origin BUG-002` (CLI) sets `origin: BUG-002` and wins over detection; an unknown or non-plan/non-item ref fails with `Origin <ref> does not exist.`. With no worktree, claim or `--origin`, there is no `origin:` field.
  - `--goal G-001` is checked as today, then only recorded in Notes as `goal hint G-001 (by <actor>)`.
  - The MCP `new_item` tool behaves the same, with detection only: its schema is frozen.
  - A goal's Breakdown (`breakdownToItems`) still links the items it creates to that goal.
- [ ] AC1b · Triage suggests the goal. `triage FEAT-### --priority P2` on a goal-less item leaves `goal:` empty and prints `suggested goal: G-### (<origin P-003's goal | origin BUG-002's goal | goal hint>) — confirm with \`triage FEAT-### --goal G-###\` or pick another`. The suggestion is the origin's goal, else the latest Notes hint; it prints nothing when there is none. `triage --goal G-###` links as today.
- [ ] AC2 · Bug capture. `new-item bug` whose body leaves Steps to reproduce, Expected or Actual empty fails with `A bug needs Steps to reproduce, Expected and Actual; empty: <names>. Nothing was created.` That includes every `--why` bug. Nothing is created and the draft is kept. A bug from a draft with the three sections filled is created as today.
- [ ] AC3 · BUG-037. `triage FEAT-### --goal none --note "off G-001"` on an item linked to G-001 clears `goal:`, appends a Notes line naming the old goal and the note, and records a `log` ledger event. `--goal ""` does the same, or fails with `use --goal none to clear the goal` if the parser drops the empty value; it is never reported as updated with no change. A regression test asserts the cleared front matter.
- [ ] AC4 · Re-goal. `regoal <ID> <G-###|none> --note TXT` (CLI) and the `regoal` MCP tool change the goal of an item or a plan. `--note` is required. Each re-goal appends `re-goaled <old|none> → <new|none> by <actor>: <note>` to the document (Notes for items, Progress log for plans) and records a `log` ledger event on the ref. Changing an existing goal through `triage --goal` counts as a re-goal: it needs `--note` and passes the AC5 and AC6 checks. Linking a goal-less item at triage needs no note.
- [ ] AC5 · Frozen work. A re-goal is refused, with nothing changed, when the document's current goal is `done` or `dropped`, when the target goal is `done` or `dropped`, or when the document itself is closed (item `done`/`wontfix`/`duplicate`, plan `done`/`dropped`). Each refusal names the reason.
- [ ] AC6 · Plans move whole. Re-goaling an item whose `plan:` names an open plan is refused with `FEAT-### is in P-###: re-goal the plan, which moves its items with it`. `regoal P-### G-002 --note …` moves the plan and every item in its `items:`, all or nothing: if any of them fails AC5, nothing changes.
- [ ] AC7 · Permissions. `item.regoaled` and `plan.regoaled` are gated actions (`ACTIONS`), and the lifecycle preset gives both to `pm`. `regoal` (and a re-goal through `triage --goal`) run by any role other than the gate's role, including the executive and a run in no role, is refused by the policy: re-goal is the PM's alone, and the executive asks the PM (executive decision relayed by the coordinator in the P-055 review, 2026-10-26). `policy show` lists both. The PM template, `references/model.md` and the generated doc blocks describe the capture, bug and re-goal rules.

## Approach
- **Capture (backlog.ts `newItem`).**
  - `--goal` is checked with `checkRef`, then kept out of `fields` and appended to Notes as a hint.
  - `origin` comes from `itemOrigin(store, explicit)`, in order: (1) `--origin`, checked as an existing plan or item; (2) the plan whose worktree is `store.ws.root` (reverse of `store.planWorktrees()`); (3) the plan of the caller's run's open claim when exactly one exists (`store.ledger.claims()` filtered by `who.run`); (4) none. When there is an origin, `doc.set("origin", …)` runs after `store.build`, so the item templates, including the vendored `.crew/templates/item-*.md`, stay unchanged.
  - Intake triage (priority/severity at capture) still runs, without a goal.
  - The CLI gains `--origin` (adding an option is allowed by registry.test.ts) and a new, separate usage line: `  new-item … --origin P-###|ID                       record where the item was found (else the caller's plan worktree or claim)`. The existing help line, the MCP `new_item` schema and its description stay as `registry-before.json` pins them.
- **Triage suggestion.** `suggestedGoal(store, item)`: the `origin` doc's `goal`, else the last `goal hint G-###` in Notes, else null. `triage` prints it when the item ends without a goal.
- **Bug capture.** Before `createItem`, for `BUG` check `probe.missing(TRIAGE_SECTIONS.BUG)` (core/work/model.ts, the same sections `triageProblems` checks) and fail with AC2's text.
- **One goal-link helper** in backlog.ts: `relink(store, doc, target: string | null, note, actor)`. It applies the AC5 checks, the AC6 item-in-open-plan refusal, `authorize(store, doc.id, "<kind>.regoaled", undefined, undefined, "regoal …")`, the set, the log line and `store.ledger.record("log", doc.id, { text })`. For a plan it first checks every linked item, then writes all of them (all or nothing). `parseGoal(value)` maps `none`/`""` to null, else `checkRef`.
  - `triage`: when `o.goal` is given (including `""` or `none`) and the item already has a goal different from the target, it calls `relink` (note required). When the item has no goal, it sets it as today. The `if (value)` skip no longer applies to `goal`.
  - `regoal ID TARGET --note TXT`: new, for items and plans, through `relink`.
- **Registration (backlog.reg.ts).**
  - CLI `regoal` (`pos: ["id", "goal"]`, `str: ["note"]`), with the usage line `  regoal ID G-###|none --note TXT                  move an item or plan (with its items) to another goal, or off it (PM)`.
  - MCP tool `regoal` (`id`, `goal`, `note`; all required).
  - `new-item` and `triage` registrations are unchanged (pinned).
- **Policy.** `core/team/policy.ts` `ACTIONS` gains `item.regoaled` and `plan.regoaled`. `core/team/presets.ts` lifecycle `role_gates` gains `"item.regoaled": "pm"` and `"plan.regoaled": "pm"`. No new ledger event type (re-goals are `log` events), so the ledger command needs no change; the two new role gates do appear in the generated plan-steps table, so `diagrams.ts` `STEP_NOTES` gains a line for each and `plugins/crew/docs/plan-lifecycle.md` is committed regenerated (Q-cf70a3).
- **Docs (K-2026-10-26-add-plugins-crew-docs-reference-md).** `npm run build` regenerates `plugins/crew/docs/reference.md` (`regoal` command and tool) and `plugins/crew/docs/policy.md` (transition gates); both are checkpointed with `test/docs.test.ts` green. Hand text:
  - `references/model.md`: an "Goal links" paragraph covering the capture, bug and re-goal rules.
  - `agents/pm.md`: the triage line, plus `regoal … --note`.
- **Existing tests and the sample.** These break under the new rules and are updated to keep what they test:
  - Bugs captured with `--why` switch to `newBug` (helpers.ts) or a filled draft: basics, dispatch, doctor, items, sparse-worktrees, worktrees.
  - Items captured with `--goal` and expected linked get `triage --goal` by the PM after capture: dispatch, runner.
  - `scripts/sample-project.mjs` triages its two bugs onto their goals after capture, so the sample's state (which `view.test.ts` and `mcp.test.ts` read) is unchanged.
- backlog.ts is 119 lines and stays under 300.

## Tasks
- [x] T1: Capture with origin, not goal (`newItem`, `itemOrigin`, `--origin` and its usage line), the triage suggestion, and the bug capture rule → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/goal-links.test.ts -t "capture"`. Cases: origin from the worktree, from the claim, from `--origin`, none; goal hint in Notes; triage suggestion from the origin and from the hint (AC1, AC1b, AC2)
- [x] T2: `relink`, `parseGoal`, triage's goal handling (BUG-037) → verify: `npx vitest run test/hub/e2e/goal-links.test.ts -t "triage"` (AC3, AC4 triage part)
- [x] T3: `regoal` command, MCP tool, `ACTIONS`, preset gates; `regoal` added to `test/mcp.test.ts`'s sorted tool list → verify: `npx vitest run test/hub/e2e/goal-links.test.ts -t "regoal" test/mcp.test.ts test/hub/registry.test.ts test/hub/e2e/policy.test.ts`; `git diff --quiet main -- test/hub/registry-before.json` (AC4–AC7)
- [x] T4: Existing tests and `sample-project.mjs` moved to the new rules → verify: `npx vitest run test/hub/e2e/basics.test.ts test/hub/e2e/dispatch.test.ts test/hub/e2e/doctor.test.ts test/hub/e2e/items.test.ts test/hub/e2e/sparse-worktrees.test.ts test/hub/e2e/worktrees.test.ts test/hub/e2e/runner.test.ts test/hub-worktrees.test.ts test/view.test.ts test/mcp.test.ts`
- [x] T5: Docs and templates (`model.md`, `pm.md`, regenerated `reference.md` and `policy.md`) → verify: `npx vitest run test/docs.test.ts test/hub/e2e/agents.test.ts`; read the PM template and model.md against AC7

## Test plan
**Targeted checks** (from `packages/crew/`; the e2e suites drive the built bundles: `npm run build` first, then `git checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md`):
- AC1, AC1b, AC2 → `npx vitest run test/hub/e2e/goal-links.test.ts -t "capture"`
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
- Existing items keep their goals; only new captures start goal-less. Items captured before this plan have no `origin:`.
- Origin detection from a claim is skipped when the run holds more than one open claim; then it needs `--origin`.

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-055: Triage owns goal links [in-review] tasks 5/5 — claimed by Arpit Anand (developer:ae7abfea7422550fc)
- last checkpoint 2026-10-26 09:11 at T3 (d16b579) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —, AC6 —, AC7 —, AC8 —

Latest log:
- 2026-10-26: review: changes requested — 1) Re-goal is the PM's alone (executive decision; AC7 amended in the spec): in backlog.ts regoalProblems, drop the also [executive, empty] argument to authorize, so item.regoaled/plan.regoaled refuse every role but the gate's, the executive and a run in no role included (the executive asks the PM). In test/hub/e2e/policy.test.ts 'lifecycle gives regoal to the PM', the executive and no-role cases must now expect refusal ('is for the pm role; this run is the executive role' / 'in no role') with goal: unchanged, for regoal and for a re-goal through triage --goal ... --note; pm keeps passing. 2) Intake triage at capture (backlog.ts newItem): the new check must mirror authorize exactly. It now lets the executive and a no-role run reach move(), which authorize then refuses AFTER the item is created: under preset lifecycle, new-item feat X --why y --priority P2 run as the executive role, and with no role, both exit 1 with 'FEAT-001 -> triaged is for the pm role' while FEAT-001 exists (reproduced). Use 'role && mine !== role' (no executive or empty-role exception) so any non-gate caller leaves the item new with the 'the pm triages it' note and exit 0; add a test for executive and no-role capture with --priority under lifecycle (item created, status new, exit 0). Everything else checks out: registry-before.json and the new-item/triage registrations unchanged, the T4 test moves keep or strengthen their assertions, docs and STEP_NOTES fine. Rebuild, rerun goal-links, policy, registry, mcp and docs tests, and restore the generated dist and commands.md paths.
- 2026-10-26: status in-review → in-progress — changes requested: 1) Re-goal is the PM's alone (executive decision; AC7 amended in the spec): in backlog.ts regoalProblems, drop the also [executive, empty] argument to authorize, so item.regoaled/plan.regoaled refuse every role but the gate's, the executive and a run in no role included (the executive asks the PM). In test/hub/e2e/policy.test.ts 'lifecycle gives regoal to the PM', the executive and no-role cases must now expect refusal ('is for the pm role; this run is the executive role' / 'in no role') with goal: unchanged, for regoal and for a re-goal through triage --goal ... --note; pm keeps passing. 2) Intake triage at capture (backlog.ts newItem): the new check must mirror authorize exactly. It now lets the executive and a no-role run reach move(), which authorize then refuses AFTER the item is created: under preset lifecycle, new-item feat X --why y --priority P2 run as the executive role, and with no role, both exit 1 with 'FEAT-001 -> triaged is for the pm role' while FEAT-001 exists (reproduced). Use 'role && mine !== role' (no executive or empty-role exception) so any non-gate caller leaves the item new with the 'the pm triages it' note and exit 0; add a test for executive and no-role capture with --priority under lifecycle (item created, status new, exit 0). Everything else checks out: registry-before.json and the new-item/triage registrations unchanged, the T4 test moves keep or strengthen their assertions, docs and STEP_NOTES fine. Rebuild, rerun goal-links, policy, registry, mcp and docs tests, and restore the generated dist and commands.md paths.
- 2026-10-26: Executive decision (Arpit Anand, team session 2026-10-26, in their words: 'PM owns it'): re-goal (item.regoaled, plan.regoaled, and triage changing or clearing an existing goal) is the PM's alone; no pass for the executive or a role-less caller; the executive asks the PM.

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: Architect: spec updated for the executive's rule 1 (Q-fcec4f): items record origin (--origin, plan worktree, single claim), --goal is a Notes hint, triage suggests the origin's goal (AC1, AC1b, Approach, T1). Rules 2-5 unchanged; touches unchanged.
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-055-triage-owns-goal-links
- 2026-10-26: status in-progress → in-review
- 2026-10-26: review: changes requested — 1) Re-goal is the PM's alone (executive decision; AC7 amended in the spec): in backlog.ts regoalProblems, drop the also [executive, empty] argument to authorize, so item.regoaled/plan.regoaled refuse every role but the gate's, the executive and a run in no role included (the executive asks the PM). In test/hub/e2e/policy.test.ts 'lifecycle gives regoal to the PM', the executive and no-role cases must now expect refusal ('is for the pm role; this run is the executive role' / 'in no role') with goal: unchanged, for regoal and for a re-goal through triage --goal ... --note; pm keeps passing. 2) Intake triage at capture (backlog.ts newItem): the new check must mirror authorize exactly. It now lets the executive and a no-role run reach move(), which authorize then refuses AFTER the item is created: under preset lifecycle, new-item feat X --why y --priority P2 run as the executive role, and with no role, both exit 1 with 'FEAT-001 -> triaged is for the pm role' while FEAT-001 exists (reproduced). Use 'role && mine !== role' (no executive or empty-role exception) so any non-gate caller leaves the item new with the 'the pm triages it' note and exit 0; add a test for executive and no-role capture with --priority under lifecycle (item created, status new, exit 0). Everything else checks out: registry-before.json and the new-item/triage registrations unchanged, the T4 test moves keep or strengthen their assertions, docs and STEP_NOTES fine. Rebuild, rerun goal-links, policy, registry, mcp and docs tests, and restore the generated dist and commands.md paths.
- 2026-10-26: status in-review → in-progress — changes requested: 1) Re-goal is the PM's alone (executive decision; AC7 amended in the spec): in backlog.ts regoalProblems, drop the also [executive, empty] argument to authorize, so item.regoaled/plan.regoaled refuse every role but the gate's, the executive and a run in no role included (the executive asks the PM). In test/hub/e2e/policy.test.ts 'lifecycle gives regoal to the PM', the executive and no-role cases must now expect refusal ('is for the pm role; this run is the executive role' / 'in no role') with goal: unchanged, for regoal and for a re-goal through triage --goal ... --note; pm keeps passing. 2) Intake triage at capture (backlog.ts newItem): the new check must mirror authorize exactly. It now lets the executive and a no-role run reach move(), which authorize then refuses AFTER the item is created: under preset lifecycle, new-item feat X --why y --priority P2 run as the executive role, and with no role, both exit 1 with 'FEAT-001 -> triaged is for the pm role' while FEAT-001 exists (reproduced). Use 'role && mine !== role' (no executive or empty-role exception) so any non-gate caller leaves the item new with the 'the pm triages it' note and exit 0; add a test for executive and no-role capture with --priority under lifecycle (item created, status new, exit 0). Everything else checks out: registry-before.json and the new-item/triage registrations unchanged, the T4 test moves keep or strengthen their assertions, docs and STEP_NOTES fine. Rebuild, rerun goal-links, policy, registry, mcp and docs tests, and restore the generated dist and commands.md paths.
- 2026-10-26: Executive decision (Arpit Anand, team session 2026-10-26, in their words: 'PM owns it'): re-goal (item.regoaled, plan.regoaled, and triage changing or clearing an existing goal) is the PM's alone; no pass for the executive or a role-less caller; the executive asks the PM.
- 2026-10-26: status in-progress → in-review
- 2026-10-26: status in-review → accepted
- 2026-10-26: landed on main as 6468c7b

## Outcome
Capture records origin, not goal: `new-item` sets `origin:` (`--origin`, the plan branch it runs on, or the run's single open plan claim) and keeps `--goal` as a `goal hint` Notes line; bugs need Steps to reproduce, Expected and Actual; `triage` prints the suggested goal and can clear (`--goal none`/`""`) or change a goal as a noted, logged re-goal (BUG-037 fixed). New `regoal` CLI command and MCP tool, gated by `item.regoaled`/`plan.regoaled` (pm in the lifecycle preset, and the PM's alone: the executive and a run in no role are refused, per review), with frozen-work and plan-moves-whole rules. Beyond the spec: `diagrams.ts` STEP_NOTES and `plan-lifecycle.md` (Q-cf70a3), the `docs.test.ts` offFlowSteps pin (Q-5764d6), and intake triage at capture now leaves an item new with a note when the capturing run's role (including the executive or no role) isn't `item.triaged`'s gate role (a developer filing an S1 bug used to fail the whole capture once bugs could pass the triage gate at intake).
Learnings: K-2026-10-26-authorize-refuses-a-run-in-no-role (also: a new off-flow gated action needs a STEP_NOTES line in diagrams.ts and a regenerated plan-lifecycle.md)
