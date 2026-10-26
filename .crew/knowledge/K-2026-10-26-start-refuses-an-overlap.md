---
id: K-2026-10-26-start-refuses-an-overlap
type: decision
title: start refuses an overlap with in-progress, blocked or in-review work outside hub.shared unless --force, using the same footprint function as staff
scope: packages/crew/src/hub/commands/work/workflow.ts, packages/crew/src/hub/commands/team/team.ts, packages/crew/src/hub/core/work/footprint.ts
source: 
supersedes:
tier: project
created: 2026-10-26
---

# start refuses an overlap with in-progress, blocked or in-review work outside hub.shared unless --force, using the same footprint function as staff

Re-recorded from the unmerged branch claude/crew-bug-001-9d4b01 (b131393, K-2026-10-24-start-refuses-an-overlap) per Q-0baafa: staff and start must give the same verdict for the same overlap; parallelism comes from disjoint touches. Implemented by FEAT-069.
