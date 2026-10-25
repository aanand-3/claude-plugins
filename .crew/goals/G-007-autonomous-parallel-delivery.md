---
id: G-007
title: Autonomous parallel delivery
status: active
priority: P1
created: 2026-10-25
completed:
integration_branch:
---

# G-007: Autonomous parallel delivery

## Outcome
Once the human approves a set of goals, the crew team works the backlog to done on its own — several plans at once, in this repo and in other projects — and the human can watch every agent live in the hub and answer what only they decide from the hub, with no Claude Code session open.

## Scope
**In:**
- one home for hub state (the main checkout), so parallel plan worktrees never fork plans, items, goals or knowledge
- live activity of every agent in the hub (feed, status, ui), captured by hooks
- plans that overlap on shared or generated files run side by side; a merge queue lands them in order and sends real conflicts back
- the hub routes each step to its role (`dispatch`); the PM owns each plan, the Director handles exceptions and the goal queue
- a local runner that keeps going until every approved goal is done, and an inbox where the human approves and answers
- `doctor` and `init` defaults so another project can run the same loop

**Out:**
- a scheduled cloud runner and cross-machine ledger sync (SPIKE-001)
- human approval of each plan: the human approves goals and the reserved decisions only (decision 2026-10-25)

## Acceptance criteria
- [ ] two plan worktrees create and move plans and items, and the main checkout's `.crew` shows every one of them with one status; no worktree has `.crew` changes
- [ ] two plans that edit the same registry file and both rebuild the bundles run at the same time and both merge to main; a real conflict sends the second back to its developer
- [ ] while an agent runs, `status` and `watch` show its latest tool call within seconds; after it stops, its report is in the ledger on its plan
- [ ] on a sample project with two approved goals and five items, `run --until-done` triages, specs, builds, tests and merges everything, moves the focus to the second goal and stops with "all approved goals done", with no human input and the Director acting only on exceptions
- [ ] with no session open, the human answers an escalation from the inbox and the next pass continues

## Success metrics
- plans running in parallel per pass (target: `budgets.max_agents`)
- passes between a plan going ready and merging
- human interventions per goal outside goal approval and reserved decisions (target: 0)

## Breakdown
- FEAT-034: Gather forked hub files — `migrate --gather` copies plans, items, goals and knowledge from every worktree into the main checkout, renumbering clashing IDs
- BUG-018
- FEAT-035: Live agent activity in the hub — a PostToolUse hook feeds an activity log; status, watch and ui show each run live; reports land on their ref; idle runs are flagged
- FEAT-036: Plan branches commit as they go — checkpoint makes WIP commits (generated files left out), so review pins to real code and goes stale when it moves
- FEAT-037: Merge queue — `land` brings each done plan up to the base, rebuilds, runs the full suite, squash-merges and fast-forwards dependants; a conflict goes back to the developer
- FEAT-038: Overlap is not a dependency — shared globs don't block staffing; check warns on broad touches, generated paths in touches and overlap-only depends_on
- FEAT-039: Registries split per command — each command module registers its CLI command and MCP tool; the hub SKILL.md command reference is generated
- FEAT-040: Hub dispatch — `dispatch` routes each plan and item to the role that owns its next step; the PM owns plans and goal closure, the Director handles exceptions
- FEAT-041: Goal queue — a done focus goal moves on to the next approved goal; the team stops only when none is left
- FEAT-042: Local runner until done — `run --until-done` loops passes, stops on no progress, notifies, and checks the agents and hooks first
- FEAT-043: Human inbox — the human approves goals and answers escalations from the hub (CLI or ui), and steers the Director there
- FEAT-044: Doctor and init defaults — another project can check and set up everything the loop needs

## Notes & decisions
- 2026-10-25 (executive): hub state lives in the main checkout only; humans approve goals and reserved decisions only; the runner is a local loop; the hub dispatches, the PM owns each plan, the Director handles exceptions; the human talks to the hub, not to a session.
- Design: `.crew/drafts/the-crew-team-was-pure-reef.md` (Wave 0 by hand; Waves 1–2 as parallel plans with disjoint touches).

## Progress log
- 2026-10-25: status proposed → active (approved by Arpit Anand)
- 2026-10-25: DIRECTOR HANDOFF 2026-10-25 (wind-down for a fresh session). MERGED this run: P-028 6a13850, P-041 f59be50, P-024 23e2a4a, P-029 a16e16c, P-038 4df8fca, P-033 7c017d4, P-040 cc98a10, P-030 0c78169. Main was damaged once by a QA script run in the wrong directory and repaired in ecc446a. IN FLIGHT: P-042 (guard fix for BUG-017 and CHORE-020) is in-review, developer done 4/4, needs Architect review then QA then PM done then Release; its branch starts before P-030 so Release rebases. P-031 (hub dispatch) is in-progress with T1-T4 done, blocked on Q-5212df to the Architect: it must add registry.test.ts, mcp.test.ts and registry-before.json to touches and append dispatch; then T5, handoff, in-review. P-039 (BUG-026 fix) is approved at 4d4c5e2 and QA passed AC1-AC8 with checkpoints recorded, so the PM can complete it then Release merges it; P-032 waits for it. NEXT: PM triages BUG-028 (suite load timeouts) into one small plan per the executive: a hub lock around hub.full_suite with hub.suite_slots default 1, vitest maxWorkers 50 percent, record suite durations; hub.suite_slots config edit is the executive's step. The PM also files a no-goal backlog item for converting hub tests to in-process cli.ts main calls with one shared sample fixture. The executive did NOT adopt a scope rule that only AC-blocking findings join G-007. Then P-036, P-034, P-035 (wait for P-031), P-032 (waits for P-039), P-021 and P-025 (overlap P-039). OPEN DECISIONS for the executive: Q-d4e060 and Q-67af6f about P-003 and P-002 specs stranded on claude/crew-bug-001-9d4b01; refresh-bin from Release is denied by the session permissions so the executive refreshes the vendored hub on main after each merge; done-to-in-progress needs a forced move until P-032 lands and sessions refuse it, so any reopen needs the executive; QA writes only in the drafts folder and left scripts there which the executive clears. STANDING RULES: one full suite at a time across all checkouts; Release merges only on one fully green full run, waits and reruns on load timeouts, never merges on per-file passes, escalates instead of relaxing; no bash script with arguments near the main checkout until P-042 lands, scratch scripts take paths from environment variables and verify their cwd; never quote the human-approval flag in hub call text; QA records evidence with verify checkpoints on a clean worktree; read specs from the main checkout because context can show a stale branch copy until P-039 lands; tie post-merge questions to G-007; checkpoints now commit code on the plan branch so a checkpoint after an approving review voids it and needs re-approval. G-007 stays active, nothing paused.
