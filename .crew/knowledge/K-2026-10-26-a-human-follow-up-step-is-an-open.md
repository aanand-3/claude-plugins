---
id: K-2026-10-26-a-human-follow-up-step-is-an-open
type: decision
title: A human follow-up step is an open blocking ask to the executive (ask event with after: Q-… and step) about the plan or item it unblocks, closed when a human answers it done; no new ledger event type
scope: packages/crew/src/hub/commands/team/followups.ts, packages/crew/src/hub/commands/team/inbox.ts, packages/crew/src/hub/commands/team/questions.ts
source: P-072
supersedes:
tier: project
created: 2026-10-26
---

# A human follow-up step is an open blocking ask to the executive (ask event with after: Q-… and step) about the plan or item it unblocks, closed when a human answers it done; no new ledger event type

Reuses every existing wait path (forward-move refusal, staff, status, run --check holds, executive next) and the human-only answer; a follow-up must name a plan or item so escalationHolds never makes it stop the team (P-072, FEAT-068)
