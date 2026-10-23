---
id: K-2026-10-23-undo-unstaged-side-effects-on-refusal
type: convention
title: Undo unstaged side effects on refusal with Workspace.onAbort
scope: packages/hub/src/core/workspace.ts, packages/hub/src/commands/workflow.ts
source: FEAT-001
supersedes:
tier: project
created: 2026-10-23
---

# Undo unstaged side effects on refusal with Workspace.onAbort

Staged writes vanish on a refusal, but a git branch doesn't. Do every check that can refuse before the side effect; for refusals only possible later (flush-time claim race, ledger lock) register an onAbort that reverts it — start switches back and deletes the branch.
