---
id: BUG-024
type: bug
title: An item does not close when its plan reaches done; items have no closing status
status: triaged
severity: S3
priority: P2
goal: G-007
plan: P-045
created: 2026-10-25
closed:
---

# BUG-024: An item does not close when its plan reaches done; items have no closing status

## Summary
An item does not close when its plan reaches done, and items have no closing status. BUG-005 was delivered by P-018 (done 2026-10-24, QA evidence for AC1 passed, merged as d73e417), yet BUG-005 still reads `status: triaged` with `closed:` empty. `move BUG-005 done` is refused, since items accept only new, triaged, wontfix and duplicate. A finished spike (SPIKE-005, whose findings are complete) can't be closed either. So delivered work stays open in the backlog, `next` and `check`.

## Environment
This repo, main after P-026; hub vendored in .crew/bin (refreshed after P-026).

## Steps to reproduce
1. `node .crew/bin/crew.mjs move BUG-005 done --note "Delivered by P-018"` on main.
2. Look at `.crew/items/BUG-005-merge-order-lists-squash-merged-plans-as.md`: `plan: P-018` (P-018 is `status: done`), item `status: triaged`, `closed:` empty.

## Expected
When a plan moves to done, its items close (a closing status such as done, with `closed:` set). An item delivered by a plan that is already done, or a spike whose findings are complete, can be closed by the PM.

## Actual
Step 1 prints `Unknown status 'done'. Valid: new, triaged, wontfix, duplicate`. BUG-005 stays triaged with P-018 done.

## Evidence
Output of step 1 above; BUG-005's log entries of 2026-10-25.

## Impact
Delivered items and finished spikes look open, so triage queues and goal progress over-count open work. Workaround: none within the PM role (closing as wontfix or duplicate would be wrong).

## Notes
- 2026-10-25: status new → triaged — priority P2, severity S3
