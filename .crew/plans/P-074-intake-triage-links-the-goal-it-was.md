---
id: P-074
title: Intake triage links the --goal it was given
goal:
items: BUG-046
touches: packages/crew/src/hub/commands/work/backlog.ts, packages/crew/test/hub/e2e/goal-links.test.ts, plugins/crew/skills/hub/agents/pm.md, plugins/crew/skills/hub/references/model.md
depends_on:
status: in-review
branch: plan/P-074-intake-triage-links-the-goal-it-was
pr:
created: 2026-10-26
started: 2026-10-27
completed:
assignee: developer
---

# P-074: Intake triage links the --goal it was given

## Context
BUG-046: `new-item feat "T" --from D --goal G-007 --priority P1`, run by the PM, creates the item and triages it in the same
call, but leaves `goal:` empty. The PM then needs a second `triage <ID> --goal G-007` (six items under G-007 and G-009).

This is P-055's rule as built, not a regression: "goal links are decided at triage, not capture; `--goal` at capture is
only a hint" (Q-fcec4f). `goal-links.test.ts` pins it ("intake triage still runs, without a goal"). But when the item
leaves `new-item` triaged, that call was the triage. The run that triaged it holds the `item.triaged` gate, and its
`--goal` is that run's choice of goal, which the rule leaves to triage. So the hint should become the link in exactly that case.
Whenever the item stays `new`, capture still links no goal.

## Scope
**In:**
- `newItem` (backlog.ts): when intake triage moves the item to `triaged` and `--goal` was given, set `goal:` to it and
  append no `goal hint` line. In every other case (no `--priority`/`--severity`, the triage gate fails, the step needs
  human approval, or the caller is not the gate's role), behavior is unchanged: `goal:` stays empty and the hint goes in Notes.
- The MCP `new_item` tool follows the same code path; its schema is unchanged.
- pm.md and references/model.md: one sentence each, saying that capture which also triages links `--goal`.

**Out:**
- Linking the origin's goal at intake triage, or printing the suggestion after intake triage (suggestion stays with `triage`/`next`).
- Re-goal rules, `--origin`, `breakdownToItems`/`itemFromCandidate` (P-073 owns those).
- Re-vendoring `.crew/templates/agents/pm.md` (protected; the executive does it).

## Acceptance criteria
- [ ] AC1 · Regression (BUG-046). With no `item.triaged` gate, `new-item feat "Dark mode" --why "users asked" --goal g-001 --priority P2` exits 0 and the item has `status: triaged`, `goal: G-001`, and no `goal hint` line in Notes.
- [ ] AC2 · A bug with a filled draft, `--goal G-001 --severity S3` and no `--priority` is triaged with `goal: G-001` and `priority: P2`.
- [ ] AC3 · Unchanged when the item stays new. `new-item feat … --goal G-001` with no `--priority`/`--severity` leaves `goal:` empty with a `goal hint G-001 (by <actor>)` Notes line. The same holds when the lifecycle preset is on and the caller is not the pm role, and when the triage gate fails. Each case exits 0 and prints its existing `stays new` note.
- [ ] AC4 · `--goal` is still checked before anything is created: `--goal G-009` (unknown) fails with `Goal G-009 does not exist.` and no item exists.
- [ ] AC5 · The MCP `new_item` tool with `goal` and `priority` links the goal the same way; with `goal` alone it keeps the hint.
- [ ] AC6 · pm.md's Capture bullet and model.md's Goal links paragraph say that capture which also triages links `--goal`, and otherwise it is a hint. `test/hub/e2e/agents.test.ts` and `test/docs.test.ts` stay green.

## Approach
- In `newItem`, decide whether intake triage moves the item before writing the hint. Lift the `if (o.priority || severity)`
  gate checks (problems, `approvalReason`, the `role && mine !== role` check) into a local `triageNow` boolean, computed after `createItem`.
- If `triageNow && hint`, call `it.set("goal", hint)`. Otherwise append the hint Notes line as today. Then save, then
  `move(store, it.id, "triaged", summary(it))` as today. The `stays new` notes are unchanged.
- `triageProblems` does not read `goal`, so linking before `move` changes no gate result. backlog.ts stays under 300 lines.
- Update the `// a goal is linked at triage; at capture it is only a hint` comment to the new rule.
- Tests: change `goal-links.test.ts` "--goal is checked, then kept only as a hint in Notes (AC1)" so that it expects
  `goal: G-001`, with no hint line, for the `--priority` capture. Add the AC2, AC3 and AC5 cases next to it, as a test
  named "intake triage links --goal (BUG-046)". The MCP test at "new_item detects the origin and keeps --goal as a hint"
  stays as is, because it passes no priority.

## Design

## Tasks
- [x] T1: In `newItem`, link `--goal` when intake triage moves the item, else keep the hint (AC1–AC5) → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/goal-links.test.ts -t "capture"`, then `git checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md`
- [x] T2: Update pm.md's Capture bullet and model.md's Goal links paragraph (AC6) → verify: `cd packages/crew && npx vitest run test/hub/e2e/agents.test.ts test/docs.test.ts`, and read both sentences against AC6
- [x] T3: Typecheck → verify: `cd packages/crew && npm run typecheck`

## Test plan
**Targeted checks** (from `packages/crew/`; e2e suites drive the built bundle: run `npm run build` first, then `git checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md`):
- AC1, AC2, AC3, AC4 → `npx vitest run test/hub/e2e/goal-links.test.ts -t "capture"`
- AC5 → `npx vitest run test/hub/e2e/goal-links.test.ts -t "capture"` (the new BUG-046 case, MCP `new_item` with `goal` and `priority`) and `-t "MCP"` (the existing `new_item` hint case, `goal` alone)
- AC6 → `npx vitest run test/hub/e2e/agents.test.ts test/docs.test.ts`
- `npm run typecheck`

## Rollout & rollback
- Ships in the bundle. It reaches this repo through refresh-bin after landing.
- The pm.md text reaches running PM agents after the executive re-vendors `.crew/templates/agents/pm.md` (protected).
- Rollback: revert the commit. Items linked at capture keep their goals, which are valid links.

## Risks & open questions
- This narrows P-055's executive-approved rule (Q-fcec4f) for the one case where capture is also triage. Resolved: the PM
  escalated it (Q-d11997, Q-2a7842) and the executive chose B: a new-item call that also triages is the PM confirming the
  goal at triage, so linking it follows rule 1; --goal stays a hint for captures that do not triage.
- Overlap: P-073 also edits backlog.ts (`itemFromCandidate`/`breakdownToItems`, a different function), so this plan is
  staffed after P-073. The test file and model.md are `hub.shared`.

## Handoff

_Generated 2026-10-28 by `crew.mjs handoff` from the ledger._

- P-074: Intake triage links the --goal it was given [in-review] tasks 3/3 — claimed by Arpit Anand (developer:afb9baa65e51c0e3c)
- last checkpoint 2026-10-28 05:30 at done (8eb2bb9) by Arpit Anand; since then 0 commit(s), 2 uncommitted file(s): plugins/crew/skills/hub/dist/crew.mjs, plugins/crew/skills/hub/dist/mcp.mjs
- ✗ cd packages/crew && npx vitest run test/hub/e2e/goal-links.test.ts -t capture (AC 2) — ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
- ✓ cd packages/crew && npx vitest run test/hub/e2e/goal-links.test.ts -t MCP (AC 5)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/agents.test.ts test/docs.test.ts (AC 6)
- ✓ cd packages/crew && npm run typecheck
- evidence: AC1 ✓, AC2 ✗, AC3 —, AC4 —, AC5 ✓, AC6 ✓

Latest log:
- 2026-10-27: assigned to the developer role
- 2026-10-27: status ready → in-progress — branch plan/P-074-intake-triage-links-the-goal-it-was
- 2026-10-27: status in-progress → in-review

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-27: assigned to the developer role
- 2026-10-27: status ready → in-progress — branch plan/P-074-intake-triage-links-the-goal-it-was
- 2026-10-27: status in-progress → in-review

## Outcome
Behaviour change: `new-item` with `--goal` links that goal when the same call triages the item (`--priority` or
`--severity`, and the `item.triaged` gate passes for the caller); the item gets `goal: G-###` and no `goal hint` Notes line.
When the item stays new (no triage decision, the gate's problems, a human gate, or a caller outside the gate's role) the
goal stays a Notes hint as before. The MCP `new_item` tool follows the same path. pm.md's Capture bullet and model.md's
Goal links paragraph say so. A fresh plan worktree needs `npm ci` in packages/crew before build/tests (existing gotcha).
Learnings: none
