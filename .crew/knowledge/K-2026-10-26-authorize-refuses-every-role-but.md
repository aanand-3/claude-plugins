---
id: K-2026-10-26-authorize-refuses-every-role-but
type: gotcha
title: authorize() refuses every role but the gate's on a role gate, the executive and a run in no role included. Its also argument widens a gate only on a deliberate decision (the fast lane's pm on plan.ready); never add executive or the empty role to pass a human through: re-goal (item.regoaled, plan.regoaled) is the PM's alone, and the executive asks the PM. A capture that applies a gated step at intake (new-item --priority) must mirror the same check (role && mine !== role) and leave the item new, or the item is created and the command still fails.
scope: packages/crew/src/hub/commands/work/**
source: 
supersedes: K-2026-10-26-authorize-refuses-a-run-in-no-role
tier: project
created: 2026-10-26
---

# authorize() refuses every role but the gate's on a role gate, the executive and a run in no role included. Its also argument widens a gate only on a deliberate decision (the fast lane's pm on plan.ready); never add executive or the empty role to pass a human through: re-goal (item.regoaled, plan.regoaled) is the PM's alone, and the executive asks the PM. A capture that applies a gated step at intake (new-item --priority) must mirror the same check (role && mine !== role) and leave the item new, or the item is created and the command still fails.

P-055 review: the executive ruled re-goal PM-only, so the also pass for executive and no role was removed; the intake check that let them through created the item and then failed in authorize (reproduced under preset lifecycle).
