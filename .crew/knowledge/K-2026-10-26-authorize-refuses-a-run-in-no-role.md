---
id: K-2026-10-26-authorize-refuses-a-run-in-no-role
type: gotcha
title: authorize() refuses a run in no role on any role gate; a gate meant to let the executive and a role-less human through must pass also: ["executive", ""]
scope: packages/crew/src/hub/commands/work/**
source: 
supersedes:
tier: project
created: 2026-10-26
---

# authorize() refuses a run in no role on any role gate; a gate meant to let the executive and a role-less human through must pass also: ["executive", ""]

P-055's regoal gate: the spec said humans pass 'as with other role gates', but authorize's check (mine !== role && !also.includes(mine ?? '')) fails CREW_ROLE-less runs
