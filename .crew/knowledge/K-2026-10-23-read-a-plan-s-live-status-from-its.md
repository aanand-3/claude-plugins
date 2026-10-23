---
id: K-2026-10-23-read-a-plan-s-live-status-from-its
type: gotcha
title: Read a plan's live status from its branch, not main's copy
scope: packages/hub/src/commands/checks.ts, packages/hub/src/core/store.ts
source: 
supersedes:
tier: project
created: 2026-10-23
---

# Read a plan's live status from its branch, not main's copy

On main a started plan still says ready; the live status is on plan/*. store.plans(true) merges the branch copies; checks about active work must use it (the overlap check missed P-006/P-008 until it did).
