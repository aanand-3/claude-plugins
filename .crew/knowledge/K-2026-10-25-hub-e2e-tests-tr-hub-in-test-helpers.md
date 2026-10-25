---
id: K-2026-10-25-hub-e2e-tests-tr-hub-in-test-helpers
type: gotcha
title: Hub e2e tests (tr/HUB in test/helpers/repo.ts) run the built plugins/crew/skills/hub/dist/crew.mjs, not src, so a source mutation check needs hub.build after the edit and again after restoring; a fresh plan worktree also needs npm ci in packages/crew first
scope: packages/crew/test/hub/e2e/**
source: 
supersedes:
tier: project
created: 2026-10-25
---

# Hub e2e tests (tr/HUB in test/helpers/repo.ts) run the built plugins/crew/skills/hub/dist/crew.mjs, not src, so a source mutation check needs hub.build after the edit and again after restoring; a fresh plan worktree also needs npm ci in packages/crew first

P-044's mutation check passed vacuously until the bundle was rebuilt
