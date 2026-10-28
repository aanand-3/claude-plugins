---
id: P-084
title: Waive an acceptance criterion the acceptor rules not reproducible
goal:
items: BUG-052
touches: packages/crew/src/hub/commands/work/execution.ts, packages/crew/src/hub/commands/work/execution.reg.ts, packages/crew/src/hub/commands/work/resume.ts, packages/crew/src/hub/commands/team/dispatch.ts, packages/crew/src/hub/commands/team/roles.ts, packages/crew/src/hub/commands/team/inbox.ts, packages/crew/src/hub/commands/memory/context.ts, plugins/crew/skills/hub/agents/pm.md, plugins/crew/skills/hub/references/model.md, packages/crew/test/hub/e2e/waive.test.ts
depends_on:
status: in-progress
branch: plan/P-084-waive-an-acceptance-criterion
pr:
created: 2026-10-27
started: 2026-10-28
completed:
assignee: developer
---

# P-084: Waive an acceptance criterion the acceptor rules not reproducible

## Context
BUG-052 (G-007): the hub can record only pass or fail for a check, so an acceptance criterion the PM has accepted as
"not reproduced" stays red. P-077 AC4 (a 16-process CPU load the permission policy denies agents) is the case: the PM
answered Q-ddf44d ("accept AC4 as not reproduced"), QA could only record a fail, and dispatch keeps sending developers
to "fix P-077" with nothing to fix. The PM then had to escalate a `move --force` to the human (Q-460998).

Today the only non-check path is a human's approval flag plus an `evidence:` note in the criterion text
(`evidenceProblems` in `commands/work/execution.ts`). That needs a human for every such case. This plan gives the role
that accepts plans a recorded waiver instead. The waiver never counts as a pass, and a later real check replaces it.

Binding decisions: done needs evidence from a run other than the implementer (K-2026-10-23-done-needs-evidence...).
Approvals stay human, so agents never pass the approval flag. registry-before.json is frozen
(K-2026-10-25-approved-with-one-change...), so the MCP `checkpoint` tool schema and the existing help line stay
unchanged. Modules stay under 300 lines.

## Scope
**In:**
- `checkpoint P-### --waive "<why it can't be checked, and who decided>" --ac <n>[,<n>]`, CLI only. It records a
  checkpoint whose verify entry is `{ cmd: <why>, ok: false, waived: true, ac, ac_text, observed: false }`.
- Who may waive: the role that `role_gates["plan.accepted"]` names (the PM under `preset: lifecycle`). With no role
  gate on `plan.accepted`, any run that is not one of the plan's implementers may waive. An implementer may never waive.
- A waiver checkpoint commits nothing. It skips `commitWork`, so the PM never commits a developer's uncommitted code
  and never invalidates a code review.
- One helper `settled(e)` in execution.ts: `(e.verify?.ok && e.independent) || e.verify?.waived`. It is used by
  `evidenceProblems`, dispatch (the in-review rule), roles (`next` for executive, qa and pm), the inbox approval
  entry and context.
- Display: resume, handoff and context show a waived criterion as `waived`, never as ✓ or ✗. Resume's check list
  shows `~ waived: <why> (AC n)`.
- A new usage line for `--waive` (added next to the existing checkpoint line, which stays unchanged). Add a sentence
  in references/model.md (Execution state) and one bullet in agents/pm.md.

**Out (explicitly not doing):**
- The MCP `checkpoint` tool schema. The frozen registry-before.json pins it, and agents use the CLI.
- Waiving a goal's criteria (`G-###`): refused.
- Unchecked tasks. The in-review and accepted task gates are unchanged. A task tied to a waived criterion (P-077 T3)
  is ticked by its developer with a note.
- Clearing P-077 itself. After this lands, the PM records the waiver on P-077 AC4 through the normal flow.
- Re-rendering `.claude/agents/crew-pm.md`. It is protected, so the human runs `crew.mjs agents` after landing.

## Acceptance criteria
- [ ] AC1: Under `preset: lifecycle`, `checkpoint P-001 --waive "load test denied by policy; PM accepted in Q-x" --ac 2` run by the PM exits 0 and records one checkpoint event whose verify entry has `ok: false`, `waived: true`, `ac: [2]` and the criterion's `ac_text`. HEAD of the plan worktree is unchanged, and an uncommitted file there stays uncommitted.
- [ ] AC2: `--waive` is refused (non-zero exit, no checkpoint recorded) when: run by QA or the developer under lifecycle, run by an implementer of the plan, given without `--ac`, combined with `--run` or `--verify`, or aimed at a goal (`G-###`).
- [ ] AC3: Take a plan in review whose other criteria have passing QA checks and whose code review is approved, with AC2 waived after a failing check. `dispatch --json` gives no `fix` entry and gives `pm` the `accept P-001` entry. `move P-001 accepted` by the PM succeeds.
- [ ] AC4: A waiver is never a pass. `resume P-001` shows `AC2 waived` in its evidence line and `~ waived: … (AC 2)`. `context P-001` shows `AC2 waived`. The ledger entry keeps `ok: false`.
- [ ] AC5: The latest result wins. A QA `checkpoint --run false --ac 2` after the waiver brings back the developer `fix` dispatch. A later passing QA check shows `AC2 ✓`. Editing AC2's text after a waiver makes AC2 show no evidence again.
- [ ] AC6: With AC2 waived and the rest complete, `next --role qa` no longer lists AC2 as missing, and `next --role pm` lists `accept P-001`. In `mode: ai-assisted` (plan.accepted is a human gate, no role gate), a waiver by a non-implementer run makes `inbox --json` list the approval entry for P-001.
- [ ] AC7: `crew.mjs --help` shows the `--waive` usage line. test/hub/registry.test.ts and test/mcp.test.ts pass unchanged, and `git diff --quiet main -- packages/crew/test/hub/registry-before.json` holds.

## Approach
- `Verify` gains an optional `waived?: true`. `CheckpointOptions` gains `waive?: string`. In `checkpoint()`:
  validate first (a plan and not a goal, `--ac` given, no `--run` or `--verify`, the role allowed and the run not an
  implementer), then skip `commitWork`, push the waived verify entry, and print `P-###: AC n waived — <why>`. Return 0.
  Add the role check as a small `mayWaive(store, plan)` next to `evidenceProblems`. Use
  `store.policy.policy.role_gates["plan.accepted"]` and `implementers()`, and mirror the
  `role && mine !== role` check from `authorize()` (K-2026-10-26-authorize-refuses-every-role...).
- `evidence()` doesn't change. The latest verify per criterion text still wins, so a waiver supersedes an earlier fail
  and a later check supersedes the waiver. Binding through `ac_text` means an edited criterion voids its waiver.
- Export `settled()` and switch every `verify?.ok && independent` site to it: dispatch.ts:93 (qa test), roles.ts:60,
  :107 and :125, and inbox.ts:27. dispatch.ts:87 becomes `e.verify && !e.verify.ok && !e.verify.waived`.
  `evidenceProblems` skips a waived criterion. In recovery and context, the symbol order is: `—`/`·` none, `waived`,
  `✗`, `✓`, `✓ self`.
- execution.ts is at 251 lines. If the change takes it past 300, move `recovery`/`resume`/`handoff` out into
  `commands/work/resume.ts` (an existing pattern: one module per concern) and keep the imports in the .reg.ts.
- CLI: execution.reg.ts adds `"waive"` to the checkpoint `str` list (lists may grow; `choices` stays `pass|fail`) and
  adds one usage line:
  `  checkpoint P-### --waive WHY --ac N            the plan's acceptor waives a criterion that can't be checked (never a pass)`.

## Design

## Tasks
- [x] T1: Add `waive` to `checkpoint` (validation, `mayWaive`, no commit, the waived verify entry) and the CLI option and usage line → verify: waive.test.ts cases for AC1, AC2 and AC7 pass, along with test/hub/registry.test.ts
- [x] T2: Add `settled()` and use it in evidenceProblems, dispatch, roles and inbox → verify: waive.test.ts cases for AC3, AC5 and AC6 pass, along with test/hub/e2e/dispatch.test.ts and test/hub/e2e/inbox.test.ts
- [x] T3: Show `waived` in recovery and context → verify: waive.test.ts AC4 case and test/hub/e2e/execution.test.ts, test/hub/e2e/context.test.ts pass
- [x] T4: Document it: model.md Execution state (one sentence) and pm.md (one bullet: when a criterion can't be checked and you accept that, `crew.mjs checkpoint P-### --waive "<why; the question>" --ac <n>`; never for a criterion that failed for real) → verify: test/docs.test.ts passes; `grep -n -- "--waive" plugins/crew/skills/hub/agents/pm.md plugins/crew/skills/hub/references/model.md` finds both
- [x] T5: Keep the line limit → verify: `wc -l` on every touched src file shows < 300

## Test plan
**Targeted checks:**
- `cd packages/crew && npx vitest run test/hub/e2e/waive.test.ts` (new): AC1–AC7. One case per criterion, using
  team-helpers (`lifecycle`, `started`, `inReview`, `as`). This is the regression test for BUG-052. Before the fix,
  `--waive` is an unknown option and the fix dispatch remains.
- `cd packages/crew && npx vitest run test/hub/registry.test.ts test/mcp.test.ts`: AC7 (frozen registry unchanged).
- `cd packages/crew && npx vitest run test/hub/e2e/dispatch.test.ts test/hub/e2e/inbox.test.ts test/hub/e2e/execution.test.ts test/hub/e2e/context.test.ts`: AC3–AC6. Nothing that already worked regresses.
- `cd packages/crew && npx vitest run test/docs.test.ts`: T4.
- `cd packages/crew && npm run typecheck`: all ACs (types of `Verify` and `CheckpointOptions`).

## Rollout & rollback
n/a for runtime. This is a hub CLI change that Release lands and rebuilds as usual (dist and references/commands.md are
generated). After landing, the human refreshes `.crew/bin` and runs `crew.mjs agents` to re-render the protected
`.claude/agents/crew-pm.md`. Rollback: revert the squash commit. Waiver entries already in the ledger then read as
plain failed checks (`ok: false`), which is safe.

## Risks & open questions
- Misuse: a PM could waive a criterion that fails for real. Mitigations: only the acceptor role may waive. The reason
  is required and shows in resume and handoff. The Architect's review and QA still apply, and any later check
  overrides the waiver.
- Overlaps (they wait, they don't block ready): execution.ts with P-072 and P-075 (accepted, landing), dispatch.ts
  with P-081 (ready), pm.md with P-074 (in review). model.md and the test file are in `hub.shared`.
- P-077 is not unblocked by this plan alone. Its T3 is still unchecked, and today its fix is the human's
  `move --force` (Q-460998).

## Handoff

_Generated 2026-10-28 by `crew.mjs handoff` from the ledger._

- P-084: Waive an acceptance criterion the acceptor rules not reproducible [in-progress] tasks 5/5 — claimed by Arpit Anand (developer:a5e71d7783abb7ded)
- last checkpoint 2026-10-28 08:34 at done (a53355d) by Arpit Anand; since then 0 commit(s), 3 uncommitted file(s): plugins/crew/skills/hub/dist/crew.mjs, plugins/crew/skills/hub/dist/mcp.mjs, plugins/crew/skills/hub/references/commands.md
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —, AC6 —, AC7 —

Latest log:
- 2026-10-27: status draft → ready
- 2026-10-28: assigned to the developer role
- 2026-10-28: status ready → in-progress — branch plan/P-084-waive-an-acceptance-criterion

## Progress log

- 2026-10-27: status draft → ready
- 2026-10-28: assigned to the developer role
- 2026-10-28: status ready → in-progress — branch plan/P-084-waive-an-acceptance-criterion

## Outcome
`checkpoint P-### --waive WHY --ac N` lets the plan's acceptor (never QA, the developer or an implementer) record a waived verify entry (`ok: false`, `waived: true`) without committing. `settled()` treats a waived criterion as settled in evidenceProblems, dispatch, roles and inbox; resume and context show it as `waived`, never as a pass, and any later check overrides it. Documented in model.md and pm.md.
Verified (developer, not evidence): waive.test.ts 7/7, registry, dispatch, execution, context and docs tests, typecheck. `test/mcp.test.ts` and the inbox UI AC5 test timed out under machine load, on main too; QA should re-run them.
Learnings: K-2026-10-28-test-hub-e2e-inbox-test-ts-ui-api-inbox
