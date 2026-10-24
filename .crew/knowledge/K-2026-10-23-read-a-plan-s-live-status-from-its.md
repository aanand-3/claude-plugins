---
id: K-2026-10-23-read-a-plan-s-live-status-from-its
type: gotcha
title: Read a plan's live status from its branch, not main's copy
scope: packages/crew/src/hub/commands/views/checks.ts, packages/crew/src/hub/core/store.ts
source: 
supersedes:
tier: project
created: 2026-10-23
---

# Read a plan's live status from its branch, not main's copy

On main a started plan still says ready; the live status is on plan/*. store.plans(true) merges the branch copies; checks about active work must use it (the overlap check missed P-006/P-008 until it did).
