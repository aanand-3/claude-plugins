---
id: P-013
title: Import the pre-hub plans; plan-mode plans land in .crew/drafts
goal: G-001
items: CHORE-010
touches: .crew/plans/P-005-*.md, .crew/plans/P-006-*.md, .crew/plans/P-007-*.md, .crew/plans/P-008-*.md, .crew/plans/P-009-*.md, .crew/plans/P-010-*.md, .crew/plans/P-011-*.md, .crew/plans/P-012-*.md, .crew/items/FEAT-00*.md, .crew/items/FEAT-01*.md, .crew/items/CHORE-00*.md, .claude/settings.json, .crew/bin/track_plan_draft.mjs
depends_on:
status: in-review
branch: plan/P-013-import-the-pre-hub-plans-plan-mode-plans
pr:
created: 2026-10-24
started: 2026-10-24
completed:
assignee: developer
---

# P-013: Import the pre-hub plans; plan-mode plans land in .crew/drafts

## Context
Eight plans for this repo were made in plan mode and live only in `~/.claude/plans/`, so the hub doesn't know them: shipped work has no plan, and Workstream T's items (FEAT-006..012) still read `triaged` though T1–T8 merged in `7b24f00`. The crew plugin already ships the fix for new plans (the guidelines settings template sets `plansDirectory: .crew/drafts` and an ExitPlanMode hook), but this repo never got it.

## Scope
**In:**
- Import the eight plans as P-005..P-012, each with its original text, a log line and an Outcome naming the commits and PRs.
- Six as done (P-005..P-008, P-010, P-011); P-011 links FEAT-006..012, which closes them.
- P-009 (robustness research) as dropped: its report never landed.
- P-012 (Node only) as a draft: steps 1–4 shipped as P-001, P-014, P-015 and P-016; it links the remaining CHORE-011, with Scope and Acceptance criteria taken from its own Outcome and Verification.
- `.claude/settings.json`: `plansDirectory: .crew/drafts`, the ExitPlanMode and SessionStart hooks; vendor `track_plan_draft.mjs` into `.crew/bin/`.

**Out (explicitly not doing):**
- `proud-jingling-cosmos.md` (Taskplane and Ferry, another project).
- Deleting the originals in `~/.claude/plans/`.
- The rest of the guidelines settings template (format-on-edit, Stop hooks).
- FEAT-020 (shipped in T7 but not in this plan's list).

## Acceptance criteria
- [ ] `.crew/plans/` holds P-005..P-012 with the statuses above, and `crew.mjs check` reports no errors.
- [ ] FEAT-006..012 link P-011 and no longer appear in the backlog; CHORE-011 links P-012.
- [ ] `.claude/settings.json` sets `plansDirectory` to `.crew/drafts` and runs `track_plan_draft.mjs` on ExitPlanMode and at SessionStart.
- [ ] The hook prints the "not tracked yet" nudge for ExitPlanMode input, and lists leftover drafts with `--session`.

## Approach
The work exists as `f34f0a0`, made directly on main and moved off it (kept on `keep/import-f34f0a0`). Apply it to this plan's branch unchanged, then add the plan's own bookkeeping. Imported plans are written as files, the way `migrate` carries pre-hub history; item status follows the linked plan.

## Tasks
- [x] T1: import the eight plans and link the items → verify: `node .crew/bin/crew.mjs check` has no ERROR; `status` lists them under Recently done
- [x] T2: settings and the vendored hook → verify: pipe ExitPlanMode JSON into `track_plan_draft.mjs`; run it with `--session` and a draft present

## Test plan
**Targeted checks:**
- AC1, AC2: `node .crew/bin/crew.mjs check` (no ERROR) and `node .crew/bin/crew.mjs status` (Recently done lists the imports; FEAT-006..012 gone from the backlog).
- AC3: read `.claude/settings.json`.
- AC4: `echo '{"tool_name":"ExitPlanMode","tool_input":{"planFilePath":".crew/drafts/demo.md"}}' | CLAUDE_PROJECT_DIR=$PWD node .crew/bin/track_plan_draft.mjs`, and `--session` with a draft present.

## Rollout & rollback
The settings take effect from the next session. Rollback: revert the merge; the imported files and links go with it.

## Risks & open questions
- The hook nudges "on main … start": with P-004 merged, `start` carries the draft along, so the wording stays correct.

## Handoff

_Generated 2026-10-24 by `crew.mjs handoff` from the ledger._

- P-013: Import the pre-hub plans; plan-mode plans land in .crew/drafts [in-review] tasks 2/2 — claimed by Arpit Anand (developer:main-session)
- last checkpoint 2026-10-24 06:45 at T2 (81c2b98) by Arpit Anand; since then 8 commit(s), 4 uncommitted file(s): .claude/settings.json, .crew/bin/track_plan_draft.py, .crew/plans/P-013-import-the-pre-hub-plans-plan-mode-plans.md, .crew/bin/track_plan_draft.mjs
- evidence: AC1 —, AC2 —, AC3 —, AC4 —

Latest log:
- 2026-10-24: assigned to the developer role
- 2026-10-24: status ready → in-progress — branch plan/P-013-import-the-pre-hub-plans-plan-mode-plans
- 2026-10-24: status in-progress → in-review

## Progress log

- 2026-10-24: status draft → ready
- 2026-10-24: assigned to the developer role
- 2026-10-24: status ready → in-progress — branch plan/P-013-import-the-pre-hub-plans-plan-mode-plans
- 2026-10-24: status in-progress → in-review

## Outcome
<!-- Filled before review: what shipped, PR link, deviations from plan, follow-ups captured as items, and
     `Learnings: K-…, K-…` (entries captured with `crew.mjs learn`) or `Learnings: none`. -->
Shipped:
- P-005..P-008, P-010, P-011 imported as done with the commits and PRs that shipped each; P-011 closes FEAT-006..012.
- P-009 imported as dropped (the report never landed); P-012 as a draft linking the remaining CHORE-011, with Scope and Acceptance criteria from its own Outcome and Verification.
- `plansDirectory: .crew/drafts` and the ExitPlanMode / SessionStart hooks, with `track_plan_draft.mjs` vendored into `.crew/bin/`.

Deviations: the work was first committed directly on main (`f34f0a0`), then moved here unchanged; main was reset to `81c2b98`. Started with P-004's `start` (carries uncommitted hub files), so no spec commit on main.

Rebased onto P-016, which ported the hook to Node: the repo vendors `track_plan_draft.mjs` (run with `node`), not the Python script. CHORE-008/009 keep their links to P-015/P-016, and P-012 now links the remaining CHORE-011.

Follow-ups: FEAT-020 (usage capture) shipped in T7 but is still open. Merge P-004 first or after: no overlapping files.

Learnings: none
