---
id: K-2026-10-26-checkpoint-step-tn-and-handoff-never
type: gotcha
title: checkpoint --step Tn and handoff never tick a plan's task boxes; tick them by editing '- [ ]' to '- [x]' in the plan file under .crew/plans/, then run handoff so the hub commits it. The PM's accept refuses unchecked tasks.
scope: .crew/plans/**
source: P-060
supersedes:
tier: project
created: 2026-10-26
---

# checkpoint --step Tn and handoff never tick a plan's task boxes; tick them by editing '- [ ]' to '- [x]' in the plan file under .crew/plans/, then run handoff so the hub commits it. The PM's accept refuses unchecked tasks.

P-060 sat in review with tasks 0/5 although every step was checkpointed and QA's evidence was in (Q-ff5ed7)
