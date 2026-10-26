---
id: CHORE-026
type: chore
title: Docs: show reserved decisions (idea.decided, idea.killed) as human-gated in the generated lifecycle diagrams
status: triaged
priority: P3
goal: G-006
plan:
created: 2026-10-26
closed:
---

# CHORE-026: Docs: show reserved decisions (idea.decided, idea.killed) as human-gated in the generated lifecycle diagrams

## Summary
P-025's diagrams.ts labels edges from the lifecycle preset's role_gates and human_gates only; the built-in reserved list lives in policy.ts's unexported BUILT_IN (out of P-025's touches, and policy.ts reads files, which the UI can't import), so the idea flow's decided/killed edges show no human. Move the built-in reserved list into a pure core module and read it in diagrams.ts. (G-006)

## Done when
- [ ]

## Notes
- 2026-10-26: status new → triaged — priority P3
