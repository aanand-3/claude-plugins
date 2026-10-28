---
id: P-094
title: Runner lands accepted plans in batches: dispatch and Release agent
goal: G-007
items: BUG-060
touches: packages/crew/src/hub/commands/team/dispatch.ts, packages/crew/src/hub/commands/team/agents.ts, plugins/crew/skills/hub/agents/release.md, packages/crew/test/hub/e2e/dispatch.test.ts, packages/crew/test/hub/e2e/agents.test.ts
depends_on:
status: in-progress
branch: plan/P-094-runner-lands-accepted-plans-in-batches
pr:
created: 2026-10-28
started: 2026-10-28
completed:
assignee: developer
---

# P-094: Runner lands accepted plans in batches: dispatch and Release agent

## Context
P0 fix for BUG-060 (goal G-007). Dispatch (dispatch.ts:78-80) hands Release only `land P-###` for the first plan in merge order. The vendored `.crew/templates/agents/release.md` and rendered `.claude/agents/crew-release.md` lack P-079's batch Loop text, yet `agents --check` reports them up to date. Draft touches (Architect may adjust): dispatch.ts, its dispatch tests, the release.md template, and the code behind `agents --check` (agents.ts).

## Scope
In:
- **Dispatch's Release row** (`dispatch.ts`, row 4): when two or more landable plans are in `merge-order` and none is held, Release gets one entry that names the whole queue and the command `land` with no ID. One landable plan keeps today's `land P-###` entry; a legacy plan first in line keeps its "merge by hand" entry.
- **Holds still apply**: `land` with no ID lands every non-legacy plan in `merge-order` and knows nothing of escalation holds or blocking questions, so dispatch only offers the batch when no queued plan is held, asked (open blocking question) or behind one that is. Otherwise Release gets the single-path entry `land P-###` for the first queued plan that is free, or nothing.
- **Template drift check** (`agents.ts`): `agents --check` and `check`'s agent hints report each vendored `.crew/templates/agents/<name>.md` that differs from (or is missing beside) the plugin's `agents/<name>.md`, with the fix: the human re-runs `init` from the plugin, then `agents`.
- **Release's agent text** (plugin `agents/release.md`): one sentence that maps dispatch's batch entry to `land` with no ID.

Out:
- Refreshing `.crew/templates/agents/**` and `.claude/agents/**` in this repo. Both are `paths.protected` (policy.ts BUILT_IN); only the human re-vendors (`init`) and renders (`agents`, K-2026-10-28-the-agents-mcp-tool-is-read-only-it-runs). This is a one-time human step after the land (see Rollout).
- `land` itself (no holds logic in land.ts), `doctor` and the runner's preflight (runner.ts is in P-066's and P-081's touches). Drift of the non-agent vendored templates (`goal.md`, `writing-guide.md`).
- The permission classifier refusing Release's `land` in auto mode (noted on BUG-060; separate).

## Acceptance criteria
- [ ] AC1: With two or more accepted, unlanded, non-legacy plans in `merge-order` and none held, `dispatch --json` has exactly one `release` entry; its `ref` is the first plan in merge order and its `task` starts with `land: <N> accepted plans as one batch (` and lists every queued plan ID in merge order, and names `land` with no ID. No other plan of the queue gets a release entry.
- [ ] AC2: With exactly one accepted, unlanded plan, the release entry is unchanged: `task` matches `^land P-### ` (the existing "an accepted, unmerged plan goes to release (AC2)" case still passes unchanged).
- [ ] AC3: With two accepted plans where the first in merge order has an open blocking question (or an escalation hold), dispatch gives no batch entry: Release gets `land <second plan>` (single path) when the second does not depend on the first, and no release entry when it does.
- [ ] AC4: `agents --check` in a project whose vendored `.crew/templates/agents/release.md` differs from the plugin's `agents/release.md` prints a line naming `.crew/templates/agents/release.md`, saying it differs from the plugin's template and that the human re-runs `crew.mjs init` from the plugin then `crew.mjs agents`, and exits 1; it no longer prints "Agents up to date.".
- [ ] AC5: `check` (once agents are rendered) carries the same template-drift hint; with vendored templates identical to the plugin's, `agents --check` still exits 0 with "Agents up to date." (the existing agents.test.ts cases pass unchanged).
- [ ] AC6: The plugin source of the templates is found both when the CLI runs from the plugin (its own `agents/` dir) and when it runs as the vendored `.crew/bin/crew.mjs`, via the sibling `agents/` of `release.refresh_bin.from` when the policy sets it; with neither available, no drift line and no error.
- [ ] AC7: `plugins/crew/skills/hub/agents/release.md`'s Loop says that a dispatch entry `land: N accepted plans as one batch` means running `land` with no ID, and that `land P-###` is for an entry naming one plan.

## Approach
Two small, independent changes behind one bug. Dispatch decides *what* Release is told; the existing `land` (no ID) already does the batching (P-079, P-093), so no land change. The agent-text half cannot be fixed in code inside the guard: the vendored templates and rendered agents are protected so agents cannot rewrite their own definitions. Keeping them in sync automatically (e.g. extending `refresh-bin` to templates) would give an agent write power over agent definitions and still leave `.claude/agents/` stale, so the fix is detection plus a human step: `agents --check`/`check` report the drift and say who fixes it, and the human re-vendors once after this lands (as d835cf92 did before).

## Design
**dispatch.ts row 4** (replace the `slice(0, 1)` row; same file, same position in ROWS):
- `const m = mergeOrder(v.store).merge`. If `m[0]?.legacy` → today's by-hand entry for `m[0]`.
- `queue = m.filter(p => !p.legacy)`; blocked = ids held (`escalationHolds(v.events).held`) or with an open blocking question (`openQuestions(v.events)`, `blocking && ref`), plus, walking `queue` in order, any plan whose `depends_on` (from `v.plans`) includes a blocked id.
- No blocked plan and `queue.length >= 2` → one entry, role `release`, ref `queue[0].id`, task "land: <n> accepted plans as one batch (<ids, comma-separated, merge order>) — run `land` with no ID".
- Otherwise the first unblocked plan of `queue` → today's `land ${id}: ${title} (first in merge-order)`; none → no entry.
- Comment updated ("4. release: one batch, or one plan when a hold keeps the batch out"). The global filter in `dispatch()` stays as is.

**agents.ts**:
- `pluginAgentsDir(store)`: `join(SKILL_DIR, "agents")` when it exists and is not the vendored dir; else, when `release.refresh_bin.from` is set, `join(store.ws.root, dirname(from), "agents")` if it exists; else null.
- `templateDrift(store): { path, problem }[]`: for each `*.md` in the plugin dir, compare with `.crew/templates/agents/<name>`; differs → "differs from the plugin's <rel path>", missing → "missing (the plugin has <rel path>)". Not part of `agentProblems` (that drives `agents`, `doctor` and the runner preflight and says "run `crew.mjs agents`").
- `agents --check`: prints "STALE  <path>: <problem> — the human re-runs `crew.mjs init` from the plugin, then `crew.mjs agents`"; counts toward exit 1. `agentHints` appends the same per drifted template (same gate: only when crew agents are rendered).

**release.md (plugin)**: one sentence in Loop step 2.

## Tasks
- [x] T1: dispatch.ts row 4 as in Design → verify: dispatch.test.ts cases for AC1, AC2, AC3.
- [x] T2: dispatch.test.ts: add a batch case (two accepted plans → one batch entry, AC1) and a hold case (blocking question on the first; independent second → `land P-…`; dependent second → no release entry, AC3) → verify: `cd packages/crew && npx vitest run test/hub/e2e/dispatch.test.ts`.
- [x] T3: agents.ts `pluginAgentsDir`, `templateDrift`, wired into `agents --check` and `agentHints` → verify: agents.test.ts cases for AC4–AC6.
- [x] T4: agents.test.ts: edit the vendored release.md in a test repo → `agents --check` exits 1 with the drift line and `check` shows the hint (AC4, AC5); vendored-run case: copy the built CLI to the repo's `.crew/bin`, set `release.refresh_bin.from` to a dir whose sibling `agents/` holds a differing release.md → drift reported; no source → clean (AC6) → verify: `cd packages/crew && npx vitest run test/hub/e2e/agents.test.ts`.
- [x] T5: plugin release.md Loop sentence (AC7) → verify: `grep -n "one batch" plugins/crew/skills/hub/agents/release.md` shows it in the Loop section.
- [x] T6: typecheck → verify: `cd packages/crew && npm run typecheck`.

## Test plan
**Regression tests for BUG-060:** the new dispatch.test.ts case "two accepted plans land as one batch" (fails on main: dispatch gives `land P-###` for the first plan only) and the new agents.test.ts case "agents --check flags a vendored template that differs from the plugin's" (fails on main: it says "Agents up to date.").

**Targeted checks:**
- AC1, AC2, AC3: `cd packages/crew && npx vitest run test/hub/e2e/dispatch.test.ts`
- AC4, AC5, AC6: `cd packages/crew && npx vitest run test/hub/e2e/agents.test.ts`
- AC7: `grep -n "one batch" plugins/crew/skills/hub/agents/release.md`
- Types: `cd packages/crew && npm run typecheck`

These tests run the CLI through spawnSync only (no servers or background processes); the batch case must not start `land` or a suite. Any helper that spawns a long-lived process kills it in `afterEach`/`finally` on every exit path (BUG-058). Temp repos are removed by the existing test cleanup (test/setup/cleanup.ts).

## Rollout & rollback
Release lands it as usual (rebuilds dist and refresh-bin). **Then a one-time human step** in the main checkout on main, before restarting the runner:
1. `node plugins/crew/skills/hub/dist/crew.mjs init` — re-vendors `.crew/bin/`, `.crew/templates/` and `.crew/templates/agents/` from the plugin (protected paths; the guard refuses agents).
2. `node .crew/bin/crew.mjs agents` — re-renders `.claude/agents/crew-*.md` (the runner's preflight refuses to start until this is done).
3. Commit both (`chore(hub): re-vendor agent templates after P-079, P-094`), start a new session / restart the runner (rendered agents only load in a new session).
4. `node .crew/bin/crew.mjs agents --check` → "Agents up to date.".
Rollback: revert the plan's commit; dispatch returns to the single entry and the drift lines go away.

## Risks & open questions
- Overlap: P-081 (ready) also touches `dispatch.ts` (not hub.shared), so the two cannot be in progress at once; P-094 is P0 and should start first, P-081 then re-merges. Test files overlap with P-080/P-081 but are hub.shared. No overlap with P-066, P-068, P-071 or P-080 on source files.
- A project that edits its vendored agent templates on purpose will now see a drift hint and `agents --check` exit 1. Accepted: the hint names the file and the fix; a project-local edit belongs in the plugin or in the policy.
- `land` with no ID ignores holds; dispatch is the only guard for them. If a hold lands between dispatch and Release running `land`, the held plan can land. Same window exists today for `land P-###`.
- Not fixed here: the permission classifier refusing `land` in auto mode (BUG-060 notes).

## Handoff
_Generated 2026-10-28 by `crew.mjs handoff` from the ledger._

- P-094: Runner lands accepted plans in batches: dispatch and Release agent [in-progress] tasks 6/6 — claimed by Arpit Anand (developer:ab21f5208ff199427)
- last checkpoint 2026-10-28 14:13 at T6 (6f3b49e) by Arpit Anand; since then 0 commit(s), 2 uncommitted file(s): plugins/crew/skills/hub/dist/crew.mjs, plugins/crew/skills/hub/dist/mcp.mjs
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —, AC6 —, AC7 —

Latest log:
- 2026-10-28: status draft → ready
- 2026-10-28: assigned to the developer role
- 2026-10-28: status ready → in-progress — branch plan/P-094-runner-lands-accepted-plans-in-batches

## Progress log

- 2026-10-28: re-goaled none → G-007 by Arpit Anand: P0 BUG-060 fix belongs to G-007
- 2026-10-28: Draft touches for the Architect (not set in frontmatter): packages/crew/src/hub/commands/team/dispatch.ts, its dispatch tests, .crew/templates/agents/release.md, packages/crew/src/hub/commands/team/agents.ts (agents --check)
- 2026-10-28: status draft → ready
- 2026-10-28: assigned to the developer role
- 2026-10-28: status ready → in-progress — branch plan/P-094-runner-lands-accepted-plans-in-batches

## Outcome
Dispatch's Release row now gives one batch entry (`land: N accepted plans as one batch (…) — run land with no ID`) when two or more plans are queued and none is held, asked or behind one; otherwise `land P-###` for the first free plan, or nothing. `agents --check` and `check` report vendored agent templates that differ from (or are missing beside) the plugin's, with the human's re-vendor step. Plugin release.md maps the batch entry to `land` with no ID. No deviations from the Design. The protected `.crew/templates/agents/**` and `.claude/agents/**` are untouched: the human re-vendors after the land (Rollout), and until then `agents --check` in this repo exits 1 on the drifted templates, as intended.
Learnings: none new; the design is K-2026-10-28-dispatch-gives-release-one-batch-entry and K-2026-10-28-vendored-agent-templates-and-rendered.
