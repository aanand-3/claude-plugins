---
id: P-017
title: Hub tests to vitest; no Python left
goal:
items: CHORE-012, CHORE-011, BUG-004
touches: packages/crew/**, tests/**, .github/workflows/ci.yml, .crew/config.yaml, .gitignore, README.md, plugins/crew/skills/hub/SKILL.md, plugins/crew/skills/hub/references/writing-guide.md, .crew/templates/writing-guide.md, plugins/crew/skills/*/scripts/*.mjs, plugins/crew/skills/hub/dist/**, .crew/bin/crew.mjs
depends_on:
status: in-review
branch: plan/P-017-hub-tests-to-vitest-no-python-left
pr: https://github.com/aanand-3/claude-plugins/pull/12
created: 2026-10-24
started: 2026-10-24
completed:
assignee: developer
---

# P-017: Hub tests to vitest; no Python left

## Context
This is the last step of the move to Node only. P-015 ported the skill scripts and P-016 the upgrade path. P-004 (merged as #9) changed `test_hub.py`, so its port had to wait. Now `tests/crew/test_hub.py` (99 tests) and `test_team.py` (22) are the only Python left in the repo, apart from graphify, which is an external tool. They exercise the shipped `dist/crew.mjs` end to end.

Bundled here:
- CHORE-012: the port.
- CHORE-011: removing the last Python once the port lands.
- BUG-004: the pytest helper passes the hub run's `CREW_ROLE`/`CREW_RUN` on to the processes it starts, so 12 tests fail under `checkpoint --run`.

The same PR also does two follow-ups P-015 deferred because they sat in P-004's files:
- the hub docs that still name `check_structure.py`/`check_design.py`;
- one shared home for the secret patterns.

## Scope
**In:**
- **The port:** every `test_hub.py`/`test_team.py` case becomes a vitest case in `packages/crew/test/hub/e2e/<section>.test.ts`, one file per section of the pytest file (basics, idea/focus, items, status, migrate, ledger, policy, knowledge, execution, context/roles, review fixes, T1 guard, T2 agents, plan worktrees, team). Each file stays ≤ 300 lines.
  - The shared drafts and fixtures (IDEA/GOAL/PLAN/BUG, the project-kit `.project/` tree, org playbooks) go in `test/hub/e2e/fixtures.ts`.
  - The shared helpers (`init`, `tr`, `newIdea`, `newGoal`, `newPlan`, `newBug`, `item`, `planFile`, `finish`, `events`, `mcpCall`, `orgPlaybook`, `hook`) go in `test/hub/e2e/helpers.ts`. They build on `test/helpers/repo.ts`, which already strips `CREW_*` and so fixes BUG-004.
  - The same assertions as the pytest cases, with one-for-one names (reworded into sentences is fine), so the 121 can be counted.
- **The secret patterns:** `src/shared/secrets.ts` holds the high-confidence secret patterns. Both `src/hub/core/memory/knowledge.ts` and `src/tools/git-setup/check_secrets.ts` import it. `structure.test.ts` checks that `shared/` imports nothing in `src/`, and allows `tools/*` and `hub/*` to import `shared/`.
- **The hub docs:** `plugins/crew/skills/hub/SKILL.md:131` and both copies of `writing-guide.md:23` (the plugin's and `.crew/templates/`) say `check_structure.mjs`/`check_design.mjs`.
- **The last Python goes:**
  - delete `tests/crew/` (conftest, pytest.ini, both test files);
  - drop the pytest step and uv setup from `.github/workflows/ci.yml`, and the pytest part of `hub.full_suite`;
  - drop `.pytest_cache/` from `.gitignore`;
  - change the README's test section to `npm test` only.

**Out (explicitly not doing):**
- Any behaviour change in the hub. This is a test port.
- The Python stack packs and templates shipped for users' Python projects.
- graphify, which is external.

## Acceptance criteria
- [ ] Each of the 121 pytest cases has a vitest counterpart that asserts the same thing, and the mapping is listed in the plan's Outcome.
- [ ] `npx vitest run test/hub/e2e` passes with `CREW_ROLE`/`CREW_RUN` set in the environment (the BUG-004 regression).
- [ ] `src/shared/secrets.ts` is the one home of the patterns. `knowledge.ts` and `check_secrets.ts` import it, and `structure.test.ts` enforces the `shared/` rule.
- [ ] `git ls-files '*.py'` is empty. `git grep -nE 'pytest|python3'` finds only the Python stack packs and templates and graphify, nothing crew runs.
- [ ] `hub.full_suite` and CI run only Node, and pass. `npm run build` leaves `dist/` in sync.

## Approach
- **Helpers:** `helpers.ts` keeps the Python helpers' names and defaults, so each port reads side by side with its original. `tr()` returns `{ returncode, stdout, stderr }` and never throws, like conftest's `Repo.run`.
- **Concurrency tests:** they become `Promise.all` over 20 `spawn`s.
- **Lock aging:** done with `utimesSync`.
- **YAML front matter in the agents tests:** parsed with the bundled `yaml`.
- **Moving the patterns:** `knowledge.ts` and `check_secrets.ts` already hold identical patterns, except that check_secrets has one more (HubSpot). The union goes into `shared/secrets.ts`, so the hub's knowledge check also gains the HubSpot pattern. That's the one intended behaviour change, and it's noted in the Outcome.
- **Order:** port, then run each file twice: plain, and with `CREW_ROLE=qa CREW_RUN=x`. Delete the pytest files only once all 121 are green.

## Tasks
- [x] T1: `test/hub/e2e/helpers.ts` and `fixtures.ts`, plus the basics section → verify: `cd packages/crew && npx vitest run test/hub/e2e/basics.test.ts`
- [x] T2: idea/focus, items, status and migrate sections → verify: `npx vitest run test/hub/e2e/{idea,items,status,migrate}.test.ts`
- [x] T3: ledger, policy, knowledge and execution sections → verify: `npx vitest run test/hub/e2e/{ledger,policy,knowledge,execution}.test.ts`
- [x] T4: context/roles, review fixes, T1 guard, T2 agents and plan worktrees sections → verify: `npx vitest run test/hub/e2e/{context,review-fixes,guard,agents,worktrees}.test.ts`
- [x] T5: test_team.py → `team.test.ts` → verify: `npx vitest run test/hub/e2e/team.test.ts`
- [x] T6: `src/shared/secrets.ts`, with knowledge and check_secrets importing it and the structure rule → verify: `npx vitest run test/structure.test.ts test/tools/git-setup.test.ts test/hub/e2e/knowledge.test.ts`
- [x] T7: hub SKILL and writing-guide lines → verify: `git grep -nE 'check_(structure|design)\.py' -- plugins .crew/templates` is empty
- [x] T8: delete `tests/crew`; update CI, `full_suite`, `.gitignore` and README → verify: `git ls-files '*.py'` is empty
- [x] T9: the BUG-004 regression and the full suite → verify: `CREW_ROLE=qa CREW_RUN=x npx vitest run test/hub/e2e`, then the `hub.full_suite` command

## Test plan
- **AC1:** the Outcome lists every pytest name next to its vitest file and case, and the counts match (99 + 22).
- **AC2 (BUG-004):** the e2e run with `CREW_ROLE`/`CREW_RUN` set. Before this plan, 12 pytest cases failed exactly that way.
- **AC3:** `structure.test.ts`, plus the git-setup and knowledge tests, which exercise both users of the patterns.
- **AC4:** the greps.
- **AC5:** the `full_suite` command and CI on the PR.

## Rollout & rollback
- n/a for users: tests and dev tooling only, and the plugin's behaviour doesn't change. The one exception is that knowledge entries now also refuse a HubSpot token.
- Rollback: revert the PR.

## Risks & open questions
- **A port that weakens an assertion.** The one-for-one mapping in the Outcome is how review checks this, and QA can spot-check against `git show origin/main:tests/crew/test_hub.py`.
- **Wall-clock time.** The e2e cases spawn `node dist/crew.mjs` many times. vitest runs the files in parallel, and `vitest.config.ts` already allows 30s per test.

## Handoff

_Generated 2026-10-24 by `crew.mjs handoff` from the ledger._

- P-017: Hub tests to vitest; no Python left [in-review] tasks 9/9 — claimed by Arpit Anand (main-node-only)
- last checkpoint 2026-10-24 11:28 at done (ae9c4c6) by Arpit Anand; since then 1 commit(s), 0 uncommitted file(s)
- ✓ vitest test/hub/e2e: 16 files, 121/121, plain and with CREW_ROLE=qa CREW_RUN=x (BUG-004); full vitest 36 files, 250 tests; build idempotent; git ls-files '*.py' empty (AC 1,2,3,4,5) (reported)
- evidence: AC1 ✓ (self), AC2 ✓ (self), AC3 ✓ (self), AC4 ✓ (self), AC5 ✓ (self)

Latest log:
- 2026-10-24: status draft → ready
- 2026-10-24: assigned to the developer role
- 2026-10-24: status ready → in-progress — branch plan/P-017-hub-tests-to-vitest-no-python-left

## Progress log

- 2026-10-24: status draft → ready
- 2026-10-24: assigned to the developer role
- 2026-10-24: status ready → in-progress — branch plan/P-017-hub-tests-to-vitest-no-python-left
- 2026-10-24: status in-progress → in-review

## Outcome
- **What shipped:**
  - `tests/crew/test_hub.py` (99) and `test_team.py` (22) are vitest, in `packages/crew/test/hub/e2e/`: 16 files, each ≤ 300 lines.
    - The shared helpers and drafts are in `helpers.ts` and `fixtures.ts`.
    - The per-section helpers the pytest file defined (ledger events, MCP calls, org playbooks, guard hooks, agent front matter, the project-kit tree) are in `sections.ts`; the team's own helpers are in `team-helpers.ts`.
    - Every case runs against the shipped `dist/crew.mjs`, and `Repo` strips `CREW_*`, which closes BUG-004. The e2e suite passes 121/121 plain and with `CREW_ROLE=qa CREW_RUN=x`.
  - `src/shared/secrets.ts` is the one home of the secret patterns. `knowledge.ts` and `check_secrets.ts` import it, and `structure.test.ts` checks that `shared/` imports nothing else.
  - The hub SKILL and both writing guides name the `.mjs` scripts.
  - **No Python left:**
    - `tests/crew` is deleted;
    - CI drops uv and pytest, and checks that every skill bundle is in sync, not just the hub's;
    - `hub.full_suite` matches CI;
    - `.pytest_cache/` is out of `.gitignore`;
    - the README tests with `npm test` only;
    - the test helper's `CREW_TOOLS=py` mode is gone (`repo.py` → `repo.node`).
  **AC1 mapping** (121 pytest functions, one vitest case each, same assertions; vitest counts 121 `it()`s in `test/hub/e2e/`):
  - `basics.test.ts` ← 15: init_vendors_script_and_templates, vendored_copy_runs_without_the_plugin, refused_command_writes_nothing, usage_errors, no_skeletons_draft_required_and_validated, created_plan_keeps_draft_content_in_template_order, definition_of_ready, too_many_tasks_needs_a_split, illegal_transition_rejected, dependencies_gate_start_and_drive_next, wip_limit_gates_start, check_flags_skeletons_and_leftover_drafts, goal_cannot_activate_without_outcome, ids_do_not_collide_across_branches, created_docs_drop_template_guidance_comments
  - `idea.test.ts` ← 3: idea_is_decided_only_with_checkable_success_criteria, next_asks_for_the_idea_until_it_is_decided, focus_ranks_work_and_flags_off_focus_plans
  - `items.test.ts` ← 7: item_intake_and_triage_gate, new_item_with_priority_is_triaged, goal_breakdown_becomes_triaged_items, plan_links_items_and_item_status_is_derived, bug_plan_needs_regression_test, untriaged_item_blocks_ready, next_ordering_expedites_p0_bugs
  - `idea.test.ts (status)` ← 1: status_report_sections
  - `migrate.test.ts` ← 3: migrate_converts_a_project_kit_folder, migrate_refuses_without_project_or_over_crew, check_points_at_migrate_while_project_folder_remains
  - `ledger.test.ts` ← 7: ledger_lives_in_the_git_common_dir_and_records_moves_and_logs, refused_command_records_no_event, claim_is_visible_and_refused_from_another_worktree, done_releases_the_claim_and_check_compares_ledger_with_files, wip_limit_is_per_run, parallel_writers_lose_no_events, usage_needs_numbers
  - `policy.test.ts` ← 7: policy_show_reports_each_value_and_its_layer, policy_check_refuses_a_project_that_loosens_the_org, org_policy_is_read_at_the_pinned_ref, human_gate_refused_over_mcp_and_approved_on_the_cli, role_gates, budgets_stop_new_work_until_a_human_approves, human_led_triage_needs_a_human
  - `knowledge.test.ts` ← 5: learn_and_recall_round_trip, learn_validates_and_refuses_secrets, supersession_and_rot_checks, review_needs_learnings, recall_reads_playbook_lessons_at_the_pinned_ref
  - `execution.test.ts` ← 5: a_crashed_run_resumes_from_the_ledger, auto_checkpoints_are_cheap, done_needs_independent_evidence_for_every_criterion, human_approval_accepts_evidence_notes, checkpoint_records_reported_results_and_hides_secrets
  - `context.test.ts` ← 6: context_stays_within_budget_in_role_order, an_ask_blocks_only_its_plan, escalations_need_a_human, overlapping_plans_warn_and_drift_is_flagged, role_queues, session_start_hook_runs_context
  - `review-fixes.test.ts, review-fixes-2.test.ts` ← 18: moving_a_plan_in_progress_claims_it_so_it_cannot_approve_itself, a_takeover_keeps_the_first_implementer_dependent, usage_rejects_negative_or_fractional_tokens, a_refused_start_leaves_no_branch_and_can_be_retried, start_carries_uncommitted_hub_files_to_the_plan_branch, a_refusal_after_branching_rolls_the_branch_back, a_torn_ledger_line_does_not_swallow_the_next_event, an_org_human_gates_floor_adds_to_the_mode_gates, only_the_addressed_role_answers, ids_are_not_reused_from_a_subdirectory, an_invalid_secret_pattern_fails_policy_check, migrate_keeps_subfolders_and_binary_files, migrate_refuses_two_files_with_one_target, context_puts_open_questions_first, parallel_writers_take_over_a_stale_lock_once, evidence_follows_the_criterion_not_its_position, the_team_policy_layer_is_enforced, drift_uses_the_configured_default_branch
  - `guard.test.ts` ← 7: identity_flags_win_over_the_environment, guard_leaves_the_main_session_alone, guard_injects_identity_and_refuses_other_claims, injected_identity_reaches_the_ledger, guard_protects_its_own_files_from_every_subagent, guard_applies_the_roles_policy, projects_can_define_their_own_roles
  - `agents.test.ts` ← 7: agents_render_every_role_but_the_humans, agent_frontmatter_follows_the_roles_policy, a_project_role_renders_from_the_generic_template, agents_check_flags_policy_changes, projects_without_agents_get_no_agent_hints, only_the_human_renders_agents, agent_templates_are_valid_and_name_real_commands
  - `worktrees.test.ts` ← 8: plan_worktrees_new_plan_specs_in_its_own_worktree, plan_worktrees_refuse_a_spec_off_the_base_branch, plan_worktrees_are_seen_and_edited_from_main, plan_worktrees_start_checkpoint_and_merge_order, plan_worktrees_developer_agent_has_no_isolation, guard_protects_hub_files_inside_plan_worktrees, merge_order_ignores_plan_worktrees_in_solo_mode, plan_worktrees_start_keeps_an_existing_branchs_progress
  - `team.test.ts, team-2.test.ts` ← 22: staff_proposes_the_ready_non_overlapping_frontier, staff_stays_within_max_agents, the_lifecycle_preset_is_a_policy_layer, a_developer_starts_only_what_the_pm_assigned_to_it, under_the_lifecycle_only_the_pm_completes_and_triages, activating_the_goal_set_waits_for_the_executive, role_gates_on_one_edge, a_goal_is_done_only_when_the_pm_verified_it_and_nothing_is_left, a_stale_claim_is_flagged_and_reassigned, the_third_bounce_goes_to_the_director, attempts_over_the_limit_go_to_the_director, a_paused_team_staffs_and_starts_nothing, kickoff_runs_in_the_ledger, review_sends_changes_back_and_done_needs_an_approval_of_the_current_code, only_qa_checks_count_as_evidence_under_the_lifecycle, raci_under_the_lifecycle, merge_order_puts_dependencies_first, a_plan_waits_for_its_unmerged_dependency, the_runner_stops_on_escalation_pause_budget_and_a_done_goal, notify_runs_the_policy_command_once_per_event, usage_is_captured_from_each_agents_transcript_and_budgets_bite, the_fast_lane_skips_the_architect_but_not_qa
- **Deviations:**
  - **Timeout:** `vitest.config.ts` raised the per-test timeout from 30s to 120s. 16 e2e files run in parallel and each spawns the hub dozens of times, so the slowest team cases passed 30s on a busy machine. They were timeouts, never assertion failures. Two per-test 60s overrides were dropped in favour of the suite default.
  - **Behaviour change:** knowledge entries now also refuse a HubSpot private-app token (`test/shared.test.ts`).
- **Follow-ups:**
  - **The guard compares paths unresolved.** A protected file reached through a symlinked prefix (macOS `/var` → `/private/var`) isn't recognised. The worktree-guard port had to `realpath` the test repo to match pytest's resolved `tmp_path`. Capture it as a BUG on main.
  - **The guard's `paths.protected` matches `.crew/bin/…` in any directory**, so it blocked a QA subagent's scratch project outside this repo. Capture it as a BUG or decision on main.

Learnings: none
