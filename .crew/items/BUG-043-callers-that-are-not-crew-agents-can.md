---
id: BUG-043
type: bug
title: Callers that are not crew agents can claim any role
status: triaged
severity: S2
priority: P1
goal: G-007
plan:
created: 2026-10-26
closed:
---

# BUG-043: Callers that are not crew agents can claim any role

## Summary
Callers that are not crew agents (the main session, general-purpose subagents) can claim any role with the role flag, a CREW_ROLE variable, a run-id flag, or the MCP `as` field, because `guard.ts:decide` returns early for them. The identity the hub records is whatever the caller types, so a session can act as pm, developer or any other role.

Fix direction: inject the executive identity (MCP: `as: executive`) for the main session and for subagents that are not crew agents; deny any other role flag, run-id flag, `CREW_(ROLE|RUN|ACTOR|TEAM|RUNNER)=` and their `export`/`env` forms. Touches `guard.ts`, `hubcall.ts`; land after P-063. The guard is an accident-preventer, not a security boundary.

## Environment
Commit 0734bc7 and later, local, main checkout, Claude Code main session.

## Steps to reproduce
1. From the main session (or a general-purpose subagent), run an `assign P-060 --to developer` hub call with the role flag set to pm.
2. Alternatively set CREW_ROLE=pm, pass a run-id flag, or call the MCP tool with `as: pm`.

## Expected
The guard denies the role claim, or records the caller as executive.

## Actual
The call goes through and the hub records role pm. Seen in this session: the `assign P-060` call with the pm role flag (0734bc7).

## Evidence
`guard.ts:decide` returns early for callers that are not crew agents. Commit 0734bc7.

## Impact
Any role-gated rule (PM-only assign, developer-only start) can be bypassed by the main session or a non-crew subagent. Severity S2: the role model is unenforced for those callers; the only workaround is convention.

## Notes
Goal G-007. Source draft: .crew/drafts/yes-pm-logs-them-recursive-sparkle.md step 3.
- 2026-10-26: goal hint G-007 (by Arpit Anand)
- 2026-10-26: status new → triaged — priority P1, severity S2
- 2026-10-26: re-triaged: priority P1, severity S2
