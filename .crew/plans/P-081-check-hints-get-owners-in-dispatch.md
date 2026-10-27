---
id: P-081
title: Check hints get owners in dispatch
goal: G-007
items: FEAT-074
touches: packages/crew/src/hub/commands/views/checks.ts, packages/crew/src/hub/commands/team/hints.ts, packages/crew/src/hub/commands/team/dispatch.ts, packages/crew/src/hub/commands/team/runner.ts, packages/crew/src/hub/commands/work/goals.ts, packages/crew/src/hub/commands/views/graph.ts, plugins/crew/skills/hub/references/model.md, packages/crew/test/hub/e2e/hint-owners.test.ts, packages/crew/test/hub/e2e/runner.test.ts, packages/crew/test/hub/e2e/dispatch.test.ts, packages/crew/test/hub/e2e/team.test.ts, packages/crew/test/hub/e2e/inbox.test.ts, packages/crew/test/hub/e2e/activity.test.ts, packages/crew/test/hub/e2e/design-review.test.ts, packages/crew/test/hub/e2e/land.test.ts, packages/crew/test/mcp.test.ts
depends_on: P-066
status: draft
branch: plan/P-081-check-hints-get-owners-in-dispatch
pr:
created: 2026-10-27
started:
completed:
---

# P-081: Check hints get owners in dispatch

## Context
FEAT-074 (G-007, split from FEAT-072 AC4): `check` prints its hints as plain strings and nobody owns them, so they pile up
(14 unowned hints on 2026-10-26: stale knowledge scopes, a superseded entry still cited, a file vs ledger mismatch,
changes outside touches, plans written ahead, unconverted drafts). This plan makes every hint structured
(`ref`, `kind`, `text`), routes each kind to the role that can fix it through `dispatch`, and records the runner pass on
which each routed hint was first seen, which FEAT-066 (G-009) later uses for its stale-hint stall.

It depends on P-066 (runner lock and idle mode, accepted, not landed): the first-seen record is written by the runner
loop that P-066 rewrites (async `untilDone`, idle reports), so this plan edits P-066's version of
`commands/team/runner.ts`, not main's.

## Scope
**In:**
- `Hint = { ref: string | null; kind: HintKind; text: string }` and the closed list `HINT_KINDS`, exported from
  `commands/views/checks.ts`; `findings()` returns `hints: Hint[]`. Every hint `check` emits today gets a kind,
  including the ones built in other modules (policy, agents, liveness, legacy, `touchHints`), which `findings()` wraps.
- `check` prints exactly the text it prints today (`HINT   <text>`), so its output does not change.
- A routing table, kind → owner, in a new `commands/team/hints.ts`, and a dispatch row that turns routed hints into
  entries: one entry per (owner, ref).
- First-seen pass: each runner pass report records the keys of the routed hints dispatch saw before that pass, and
  `hintsFirstSeen(events)` returns, per open hint key, the pass that started its current unbroken run of passes.
- Consumers of `findings().hints` keep working: `work/goals.ts` (drift problems) filters on kind and ref instead of the
  text; `views/graph.ts` keeps exporting `check.hints` as strings (the texts), so the UI and `graph-types.ts` don't change.
- The Dispatch paragraph of `plugins/crew/skills/hub/references/model.md` describes the hint row.

**Out (explicitly not doing):**
- The stale-hint Director stall (FEAT-066, G-009); this plan only records the first-seen pass it needs.
- Recurrence and dispositions for knowledge (FEAT-072, FEAT-073).
- New hints, changed hint texts, or turning any hint into an error.
- Routing setup hints: they stay with `doctor`.
- A new ledger event type (the record rides on the existing runner `report`).

## Acceptance criteria
- [ ] AC1: `findings(store).hints` is an array of `{ ref, kind, text }` with `kind` in `HINT_KINDS` for every hint; `check`'s printed output for the same hub is unchanged (each hint printed as `HINT   <text>`).
- [ ] AC2: `routeHint` maps every kind in `HINT_KINDS` to its owner per the table in Approach (Architect, plan owner, Release, PM, Director, or unrouted for setup and liveness); a unit test iterates `HINT_KINDS` so a kind added without a route fails it.
- [ ] AC3: The plan owner of a plan hint is the role holding the plan's live claim; without a claim, the architect for a draft or ready plan, the developer for an in-progress, in-review or blocked plan, release for an accepted plan, else the PM.
- [ ] AC4: `dispatch --json` gives one entry per (owner, ref) for routed hints (several hints on the same owner and ref share one entry whose task lists all their texts; ref-less hints of one owner share one entry with `ref: null`); when an earlier row already has an entry with the same role and ref, the hints are appended to that entry's task instead; hint entries skip held and blocked-by-question refs like other rows, come after the spec frontier, and count against `budgets.max_agents`. `dispatch --json` also returns `hints: [{ key, role, ref, kind, text }]` (all routed hints, before the cut).
- [ ] AC5: A fixture hub with at least one routed hint per owner (Architect: knowledge scope matching no file; plan owner: a ready plan off the focus goal and an in-progress plan waiting on an unfinished dependency; Release: a closed plan still claimed; PM: an unconverted draft; Director: no focus goal) gives the expected owner entries in `dispatch --json`, setup hints give none, and fixing each cause removes its entry on the next `dispatch --json`.
- [ ] AC6: Each runner pass `report` carries `hints: [key…]` (the routed hint keys dispatch saw before that pass; key = `kind|ref|text`); `hintsFirstSeen(events)` returns for each key in the latest pass report `{ pass, at, passes }`: the pass number and time of the earliest report in its unbroken run of pass reports, and how many passes that run spans. A hint that disappears for one pass and comes back starts a new run. Idle and stopped reports are skipped.

## Approach
- Kinds (`HINT_KINDS`) and routes:
  - Architect: `knowledge-scope` (scope matches no file), `knowledge-superseded` (superseded but still cited),
    `knowledge-risk` (risk with no owner). Ref: the K- id.
  - Plan owner: `drift` (changes outside touches), `ledger-mismatch` (ledger vs file status), `off-focus`,
    `waits-deps` (active while dependencies are unfinished), `depends-overlap` (depends only through an overlap),
    `overlap` (two active plans overlap; ref the lower ID), `touches` (broad glob, generated path). Ref: the plan.
  - Release: `lost-branch` (branch with no plan file or worktree, both variants), `closed-claimed`, `branch-missing`.
  - PM: `drafts` (ref null), `written-ahead` (null), `untriaged` (null), `item-plan-dropped` (item), `p0-no-plan`
    (bug), `goal-shape` (all closed, proposed but started, no plans or items; ref the goal).
  - Director: `focus` (focus goal closed: ref the focus goal; no focus: ref null).
  - Unrouted: `setup` (no idea.md, CLAUDE.md hub-state section, code graph, `.project/`, legacy, policy, agents) and
    `liveness` (pause and stale claims, which dispatch already handles in its Director rows).
- `checks.ts` stays under 300 lines (K-2026-10-23-every-module-stays-under-300-lines): replace each
  `f.hints.push(text)` with a small `hint(f, kind, ref, text)` helper; the wrapped strings from other modules get their
  kind and ref (plan id for `touchHints`) in `findings()`. Their source modules don't change.
- `commands/team/hints.ts`: `routeHint(kind)`, `planOwner(...)`, `hintKey(hint)`, `hintEntries(...)` (the dispatch row)
  and `hintsFirstSeen(events)`. `dispatch.ts` adds the row after the spec frontier and before the stall; the stall
  still runs only when nothing else (hint entries included) was dispatched. `Dispatch` gains `hints`.
- `runner.ts` (P-066's version): add `hints: d.hints.map(h => h.key)` to the pass `report` payload; nothing else.
- Dispatch is a read: it records nothing. Only the runner writes the first-seen record.
- `goals.ts`: drift problems become `hints.filter(h => h.kind === "drift" && ids.has(h.ref))`, same message text.
- Existing dispatch tests that compare exact entry lists may now see hint entries (for example a Director entry for
  "no focus goal"): update their expectations, or give the fixture what removes the hint, case by case.

## Design

## Tasks
- [ ] T1: Structured hints in `checks.ts` (`Hint`, `HINT_KINDS`, `hint()` helper, wrapped external hints), `check` output unchanged, `graph.ts` exports the texts, `goals.ts` filters on kind → verify: `npx vitest run test/hub/e2e/hint-owners.test.ts -t AC1` and `npx vitest run test/view.test.ts test/hub/e2e/goal-queue.test.ts test/goal-queue.test.ts` green; `wc -l src/hub/commands/views/checks.ts` under 300.
- [ ] T2: `commands/team/hints.ts`: routing table, plan owner, keys, the dispatch row; wire it into `dispatch.ts` with `hints` in the JSON → verify: `npx vitest run test/hub/e2e/hint-owners.test.ts -t "AC2|AC3|AC4|AC5"` green.
- [ ] T3: Runner pass reports carry hint keys; `hintsFirstSeen` → verify: `npx vitest run test/hub/e2e/runner.test.ts test/hub/e2e/hint-owners.test.ts -t AC6` green.
- [ ] T4: Update existing dispatch-dependent tests for the hint row → verify: `npx vitest run test/hub/e2e/dispatch.test.ts test/hub/e2e/team.test.ts test/hub/e2e/inbox.test.ts test/hub/e2e/activity.test.ts test/hub/e2e/design-review.test.ts test/hub/e2e/land.test.ts test/mcp.test.ts` green.
- [ ] T5: The Dispatch paragraph in `plugins/crew/skills/hub/references/model.md` (hint row, owners, first-seen record) → verify: `npx vitest run test/docs.test.ts` green and the paragraph names every owner in AC2.

## Test plan
**Targeted checks:** (run in `packages/crew`)
- `test/hub/e2e/hint-owners.test.ts` (new): AC1 (structured findings, `check` output unchanged), AC2 (every kind routed, unit over `HINT_KINDS`), AC3 (plan owner by claim and status), AC4 (one entry per owner and ref, merge into an existing entry, held refs skipped, `hints` in JSON), AC5 (one hint per owner fixture, fix removes the entry), AC6 (`hintsFirstSeen` over hand-written runner report events: first pass, a gap restarts the run, idle and stopped reports skipped).
- `test/hub/e2e/runner.test.ts`: AC6 (a runner pass with a `--command` script records `hints` keys on its report).
- `test/hub/e2e/dispatch.test.ts`, `team.test.ts`, `inbox.test.ts`, `activity.test.ts`, `design-review.test.ts`, `land.test.ts`, `test/mcp.test.ts`: existing dispatch behaviour still holds (AC4).
- `test/view.test.ts`, `test/hub/e2e/goal-queue.test.ts`, `test/goal-queue.test.ts`: export and goal drift unchanged (AC1).
- `test/docs.test.ts`: model.md (T5).

## Rollout & rollback
n/a: hub-internal. Back out by reverting the squash commit; runner reports with an extra `hints` field stay readable.

## Risks & open questions
- Dispatch now runs `findings()` (git calls per plan for drift, `git ls-files`), which `next`/`context` reach through
  `roles.ts`; a slower dispatch is accepted. If a targeted test times out because of it, say so in the Progress log
  rather than caching.
- Hint entries make dispatch non-empty, so the runner (P-066's idle mode) runs passes for hints; a hint no agent can
  fix ends in "no progress in 2 passes" until FEAT-066's stale-hint stall hands it to the Director.
- Overlaps P-076 on `commands/team/runner.ts` (both change the runner loop; staffing serialises them); the one-line
  payload change rebases easily.
- Key includes the text, so a count in the text (untriaged, written ahead) restarts the first-seen run when it changes.

## Handoff

## Progress log

## Outcome
