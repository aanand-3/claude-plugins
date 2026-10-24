---
id: P-004
title: Agent lifecycle: one commit per plan, resumed agents, targeted tests
goal: G-003
items: FEAT-022
touches: packages/crew/src/hub/**, packages/crew/test/**, tests/crew/test_hub.py, plugins/crew/skills/hub/**, plugins/crew/skills/team/SKILL.md, .crew/templates/**, .crew/bin/crew.mjs, .crew/config.yaml, .claude/agents/**, .github/workflows/ci.yml
depends_on: P-015
status: in-review
branch: plan/P-004-agent-lifecycle-one-commit-per-plan
pr:
created: 2026-10-24
started: 2026-10-24
completed:
assignee: developer
---

# P-004: Agent lifecycle: one commit per plan, resumed agents, targeted tests

## Context
Delivers the agent-lifecycle item under G-003 (Agent team). Three gaps showed up in the first team runs:
- **Commits.** The developer template commits after every task, and the hub skill commits every status move
  (`chore(P-###): start`, `in review`, `complete`). `start` refuses a dirty tree, so a spec commit on main is forced too.
- **Agent lifecycle.** The Director starts a new subagent for every hand-off, and the team skill starts a new Director for
  every "continue". Each one re-reads its instructions and the hub from scratch. Claude Code can resume a subagent with
  its conversation intact (SendMessage to its agent ID). The guard's run identity is `role:agent_id`, so a resumed agent
  keeps its claim.
- **Branches.** The team needs one place per plan that every role shares — the spec, the code, QA's checks — so that
  nothing is committed until the plan is complete. The executive chose one shared git worktree per plan (option B),
  created when the plan is specced, with a single commit at completion and nothing committed to main.
- **Tests.** Plans list "full suites" as a task and an acceptance criterion (P-001 T5 and AC5), so the developer and QA
  both run everything. The repo has no CI to run the full suite once.

## Scope
**In:**
- **Shared plan worktrees** (`hub.plan_worktrees: true`; the agent team requires it, this repo turns it on): `new-plan` creates the plan's branch and its worktree (`.claude/worktrees/<P-###-slug>`) and writes the spec there, carrying the checkout's other uncommitted hub files along. Every role works in that worktree; nothing is committed until the plan is complete; Release makes the one commit and squash-merges. Nothing is committed to main.
- The hub sees a plan, and the items, goals and knowledge changed for it, wherever its worktree is: lookups, edits and new IDs work from any checkout.
- `start` claims the plan without switching branches; `checkpoint` and `resume` read git, and run checks, in the plan's worktree; `context` names it; `merge-order` lists a done plan's worktree to commit and remove; the developer agent drops its own isolated worktree; the guard applies protected paths inside plan worktrees.
- Without `plan_worktrees` (solo use): one commit per plan on its branch, and `start` accepts a tree whose only changes are hub files under `.crew/`, carrying them to the plan branch.
- Director and team skill: resume the same agent within a plan (and the same Director across cycles); a fresh agent for each new plan.
- Plan template, writing guide and Architect: the test plan names targeted checks per criterion; the full suite is never a task or criterion.
- QA and Developer run targeted checks only; Release runs the full suite (`hub.full_suite` in `.crew/config.yaml`), or waits for green CI, before each merge.
- `.github/workflows/ci.yml` for this repo: the full suite on pull requests and pushes to main.
- Re-render this repo's agents; keep `.crew/templates/` in step with the skill's copies.

**Out (explicitly not doing):**
- Hub code that runs the full suite itself or derives tests from `touches` (the Architect names them).
- Changing stale-claim detection: a resumed developer idle during QA stays under the 24h default.
- CI templates for user projects (guidelines / git-setup).

## Acceptance criteria
- [ ] No agent template or hub/team skill tells an agent to commit per task or per status move; in the team flow only Release commits, once per plan, and squash-merges (git grep).
- [ ] `start` succeeds when the only uncommitted changes are under `.crew/`, carries them to the plan branch, and still refuses other uncommitted changes (pytest).
- [ ] The Director and team skill tell the caller to resume the same agent with SendMessage within a plan and to start a fresh one for a new plan (git grep).
- [ ] The plan template and writing guide split the test plan into targeted checks and the full suite; QA and Developer run targeted checks; Release runs `hub.full_suite` or waits for CI before merging (git grep).
- [ ] `.github/workflows/ci.yml` runs the pytest suites, the hub typecheck and tests, and the dist-in-sync check; `.crew/config.yaml` sets `hub.full_suite` to the same commands.
- [ ] `crew.mjs agents --check` reports this repo's agents up to date, and `.crew/templates/` matches the skill's templates.

- [ ] With `plan_worktrees`, `new-plan` from main creates the plan's branch and worktree, writes the spec only there, carries the checkout's uncommitted hub files (not drafts) along, and leaves main's tree clean (pytest).
- [ ] From the main checkout, `status` lists a plan that exists only in its worktree, `move`/`assign`/`log` change the worktree's copy, a carried item still shows, and the next `new-plan` doesn't reuse its ID (pytest).
- [ ] `start` keeps the current checkout on its branch; `checkpoint --run` runs in the plan's worktree; `merge-order` lists a done plan with its worktree; the developer agent renders without `isolation` (pytest).
- [ ] The guard refuses an agent's write to `.crew/bin/` inside a plan worktree (pytest).

## Approach
- **start:** `git.treeIsClean(ignore?)` takes a path prefix to ignore; `start` passes `.crew/`. `git switch -c` carries the uncommitted hub files to the new branch. Takeover is unchanged.
- **Plan worktrees:** `git worktree add -b plan/<P-###-slug> .claude/worktrees/<P-###-slug> <base>` at `new-plan`, refused unless the checkout is on the base branch (so only main's own uncommitted hub files are carried). `.claude/worktrees/` goes into the repo's `info/exclude`. The store overlays, from every plan worktree, its own plan file and any item, goal or knowledge file that is uncommitted there (a file also changed in the current checkout keeps the local copy); overlaid documents save back to the worktree. `nextId` lists every worktree's directories too.
- **Commits:** in the team flow nobody commits until the plan is done: then Release commits the worktree once (`<type>(P-###): <title>`), squash-merges, and removes the worktree and branch. Solo, without worktrees: the plan's commit carries its hub bookkeeping; no plan/start/complete commits.
- **Resume:** the Director keeps a roster (plan → agent IDs) for its run. QA bugs and review changes go back to the developer that built the plan; the next cycle goes to the same Director. A new plan, or an agent that says its context is filling up, gets a fresh agent. If SendMessage isn't available, start a fresh agent: the hub has everything (`resume`).
- **Tests:** targeted checks are the tests for the files in `touches`. `hub.full_suite` is a flat `hub:` key in config (the settings reader already parses that block); Release reads it.
- **Rebuild:** `npm run build` regenerates the skill's dist; refresh `.crew/bin/crew.mjs` from it; `crew.mjs agents` re-renders `.claude/agents/`.

## Tasks
- [x] T1: `start` accepts hub-only changes, with a pytest case → verify: `uvx --with pyyaml pytest tests/crew/test_hub.py -q -k start`
- [x] T2: one commit per plan in the developer, director, release templates and the hub and team skills → verify: AC1 grep
- [x] T3: resume within a plan in the director template and team skill → verify: AC3 grep
- [x] T4: targeted checks in the plan template, writing guide, architect, developer, QA; full suite in release and config → verify: AC4 grep
- [x] T5: CI workflow → verify: run each of its commands locally
- [x] T6: rebuild dist, vendored crew.mjs, `.crew/templates/`, re-render agents → verify: `node .crew/bin/crew.mjs agents --check` and `diff -r .crew/templates/agents plugins/crew/skills/hub/agents`

- [x] T7: shared plan worktrees — setting, `git.worktrees`, store overlay, `find`, `nextId`, `new-plan` creates the worktree and carries hub files → verify: `uvx --with pyyaml pytest tests/crew/test_hub.py -q -k worktree`
- [x] T8: `start`, `checkpoint`, `resume`, `context`, `merge-order` in the plan's worktree; developer agent without isolation → verify: same, plus `-k "merge_order or agents"`
- [x] T9: guard strips the plan-worktree prefix → verify: `uvx --with pyyaml pytest tests/crew/test_hub.py -q -k guard`
- [x] T10: agents, team and hub skills, model reference and config for the shared-worktree flow; rebuild, re-vendor, sync templates, re-render → verify: AC1 grep, `node .crew/bin/crew.mjs agents --check`

## Test plan
**Targeted checks (each criterion):**
- AC1: `git grep -nE "After each task, tick it and commit|commit \`chore\(P-###\): (start|complete)\`|run its verification, commit" -- plugins/crew/skills .crew/templates` is empty, and `git grep -n "squash" plugins/crew/skills/hub/agents/release.md` matches.
- AC2: a pytest case in `tests/crew/test_hub.py`: `start` with a dirty `.crew/` file succeeds and the file is on the plan branch; a dirty file outside `.crew/` is still refused.
- AC3: `git grep -n "SendMessage" plugins/crew/skills/hub/agents/director.md plugins/crew/skills/team/SKILL.md` matches both.
- AC4: `git grep -n "Targeted checks" plugins/crew/skills/hub/templates/plan.md plugins/crew/skills/hub/references/writing-guide.md` and `git grep -n "full_suite" plugins/crew/skills/hub/agents/release.md .crew/config.yaml` match.
- AC5: read `.github/workflows/ci.yml`; run each command it lists locally.
- AC6: `node .crew/bin/crew.mjs agents --check`; `diff -r .crew/templates/agents plugins/crew/skills/hub/agents`.

- AC7–AC9: pytest cases in `tests/crew/test_hub.py` named `*worktree*` (a repo with `hub:\n  plan_worktrees: true`).
- AC10: a pytest guard case feeding a Write to `.claude/worktrees/P-001-x/.crew/bin/crew.mjs` from a crew agent.

**Full suite (before merge, and in CI):** `hub.full_suite` in `.crew/config.yaml`.

## Rollout & rollback
Agent definitions are read at session start: start a new session after this merges. Rollback: revert the commit and re-render the agents.

## Risks & open questions
- Resumed agents re-read their conversation from cache: cheaper, not free, and it grows. Mitigation: one agent per plan, a fresh one per new plan.
- Whether a subagent (the Director) can SendMessage its own subagents depends on the Claude Code version; the fallback is a fresh agent.
- Two roles editing in one worktree at once (developer still fixing while QA re-runs): the Director runs them in turn on a plan, never at the same time.
- Knowledge learned inside a plan worktree is visible from other checkouts through the overlay, but lives on the plan branch until it merges.
- A developer resumed after more than 24h of QA would find its claim reported stale; out of scope here.

## Handoff

_Generated 2026-10-24 by `crew.mjs handoff` from the ledger._

- P-004: Agent lifecycle: one commit per plan, resumed agents, targeted tests [in-review] tasks 10/10 — claimed by Arpit Anand (developer:main-session)
- last checkpoint 2026-10-24 07:49 at T10 (7d90df1) by Arpit Anand; since then 0 commit(s), 39 uncommitted file(s): .claude/agents/crew-architect.md, .claude/agents/crew-developer.md, .claude/agents/crew-director.md, .claude/agents/crew-qa.md, .claude/agents/crew-release.md, .crew/bin/crew.mjs, .crew/config.yaml, .crew/plans/P-004-agent-lifecycle-one-commit-per-plan.md
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —, AC6 —, AC7 —, AC8 —, AC9 —, AC10 —

Latest log:
- 2026-10-24: status ready → in-progress — branch plan/P-004-agent-lifecycle-one-commit-per-plan
- 2026-10-24: status in-progress → in-review
- 2026-10-24: status in-review → in-progress — executive chose option B: one shared worktree per plan, a single commit at completion — re-specced

## Progress log

- 2026-10-24: status draft → ready
- 2026-10-24: assigned to the developer role
- 2026-10-24: status ready → in-progress — branch plan/P-004-agent-lifecycle-one-commit-per-plan
- 2026-10-24: status in-progress → in-review
- 2026-10-24: status in-review → in-progress — executive chose option B: one shared worktree per plan, a single commit at completion — re-specced
- 2026-10-24: status in-progress → in-review
- 2026-10-24: waits for P-015 (porting the skill scripts and pytest to Node) on the executive's call; rebase onto it once it merges, porting the shared-worktree pytest cases with it
- 2026-10-24: rebased onto P-015 and P-016; full_suite and CI run pytest on tests/crew (the only pytest suite left)

## Outcome
<!-- Filled before review: what shipped, PR link, deviations from plan, follow-ups captured as items, and
     `Learnings: K-…, K-…` (entries captured with `crew.mjs learn`) or `Learnings: none`. -->
Shipped:
- **Shared plan worktrees** (`hub.plan_worktrees`, on in this repo): `new-plan` creates `plan/P-###-slug` and `.claude/worktrees/P-###-slug` from the base branch, writes the spec there and carries the checkout's uncommitted items, goals and knowledge along (idea, config and policy stay). The store overlays plan worktrees, so `status`, `find`, `move`, `log`, `triage` and `nextId` work from any checkout. `start` claims without switching branches; `checkpoint`/`resume`/`context`/drift use the plan's worktree; `merge-order` lists each done plan's worktree to commit once, squash-merge and remove. The developer agent loses its own isolation. The guard protects hub files inside plan worktrees.
- Agents: only Release commits — once per plan, at completion; nobody commits to main on its own. Developer, QA and Architect work in the plan's worktree; the Director runs one role at a time per worktree and resumes agents with SendMessage within a plan; the team skill resumes the same Director.
- Targeted checks for developers and QA; the full suite once before merge (`hub.full_suite`, or CI) — `.github/workflows/ci.yml`.
- Solo flow (no `plan_worktrees`): one commit per plan, and `start` carries uncommitted hub files to the plan branch.

Deviations: re-specced after review on the executive's call (option B). `start` now checks a held claim before readiness, since another checkout sees a claimed plan's live (in-progress) copy.

Follow-ups:
- P-015 (port the skill scripts and pytest to Node) started under the old rules, and these pytest cases will need porting with it.
- The unattended loop (`crew.mjs run`) starts a new `claude -p` per pass, so the Director can't be resumed there.
- `check` reports an error for a plan whose linked items exist only on its unmerged branch (P-013 → CHORE-010 today).

Learnings: none
