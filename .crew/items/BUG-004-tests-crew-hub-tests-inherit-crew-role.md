---
id: BUG-004
type: bug
title: tests/crew hub tests inherit CREW_ROLE/CREW_RUN and fail under checkpoint --run
status: new
severity:
priority:
goal:
plan:
created: 2026-10-24
closed:
---

# BUG-004: tests/crew hub tests inherit CREW_ROLE/CREW_RUN and fail under checkpoint --run

## Summary
tests/crew/test_hub.py and test_team.py inherit the caller's CREW_ROLE / CREW_RUN. When the suite runs under `crew.mjs checkpoint --run` (where the hub's process env carries the acting agent's identity), the crew.mjs subprocesses these tests start act as that role/run, and 12 tests fail. Run from a plain shell, the same suite passes 166/166. The test harness doesn't scrub CREW_* from the env it gives subprocesses.

## Environment
Branch plan/P-001-nothing-optional-graphify-always-on at 7c1aaeb, macOS (darwin 24.6), local. Not introduced by P-001: the PR doesn't touch test_hub.py or test_team.py.

## Steps to reproduce
1. `cd tests/crew`
2. `env CREW_ROLE=qa CREW_RUN=repro uvx --with pyyaml pytest -q test_hub.py::test_next_asks_for_the_idea_until_it_is_decided` fails.
3. `uvx --with pyyaml pytest -q test_hub.py::test_next_asks_for_the_idea_until_it_is_decided` passes.
4. Full suite: from an agent session, `node .crew/bin/crew.mjs checkpoint P-001 --run "cd tests/crew && uvx --with pyyaml pytest -q -rf" --ac 2,3,5` reports 12 failed, 154 passed.

## Expected
The suite gives the same result whatever CREW_* variables the caller has set, so QA evidence recorded through `checkpoint --run` is meaningful.

## Actual
12 failed, 154 passed under the hub (CREW_ROLE and CREW_RUN set), and 166 passed from a plain shell. Failing tests:
- test_hub.py: test_dependencies_gate_start_and_drive_next, test_next_asks_for_the_idea_until_it_is_decided, test_focus_ranks_work_and_flags_off_focus_plans, test_goal_breakdown_becomes_triaged_items, test_next_ordering_expedites_p0_bugs, test_ledger_lives_in_the_git_common_dir_and_records_moves_and_logs, test_claim_is_visible_and_refused_from_another_worktree, test_context_stays_within_budget_in_role_order, test_context_puts_open_questions_first
- test_team.py: test_a_paused_team_staffs_and_starts_nothing, test_the_runner_stops_on_escalation_pause_budget_and_a_done_goal, test_notify_runs_the_policy_command_once_per_event

## Evidence
Sample assertion: `assert (1 != 0 and 'P-001 is claimed by Test' in "git switch -c plan/P-001-signup failed: fatal: a branch named 'plan/P-001-signup' already exists\n")`. This is a claim check that sees the wrong actor.

## Impact
No QA run can record a passing full tests/crew suite through `checkpoint --run`, so every plan whose criteria include the pytest suites is blocked on evidence. There is no sanctioned workaround: unsetting the vars inside a checkpoint command is blocked as audit tampering.

## Notes
Suggested fix: the test repo fixture should build its subprocess env from os.environ with every CREW_* key removed, and then set only what each test needs (test_team.py already sets repo.env["CREW_RUN"] explicitly).
