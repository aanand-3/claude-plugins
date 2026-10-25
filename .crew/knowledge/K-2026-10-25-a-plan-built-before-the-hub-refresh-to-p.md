---
id: K-2026-10-25-a-plan-built-before-the-hub-refresh-to-p
type: gotcha
title: A plan built before the hub refresh to P-028 keeps its code uncommitted; the first non-auto checkpoint after the approving review (often QA's) commits it on the plan branch and makes done refuse until the Architect approves again
scope: packages/crew/src/hub/commands/work/review.ts, packages/crew/src/hub/commands/work/execution.ts
source: 
supersedes:
tier: project
created: 2026-10-25
---

# A plan built before the hub refresh to P-028 keeps its code uncommitted; the first non-auto checkpoint after the approving review (often QA's) commits it on the plan branch and makes done refuse until the Architect approves again

Hit by P-041 and P-024 on 2026-10-25 right after .crew/bin was refreshed (ae10c28); ask the Architect to re-approve after QA instead of using --force
