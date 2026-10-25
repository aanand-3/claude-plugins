---
id: P-029
title: Overlap is not a dependency
goal: G-007
items: FEAT-038, FEAT-028, SPIKE-004
touches: packages/crew/src/hub/core/work/footprint.ts, packages/crew/src/hub/commands/team/team.ts, packages/crew/src/hub/commands/views/checks.ts, packages/crew/test/hub/e2e/shared-touches.test.ts, packages/crew/test/view.test.ts, .crew/config.yaml, plugins/crew/skills/hub/agents/architect.md, plugins/crew/skills/hub/references/model.md
depends_on:
status: in-progress
branch: plan/P-029-overlap-is-not-a-dependency
pr:
created: 2026-10-25
started: 2026-10-25
completed: 2026-10-25
assignee: developer
---

# P-029: Overlap is not a dependency

## Context
W1-d of G-007 (design: `.crew/drafts/the-crew-team-was-pure-reef.md`, "W1-d: an overlap is not a dependency"), plus the last W1-a item ("`check` warns when a plan's touches lists a generated path"). Today any overlap of two plans' `touches:` stops `staff` from proposing the second one (team.ts `staffing`, `clash`), and `check` tells the Architect to "sequence them (depends_on)". So architects add `depends_on` as a lock even when one plan doesn't need the other's code. Most false overlaps come from three places: registries every new command edits (`cli.ts`, `mcp.ts`), docs (`SKILL.md`, `README.md`, `references/model.md`), and test files that both plans only add cases to (SPIKE-004). Broad globs make it worse: P-021's `plugins/crew/skills/hub/**` overlaps nearly every plan (FEAT-028).

SPIKE-004's answer is recorded as K-2026-10-25-overlaps-on-hub-shared-paths-including: test files are handled by the same `hub.shared` list as registries and docs, with no special case. A touch counts as shared only when it is a literal path a shared glob matches, or is itself a shared glob, so broad globs still block. The merge queue (P-032) resolves shared-file conflicts; until it lands, Release does it by hand, as today.

## Scope
**In:**
- `hub.shared` in `.crew/config.yaml`: a YAML list of path globs. Two plans whose touches overlap only through shared touches don't block each other in `staff` and aren't reported by `check`'s overlap hint.
- A touch is shared when it has no wildcard and a shared glob matches it, or when it equals a shared glob. An overlapping pair of touches is ignored only when both sides are shared, so a broad glob (never shared) still blocks every touch it overlaps (AC2; Q-acbff5).
- `check` hints, for every plan that isn't closed:
  - **broad touches** (FEAT-028): a wildcard touch that matches more than 10 tracked files, or that covers a file a shared glob matches. The hint names the glob and says to list the exact files;
  - **generated paths** (W1-a): a touch that matches a tracked file `.gitattributes` marks `linguist-generated`. Release rebuilds those; no plan lists them;
  - **overlap-only `depends_on`**: a dependency whose touches overlap this plan's (a blocking overlap) and whose ID appears nowhere in this plan's Context, Approach or Risks & open questions. The hint says to name the code it needs there, or drop the dependency.
- `check` reports `hub.shared` that isn't a list of strings as an ERROR.
- `check`'s overlap hint text no longer suggests `depends_on` ("narrow touches, or list the file in hub.shared; depends_on is only for a plan that needs the other's code").
- This repo's `hub.shared`: `packages/crew/src/hub/cli.ts`, `packages/crew/src/hub/mcp.ts`, `packages/crew/src/hub/commands/index.ts` (the registration index P-030 creates), `plugins/crew/skills/hub/SKILL.md`, `plugins/crew/skills/hub/references/model.md`, `plugins/crew/skills/team/SKILL.md`, `README.md`, `packages/crew/test/**/*.test.ts`.
- Docs: model.md (a `shared` row in the Settings table; "Size, dependencies and WIP" says depends_on is for code dependencies only) and architect.md (list exact files in touches; use depends_on only when the plan needs the other plan's code; shared paths don't block).
- SPIKE-004's Findings: a `log SPIKE-004` line pointing to the decision and this plan's tests.

**Out (explicitly not doing):**
- Resolving shared-file conflicts: P-032 (`land`).
- `start`'s overlap warning in workflow.ts (that file is P-028's and P-039's): P-039 passes it the shared globs and rewords it. Until then `start` still warns on a shared overlap; it only warns, it never refuses.
- A config key for the broad-glob threshold (a constant, 10, until a project needs another).
- Narrowing P-021's touches (G-003; its Architect's call, prompted by the new hint).
- Any change to `.crew/bin/**`, `.claude/agents/**` or the policy (human-reserved).

## Acceptance criteria
- [ ] AC1 · In a throwaway repo with two ready plans whose touches overlap only on `src/cli.ts` (a literal touch in both) and `hub.shared: [src/cli.ts]`, `staff --json` proposes both. Without `hub.shared`, the second waits ("overlaps P-001 on its touches"), as today.
- [ ] AC2 · A shared test glob (`hub.shared: ["test/**/*.test.ts"]`) lets two plans that both touch `test/a.test.ts` start together, while a plan touching `test/**` still blocks one touching `test/a.test.ts` (a broad glob is not shared).
- [ ] AC3 · With both plans in progress and overlapping only on shared touches, `check` prints no overlap hint; with a real overlap, the hint no longer mentions depends_on as the fix.
- [ ] AC4 · `check` hints `P-00x: touches glob src/** is broad (N tracked files)` for a wildcard touch that matches more than 10 tracked files or covers a shared file, and no such hint for exact paths.
- [ ] AC5 · `check` hints that a plan whose touches include `dist/**` (with `dist/** linguist-generated=true` in `.gitattributes` and a tracked file under dist/) lists a generated path.
- [ ] AC6 · `check` hints `P-002 depends on P-001 only through an overlap` when P-002 depends on P-001, their touches overlap, and P-002's Context, Approach and Risks never mention P-001; naming P-001 in Approach removes the hint.
- [ ] AC7 · `hub.shared: "src/cli.ts"` (a string, not a list) makes `check` exit 1 with `hub.shared: expected a list of path globs`.
- [ ] AC8 · This repo's `.crew/config.yaml` has the `hub.shared` list from Scope; `node plugins/crew/skills/hub/dist/crew.mjs check`, run from the main checkout after `npm run build`, prints no ERROR about it.
- [ ] AC9 · model.md documents `shared` (Settings table) and says depends_on is for code dependencies; architect.md tells the Architect to list exact files and to use depends_on only for code dependencies.

## Approach
- **footprint.ts (core).**
  - `sharedGlobs(store)`: parse `.crew/config.yaml` with the `yaml` package and return `hub.shared` (non-list → `[]`; `check` reports it). `isShared(touch, shared)`: no `*`/`?` in the touch and some `globRe(s).test(touch)`, or `shared.includes(touch)`.
  - `blockingGlobs(a, b, shared)`: the touches of `b` that overlap a touch of `a` (`globsOverlap`) unless both sides are shared.
  - `overlapping(plan, plans, shared: string[] = [])` uses `blockingGlobs`. A caller that passes no `shared` (workflow.ts's `start` warning, until P-039) keeps today's behaviour.
  - `touchHints(store, plan, shared)`: broad (`git ls-files` in the home, filtered by `globRe`) and generated (`check-attr -z linguist-generated` on the matched files) hints.
- **team.ts.** `staffing`'s `clash` uses `blockingGlobs(p, o, shared)` instead of raw `globsOverlap`.
- **checks.ts.** The `overlaps` rule passes the shared globs; a new `touches` rule runs `touchHints` and the overlap-only `depends_on` test (search Context, Approach and "Risks & open questions" with `plan.section(...)` for the dependency's ID); the `hub.shared` type check is an error. checks.ts is 235 lines: if the new rule pushes it past 300, the rule goes in footprint.ts and checks.ts only calls it.
- **config.yaml.** Add under `hub:` (with a one-line comment):
  ```yaml
  # hub.shared: overlaps on these never block staffing; the merge queue resolves them (exact files, not directories).
  shared: [packages/crew/src/hub/cli.ts, packages/crew/src/hub/mcp.ts, packages/crew/src/hub/commands/index.ts, plugins/crew/skills/hub/SKILL.md, plugins/crew/skills/hub/references/model.md, plugins/crew/skills/team/SKILL.md, README.md, "packages/crew/test/**/*.test.ts"]
  ```
  `Store.settings()` (store.ts, flat `key: value` lines) never reads it; footprint.ts parses the YAML itself, so store.ts stays out of this plan.
- **Reuse:** `globRe`, `globsOverlap` (knowledge.ts), `LIVE` (footprint.ts), the `check-attr -z` parsing in `drift`, `init`/`readyPlan`-style helpers in `test/hub/e2e/helpers.ts` and `team-helpers.ts`.

## Tasks
- [x] T1: footprint.ts `sharedGlobs`, `isShared`, `blockingGlobs`, shared-aware `overlapping` → verify: `cd packages/crew && npx vitest run test/hub/e2e/shared-touches.test.ts -t overlap` (AC1, AC2, AC3)
- [x] T2: team.ts `staffing` uses the blocking overlap → verify: `npx vitest run test/hub/e2e/shared-touches.test.ts -t staff` and `npx vitest run test/hub/e2e/team.test.ts test/hub/e2e/team-2.test.ts` still pass (AC1, AC2)
- [x] T3: checks.ts: shared-aware overlap hint and its new wording, the `touches` rule (broad, generated, overlap-only depends_on), the `hub.shared` type error → verify: `npx vitest run test/hub/e2e/shared-touches.test.ts -t check` (AC3, AC4, AC5, AC6, AC7)
- [x] T4: `hub.shared` in this repo's config.yaml → verify: `npm run build && cd ../.. && node plugins/crew/skills/hub/dist/crew.mjs check | grep -c "ERROR.*hub.shared"` prints 0 (AC8)
- [x] T5: model.md and architect.md; `log SPIKE-004` with the decision ID → verify: `grep -n "shared" plugins/crew/skills/hub/references/model.md plugins/crew/skills/hub/agents/architect.md` finds the row and the guidance; `npx vitest run test/plugin` passes (AC9)
- [x] T6: types and module size → verify: `npm run typecheck`; `wc -l src/hub/core/work/footprint.ts src/hub/commands/team/team.ts src/hub/commands/views/checks.ts` each under 300

## Test plan
**Targeted checks** (from `packages/crew/`, after `npm run build`; the e2e tests drive the built `dist/crew.mjs` in throwaway repos):
- AC1, AC2 → `npx vitest run test/hub/e2e/shared-touches.test.ts -t staff`
- AC3 → `npx vitest run test/hub/e2e/shared-touches.test.ts -t overlap`
- AC4, AC5, AC6, AC7 → `npx vitest run test/hub/e2e/shared-touches.test.ts -t check`
- Unchanged behaviour without `hub.shared` → `npx vitest run test/hub/e2e/team.test.ts test/hub/e2e/team-2.test.ts test/hub/e2e/basics.test.ts`
- AC8 → T4's command
- AC9 → T5's grep; `npx vitest run test/plugin`
- `npm run typecheck`

## Rollout & rollback
- Takes effect in this repo once `.crew/bin/crew.mjs` is refreshed (P-024's `refresh-bin`, or the human's copy); until then the vendored hub ignores `hub.shared` and staffs as before.
- The new hints will flag P-021's `plugins/crew/skills/hub/**` and other broad touches already on main: hints only, nothing fails.
- The human re-renders `.claude/agents/crew-architect.md` (protected) after the merge so this repo's Architect reads the new guidance.
- Rollback: revert the plan's commit; an unknown `hub.shared` key is ignored by the old hub.

## Risks & open questions
- Shared overlaps now reach Release as merge conflicts instead of waiting. Until P-032 (`land`) exists, Release resolves them by updating the second plan to the base and, if that conflicts in code, sending it back through the Director (release.md, as today).
- The 10-file threshold is a heuristic; the hint is advice, not an error.
- Shares no file with P-027, P-028, P-030, P-037 or P-038, so it can run beside any of them. Overlaps P-024 (`.crew/config.yaml`, model.md) and P-039 (team.ts, checks.ts); staffing sequences those, and none of them needs this plan's code.

## Handoff

_Generated 2026-10-25 by `crew.mjs handoff` from the ledger._

- P-029: Overlap is not a dependency [in-review] tasks 6/6 — claimed by Arpit Anand (developer:a241674714d74a684)
- last checkpoint 2026-10-25 07:16 at T6 (f7c315a) by Arpit Anand; since then 0 commit(s), 7 uncommitted file(s): .crew/config.yaml, packages/crew/src/hub/commands/team/team.ts, packages/crew/src/hub/commands/views/checks.ts, packages/crew/src/hub/core/work/footprint.ts, plugins/crew/skills/hub/agents/architect.md, plugins/crew/skills/hub/references/model.md, packages/crew/test/hub/e2e/shared-touches.test.ts
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —, AC6 —, AC7 —, AC8 —, AC9 —

Latest log:
- 2026-10-25: Architect: `plugins/crew/skills/team/SKILL.md` added to this repo's hub.shared list (P-031, P-033, P-034 and P-035 each edit a different section of it).
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-029-overlap-is-not-a-dependency

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-25: Architect: `plugins/crew/skills/team/SKILL.md` added to this repo's hub.shared list (P-031, P-033, P-034 and P-035 each edit a different section of it).
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-029-overlap-is-not-a-dependency
- 2026-10-25: status in-progress → in-review
- 2026-10-25: status in-review → done
- 2026-10-25: release blocked: hub.full_suite failed on the plan's work (brought up to main 3e879d0, rebuilt). test/view.test.ts > graph > matches the CLI expects the old overlap hint ('sequence them (depends_on) or narrow touches') and no 'P-007 depends on P-006 only through an overlap (web/home/**)' hint; P-029's new hints change that output. 1 failed / 319 passed. Not merged; plan commit 9401708 undone, work left uncommitted in its worktree. Back to the Director as a bug.
- 2026-10-25: Architect: release full suite failed in test/view.test.ts 'matches the CLI' (def8a26). Both new hints on the sample project are correct behaviour: the reworded overlap hint, and P-007 depends on P-006 only through web/home/** without naming it (AC6). Fix: update that expectation to the two hints; touches += packages/crew/test/view.test.ts. Back to the developer for this one-line test change, then re-review.
- 2026-10-25: status done → in-progress — release suite: update view.test.ts expectation (log 3e2919e); one-time --force approved by the executive

## Outcome
`hub.shared` (a YAML list under `hub:` in .crew/config.yaml) makes overlaps on shared touches non-blocking in `staff` and in `check`'s overlap hint; the hint now says to narrow touches or share the file, not to add depends_on. New `check` touches rule: ERROR for a `hub.shared` that isn't a list; hints for broad wildcard touches (> 10 tracked files or covering a shared file), touches that list generated paths, and depends_on that only stands for an overlap. This repo's config lists the 8 shared paths; model.md and architect.md document it.
Deviation: a pair of overlapping touches is ignored only when BOTH are shared (Scope said either side; AC2 needs a broad test/** to keep blocking test/a.test.ts) — Q-acbff5 to the Architect. Generated paths are found with `git ls-files ':(attr:linguist-generated)'` rather than check-attr.
Follow-ups: roles.ts and context.ts still call `overlapping` without the shared globs (roles.ts still suggests depends_on), like workflow.ts's start warning (P-039).
Learnings: K-2026-10-25-a-plans-edit-to-crew-config-yaml-in-its
