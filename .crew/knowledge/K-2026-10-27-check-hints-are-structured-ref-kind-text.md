---
id: K-2026-10-27-check-hints-are-structured-ref-kind-text
type: decision
title: check hints are structured {ref, kind, text} with a closed HINT_KINDS list in views/checks.ts; commands/team/hints.ts routes each kind (knowledge to the Architect, plan hints to the plan owner, landing artefacts to Release, drafts/backlog/goal-shape to the PM, focus to the Director, setup and liveness unrouted) and dispatch adds one entry per (owner, ref) after the spec frontier; the runner's pass report carries the routed hint keys (kind|ref|text) and hintsFirstSeen(events) derives first-seen pass, so dispatch stays a read and no new ledger event type is added
scope: packages/crew/src/hub/commands/views/checks.ts, packages/crew/src/hub/commands/team/hints.ts, packages/crew/src/hub/commands/team/dispatch.ts, packages/crew/src/hub/commands/team/runner.ts
source: P-081
supersedes:
tier: project
created: 2026-10-27
---

# check hints are structured {ref, kind, text} with a closed HINT_KINDS list in views/checks.ts; commands/team/hints.ts routes each kind (knowledge to the Architect, plan hints to the plan owner, landing artefacts to Release, drafts/backlog/goal-shape to the PM, focus to the Director, setup and liveness unrouted) and dispatch adds one entry per (owner, ref) after the spec frontier; the runner's pass report carries the routed hint keys (kind|ref|text) and hintsFirstSeen(events) derives first-seen pass, so dispatch stays a read and no new ledger event type is added

P-081 / FEAT-074: unowned hints stalled delivery; FEAT-066 needs the first-seen pass for its stale-hint stall
