---
id: BUG-059
type: bug
title: Batch land stops at refresh-bin: the candidate worktree is not a plan's worktree
status: done
severity: S2
priority: P0
goal: G-007
plan: P-093
created: 2026-10-28
closed: 2026-10-28
origin: P-079
---

# BUG-059: Batch land stops at refresh-bin: the candidate worktree is not a plan's worktree

## Summary
A batch `land` stops before its suite run in any repo that sets `release.refresh_bin`. The rebuild step refreshes `.crew/bin` inside the batch's candidate worktree, which is on a detached HEAD. `refreshBin` refuses any checkout that isn't a plan's worktree.

## Environment
Main at 0a2fb438, right after P-079 (batch landing, ca71ee4) landed. This repo's `.crew/policy.yaml` sets `release.refresh_bin: { from: plugins/crew/skills/hub/dist, files: [crew.mjs, ui.html] }`.

## Steps to reproduce
1. Have two or more accepted plans that don't conflict with main, in a repo whose policy sets `release.refresh_bin`.
2. Run `node .crew/bin/crew.mjs land --as release` (no plan argument, so it takes the batch path).

## Expected
The candidate is rebuilt, `.crew/bin` is refreshed in the candidate where the policy asks for it, and the batch gets its single full-suite run.

## Actual
```
land: the batch P-069+P-070+P-066+P-072+P-071+P-073+P-075+P-082+P-074+P-085+P-068+P-080 did not land — refresh-bin: this checkout (branch 'none') is not a plan's worktree; run it in the plan's worktree; its plans stay accepted with their worktrees; run `land` again
```
Nothing landed, and the candidate worktree was cleaned up. Before the stop, three plans left the batch with real conflicts against main (logged on each plan):
- P-066: .crew/bin/crew.mjs, suite.ts and the dist bundles;
- P-071: land.test.ts;
- P-068: qa.md.

## Evidence
- `land-steps.ts:67-68`: `rebuild` calls `refreshBin(store, dir, false)` whenever `release.refresh_bin` is set.
- `release.ts:114-116`: `refreshBin` takes the current branch and fails unless it belongs to a plan. The candidate worktree's branch is empty, so this always fails in a batch.
- `land-batch.test.ts` never sets `release.refresh_bin`, so the 12 cases didn't exercise this.

## Impact
Batch landing (FEAT-071 / P-079) can't land anything in this repo. The workaround is `land P-###` one plan at a time, a full suite each.

## Notes
- **Fix direction for the Architect:** keep the role and plan check for the `refresh-bin` command, and let the land steps refresh the candidate through an internal path that skips the plan-branch check. Or check for a plan or a land candidate.
- **Regression test:** a batch case with `release.refresh_bin` set.
- Found by the executive's batch land on 2026-10-28 (hub 390dca73).
- 2026-10-28: goal hint G-007 (by Arpit Anand)
- 2026-10-28: status new → triaged — priority P0, severity S2
- 2026-10-28: re-goaled G-007 → G-007 by Arpit Anand: BUG-059 is on G-007; the fix unblocks batch landing (FEAT-071)
- 2026-10-28: status triaged → done — delivered by P-093
