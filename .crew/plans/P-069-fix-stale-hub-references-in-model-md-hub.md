---
id: P-069
title: Fix stale hub references in model.md, hub SKILL.md and vision.md
goal: G-006
items: CHORE-016
touches: plugins/crew/skills/hub/references/model.md, plugins/crew/skills/hub/SKILL.md, docs/vision.md
depends_on:
status: in-progress
branch: plan/P-069-fix-stale-hub-references-in-model-md-hub
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
---

# P-069: Fix stale hub references in model.md, hub SKILL.md and vision.md

## Context
CHORE-016 (goal G-006). Checked against main on 2026-10-26, most of it is still stale:
- `plugins/crew/skills/hub/references/model.md` → Lifecycles: the plan diagram misses `ready → draft`,
  `in-progress → ready` and `dropped → draft`, and draws the way back to in-progress (from in-review and from accepted)
  ambiguously. The goal line (`proposed → active → done | dropped`) misses `active → proposed`, `done → active` and
  `dropped → proposed`. The item text has no `triaged → new`. The idea line misses `researching → exploring`,
  `proposed → researching` and `killed → exploring`. The source of truth is `PLAN_FLOW`, `GOAL_FLOW`, `ITEM_FLOW` (and the
  idea flow) in `packages/crew/src/hub/core/work/model.ts`, which P-025 already renders into the generated
  `plugins/crew/docs/plan-lifecycle.md`.
- model.md → Git mapping and "Where hub changes are committed" describe only branch-per-plan. With `hub.plan_worktrees:
  true` (this repository's setting), `new-plan` creates one shared worktree per plan (sparse: no `.crew/plans`, items,
  goals, knowledge, idea.md, P-038), hub documents have one home in the main checkout and every hub-writing command commits
  them there on the base branch (`chore(hub): …`, P-026), the plan branch gets WIP code commits at each checkpoint and
  the hand-over (P-028), and `land` squashes it into one commit on the base and removes the worktree and branch (P-032);
  the PM then moves the plan `done`. "status and next read main and every plan/* branch" holds only without plan worktrees.
- model.md line 15: knowledge is "written by `migrate` today, by `learn` later"; `learn` writes it.
- `plugins/crew/skills/hub/SKILL.md` (Developer section): "Nothing records it automatically yet"; the SubagentStop hook
  (`usage --hook`) records each crew agent's tokens.
- `docs/vision.md` → "Status (Workstream C built)" → Deferred lists shipped work: automatic `usage` capture (SubagentStop
  hook), kickoff/onboard as ledger runs (`checkpoint --workflow`), and the Claude Code policy adapter (`crew.mjs agents`
  frontmatter plus the `guard` hook). Their items (FEAT-020, FEAT-012, FEAT-011) are still `triaged`, so the code is the
  check, not the item status.
- Already fine, no change: model.md's `full_suite` settings row and the Definition of Done line that cites it
  (`commands/work/suite.ts` and `land.ts` read `hub.full_suite`).

## Scope
**In:**
- model.md: lifecycle text and diagrams for idea, item, plan and goal list every edge of the code's flows, with a pointer
  to the generated `plugins/crew/docs/plan-lifecycle.md` (gates per edge).
- model.md: line 15 names `learn` as the writer of `knowledge/`.
- model.md: Git mapping and "Where hub changes are committed" describe both flows (branch per plan; `plan_worktrees: true`).
- SKILL.md: the usage line says the SubagentStop hook records crew agents' tokens; manual `usage` is for runs outside it.
- vision.md: the Workstream C Deferred list marks shipped entries as shipped (or drops them), each checked against the code.

**Out (explicitly not doing):**
- Any source, test, `dist/` or generated-page change (`plugins/crew/docs/` is rewritten by `npm run docs`).
- Generating model.md's diagrams from code, or moving them out of model.md (FEAT-030 owns the doc set).
- Updating item statuses of FEAT-011/012/020 (the PM's call; a follow-up note is enough).
- P-068's model.md change (`.crew/` layout lists `scratch/`); both plans edit model.md, which is in `hub.shared`.
- Other wording in model.md, SKILL.md or vision.md.

## Acceptance criteria
- [ ] AC1: Every edge of `PLAN_FLOW`, `GOAL_FLOW`, `ITEM_FLOW` and the idea flow in `packages/crew/src/hub/core/work/model.ts` appears in model.md's Lifecycles section (diagram or text), including `ready → draft`, `in-progress → ready`, `in-review → in-progress`, `accepted → in-progress`, `dropped → draft`, `active → proposed`, `done → active`, `dropped → proposed`, `triaged → new`, `researching → exploring`, `proposed → researching` and `killed → exploring`, and no edge the code lacks; the section links `plugins/crew/docs/plan-lifecycle.md`.
- [ ] AC2: model.md's Git mapping describes both flows: branch per plan (as now) and `plan_worktrees: true` (shared sparse worktree from `new-plan`; hub documents committed on the base branch in the main checkout; WIP code commits on the plan branch at checkpoints and hand-over; `land` squashes to one commit and removes worktree and branch; the PM moves it `done`), and the "status and next read every plan/* branch" line is limited to branch-per-plan.
- [ ] AC3: model.md no longer contains "written by `migrate` today"; it says `learn` writes `knowledge/`.
- [ ] AC4: SKILL.md no longer contains "Nothing records it automatically"; it says the SubagentStop hook (`usage --hook`) records each crew agent's tokens and manual `usage` covers runs outside that hook.
- [ ] AC5: vision.md's Workstream C Deferred list no longer presents automatic `usage` capture, kickoff/onboard as ledger runs or the Claude Code policy adapter as deferred; each remaining entry (`ideate`/`architecture` skills, cross-machine ledger sync) is confirmed still unshipped (no `plugins/crew/skills/ideate` or `architecture`; SPIKE-001 open).
- [ ] AC6: The diff against the base touches only model.md, SKILL.md and docs/vision.md, and `crew.mjs check` reports nothing new.

## Approach
- Lifecycles: keep the ASCII plan diagram style but make every edge explicit (an edge list under it is fine:
  `ready → in-progress | draft | dropped`, …), and rewrite the goal, item and idea lines the same way. Check edge by edge
  against `model.ts` and the generated mermaid blocks in `plugins/crew/docs/plan-lifecycle.md`.
- Git mapping: add a "With plan worktrees" subsection beside the branch-per-plan bullets; keep the goal integration branch
  section. Facts come from P-026, P-028, P-032, P-038 outcomes and `commands/work/land.ts`'s header.
- vision.md: annotate shipped entries "(shipped: …)" or drop them, naming the mechanism.

## Design

## Tasks
- [x] T1: Rewrite model.md's Lifecycles section to every edge of the code's four flows, with a pointer to plan-lifecycle.md → verify: compare edge by edge with `grep -n " --> " plugins/crew/docs/plan-lifecycle.md` and `packages/crew/src/hub/core/work/model.ts`; every edge named in AC1 is present
- [x] T2: Fix model.md's knowledge line → verify: `grep -n "migrate\` today" plugins/crew/skills/hub/references/model.md` prints nothing and `grep -n "learn" plugins/crew/skills/hub/references/model.md` shows the `knowledge/` line
- [x] T3: Describe the plan_worktrees flow in model.md's Git mapping and limit the plan/* branch line to branch-per-plan → verify: `grep -n "plan_worktrees" plugins/crew/skills/hub/references/model.md` shows the Git mapping lines; read them against AC2
- [x] T4: Fix SKILL.md's usage line → verify: `grep -n "Nothing records it automatically" plugins/crew/skills/hub/SKILL.md` prints nothing and `grep -n "usage --hook" plugins/crew/skills/hub/SKILL.md` shows the Developer-section line
- [x] T5: Update vision.md's Workstream C Deferred list → verify: `grep -n "automatic \`usage\` capture" docs/vision.md` shows it only as shipped (or not at all); `ls plugins/crew/skills` has no ideate/architecture
- [x] T6: Confirm the change is docs-only → verify: `git diff --name-only main` lists only the three files, and `node .crew/bin/crew.mjs check` shows nothing new

## Test plan
**Targeted checks** (docs only; no test file covers these pages):
- AC1: manual edge-by-edge comparison of model.md's Lifecycles with `model.ts` flows and the generated `plugins/crew/docs/plan-lifecycle.md` (T1).
- AC2: manual read of the Git mapping against the P-026/P-028/P-032/P-038 outcomes; `grep -n plan_worktrees` (T3).
- AC3: the two greps of T2.
- AC4: the two greps of T4.
- AC5: grep of T5, `ls plugins/crew/skills`, SPIKE-001's status.
- AC6: `git diff --name-only main` and `node .crew/bin/crew.mjs check` (T6).

## Rollout & rollback
Docs only; lands with the plan. Rollback: revert the commit.

## Risks & open questions
- P-068 (ready) and P-065 (in progress) also edit model.md / SKILL.md; both files are in `hub.shared`, so they run side by
  side and Release resolves text conflicts at land (different sections: P-068 edits the `.crew/` layout and the drafts-only
  line; this plan's line-15 edit sits next to the layout, so a small conflict is possible there).
- FEAT-011, FEAT-012 and FEAT-020 are still `triaged` although their work shipped; the developer logs that on CHORE-016 for
  the PM rather than closing them.

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-069: Fix stale hub references in model.md, hub SKILL.md and vision.md [in-review] tasks 6/6 — claimed by Arpit Anand (developer:ac83238ac3dc75db9)
- last checkpoint 2026-10-26 14:23 at T6 (d80d443) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —, AC6 —

Latest log:
- 2026-10-26: re-goaled none → G-006 by Arpit Anand: CHORE-016 belongs to G-006 (docs true to the code); plan lost the goal
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-069-fix-stale-hub-references-in-model-md-hub

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: re-goaled none → G-006 by Arpit Anand: CHORE-016 belongs to G-006 (docs true to the code); plan lost the goal
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-069-fix-stale-hub-references-in-model-md-hub
- 2026-10-26: status in-progress → in-review
- 2026-10-26: status in-review → accepted
- 2026-10-26: status accepted → in-progress — land: hub.build failed (exit 1):     at ModuleLoader.getOrCreateModuleJob (node:internal/modules/esm/loader:610:35) ·     at ModuleJob.syncLink (node:internal/modules/esm/module_job:277:33) { ·   code: 'ERR_MODULE_NOT_FOUND' · } · Node.js v26.5.0
- 2026-10-26: Land bounce cause: packages/crew/node_modules missing in the plan worktree, so build.mjs could not import 'esbuild' (ERR_MODULE_NOT_FOUND). Ran npm ci --prefer-offline in the worktree's packages/crew (185 packages; allow-scripts warned esbuild/fsevents install scripts not run, build works regardless). npm run build now succeeds and leaves 0 uncommitted files. No code change.

## Outcome
Shipped (docs only: model.md, hub SKILL.md, docs/vision.md):
- model.md Lifecycles: an edge list under each of idea, item, plan and goal, matching `IDEA_FLOW`, `ITEM_FLOW`,
  `PLAN_FLOW` and `GOAL_FLOW` edge for edge (checked against the generated mermaid in `plugins/crew/docs/plan-lifecycle.md`);
  the section links plan-lifecycle.md for the gates. The ASCII plan diagram is kept as the main path.
- model.md: `knowledge/` is "written by `learn`"; Git mapping names both flows, the "Where hub changes are committed"
  heading is marked branch per plan, the `plan/*` read is limited to branch per plan, and a new "With plan worktrees"
  subsection covers the shared sparse worktree, hub commits on the base, WIP code commits at checkpoints and hand-over,
  `land`'s squash and cleanup, and the PM's `done`.
- SKILL.md: the usage line names the SubagentStop hook (`usage --hook`) and keeps manual `usage` for runs outside it.
- vision.md: Deferred keeps only `ideate`/`architecture` skills (no such skill dirs) and cross-machine ledger sync
  (SPIKE-001 triaged); a "Shipped since" line names workflow runs, `agents` + `guard`, and `usage --hook`.
Deviations: none. Follow-up: logged on CHORE-016 that FEAT-011, FEAT-012 and FEAT-020 are shipped but still triaged (PM's call).
Learnings: none
