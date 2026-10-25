---
id: P-041
title: Test suite removes its temp dirs
goal: G-007
items: BUG-025
touches: packages/crew/test/helpers/**, packages/crew/test/setup/**, packages/crew/vitest.config.ts, packages/crew/test/activity.test.ts, packages/crew/test/codegraph.test.ts, packages/crew/test/design.test.ts, packages/crew/test/dist.test.ts, packages/crew/test/hub-worktrees.test.ts, packages/crew/test/ledger.test.ts, packages/crew/test/mcp.test.ts, packages/crew/test/upgrade-hints.test.ts, packages/crew/test/view.test.ts, packages/crew/test/tools/design.test.ts, packages/crew/test/tools/research.test.ts, packages/crew/test/hub/e2e/guard.test.ts
depends_on:
status: draft
branch: plan/P-041-test-suite-removes-its-temp-dirs
pr:
created: 2026-10-25
started:
completed:
---

# P-041: Test suite removes its temp dirs

## Context
BUG-025 (S1, P1, goal G-007): the crew test suite creates mkdtemp dirs and never removes them. Repo.create
(packages/crew/test/helpers/repo.ts:36, prefix crew-tools-*) makes one real git repo per test; other tests make
hub-*, crew-later-*, wada-*, research-* dirs. On 2026-10-25 the macOS temp dir held 7,000+ of them (~19 GB), the
disk hit ENOSPC and the whole team stopped (P-028's full suite, P-024, P-038). Parallel plans multiply the leak.
Autonomous parallel delivery (G-007) cannot run while one suite run can fill the disk.

## Scope
**In:**
- The test helpers (packages/crew/test/helpers/**) remove every temp dir they create.
- A vitest setup/teardown (new file under packages/crew/test/setup/, wired in packages/crew/vitest.config.ts if
  needed) that removes the temp dirs created during the run.
- The individual test files that call mkdtemp directly (listed in touches) route through the helper or the teardown.

**Out (explicitly not doing):**
- Any product code (packages/crew/src/**, plugins/**). If a crew-git-* dir comes from product code, capture a
  separate item instead of fixing it here.
- packages/crew/test/hub/e2e/sparse-worktrees.test.ts (P-024) and packages/crew/test/hub/refresh-bin.test.ts
  (P-038): the shared teardown must cover them without editing them.
- Deleting the leftovers already on the machine (a one-off manual cleanup, not this plan).

## Acceptance criteria
- [ ] After a full suite run of packages/crew, no new crew-tools-*, hub-*, crew-later-* or crew-git-* dirs remain
      in os.tmpdir() (count before vs after the run is equal).
- [ ] Repo.create's dirs are removed when the test that made them ends (or at the latest when its file ends), so a
      single file's run leaves nothing behind.
- [ ] A regression test fails if a helper-created temp dir survives teardown.
- [ ] No file under packages/crew/src/** or plugins/** changes, and the plan touches neither P-024's nor P-038's files.

## Approach
<!-- Architect -->

## Tasks
<!-- Architect -->

## Test plan
<!-- Architect -->

## Rollout & rollback
n/a — test-only change; revert the commit to back out.

## Risks & open questions
- No source under packages/ or plugins/ uses the crew-git-* prefix today; the Architect should find which code made
  those dirs (a stale build, another package, or product code). If it is product code, it is a separate item.
- Keeping a dir on failure for debugging is optional; decide in the spec.

## Handoff

## Progress log

## Outcome
