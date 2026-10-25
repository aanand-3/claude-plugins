---
id: K-2026-10-25-transcript-usage-events-stay-cumulative
type: decision
title: Transcript usage events stay cumulative snapshots; spend() and liveRuns count each source:transcript event as its delta over the run's previous transcript event (a drop counts in full), manual usage events in full
scope: packages/crew/src/hub/core/memory/ledger.ts, packages/crew/src/hub/core/memory/activity.ts, packages/crew/src/hub/commands/team/autonomy.ts
source: P-049
supersedes:
tier: project
created: 2026-10-25
---

# Transcript usage events stay cumulative snapshots; spend() and liveRuns count each source:transcript event as its delta over the run's previous transcript event (a drop counts in full), manual usage events in full

BUG-027: resumed runs were counted again at every stop. Read-time deltas fix the ledger events already recorded without migrating the append-only ledger, and a lost snapshot never undercounts; usage --hook is unchanged (P-049)
