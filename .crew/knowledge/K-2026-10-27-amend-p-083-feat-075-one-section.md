---
id: K-2026-10-27-amend-p-083-feat-075-one-section
type: decision
title: amend (P-083, FEAT-075): one section of an item or goal is replaced from a draft through the hub, gated by new off-flow actions item.amended and goal.amended (lifecycle: pm); the Architect is let through (authorize also) only for an item's Acceptance criteria while the item has no plan or a draft plan; an active goal's Outcome, Scope, Acceptance criteria and Success metrics need a human approval; logs (item Notes, goal Progress log) and front matter are never amendable; each amend appends a log line and a ledger log event; no paths.write widening
scope: packages/crew/src/hub/commands/work/amend.ts, packages/crew/src/hub/core/team/presets.ts, packages/crew/src/hub/core/team/policy.ts
source: P-083
supersedes:
tier: project
created: 2026-10-27
---

# amend (P-083, FEAT-075): one section of an item or goal is replaced from a draft through the hub, gated by new off-flow actions item.amended and goal.amended (lifecycle: pm); the Architect is let through (authorize also) only for an item's Acceptance criteria while the item has no plan or a draft plan; an active goal's Outcome, Scope, Acceptance criteria and Success metrics need a human approval; logs (item Notes, goal Progress log) and front matter are never amendable; each amend appends a log line and a ledger log event; no paths.write widening

Owners must change what they own without hand edits by the human, while scope the executive approved stays the executive's and roles keep drafts-only write paths
