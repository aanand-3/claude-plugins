---
id: K-2026-10-23-every-run-that-claimed-or-started-a-plan
type: decision
title: Every run that claimed or started a plan is an implementer
scope: packages/crew/src/hub/commands/work/execution.ts
source: FEAT-001
supersedes:
tier: project
created: 2026-10-23
---

# Every run that claimed or started a plan is an implementer

Review finding: a plan moved to in-progress with move (not start) had no claim, so a run could verify and approve its own work. move into in-progress now claims, and evidence must come from a run outside the full implementer set (which also covers takeovers).
