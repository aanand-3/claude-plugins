---
id: K-2026-10-23-parallelism-comes-from-decomposition-one
type: decision
title: Parallelism comes from decomposition: one plan has one owner
scope: packages/hub/src/core/footprint.ts, packages/hub/src/commands/workflow.ts
source: IDEA
supersedes:
tier: project
created: 2026-10-23
---

# Parallelism comes from decomposition: one plan has one owner

A big plan is split into plans with disjoint touches and depends_on, never staffed with several agents. start claims a plan for one run; WIP is per run; overlapping active footprints and changes outside touches are flagged. (docs/vision.md → Principles)
