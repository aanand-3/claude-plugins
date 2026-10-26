---
id: BUG-052
type: bug
title: Hub cannot record a PM-accepted not-reproduced AC; red AC drives fix dispatch (P-077 AC4)
status: new
severity:
priority:
goal:
plan:
created: 2026-10-26
closed:
---

# BUG-052: Hub cannot record a PM-accepted not-reproduced AC; red AC drives fix dispatch (P-077 AC4)

## Summary
The hub cannot record an acceptance criterion as "not reproduced / accepted by PM". `checkpoint --result` takes only pass|fail, so a PM-accepted unrunnable criterion (P-077 AC4, Q-ddf44d) stays red and dispatch keeps sending the plan back to the developer ("fix").

## Environment

## Steps to reproduce
1. P-077 AC4 needs a 16-process CPU load that the permission policy denies agents.
2. PM answers Q-ddf44d: accept AC4 as not reproduced, no developer retry.
3. QA runs `checkpoint P-077 --verify ... --result not-reproduced --ac 4` -> `error: --result: invalid choice (choose from pass, fail)`.
4. `resume P-077` still shows `evidence: AC4 ✗`; dispatch still says fix.

## Expected
A result (e.g. waived/not-reproduced) that counts as non-blocking for acceptance and dispatch when the PM has accepted it, never as a pass.

## Actual
Only pass or fail; the stale red AC4 drives fix dispatch.

## Evidence

## Impact

## Notes
