---
id: K-2026-10-25-dispatch-commands-team-dispatch-ts-is
type: decision
title: dispatch (commands/team/dispatch.ts) is a pure ordered table over the existing gates and helpers (questions, Director exceptions, urgent bugs, release, in-review, goal closure, in-progress, ready, triage, spec frontier, stall), one entry per document, cut to budgets.max_agents; the goal.done gate moves to the PM in the lifecycle preset; P-031 owns director.md and pm.md, so the goal queue (P-033) adds no agent text
scope: packages/crew/src/hub/commands/team/dispatch.ts, packages/crew/src/hub/core/team/presets.ts, plugins/crew/skills/hub/agents/director.md, plugins/crew/skills/hub/agents/pm.md, plugins/crew/skills/team/SKILL.md
source: P-031
supersedes:
tier: project
created: 2026-10-25
---

# dispatch (commands/team/dispatch.ts) is a pure ordered table over the existing gates and helpers (questions, Director exceptions, urgent bugs, release, in-review, goal closure, in-progress, ready, triage, spec frontier, stall), one entry per document, cut to budgets.max_agents; the goal.done gate moves to the PM in the lifecycle preset; P-031 owns director.md and pm.md, so the goal queue (P-033) adds no agent text

Routing is mechanical given state and gates (design W2-a); a subagent can't launch subagents, so /crew:team executes dispatch; one owner for director.md removes the W2-a/W2-b overlap; goal.done to pm is the human's design choice (2026-10-25), not a separate reserved step
