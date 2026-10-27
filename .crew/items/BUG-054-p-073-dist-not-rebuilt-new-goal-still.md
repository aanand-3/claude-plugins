---
id: BUG-054
type: bug
title: P-073 dist not rebuilt: new-goal still splits at colon
status: new
severity: S2
priority: P1
goal:
plan:
created: 2026-10-27
closed:
---

# BUG-054: P-073 dist not rebuilt: new-goal still splits at colon

## Summary
P-073 changes `packages/crew/src/hub/commands/work/backlog.ts`, but the committed `plugins/crew/skills/hub/dist/crew.mjs` still holds the old split (`/\s+[—–-]\s+|:\s/`, dist line ~12095). Hub e2e tests run the built dist, so the new BUG-045 test fails and the shipped hub still has BUG-045.

## Environment
P-073 worktree, commit a301d41.

## Steps to reproduce
1. cd packages/crew && npx vitest run test/hub/e2e/items.test.ts
2. Or run the worktree dist `new-goal` on a draft whose Breakdown has `- SPIKE: Hook facts — answers`.

## Expected
SPIKE-001 titled "Hook facts"; Launch policy line gives FEAT titled "Launch policy".

## Actual
Test fails with "no SPIKE-001 in .crew/items"; the dist creates FEAT-001-spike (title "SPIKE") and FEAT-002-launch-policy.

## Evidence
items.test.ts: 8 passed, 1 failed (a breakdown line splits only at a spaced dash and takes a type prefix (BUG-045)).
grep of the dist shows the old regex at line 12095 and no `SPIKE` prefix handling.

## Impact
AC1-AC5 cannot be verified; the fix is not in the shipped bundle. Fix: run hub.build and commit the regenerated dist (crew.mjs and mcp.mjs).

## Notes
Found testing P-073.
