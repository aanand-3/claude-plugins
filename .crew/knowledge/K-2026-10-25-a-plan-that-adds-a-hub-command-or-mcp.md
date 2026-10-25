---
id: K-2026-10-25-a-plan-that-adds-a-hub-command-or-mcp
type: gotcha
title: A plan that adds a hub command or MCP tool breaks test/hub/registry.test.ts (it compares COMMANDS, tools/list and REGISTRY.from to the frozen registry-before.json from P-030) and test/mcp.test.ts (an exact sorted tool-name list); spec those test files into touches
scope: packages/crew/src/hub/commands/**, packages/crew/test/hub/registry.test.ts, packages/crew/test/mcp.test.ts
source: P-031
supersedes:
tier: project
created: 2026-10-25
---

# A plan that adds a hub command or MCP tool breaks test/hub/registry.test.ts (it compares COMMANDS, tools/list and REGISTRY.from to the frozen registry-before.json from P-030) and test/mcp.test.ts (an exact sorted tool-name list); spec those test files into touches

P-031 adding dispatch failed 4 registry tests and the mcp tool-list test, both outside its touches
