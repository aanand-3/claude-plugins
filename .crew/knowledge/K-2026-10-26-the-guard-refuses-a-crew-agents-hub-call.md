---
id: K-2026-10-26-the-guard-refuses-a-crew-agents-hub-call
type: gotcha
title: The guard refuses a crew agent's hub call whose text contains, anywhere (quoted notes and grep patterns included), the run flag, a CREW_ROLE/RUN/ACTOR/TEAM assignment, or the role flag naming another role; describe those flags in words
scope: packages/crew/src/hub/commands/team/guard.ts
source: 
supersedes:
tier: project
created: 2026-10-26
---

# The guard refuses a crew agent's hub call whose text contains, anywhere (quoted notes and grep patterns included), the run flag, a CREW_ROLE/RUN/ACTOR/TEAM assignment, or the role flag naming another role; describe those flags in words

Re-recorded and narrowed from the unmerged branch claude/crew-bug-001-9d4b01 (3b7246a): guard.ts matches the raw command text before injecting identity, so the refusal still applies on main; the role flag naming the agent's own role passes. Non-agent callers have the P-065 rule (K-2026-10-26-callers-that-arent-crew-agents-the-main).
