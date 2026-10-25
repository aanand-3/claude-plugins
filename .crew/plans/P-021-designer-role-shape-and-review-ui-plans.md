---
id: P-021
title: Designer role: shape and review UI plans
goal: G-003
items: FEAT-024
touches: packages/crew/src/hub/core/work/model.ts, packages/crew/src/hub/core/work/gates.ts, packages/crew/src/hub/core/work/footprint.ts, packages/crew/src/hub/core/store.ts, packages/crew/src/hub/core/team/presets.ts, packages/crew/src/hub/commands/work/review.ts, packages/crew/src/hub/commands/team/roles.ts, packages/crew/src/hub/cli.ts, packages/crew/src/hub/mcp.ts, packages/crew/src/tools/design/**, packages/crew/src/tools/cli.ts, packages/crew/build.mjs, packages/crew/test/hub/e2e/policy.test.ts, packages/crew/test/hub/e2e/team.test.ts, packages/crew/test/hub/e2e/team-2.test.ts, packages/crew/test/hub/e2e/execution.test.ts, packages/crew/test/hub/e2e/review-fixes.test.ts, packages/crew/test/hub/e2e/design-review.test.ts, packages/crew/test/hub/e2e/agents.test.ts, packages/crew/test/tools/layout-sweep.test.ts, packages/crew/test/tools/design.test.ts, plugins/crew/skills/hub/agents/designer.md, plugins/crew/skills/hub/agents/developer.md, plugins/crew/skills/hub/agents/qa.md, plugins/crew/skills/hub/SKILL.md, plugins/crew/skills/hub/references/model.md, plugins/crew/skills/hub/references/writing-guide.md, plugins/crew/skills/hub/templates/plan.md, plugins/crew/skills/design/SKILL.md, plugins/crew/skills/design/references/review-checklist.md, plugins/crew/skills/team/SKILL.md, .crew/templates/plan.md, .crew/templates/writing-guide.md, .crew/templates/agents/**, .claude/agents/**, .crew/config.yaml, docs/vision.md
depends_on: P-020, P-031, P-032
status: ready
branch: plan/P-021-designer-role-shape-and-review-ui-plans
pr:
created: 2026-10-24
started:
completed:
---

# P-021: Designer role: shape and review UI plans

## Context
FEAT-024 (goal G-003, Agent team). P-020's UI shipped to review with visual defects that every check passed: unstyled native select arrows, a 288 px Goal filter sized by its longest option, Relations rows overflowing the rail, item pages scrolling sideways, and P-011's board card listing seven FEAT IDs in one chip. The user found them by looking. Nothing on the team judges how a UI looks today:
- QA (`plugins/crew/skills/hub/agents/qa.md`) records functional evidence with `checkpoint --run` / `--verify`.
- The Architect reviews code against the spec (`review P-### --approve | --changes`, the `plan.reviewed` gate in `src/hub/commands/work/review.ts`).
- The design skill's `page` mode (sketch from the inventory, screenshot loop) and `review` mode are never invoked by the team loop.
- `check_design.mjs --all` only catches mechanical drift such as raw colours.

This plan adds a built-in `designer` role that shapes a UI plan before it is built and reviews it after, in code and visually, and a design gate so a UI plan can't reach done without the Designer's approval. It also turns the P-020 layout sweep (a console prototype, checked against a planted overflow) into a script QA can run as evidence, and adds a review checklist built from what slipped through. Decided with the user: no separate UI developer or UI QA agent.

## Scope
**In:**
- `designer` as a built-in role (`ROLES`), with an agent template (`plugins/crew/skills/hub/agents/designer.md`), a queue in `next --role designer`, and RACI/charter text in `docs/vision.md` and the team and hub skills.
- **UI plans:** a plan whose `touches` overlap `design.ui_paths` in `.crew/config.yaml`. This repo sets `ui_paths: [packages/crew/ui/**]`. Without `ui_paths`, no plan is a UI plan and nothing changes.
- **Before build:** the Definition of Ready for a UI plan needs a `## Design` section. The Designer writes it: the screen layout as a composition of shell and inventory components, from DESIGN.md and the studio's Screens, plus the plan's UI acceptance criteria (states, breakpoints, inventory components used).
- **After build:** a `plan.design-reviewed` gate (lifecycle preset: `designer`), recorded with `review P-### --design --approve | --changes TXT`. Done for a UI plan needs an approving design review of the current code, with the same staleness rule as the code review. `--changes` sends the plan back to the developer.
- `layout_sweep.mjs` in `plugins/crew/skills/design/scripts/` (source in `packages/crew/src/tools/design/`). It serves the hub (or takes `--url` of one already served), loads every view (Overview, Hierarchy, Graph, Board plans and backlog) and every document page at 375, 900 and 1440 px in light and dark, and exits 1 on any sideways page scroll or any element overflowing its card or box. Each failure names the width, theme, route and element.
- The design skill's `review` mode gets a checklist (`references/review-checklist.md`), and `page` and `review` both screenshot at full size at 375/900/1440 px, light and dark.
- The Developer template runs the design skill's `page` mode on UI plans. The QA template records `layout_sweep.mjs` as evidence on UI plans. The writing guide's UI task line is updated to match.

**Out (explicitly not doing):**
- A separate UI developer or UI QA agent.
- A layout sweep for arbitrary project apps. The script checks the crew hub; generalising it (configurable routes and box selectors) is a follow-up item.
- Pixel-diff or screenshot-baseline testing.
- Fixing existing UI found by the new checklist or sweep. That work becomes BUG items.
- A design gate for projects without `design.ui_paths`.

## Acceptance criteria
- [ ] AC1 Role: `next --role designer` lists, in order, the UI plans in review awaiting its design review (never ones its run implemented), then draft UI plans with no `## Design` section. `policy show` lists `plan.design-reviewed  designer (preset lifecycle)`. `agents` renders `.claude/agents/crew-designer.md` from `designer.md`, and `agents --check` is clean.
- [ ] AC2 Ready gate: `move P-### ready` on a UI plan with an empty `## Design` section fails with `empty section: Design (a UI plan: touches overlap design.ui_paths)`. The same plan with only non-UI touches, or in a project without `ui_paths`, needs no Design section.
- [ ] AC3 Done gate: on a UI plan in review with QA's evidence and the Architect's approval, `move done` fails with `no design review yet: \`review P-### --design --approve\` by the designer`. It succeeds after the designer approves. It fails again after a code commit on the plan's branch. A non-UI plan never needs a design review.
- [ ] AC4 Design verdicts: `review P-### --design --changes "…"` moves the plan back to in-progress and logs it. A run that implemented the plan can't record a design review. A role other than the designer gets the policy's refusal. `--design` without `--approve` or `--changes` fails with the usage line. The Architect's `review` without `--design` behaves as today.
- [ ] AC5 Layout sweep, failing: against a sandbox hub with a planted overflow (a 400-character unbroken ID in a card) and a planted sideways scroll, `layout_sweep.mjs` exits 1. It reports both, each with width, theme, route and element.
- [ ] AC6 Layout sweep, passing and degraded: against the same sandbox without the plants it exits 0 and prints the routes × widths × themes it checked. With no Chromium-family browser found it exits 2 with `no headless browser: install Chrome or set CREW_BROWSER`, so it is never taken for a pass.
- [ ] AC7 Checklist: `review` mode in `plugins/crew/skills/design/SKILL.md` links `references/review-checklist.md`, which covers native form controls left unstyled, controls sized by their content, joined ID lists in chips, long IDs overflowing cards and rails, text past containers at narrow widths, icons misaligned with text, and screens judged only from scaled-down screenshots. Each entry gives how to spot it and the fix.
- [ ] AC8 Loop wiring: `designer.md` covers both passes (shape before build, review after, in code and visually at full size at 375/900/1440 px, light and dark). `developer.md` runs the design skill's `page` mode on UI plans. `qa.md` records `layout_sweep.mjs` as evidence on UI plans. `docs/vision.md`'s RACI and the team skill include the designer.

## Approach
- **Role and gate.** Add `designer` to `ROLES` (`src/hub/core/work/model.ts`) and `"plan.design-reviewed": "designer"` to the lifecycle preset. `review.ts` gains `--design`: the same checks as today (status in-review, not an implementer, staleness via `lastCode`), recorded as a `review` event with `kind: "design"`. `reviewProblems` takes the kind, and done checks the design kind only for UI plans. A built-in role rather than a policy-defined one (`roles.designer` + charter), because it ships a template, a queue and a gate like the other six.
- **UI plan.** `isUiPlan(store, plan)` checks `plan.touches()` against `design.ui_paths` with `globsOverlap` (`core/memory/knowledge.ts`), the glob overlap `overlapping()` in `core/work/footprint.ts` already uses for plan conflicts. `design.ui_paths` is a list, so it is read from `.crew/config.yaml` with the YAML parser in `core/store.ts` (`yamlBlock` only returns scalars). The `## Design` requirement goes in `readinessProblems`, next to the other Definition of Ready checks, and the plan template gets an optional `## Design` section with a comment.
- **Layout sweep without a new dependency.** No Playwright or Puppeteer. The script finds a local Chrome, Edge or Chromium (or uses `CREW_BROWSER`), launches it with `--headless=new --remote-debugging-port=0`, and drives it over CDP with the WebSocket client from `undici`, which is already a dependency. Widths come from `Emulation.setDeviceMetricsOverride`, themes from `Emulation.setEmulatedMedia prefers-color-scheme`. The in-page scan is the prototype's (box and skip selectors, a 1 px tolerance), moved into a function that is injected with `Runtime.evaluate`. Without `--url`, it starts `crew.mjs ui --no-open` on a free port against the current project and stops it afterwards. Exit codes are 0 clean, 1 findings, 2 cannot run.
- **Who does what.** The Developer runs `page` mode while building. QA runs the sweep as evidence (scripted, so it counts toward done like any `checkpoint --run`). The Designer's verdict is judgement: full-size screenshots against DESIGN.md, `principles.md` and the checklist, plus a code pass (tokens only, inventory reuse, no raw controls, `check_design.mjs --all`).
- Protected paths: `.claude/agents/**` and `.crew/templates/agents/**` are policy-protected, so rendering `crew-designer.md` into this repo and vendoring the template need the executive (`--approved-by`) at T7.

## Tasks
- [ ] T1: Add the `designer` role, the `plan.design-reviewed` gate in the lifecycle preset, and `isUiPlan` from `design.ui_paths` → verify: `policy show` lists the gate; unit test for `isUiPlan` (overlap, no overlap, no `ui_paths`) (AC1 part)
- [ ] T2: `## Design` in the Definition of Ready for UI plans, plus the optional section in the plan template → verify: e2e test for AC2
- [ ] T3: `review --design` and the design part of done (`reviewProblems` by kind, staleness, implementer and role checks), in CLI and MCP → verify: e2e tests for AC3 and AC4
- [ ] T4: The designer's queue in `roles.ts` and the `designer.md` agent template → verify: e2e test for `next --role designer` ordering; `agents` renders it and `agents --check` is clean in a sandbox (AC1)
- [ ] T5: `layout_sweep.ts` → `plugins/crew/skills/design/scripts/layout_sweep.mjs` (CDP over undici, own `ui` server or `--url`, widths × themes × routes, exit 0/1/2), registered in `TOOLS` in `packages/crew/build.mjs` → verify: new `test/tools/layout-sweep.test.ts` against a sandbox hub with and without the planted overflow and sideways scroll, skipped with a visible reason when no browser is found (AC5, AC6); `npm run build` and `git diff --exit-code -- plugins/crew/skills` clean
- [ ] T6: `references/review-checklist.md`, with `review` and `page` modes linking it and the full-size 375/900/1440 light/dark screenshot rule → verify: `test/tools/design.test.ts` checks that every checklist entry is present and linked (AC7)
- [ ] T7: Wire the loop: `developer.md` (`page` mode on UI plans), `qa.md` (sweep as evidence), the writing guide's UI line, `docs/vision.md` RACI, team and hub skills, `design.ui_paths` in this repo's config; render the agents into `.claude/agents/` and `.crew/templates/agents/` with the executive's approval → verify: `agents --check` clean in this repo; grep the templates for the sweep and `page` mode (AC8)
- [ ] T8: Visual QA → verify: `layout_sweep.mjs` clean against this repo's hub; `check_design.mjs --all` clean

## Test plan
**Targeted checks:**
- `cd packages/crew && npx vitest run test/hub/e2e/policy.test.ts test/hub/e2e/team.test.ts test/hub/e2e/team-2.test.ts` covers the role, gate and queue (AC1).
- `npx vitest run test/hub/e2e/execution.test.ts test/hub/e2e/review-fixes.test.ts` plus `test/hub/e2e/design-review.test.ts` (new) cover the ready gate, the done gate and the design verdicts (AC2–AC4).
- `npx vitest run test/hub/e2e/agents.test.ts` covers rendering `crew-designer.md` (AC1).
- `npx vitest run test/tools/layout-sweep.test.ts` (new): a planted overflow and sideways scroll in a sandbox hub, clean versus findings, and exit 2 with `CREW_BROWSER=/nonexistent` (AC5, AC6). Where no browser exists the test is skipped and says so; QA runs it on a machine with Chrome.
- `npx vitest run test/tools/design.test.ts` covers the checklist (AC7).
- Manual (`--verify`): read `designer.md`, `developer.md` and `qa.md` against AC8, and run `node plugins/crew/skills/design/scripts/layout_sweep.mjs` against this repo's hub.

## Rollout & rollback
- Projects that don't set `design.ui_paths` see no change. Projects that set it get the Ready and done gates for UI plans from the next release; their in-review UI plans need a design review before done.
- Back out by removing `design.ui_paths` (the gates go dormant) or reverting the plan. The `designer` role and the `review` events with `kind: design` stay readable after a revert: an unknown role in old ledger events is ignored.
- Existing projects need `crew.mjs agents` (executive-approved, protected paths) to get `crew-designer.md`. `agents --check` reports it as missing until then.

## Risks & open questions
- **Headless browser on CI and other machines.** No Chrome means the sweep can't run. Mitigation: exit 2 and a skipped test that says so, never a silent pass. Owner: Architect, at T5. Open: should Release's full suite require the sweep? Proposed: no, it stays QA evidence.
- **False positives from the box and skip selectors.** Intentional scroll areas (tables, `pre`, the board, menus) are skipped as in the prototype. A new scroll area needs adding to the skip list. Mitigation: the selectors live in one exported constant, and each finding names the element.
- **Gate fatigue.** Every UI plan now needs a Designer pass before ready and after review. If that proves heavy for small UI fixes, the fast lane (`fast_lane.types`) could skip the Ready part. Owner: the executive decides after two UI plans.
- **Protected paths.** T7 writes `.claude/agents/**` and `.crew/templates/agents/**` and needs the executive's approval while the plan is in progress.
- **Overlap with P-020** (in progress): this plan doesn't touch the UI sources (`packages/crew/ui/**`), but both plans change tests under `packages/crew/test/**` and rebuild `plugins/crew/skills/hub/dist/**` (the CLI and MCP bundles carry this plan's gate), so touches can't be narrowed apart. `depends_on: P-020`: this plan starts after P-020 merges, rebuilds the bundles on top of it, and T8 sweeps P-020's document page too.
- **Staleness inherits BUG-014.** The design review uses the same `lastCode` rule as the code review, so with plan worktrees (work uncommitted until Release) an approval is not invalidated by later uncommitted changes. AC3 is tested with a commit on the branch; fixing BUG-014 fixes both kinds.

- **Overlap with P-031 and P-032** (presets.ts; P-032 also model.ts and .crew/config.yaml): each adds lifecycle gates or a flow edge this plan's design gate must sit beside (P-032's `land` must also honour the design review at done), so `depends_on: P-031, P-032`. The e2e and hub-skill globs are narrowed to the exact files the tasks change; the dist bundles are Release's (hub.build).

## Handoff

## Progress log

- 2026-10-24: status draft → ready
- 2026-10-25: Architect: depends_on P-031, P-032 added (presets.ts, model.ts, config.yaml); e2e, hub-skill, test/tools and design-skill globs narrowed to exact files

## Outcome
