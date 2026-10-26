---
id: K-2026-10-26-a-plan-worktree-has-no-packages-crew
type: gotcha
title: A plan worktree has no packages/crew/node_modules; run npm ci --prefer-offline --prefix <worktree>/packages/crew before hub.build or land fails with ERR_MODULE_NOT_FOUND for esbuild
scope: packages/crew/**
source: 
supersedes:
tier: project
created: 2026-10-26
---

# A plan worktree has no packages/crew/node_modules; run npm ci --prefer-offline --prefix <worktree>/packages/crew before hub.build or land fails with ERR_MODULE_NOT_FOUND for esbuild

P-069 land bounced on hub.build because the fresh worktree had no dependencies installed
