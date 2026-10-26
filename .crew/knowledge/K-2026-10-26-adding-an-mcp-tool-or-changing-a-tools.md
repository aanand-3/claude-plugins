---
id: K-2026-10-26-adding-an-mcp-tool-or-changing-a-tools
type: gotcha
title: Adding an MCP tool or changing a tool's input schema breaks two pinned tests outside most plans' touches: test/mcp.test.ts lists the exact tool names (from the built mcp.mjs, so it only fails after npm run build), and test/hub/registry.test.ts compares existing tools' schemas and help lines with test/hub/registry-before.json. Put those files in touches when a plan adds or changes tools or help lines.
scope: packages/crew/src/hub/commands/**/*.reg.ts, packages/crew/test/mcp.test.ts, packages/crew/test/hub/registry.test.ts
source: 
supersedes:
tier: project
created: 2026-10-26
---

# Adding an MCP tool or changing a tool's input schema breaks two pinned tests outside most plans' touches: test/mcp.test.ts lists the exact tool names (from the built mcp.mjs, so it only fails after npm run build), and test/hub/registry.test.ts compares existing tools' schemas and help lines with test/hub/registry-before.json. Put those files in touches when a plan adds or changes tools or help lines.

P-035 added an inbox MCP tool and --options on ask/escalate and only found both after spec time
