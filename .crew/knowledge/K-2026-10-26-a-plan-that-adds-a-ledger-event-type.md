---
id: K-2026-10-26-a-plan-that-adds-a-ledger-event-type
type: gotcha
title: A plan that adds a ledger event type must also touch src/docs/diagrams.ts (EVENT_NOTES is Record<EventType,string>), src/hub/commands/memory/ledger.ts (DETAIL, or ledger --type rejects it) and plugins/crew/docs/context-and-memory.md (ledger-events block)
scope: packages/crew/src/hub/core/memory/ledger.ts
source: 
supersedes:
tier: project
created: 2026-10-26
---

# A plan that adds a ledger event type must also touch src/docs/diagrams.ts (EVENT_NOTES is Record<EventType,string>), src/hub/commands/memory/ledger.ts (DETAIL, or ledger --type rejects it) and plugins/crew/docs/context-and-memory.md (ledger-events block)

P-053's end-run broke typecheck and npm run build's docs step with those files outside touches
