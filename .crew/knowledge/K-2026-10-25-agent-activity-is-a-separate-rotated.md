---
id: K-2026-10-25-agent-activity-is-a-separate-rotated
type: decision
title: Agent activity is a separate rotated activity.jsonl beside the ledger, written by a PostToolUse hook for crew agents only, storing tool, target and ref but never tool arguments; reports are ledger 'report' events
scope: packages/crew/src/hub/core/memory/activity.ts, packages/crew/src/hub/commands/team/activity.ts, packages/crew/src/hub/core/memory/ledger.ts
source: 
supersedes:
tier: project
created: 2026-10-25
---

# Agent activity is a separate rotated activity.jsonl beside the ledger, written by a PostToolUse hook for crew agents only, storing tool, target and ref but never tool arguments; reports are ledger 'report' events

Keeps the ledger small and authoritative while the feed churns; storing no arguments keeps secrets out; the main session stays the human's own like the guard and usage hook (P-027)
