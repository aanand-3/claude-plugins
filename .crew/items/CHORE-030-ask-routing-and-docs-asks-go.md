---
id: CHORE-030
type: chore
title: Ask routing and docs: asks go to the Director first
status: done
priority: P2
goal: G-009
plan: P-070
created: 2026-10-26
closed: 2026-10-28
---

# CHORE-030: Ask routing and docs: asks go to the Director first

## Summary
Update the Director agent/playbook and the context-and-memory docs, and make ask routing default to the Director for questions that today go to the executive (the Q-d4e060 / Q-67af6f pattern on P-003). The executive is asked only through the Director's escalate.

## Done when
- [ ] The Director agent/playbook and the context-and-memory docs describe Director-first exceptions.
- [ ] Questions that went straight to the executive route to the Director by default.
- [ ] A targeted test covers the routing; the full suite passes.

## Notes
Goal G-009 (Director-first exceptions). Follows the escalate gate item. Source: Q-24ba43 (c), Q-73467a.
- 2026-10-26: goal hint G-009 (by Arpit Anand)
- 2026-10-26: status new → triaged — priority P2
- 2026-10-28: status triaged → done — delivered by P-070
