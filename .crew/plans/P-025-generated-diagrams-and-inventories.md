---
id: P-025
title: Generated diagrams and inventories for the docs
goal: G-006
items: FEAT-029
touches: packages/crew/src/docs/**, packages/crew/scripts/docs.mjs, packages/crew/test/docs.test.ts, packages/crew/package.json, packages/crew/src/hub/cli.ts, packages/crew/src/hub/commands/work/workflow.ts, packages/crew/src/hub/core/work/transition-gates.ts, packages/crew/src/hub/core/memory/ledger.ts, plugins/crew/docs/**
depends_on: P-023
status: accepted
branch: plan/P-025-generated-diagrams-and-inventories
pr:
created: 2026-10-25
started: 2026-10-26
completed:
assignee: developer
---

# P-025: Generated diagrams and inventories for the docs

## Context
G-006, FEAT-029. The doc set (FEAT-030) and the UI docs view (FEAT-031) both need diagrams of the lifecycles, gates and policy, and reference tables of the commands, MCP tools and hooks. Hand-written versions go stale: `references/model.md`'s lifecycle diagrams already miss edges that `PLAN_FLOW`, `GOAL_FLOW` and `ITEM_FLOW` allow (CHORE-016). This plan builds that content from the code's own tables and adds a freshness test, the same way `dist.test.ts` does for bundles. FEAT-030 and FEAT-031 get their own plans, which depend on this one.

## Scope
**In:**
- `packages/crew/src/hub/core/work/transition-gates.ts` (new, pure data): `TRANSITION_GATES`, keyed `"<kind>.<status>"` (the target status: `guard()` gates on where a document goes, not where it comes from), each `{ gate, label }` — e.g. `"plan.ready": { gate: "Definition of Ready", label: "is not ready (Definition of Ready)" }`. `guard()` in `commands/work/workflow.ts` takes every refusal label from it, so the map is the code's own data, not a copy. It lives in core, not beside `guard()`, because workflow.ts is at 283 of its 300 lines and because `src/docs/diagrams.ts` must import only core.
- `packages/crew/src/hub/core/memory/ledger.ts`: `export const EVENT_TYPES = [...] as const` with `EventType` derived from it (today `EventType` is a type-only union, which nothing can list at runtime).
- `packages/crew/src/docs/diagrams.ts`: plain `{nodes, edges}` data, with no rendering and **no imports outside `src/hub/core/` and `src/shared/`** (FEAT-031's UI imports it; `test/structure.test.ts` limits what the UI may reach), for:
  - `IDEA_FLOW`, `GOAL_FLOW`, `PLAN_FLOW` and `ITEM_FLOW` (`core/work/model.ts`), each edge labelled with the gate it runs (`TRANSITION_GATES`) and the role that may take it under the `lifecycle` preset (`core/team/presets.ts` `role_gates`, plus `human_gates`); role gates that are not flow edges (`plan.assigned`, `plan.reviewed`, `plan.reassigned`) listed beside the plan flow;
  - the policy layer order, as a static list (built-in → org → org role → preset → preset role → project → project role → project team); `docs.test.ts` checks it against `loadLayers()` (`core/team/policy.ts`) on a fixture where every layer is present, so policy.ts is not touched;
  - the ledger event types (`EVENT_TYPES`).
- `packages/crew/src/docs/inventory.ts` (reads files and imports the entry points, so it is kept apart from diagrams.ts): reference tables of CLI commands (export `COMMANDS` from `cli.ts`: the keyword only), MCP tools (`mcp.ts` `TOOLS`, marking the commands that are CLI-only), UI actions (`server.ts` `ACTIONS`), the hook timeline from `plugins/crew/skills/guidelines/templates/settings.json`, and skills (each `SKILL.md`'s frontmatter).
- `packages/crew/src/docs/render.ts` turns the data into Mermaid and markdown tables. `scripts/docs.mjs` (`npm run docs`) rewrites each `<!-- generated:<id> -->` … `<!-- /generated -->` block in `plugins/crew/docs/*.md`; its header comment says when to run it. It bundles `src/docs` with esbuild (as `build.mjs` does) rather than importing `.ts` directly, since the sources import with `.js` extensions.
- `package.json`: `docs` script, and `build` runs it after `build.mjs` (`node build.mjs && node scripts/docs.mjs`), so Release's `hub.build` (`cd packages/crew && npm run build`, P-023) regenerates the blocks along with the bundles — a later plan that adds a command or an edge changes source only, as K-2026-10-24-release-builds-the-generated-files-plans says.
- Stub pages in `plugins/crew/docs/` holding the generated blocks and a heading each: `plan-lifecycle.md`, `policy.md`, `context-and-memory.md`, `reference.md`. The prose comes in FEAT-030's plan.
- `test/docs.test.ts` covers freshness, pointers and the layer order (see the acceptance criteria); its failure message says "run `npm run docs`", as dist.test.ts does for bundles.

**Out (explicitly not doing):**
- `plugins/crew/skills/hub/dist/**` and `.crew/bin/crew.mjs`: generated; Release rebuilds `dist/` (K-2026-10-24-release-builds-the-generated-files-plans) and refreshing `.crew/bin` is FEAT-027.
- the prose of the doc set, and fixing `model.md` / `SKILL.md` / `vision.md` (FEAT-030, CHORE-016);
- the UI docs view and interactive diagrams (FEAT-031), including widening the UI's import rule in structure.test.ts;
- any change to what a gate or flow does: `guard()` keeps its branches and only reads its labels from the map; `policy.ts` is not changed.

## Acceptance criteria
- [ ] AC1 · `npm run docs` writes every generated block, and running it a second time changes nothing.
- [ ] AC2 · `docs.test.ts` fails when a generated block is stale (a hand edit inside a block, or a new `PLAN_FLOW` edge without regenerating) and passes on a fresh tree.
- [ ] AC3 · `docs.test.ts` fails when a `` `path:symbol` `` pointer in `plugins/crew/docs/*.md` names a file or symbol that doesn't exist.
- [ ] AC4 · The plan-lifecycle block shows every `PLAN_FLOW` edge, including `in-review→in-progress`, `in-progress→ready`, `ready→draft` and `dropped→draft`. Each gated edge names its gate, and each role-gated edge names its role under `lifecycle`.
- [ ] AC5 · The reference block lists every CLI command and MCP tool, and marks the commands that are CLI-only.
- [ ] AC6 · The change is source, tests and docs only: no path under `plugins/crew/skills/hub/dist/` or `.crew/bin/` differs from the base branch (`git diff --exit-code <base> -- plugins/crew/skills/hub/dist .crew/bin` after restoring any local build output); `guard()`'s refusals read exactly as before (the targeted refusal tests pass); `npm run typecheck` passes; `src/docs/diagrams.ts` imports only `src/hub/core/` and `src/shared/`; every new or changed module is under 300 lines (`test/structure.test.ts`).

## Approach
- Data and rendering are kept apart. The UI plan (FEAT-031) imports `diagrams.ts` at build time and draws the same data with React Flow, so GitHub (Mermaid) and the UI never disagree. That is why diagrams.ts depends on core only, and the file-reading inventory sits in its own module.
- Markers are plain HTML comments, so GitHub hides them, and prose outside them is never touched.
- Pointers use one form, `` `packages/crew/src/…/file.ts:symbol` ``. The test resolves the file and greps for `function|const|class|type|interface <symbol>`.
- Generate in memory and compare in the test; reuse `test/helpers/` only if a temp copy of the docs is needed.
- The e2e refusal tests drive `dist/crew.mjs`: run `npm run build` in the worktree before them and never keep what it writes (Release rebuilds; restore `dist/` before handing over).
- Ordering. depends_on P-023: this plan leaves `dist/` to Release and regenerates its doc blocks through `npm run build`, which is what P-023's `hub.build` and Release instructions run; until P-023 lands, Release still expects plans to commit their bundles. No overlap with P-023's touches. No depends_on P-021, P-022 or P-024: with the generated paths out, the only shared file is `cli.ts` (P-021, P-024), where this plan adds one `export` keyword on the `COMMANDS` declaration line, which neither of them edits (they add entries inside the table); whichever lands second takes the other's text when it updates to the base. After this plan, their new commands reach the reference block through Release's `npm run build`.

## Tasks
- [x] T1: `core/work/transition-gates.ts` with `TRANSITION_GATES`; `guard()` takes its labels from it; `export` on `COMMANDS` in `cli.ts`; `EVENT_TYPES` in `ledger.ts` → verify: `npm run typecheck`; after `npm run build`, `npx vitest run test/hub/e2e/basics.test.ts test/mcp.test.ts test/view.test.ts test/ledger.test.ts` pass unchanged (they assert guard's refusal text)
- [x] T2: `src/docs/diagrams.ts` for the four flows (gates, lifecycle roles, non-edge role gates), the policy layer order and the ledger event types → verify: `docs.test.ts` cases that every `PLAN_FLOW` edge appears with the four edges of AC4 labelled, every `TRANSITION_GATES` key labels at least one edge, and the static layer order equals `loadLayers()`'s on a fixture (org playbook via `CREW_PLAYBOOK`, `preset: lifecycle`, a role and a team)
- [x] T3: `src/docs/inventory.ts` for commands, MCP tools, UI actions, hooks and skills → verify: `docs.test.ts` case that every `TOOLS` and `COMMANDS` key is listed and the CLI-only set is `COMMANDS` minus `TOOLS`
- [x] T4: `src/docs/render.ts` (Mermaid and tables), `scripts/docs.mjs` with the marker rewrite and its header note, and `docs`/`build` in `package.json` → verify: `npm run docs` twice, then `git diff --exit-code plugins/crew/docs` after the second run is empty
- [x] T5: Stub pages in `plugins/crew/docs/` with their generated blocks → verify: after `npm run docs` every `<!-- generated:<id> -->` block in the four pages is non-empty (`docs.test.ts` case), and the Mermaid blocks open in a Markdown preview with Mermaid support (manual, noted in the checkpoint)
- [x] T6: `test/docs.test.ts` freshness and pointer checks → verify: passes; fails after a hand edit in a block and after a fake pointer (both demonstrated in the checkpoint note)

## Test plan
**Targeted checks** (from `packages/crew/`):
- AC1 → `npm run docs` twice plus `git diff --exit-code plugins/crew/docs`.
- AC2, AC3, AC4, AC5 → `npx vitest run test/docs.test.ts`, plus T6's two deliberate failures.
- AC6 → `npm run typecheck`; `npx vitest run test/structure.test.ts`; after `npm run build`, `npx vitest run test/hub/e2e/basics.test.ts test/mcp.test.ts test/view.test.ts test/ledger.test.ts`; then restore `dist/` and `git diff --exit-code <base> -- ../../plugins/crew/skills/hub/dist ../../.crew/bin`.

## Rollout & rollback
n/a: internal tooling and new docs files; revert the PR to back out. Release: `hub.build` now also regenerates `plugins/crew/docs/*` blocks; commit them with the bundles.

## Risks & open questions
- The gate map can drift from `guard()`'s branches. Mitigated by `guard()` reading its labels from the map (a branch without an entry has no label to print). A stronger check — driving each key through `move()` on a sample repo with the gate's precondition missing — is a follow-up if drift shows up.
- `docs.test.ts` is in `npm test`, so the full suite (Release, CI) checks freshness; Release's `npm run build` keeps it green when a later plan changes a flow, command or tool.
- In a later plan's worktree, a developer who runs `npm run build` gets regenerated `plugins/crew/docs` blocks as a drift hint outside their touches (they are not `linguist-generated`, being partial files). They restore them like `dist/`; Release regenerates.

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-025: Generated diagrams and inventories for the docs [in-review] tasks 6/6 — claimed by Arpit Anand (developer:a2da2c0248382d944)
- last checkpoint 2026-10-26 06:25 at T6 (2fac4fe) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-025-generated-diagrams-and-inventories/packages/crew && npm run typecheck >/dev/null 2>&1 && npm run build >/dev/null 2>&1 && npx vitest run test/hub/e2e/basics.test.ts test/mcp.test.ts test/view.test.ts test/ledger.test.ts ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-025-generated-diagrams-and-inventories checkout -- plugins; exit $r (AC 6)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-025-generated-diagrams-and-inventories/packages/crew && npx vitest run test/docs.test.ts (AC 5)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-025-generated-diagrams-and-inventories/packages/crew && npm run docs && npm run docs && git diff --exit-code ../../plugins/crew/docs && test -z "$(git status --porcelain ../../plugins/crew/docs)" (AC 1)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-025-generated-diagrams-and-inventories/packages/crew && npx vitest run test/docs.test.ts -t 'filled|PLAN_FLOW edge' (AC 4)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-025-generated-diagrams-and-inventories/packages/crew && sed -i '' 's/| `init` | CLI only |/| `init` | `init` |/' ../../plugins/crew/docs/reference.md && ! npx vitest run test/docs.test.ts -t 'fresh' ; a=$?; git checkout -- ../../plugins/crew/docs; printf '\nSee `packages/crew/src/hub/cli.ts:NO_SUCH_SYMBOL`.\n' >> ../../plugins/crew/docs/policy.md && ! npx vitest run test/docs.test.ts -t 'pointer in the doc pages' ; b=$?; git checkout -- ../../plugins/crew/docs; echo hand-edit-failed=$a fake-pointer-failed=$b; [ $a = 0 ] && [ $b = 0 ] && npx vitest run test/docs.test.ts (AC 2)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-025-generated-diagrams-and-inventories/packages/crew && printf '\nSee `packages/crew/src/hub/nope.ts:main`.\n' >> ../../plugins/crew/docs/policy.md && ! npx vitest run test/docs.test.ts -t 'pointer' ; b=$?; git checkout -- ../../plugins/crew/docs; [ $b = 0 ] && npx vitest run test/docs.test.ts -t 'pointer' (AC 3)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-025-generated-diagrams-and-inventories/packages/crew && npx vitest run test/docs.test.ts -t 'inventory' (AC 5)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-025-generated-diagrams-and-inventories/packages/crew && npm run typecheck >/dev/null 2>&1 && npm run build >/dev/null 2>&1 && npx vitest run test/structure.test.ts test/docs.test.ts test/hub/e2e/basics.test.ts test/mcp.test.ts test/view.test.ts test/ledger.test.ts ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-025-generated-diagrams-and-inventories checkout -- plugins; [ $r = 0 ] && git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-025-generated-diagrams-and-inventories diff --exit-code $(git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-025-generated-diagrams-and-inventories merge-base HEAD main) -- plugins/crew/skills/hub/dist .crew/bin && ! grep -E 'from "\.\./hub/(cli|mcp|server|commands)' src/docs/diagrams.ts (AC 6)
- evidence: AC1 ✓ (self), AC2 ✓ (self), AC3 ✓ (self), AC4 ✓ (self), AC5 ✓ (self), AC6 ✓ (self)

Latest log:
- 2026-10-25: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-025-generated-diagrams-and-inventories

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-025-generated-diagrams-and-inventories
- 2026-10-26: status in-progress → in-review — T1-T6 done; checks per AC in checkpoints; dist/ untouched (Release rebuilds; build now also runs npm run docs)
- 2026-10-26: status in-review → accepted

## Outcome
`TRANSITION_GATES` (core/work/transition-gates.ts) now holds every gate's name and refusal label, and `guard()` reads its labels from it, so its refusals read as before. `EVENT_TYPES` is a runtime list in ledger.ts. `src/docs/diagrams.ts` builds the four flows as data (each edge with its gate, its `lifecycle` role and any human gate), the role gates that aren't flow edges, the policy layer order and the ledger events. It imports only hub/core. `src/docs/inventory.ts` reads commands, MCP tools, UI actions, hooks and skills. `src/docs/render.ts` turns that data into Mermaid and tables. `npm run docs` (also run by `npm run build`) rewrites the marker blocks in four stub pages under `plugins/crew/docs/`. `test/docs.test.ts` checks freshness, staleness after a hand edit or a new edge, filled blocks, pointers, the layer order against `loadLayers()` and the inventory. COMMANDS was already exported in cli.ts, so cli.ts is unchanged. Not done: reserved decisions (`idea.decided`, `idea.killed`) don't show as human-gated, because the built-in list is private to policy.ts; that is CHORE-026.

Learnings: K-2026-10-26-skill-md-frontmatter-in-plugins-crew
