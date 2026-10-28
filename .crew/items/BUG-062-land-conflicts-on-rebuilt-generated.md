---
id: BUG-062
type: bug
title: land conflicts on rebuilt generated and .crew/bin files it would regenerate anyway
status: triaged
severity: S2
priority: P1
goal: G-007
plan:
created: 2026-10-28
closed:
origin: P-066
---

# BUG-062: land conflicts on rebuilt generated and .crew/bin files it would regenerate anyway

## Summary

## Environment

## Steps to reproduce
1. Land plan P-066 once so land step 3 merges main into plan/P-066 and step 4 commits the rebuilt dist files and the refresh_bin copy .crew/bin/crew.mjs on the branch (02f1d52c); the land then bounces.
2. Land other plans so main's dist and .crew/bin change.
3. Run land P-066 again.

## Expected
The merge of main takes the base's generated and .crew/bin files (step 4 rebuilds them from the merged code anyway); only real code conflicts bounce.

## Actual
The land bounces on conflicts in .crew/bin/crew.mjs, plugins/crew/skills/hub/dist/crew.mjs and dist/mcp.mjs. .crew/bin is in paths.protected, so the developer cannot resolve it, and while the merge is open the worktree's hub CLI has conflict markers and crashes. Every later land of a once-rebuilt branch hits this.

## Evidence

## Impact

## Fix
In packages/crew/src/hub/commands/work/land-steps.ts prepare(), step 2: before merging, reset every generated file (git.generated) and every refresh_bin target (.crew/bin/<files>) that differs between HEAD and merge-base(HEAD, from) to its merge-base version (git rm when absent there), committed on the branch as chore(P-###): reset generated files. The merge then cannot conflict on them and step 4 rebuilds them. Test: a land e2e case where a branch carries a rebuilt dist and .crew/bin and main then changes both lands without a conflict.

## Notes
- 2026-10-28: status new → triaged — priority P1, severity S2
