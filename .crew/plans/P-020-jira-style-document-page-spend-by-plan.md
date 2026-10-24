---
id: P-020
title: Jira-style document page, spend by plan and agent, tasks and epic views
goal: G-001
items: FEAT-023
touches: packages/crew/ui/**, packages/crew/src/hub/core/memory/ledger.ts, packages/crew/src/hub/graph-types.ts, packages/crew/src/hub/commands/views/**, packages/crew/src/hub/commands/team/autonomy.ts, packages/crew/src/hub/core/work/doc.ts, packages/crew/test/**, packages/crew/scripts/sample-project.mjs, packages/crew/docs/design/DESIGN.md, plugins/crew/skills/hub/dist/**, .crew/bin/**
depends_on:
status: in-review
branch: plan/P-020-jira-style-document-page-spend-by-plan
pr:
created: 2026-10-24
started: 2026-10-24
completed:
assignee: developer
---

# P-020: Jira-style document page, spend by plan and agent, tasks and epic views

## Context
Delivers FEAT-023 under G-001. Feedback on the hub UI's document page (`packages/crew/ui/src/views/DocPage.tsx`): it is one long scroll with no defined sections; the 72ch + 320px layout leaves a blank band on the right of the 1440px content area; Touches is one comma-joined `<code>` string although plans touch hundreds of files; Relations put the status chip after the title; actions are a row of pill buttons. Spend shows only as one overall number on Overview, and `Ledger.spend()` groups only by `actor` (the git user, so everything lands under one person).
Ledger facts (`.git/crew/ledger.jsonl`): usage events carry `role` and `run`, but `ref` is null (the SubagentStop hook in `commands/team/autonomy.ts` never sets one) and `cost` is 0. 14 of 15 runs also wrote moves, checkpoints or learns with a ref under the same run id, so usage can be attributed to documents at read time.
Goals are the epic equivalent (`commands/work/migrate.ts` maps EP- to G-), but tasks reach the UI only as counts and a goal's children only as rail links. Approved design: /Users/aanand/.claude/plans/the-crew-ui-looks-declarative-coral.md. Follows P-014 (packages/crew).

## Scope
**In:**
- Phase 1: a full-width document page (main column plus a 360px details rail, prose capped at 90ch); collapsible panels for main sections and a tab strip for reference sections, per kind; Actions as a split-button dropdown in the header; Triage and Log as a rail card; a `FileList` for Touches and knowledge's Applies to; Relations status-first and collapsible.
- Phase 2: `Ledger.spend()` gains `byRole` and `byRef`, attributing usage with no ref to the refs its run wrote (split evenly, else `unattributed`); the SubagentStop hook sets `ref` when the run touched exactly one doc; a Spend row on doc pages; an Overview spend KPI in tokens plus "Spend by agent" and "Top plans by spend".
- Phase 3: tasks as data (`tasks.list` with id, text, verify, done, phase from `###` subheadings); a plan Tasks panel; a board tooltip of open tasks; a Child issues table on goal and item pages; Hierarchy plan rows that expand into tasks.
- DESIGN.md inventory and layout update; rebuilt bundles.

**Out (explicitly not doing):**
- Sharing the ledger across clones and machines (SPIKE-001).
- Deriving $ from tokens with a price table (CHORE-004); $ shows only when recorded cost > 0.
- Any database: files, git and the ledger stay the source of truth.
- Backfilling refs into past usage events (attribution is computed at read time).

## Acceptance criteria
- [ ] At 1440px the document page has no blank band right of the rail: the main column fills the width, prose is capped at 90ch, and the rail is 360px and sticky; below 1024px it stacks (browser).
- [ ] Main sections (for a plan: Context, Scope, Acceptance criteria, Approach, Tasks) are collapsible panels, open by default; reference sections (plan: Test plan, Rollout & rollback, Risks & open questions, Handoff, Progress log, Outcome; and the goal/idea/item lists) are tabs with role=tablist and arrow-key navigation (browser).
- [ ] Actions are one split button in the header: the primary forward move plus a menu (other moves, focus goal, the start hint disabled), with aria-haspopup/expanded and role=menu, closing on Escape, outside click or selection; a move shows the CLI output and a gated move the refusal (browser).
- [ ] Touches shows a count, the first 10 entries one per line grouped by top-level directory, a "Show all N" toggle and a filter when there are more than 20 (browser).
- [ ] Relations rows put the status chip before the linked title, aligned in a grid; each group collapses (browser).
- [ ] `Ledger.spend()` returns `byRole` (role, falling back to actor) and `byRef`: usage with a ref goes to that ref, usage with no ref splits evenly over the refs its run wrote, and a run that touched nothing lands in `unattributed`; `byActor` is unchanged (vitest).
- [ ] Doc pages show a Spend row (tokens, runs, $ only when cost > 0, by-role tooltip; plans add their items' total), and Overview shows tokens as the spend KPI, a Spend by agent card and the top 5 plans by spend, matching `crew.mjs ledger` totals (browser).
- [ ] The graph's plan `tasks` carries `list` entries with id, text, verify, done and the `###` phase they sit under, while `done`/`total` are unchanged (vitest).
- [ ] A plan page shows a Tasks panel grouped by phase with progress and verify commands; a goal page shows a Child issues table of its items and plans; Hierarchy expands a plan into its tasks (browser).
- [ ] `npm test` in packages/crew passes, including the dist, view and design tests, with DESIGN.md listing Tabs, CollapsiblePanel, ActionMenu, FileList and SpendBreakdown.

## Approach
- **Layout** (`ui/src/styles/views.css`): `.docpage` grid `minmax(0, 1fr) 360px`; `.docpage__head` spans both columns; `.docpage__section .md { max-width: 90ch }`. Existing <1024px breakpoint kept.
- **Sections** (`DocPage.tsx`): a per-kind `TABBED` heading list; others render as `<details open>` panels. A `Tabs` primitive in `components/primitives.tsx` with local state; it renders only when a tabbed section has content. The gate card stays on top.
- **Actions** (`components/Actions.tsx`): the same `run()` and gates, split into an `ActionMenu` (header) and a rail card (Triage selects, Log form). No new dependency.
- **FileList** primitive: count label, grouped by top-level dir, 240px scroll box, first 10 then "Show all", filter above 20.
- **Spend** (`core/memory/ledger.ts`): `Usage = { tokens, cost, runs }`; per-run refs come from all non-usage events with a ref under the same `run`. Graph `spend` type extended in `graph-types.ts`; `SCHEMA_VERSION` bumped. The hook in `commands/team/autonomy.ts` sets `ref` when the run's events name exactly one doc.
- **Tasks** (`core/work/doc.ts`): `Doc.taskGroups()` next to `checklist()` keeps `###` subheadings; `tasks()` is unchanged. `commands/views/graph.ts` splits `T3: text → verify: cmd`.
- **Epic view**: Child issues from the graph (items with `goal`, plans with `goal`; an item's plans), in the existing DataTable style.
- Reuses `StatusChip`, `IdLink`, `Kpi` and the DataTable styles; tokens only in `components.css`.

## Tasks
### Phase 1: Document page layout
- [x] T1: full-width grid, collapsible panels and a Tabs primitive with the per-kind tabbed sections → verify: `cd packages/crew && npx tsc --noEmit -p ui` + browser: P-014 at 1440px has no blank band, panels collapse, tabs switch with arrow keys
- [x] T2: Actions as a split-button menu in the header; Triage/Log as a rail card → verify: browser: the menu opens and closes by mouse, Enter and Escape; a move shows CLI output; a gated move shows the refusal
- [x] T3: FileList for Touches and Applies to; Relations status-first, collapsible → verify: browser: P-014 Touches shows a count, 10 entries, Show all and the filter; relation rows put the status first

### Phase 2: Spend by plan and agent
- [x] T4: `Ledger.spend()` byRole/byRef with run attribution and `unattributed`; the hook sets ref for single-doc runs; graph type and schema version → verify: `cd packages/crew && npx vitest run test/ledger.test.ts -t spend`
- [x] T5: doc-page Spend row and Overview spend KPI, Spend by agent and Top plans → verify: browser: P-014's Spend row and Overview's by-agent card match `node .crew/bin/crew.mjs ledger --type usage --json` totals

### Phase 3: Tasks and the epic view
- [x] T6: `Doc.taskGroups()` and `tasks.list` in the graph → verify: `cd packages/crew && npx vitest run test/view.test.ts -t tasks`
- [x] T7: plan Tasks panel by phase and the board's open-tasks tooltip → verify: browser: P-014's Tasks panel lists T1–T6 with verify commands
- [x] T8: goal/item Child issues table and Hierarchy plan rows expanding into tasks → verify: browser: G-001 shows child issues; Hierarchy expands a plan into its tasks
- [x] T9: DESIGN.md layout and inventory rows; rebuild the bundles → verify: `cd packages/crew && npm run build && npx vitest run test/dist.test.ts test/design.test.ts`

## Test plan
**Targeted checks:**
- AC6: `npx vitest run test/ledger.test.ts -t spend`: usage with a ref goes to it; a run that moved P-1 and checkpointed P-2 splits 50/50; a run that touched nothing is `unattributed`; byRole falls back to the actor.
- AC8: `npx vitest run test/view.test.ts -t tasks`: a plan with `### Phase 1` / `### Phase 2` under Tasks yields `tasks.list` with ids, verify commands and phases; done/total unchanged.
- AC10: `npx vitest run test/view.test.ts test/dist.test.ts test/design.test.ts` and `npm run typecheck`.
- AC1–5, 7, 9: browser checks against the served UI (`.claude/launch.json` preview): P-014 at 1440px, panels/tabs, the Actions menu by mouse and keyboard, FileList, Relations, Spend vs the ledger, Overview by agent and top plans, P-014's Tasks panel, G-001's child issues, Hierarchy tasks, item/goal/idea section grouping, and 375px plus dark mode. Before/after screenshots.

## Rollout & rollback
n/a: UI and read-time ledger aggregation only. The graph schema version bumps (the UI and the server ship together in one bundle). Back out by reverting the plan's commit.

## Risks & open questions
- P-019 (ready, not started) also touches `packages/crew/src/hub/**`, `packages/crew/test/**` and the dist bundles: whichever merges second rebuilds the bundles and resolves conflicts.
- Even splitting over a run's refs is a heuristic: a run that read one plan and moved another's item is split across both. New events from the hook carry the ref directly.
- Tokens only until CHORE-004 lands a price table.

## Handoff

_Generated 2026-10-24 by `crew.mjs handoff` from the ledger._

- P-020: Jira-style document page, spend by plan and agent, tasks and epic views [in-review] tasks 9/9 — claimed by Arpit Anand (developer:p020-jira-ui)
- last checkpoint 2026-10-24 17:00 at T9 (3bcd939) by Arpit Anand; since then 3 commit(s), 3 uncommitted file(s): .claude/launch.json, .crew/plans/P-020-jira-style-document-page-spend-by-plan.md, .crew/knowledge/K-2026-10-24-judge-ui-from-full-size-screenshots.md
- ✓ cd packages/crew && npx vitest run test/ledger.test.ts -t spend (reported)
- ✓ cd packages/crew && npx vitest run test/view.test.ts -t tasks (reported)
- ✓ npm run typecheck (incl. tsc -p ui) clean; browser 1680px viewport: P-014 docpage 1392px = main 1000 + rail 360, no blank band; Context panel collapses and reopens; reference tabs switch with ArrowRight/End/Home and wrap; item/goal/idea pages group sections per TABBED (AC 1,2) (reported)
- ✓ browser: G-001 split button (aria-haspopup=menu, aria-expanded toggles) opens by mouse and Enter, ArrowDown moves focus, Escape and outside click close it; Move to proposed (sandbox) showed 'G-001: active → proposed'; Move to done showed the gate refusal; menu fits at 375px (AC 3) (reported)
- ✓ browser: P-014 Touches 8 grouped by top dir; sandbox P-001 with 47 paths: 10 shown, 'Show all 47', 240px scroll box, filter narrows to matches; Relations rows chip-first in a grid, groups are details open (AC 4,5) (reported)
- ✓ browser vs independent ledger tally: P-014 Spend 562.3k tokens · 2 runs (562315, runs qa+architect) with role tooltip; Overview KPI 8.4M (8358739), by agent architect 4.7M/12, qa 3.1M/10, director 339.3k/3, pm 180.7k/3; top plans P-015 2.6M, P-019 1.5M, P-017, P-016, P-014; unattributed 327.1k (AC 7) (reported)
- ✓ browser: P-014 Tasks panel lists T1–T6 with verify commands (long ones collapsed), 6/6 progress; board task counts carry a title tooltip (open tasks, else 'every task is done') (AC 9) (reported)
- ✓ browser: G-001 Child issues 8 (items + plans, sorted by status, 3/8 done); CHORE-007 shows its plan P-014; Hierarchy expands P-019 into T1–T5, done plans collapsed (AC 9) (reported)
- ✓ cd packages/crew && npm run build && npx vitest run test/dist.test.ts test/design.test.ts (AC 10)
- evidence: AC1 ✓ (self), AC2 ✓ (self), AC3 ✓ (self), AC4 ✓ (self), AC5 ✓ (self), AC6 —, AC7 ✓ (self), AC8 —, AC9 ✓ (self), AC10 ✓ (self)

Latest log:
- 2026-10-24: status draft → ready
- 2026-10-24: assigned to the developer role
- 2026-10-24: status ready → in-progress — branch plan/P-020-jira-style-document-page-spend-by-plan

## Progress log

- 2026-10-24: status draft → ready
- 2026-10-24: assigned to the developer role
- 2026-10-24: status ready → in-progress — branch plan/P-020-jira-style-document-page-spend-by-plan
- 2026-10-24: status in-progress → in-review

## Outcome
Shipped as planned: the full-width document page (360px details rail, prose capped at 90ch), collapsible panels and per-kind tabs, the Actions split-button menu with triage and log in the rail, FileList for Touches and Applies to, status-first collapsible Relations, a Spend row, a Tasks panel by `###` phase, Child issues on goal and item pages, Hierarchy tasks, the board's open-task tooltip, and Overview spend by agent and top plans. `Ledger.spend()` gains `byRole`/`byRef` with run attribution; graph schema v6.

Deviations:
- `test/mcp.test.ts` also asserted schema 5; updated to 6.
- Fixes found in visual review, beyond the spec: dropdowns use the Lucide chevron via a `--select-chevron` token instead of the platform arrow; filter dropdowns size to their chosen value (`field-sizing: content`, capped at 200px); long IDs truncate in Relations and wrap in the page kicker; the Child issues table scrolls inside its panel; board cards show "FEAT-006 +6" instead of every delivered ID; the Actions menu is left-anchored below 768px.
- Merged main (P-019) into the branch; the rebuilt bundles were identical to the text merge.

Follow-ups: FEAT-024 / P-021 (a Designer role, a scripted layout sweep and a review checklist), because no team role reviews visual design today.

Learnings: K-2026-10-24-judge-ui-from-full-size-screenshots
