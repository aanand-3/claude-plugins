---
id: K-2026-10-28-a-plans-edit-to-crew-config-yaml
type: decision
title: A plan's edit to .crew/config.yaml (and policy.yaml, templates/, bin/) is plan code: checkpoint commits it on the plan branch and land carries it to main in the plan's squash commit; Release need not carry it by hand. This supersedes the part of K-2026-10-25-a-plan-worktrees-own-crew-bin-crew-mjs that says checkpoint skips config.yaml.
scope: .crew/config.yaml
source: 
supersedes:
tier: project
created: 2026-10-28
---

# A plan's edit to .crew/config.yaml (and policy.yaml, templates/, bin/) is plan code: checkpoint commits it on the plan branch and land carries it to main in the plan's squash commit; Release need not carry it by hand. This supersedes the part of K-2026-10-25-a-plan-worktrees-own-crew-bin-crew-mjs that says checkpoint skips config.yaml.

git.ts codeChanges excludes only .crew/{plans,items,goals,knowledge,drafts,view}/ and idea.md, and land squashes the branch tree via merge-tree; verified in P-085's review, whose T1 checkpoint (031f9de) committed config.yaml
