---
id: K-2026-10-26-callers-that-arent-crew-agents-the-main
type: decision
title: Callers that aren't crew agents (the main session, other subagents) act as the executive or in no role: the guard refuses, in their hub calls, a role flag naming any role but executive, a run-id flag, CREW_ROLE/RUN/ACTOR/TEAM assignments, and MCP as/run_id other than executive; it injects no identity for them
scope: packages/crew/src/hub/commands/team/guard.ts
source: P-065
supersedes:
tier: project
created: 2026-10-26
---

# Callers that aren't crew agents (the main session, other subagents) act as the executive or in no role: the guard refuses, in their hub calls, a role flag naming any role but executive, a run-id flag, CREW_ROLE/RUN/ACTOR/TEAM assignments, and MCP as/run_id other than executive; it injects no identity for them

BUG-043: role gates were convention only for those callers. Injecting the executive role would make run --until-done refuse (it rejects a set role) and change what next and context show the main session; refusing the claim is enough, since role gates already refuse no role (P-065)
