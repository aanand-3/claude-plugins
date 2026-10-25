---
id: K-2026-10-25-keep-ac6-init-writes-plan-worktrees-true
type: decision
title: Keep AC6 (init writes plan_worktrees: true; that default is the point of FEAT-044). Fix the tests in the shared helper: init() in test/hub/e2e/helpers.ts gets a defaults = false option; it notes which of .crew/config.yaml and .crew/policy.yaml exist before running init and afterwards removes only those init created, unless defaults: true. A file a test wrote before init is never removed. The doctor suite's init tests use tr(repo, 'init') directly or defaults: true. sections.ts needs no change (it calls the helper). Touches += test/hub/e2e/helpers.ts, basics.test.ts (it re-runs init directly at two points; adjust only if they fail) and test/mcp.test.ts. New AC10 and T7 in the spec.
scope: packages/crew/test/hub/e2e/helpers.ts, packages/crew/src/hub/commands/work/setup.ts
source: P-036
supersedes:
tier: project
created: 2026-10-25
---

# Keep AC6 (init writes plan_worktrees: true; that default is the point of FEAT-044). Fix the tests in the shared helper: init() in test/hub/e2e/helpers.ts gets a defaults = false option; it notes which of .crew/config.yaml and .crew/policy.yaml exist before running init and afterwards removes only those init created, unless defaults: true. A file a test wrote before init is never removed. The doctor suite's init tests use tr(repo, 'init') directly or defaults: true. sections.ts needs no change (it calls the helper). Touches += test/hub/e2e/helpers.ts, basics.test.ts (it re-runs init directly at two points; adjust only if they fail) and test/mcp.test.ts. New AC10 and T7 in the spec.

Answer to Q-f37203 (architect): init now writes .crew/config.yaml with plan_worktrees: true (AC6), so every e2e test that runs init without writing its own config switches to plan-worktree mode: 7 tests fail in basics, worktrees and branch-copies (AC9), e.g. new-plan now opens a worktree and prints its path, branches already exist, start refuses main. ~14 test files call init. Proposed fix: the shared test helper init (test/hub/e2e/helpers.ts, and sections.ts if needed) removes the generated config.yaml/policy.yaml defaults after init unless the test asks for them, so the suites keep today's branch-per-plan default; add those helper files to touches. Alternatively the default could be plan_worktrees: false with a comment (changes AC6). Which do you want?
