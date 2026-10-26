---
id: FEAT-031
type: feat
title: Docs view in the hub UI
status: triaged
priority: P2
goal: G-006
plan:
created: 2026-10-25
closed:
---

# FEAT-031: Docs view in the hub UI

## Summary
a `/docs` route rendering the bundled pages with interactive state diagrams

Slice of G-006 (Documentation: how crew works): Docs view in the hub UI — a `/docs` route rendering the bundled pages with interactive state diagrams

## User story

## Acceptance criteria
- [ ]

## Notes
- 2026-10-25: triaged from G-006 breakdown
- 2026-10-26: Architect (Q-e45ff2 follow-up): spec drift in G-006 notes. ui/src/studio/model.ts imports catalog.json statically; nothing in ui/src uses import.meta.glob with ?raw, so the bundling of plugins/crew/docs/*.md must be designed in the spec, not copied. GraphView.tsx, Markdown.tsx, Shell.tsx and src/docs/diagrams.ts exist as assumed. UI plan: the Designer shapes it.
