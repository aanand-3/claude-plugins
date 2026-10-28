---
id: K-2026-10-28-dispatch-gives-release-one-batch-entry
type: decision
title: Dispatch gives Release one batch entry (land with no ID) when two or more non-legacy plans are queued and none is held, asked or behind one that is; otherwise the single path land P-### for the first free plan
scope: packages/crew/src/hub/commands/team/dispatch.ts, plugins/crew/skills/hub/agents/release.md
source: 
supersedes:
tier: project
created: 2026-10-28
---

# Dispatch gives Release one batch entry (land with no ID) when two or more non-legacy plans are queued and none is held, asked or behind one that is; otherwise the single path land P-### for the first free plan

land with no ID ignores escalation holds and blocking questions, so dispatch is where holds keep a plan out of a batch (BUG-060, P-094)
