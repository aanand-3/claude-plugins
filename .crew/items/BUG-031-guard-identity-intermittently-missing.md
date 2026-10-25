---
id: BUG-031
type: bug
title: Guard identity intermittently missing on subagent hub calls
status: new
severity: S2
priority: P1
goal: G-007
plan:
created: 2026-10-26
closed:
---

# BUG-031: Guard identity intermittently missing on subagent hub calls

## Summary
Some crew-agent crew.mjs calls reach the ledger with role null and run wt:<worktree> instead of the injected --as/--run-id. P-049 QA: AC1 and AC4 checkpoints recorded as qa, but identical direct calls for AC2, AC3, AC5 and AC6 (2026-10-25T20:10-20:11Z, agent crew-qa) recorded as wt:P-049-usage-counts-a-resumed-run-once-2e319e6a with role null, so evidence shows (self) and P-049 cannot complete. Earlier P-049 and P-034 checkpoints did the same, and the P-036 and P-049 developers each had a move refused once for no role. Feeding the guard the same PreToolUse payload by hand returns the correct updatedInput every time, so the hook's rewrite is sometimes not applied or the hook fails open (the settings hook ends with exit 0, so a failed or slow guard lets the call run unattributed). Several happened while a full suite was running. Expect: a subagent's hub call either carries its identity or is refused; never recorded as a role-less wt run.

## Environment

## Steps to reproduce
1.

## Expected

## Actual

## Evidence

## Impact

## Notes
