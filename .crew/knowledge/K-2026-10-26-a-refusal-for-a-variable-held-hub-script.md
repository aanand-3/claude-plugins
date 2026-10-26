---
id: K-2026-10-26-a-refusal-for-a-variable-held-hub-script
type: decision
title: A refusal for a variable-held hub script needs no whole-command input: refusal() only runs after withIdentity has seen crew.mjs in the command, so a runtime head (node/bun/deno) whose script word is a $VAR is refused outright; no assignment tracking
scope: packages/crew/src/hub/commands/team/hubcall.ts
source: 
supersedes:
tier: project
created: 2026-10-26
---

# A refusal for a variable-held hub script needs no whole-command input: refusal() only runs after withIdentity has seen crew.mjs in the command, so a runtime head (node/bun/deno) whose script word is a $VAR is refused outright; no assignment tracking

P-050 / BUG-031: C=...crew.mjs; node $C ... split across simple commands ran unattributed; the early return already supplies the fact, keeping hubcall.ts minimal
