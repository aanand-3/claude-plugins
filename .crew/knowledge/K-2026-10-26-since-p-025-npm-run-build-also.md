---
id: K-2026-10-26-since-p-025-npm-run-build-also
type: gotcha
title: Since P-025, npm run build also regenerates plugins/crew/docs/reference.md from the registry (MCP tool descriptions, command table), and test/docs.test.ts fails when it is stale; that file is not marked linguist-generated, so a plan changing a tool description or command needs it in touches
scope: packages/crew/src/hub/**/*.reg.ts, plugins/crew/docs/**
source: 
supersedes:
tier: project
created: 2026-10-26
---

# Since P-025, npm run build also regenerates plugins/crew/docs/reference.md from the registry (MCP tool descriptions, command table), and test/docs.test.ts fails when it is stale; that file is not marked linguist-generated, so a plan changing a tool description or command needs it in touches

P-054 changed the suites tool description and found reference.md outside its touches (Q-d5eddf)
