---
id: K-2026-10-26-packages-crew-scripts-sample-project-mjs
type: gotcha
title: packages/crew/scripts/sample-project.mjs walks its plans through the plan lifecycle (start, review, accept, squash, done), and test/view.test.ts and the UI tests build their sample from it: a change to PLAN_FLOW or a gate must update it too
scope: packages/crew/src/hub/core/work/model.ts, packages/crew/src/hub/commands/work/workflow.ts, packages/crew/scripts/sample-project.mjs
source: P-032
supersedes:
tier: project
created: 2026-10-26
---

# packages/crew/scripts/sample-project.mjs walks its plans through the plan lifecycle (start, review, accept, squash, done), and test/view.test.ts and the UI tests build their sample from it: a change to PLAN_FLOW or a gate must update it too

P-032 removed in-review to done; the script's move done failed and broke view.test.ts, outside the plan's touches
