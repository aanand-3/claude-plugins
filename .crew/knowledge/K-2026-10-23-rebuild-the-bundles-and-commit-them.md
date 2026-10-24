---
id: K-2026-10-23-rebuild-the-bundles-and-commit-them
type: convention
title: Rebuild the bundles and commit them with the source
scope: packages/crew/**, plugins/crew/skills/hub/dist/**
source: 
supersedes:
tier: project
created: 2026-10-23
---

# Rebuild the bundles and commit them with the source

Projects run the single-file dist/crew.mjs, mcp.mjs and ui.html with nothing installed; test/dist.test.ts fails when they differ from a fresh build. Run npm run build in packages/crew before committing.
