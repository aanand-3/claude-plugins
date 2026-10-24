---
id: K-2026-10-23-a-move-made-on-behalf-of-another-step
type: gotcha
title: A move made on behalf of another step must not make its run an implementer
scope: packages/crew/src/hub/commands/work/execution.ts, packages/crew/src/hub/commands/work/review.ts
source: 
supersedes:
tier: project
created: 2026-10-23
---

# A move made on behalf of another step must not make its run an implementer

review --changes moves the plan back to in-progress as the architect; implementers() counted every move to in-progress, so the reviewer could no longer review the plan (and QA evidence from such a run would stop counting). Moves record via: <step> and implementers() skips them.
