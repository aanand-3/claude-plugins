---
id: K-2026-10-23-context-is-computed-from-the-stores
type: decision
title: Context is computed from the stores, never stored
scope: packages/hub/src/commands/context.ts
source: IDEA
supersedes:
tier: project
created: 2026-10-23
---

# Context is computed from the stores, never stored

context assembles project state, ledger and memory per role within a hard budget, with pointers for what doesn't fit, so nothing is duplicated and nothing goes stale. (docs/vision.md → The model)
