---
id: BUG-036
type: bug
title: Since P-051 Release can't resolve merge conflicts: its Bash writes are bound to paths.write .crew/drafts/**
status: triaged
severity: S3
priority: P2
goal: G-007
plan: P-052
created: 2026-10-26
closed:
---

# BUG-036: Since P-051 Release can't resolve merge conflicts: its Bash writes are bound to paths.write .crew/drafts/**

## Summary
2026-10-26: Release merging P-032 hit one trivial conflict (core/team/policy.ts NOTIFY_ON/ACTIONS, keep both sides). Edit was refused as before, and now sed -i through Bash too (P-051 binds Bash writes to paths.write). Release aborted the merge. Before P-051 Release resolved conflicts and committed rebuilt dist via Bash. Routed this time to the developer (resolve + checkpoint, re-review). Needs a decision: widen release paths.write to plan worktrees (policy, executive), or route conflict resolution to the developer by design (P-032 land bounces on conflict already).

## Environment
This repo (crew hub), after P-051: the guard binds every role's Bash writes, not only Edit/Write, to that role's `paths.write`. Release's `paths.write` is `.crew/drafts/**`.

## Steps to reproduce
1. Accept a plan whose branch conflicts with the base branch (2026-10-26: P-032 on `packages/crew/src/hub/core/team/policy.ts`).
2. As Release, start the merge in the plan's worktree and try to resolve the conflict, with Edit or with Bash (`sed -i …`, `git checkout --ours/--theirs …` followed by an edit).
3. Note that the guard refuses each write to the conflicted file.

## Expected
Conflict resolution has one defined owner, and the flow gets there without an ad-hoc reroute. Either Release can resolve the conflict and finish the land, or the conflict goes back to the developer as part of the flow.

## Actual
- The guard refuses Release's Edit and Bash writes to the conflicted file because they are outside `.crew/drafts/**`. Release aborted the P-032 merge, and the conflict was routed to the developer by hand (resolve, checkpoint, re-review).
- Before P-051, Release resolved such conflicts and committed the rebuilt dist through Bash.
- `land` already bounces a conflicting plan to the developer by itself. On 2026-10-26 it moved P-045 from accepted back to in-progress on a conflict in `plugins/crew/skills/hub/references/model.md` (hub 2f7828d: "land: merging main conflicts in …"), and the developer resolved it in da967e7.

## Evidence
- hub 2f7828d (`chore(hub): land P-045`): the plan log line `accepted → in-progress — land: merging main conflicts in plugins/crew/skills/hub/references/model.md`.
- da967e7: the developer's merge of main into `plan/P-045-…`, which resolves that conflict.
- The P-032 land on 2026-10-26: Edit and `sed -i` refused by the guard, merge aborted (see Summary).

## Impact
Every conflicting land costs a round trip: the developer resolves, checkpoints and needs a new review approval before the PM accepts again. Nothing is lost or merged wrongly; the guard fails closed. Suggested severity S3: it slows delivery, has a working path (land's bounce), and corrupts nothing.

Open choice (the executive's decision, policy):
- **A. Widen Release's `paths.write`** to cover conflict resolution in plan worktrees. Release resolves trivial conflicts itself, with no bounce or re-review. The cost is that Release edits code that no review has covered.
- **B. Keep conflict resolution with the developer, as `land` does now.** Release never edits code, and the review stays valid for the code that lands. The cost is a round trip per conflict. Release's instructions would then say to run `land` (or bounce) instead of resolving.

## Notes
- 2026-10-26: status new → triaged — priority P2, severity S3
