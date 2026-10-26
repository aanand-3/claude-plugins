---
id: K-2026-10-26-director-first-asks-ask-to-executive
type: decision
title: Director-first asks: ask --to executive from a role other than director/executive is recorded to: director (routed, with a note); the Director's own ask --to executive, a role-less or executive run, and escalate are unchanged. FEAT-065 gates escalate separately.
scope: packages/crew/src/hub/commands/team/questions.ts, plugins/crew/skills/hub/agents/director.md
source: P-070
supersedes:
tier: project
created: 2026-10-26
---

# Director-first asks: ask --to executive from a role other than director/executive is recorded to: director (routed, with a note); the Director's own ask --to executive, a role-less or executive run, and escalate are unchanged. FEAT-065 gates escalate separately.

CHORE-030 / Q-24ba43: the executive should see only what the Director escalates; routing keeps the role's question instead of refusing it, and leaves the escalate gate to FEAT-065 so the two plans share questions.ts without depending on each other
