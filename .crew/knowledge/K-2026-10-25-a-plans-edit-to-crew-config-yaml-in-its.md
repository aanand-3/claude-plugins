---
id: K-2026-10-25-a-plans-edit-to-crew-config-yaml-in-its
type: gotcha
title: A plan's edit to .crew/config.yaml in its worktree has no effect on hub commands run there: the hub reads config.yaml from the main checkout (the home), so check a config change in a scratch clone of main carrying the edited file
scope: .crew/config.yaml, packages/crew/src/hub/core/store.ts
source: P-029
supersedes:
tier: project
created: 2026-10-25
---

# A plan's edit to .crew/config.yaml in its worktree has no effect on hub commands run there: the hub reads config.yaml from the main checkout (the home), so check a config change in a scratch clone of main carrying the edited file

P-029 T4: the built check in the worktree read main's config.yaml, which has no hub.shared until the plan merges
