---
id: K-2026-10-26-a-run-ends-by-its-own-usage-report-event
type: decision
title: A run ends by its own usage/report event, by an end-run event naming it (end-run RUN --note, director or executive), or when its last activity's ref is a closed plan or item; liveRuns takes a closed-ref predicate from running()
scope: packages/crew/src/hub/core/memory/activity.ts, packages/crew/src/hub/commands/team/activity.ts, packages/crew/src/hub/commands/team/liveness.ts
source: 
supersedes:
tier: project
created: 2026-10-26
---

# A run ends by its own usage/report event, by an end-run event naming it (end-run RUN --note, director or executive), or when its last activity's ref is a closed plan or item; liveRuns takes a closed-ref predicate from running()

TaskStop fires no hook, so a stopped run never writes its closing event and stayed live for 24h (BUG-034, P-053)
