---
id: K-2026-10-23-two-memory-tiers-in-one-format-project
type: decision
title: Two memory tiers in one format: project knowledge and the org playbook
scope: packages/crew/src/hub/core/memory/knowledge.ts, packages/crew/src/hub/commands/memory/knowledge.ts
source: IDEA
supersedes:
tier: project
created: 2026-10-23
---

# Two memory tiers in one format: project knowledge and the org playbook

Project facts stay in .crew/knowledge, committed and reviewed with the code; lessons that make a role better anywhere live in the shared playbook repo (lessons/), promoted per mode. Claude's per-user memory is for personal preferences only. (docs/vision.md → Self-learning roles)
