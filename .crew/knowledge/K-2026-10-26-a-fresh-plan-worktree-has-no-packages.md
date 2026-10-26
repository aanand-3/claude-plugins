---
id: K-2026-10-26-a-fresh-plan-worktree-has-no-packages
type: gotcha
title: A fresh plan worktree has no packages/crew/node_modules: run npm ci --prefer-offline in packages/crew before vitest (a symlink to the main checkout's would not match the node_modules/ ignore pattern and could be committed by a checkpoint)
scope: packages/crew/**
source: P-049
supersedes:
tier: project
created: 2026-10-26
---

# A fresh plan worktree has no packages/crew/node_modules: run npm ci --prefer-offline in packages/crew before vitest (a symlink to the main checkout's would not match the node_modules/ ignore pattern and could be committed by a checkpoint)

vitest fails to load vitest.config.ts with ERR_MODULE_NOT_FOUND until dependencies are installed
