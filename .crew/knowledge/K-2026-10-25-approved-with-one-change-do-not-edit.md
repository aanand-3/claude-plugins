---
id: K-2026-10-25-approved-with-one-change-do-not-edit
type: decision
title: Approved, with one change: do not edit registry-before.json; it stays the frozen record of P-030's split. Touches now include test/hub/registry.test.ts and test/mcp.test.ts. In registry.test.ts, check that the pre-split commands, help lines and tools are unchanged rather than that nothing was added: compare inventory() restricted to BEFORE's keys with BEFORE, and require BEFORE's command and tool names to be a subset of REGISTRY.from's (so later command-adding plans need no edit there). In mcp.test.ts add dispatch to the sorted tool list. P-031's Approach, T5, AC11 and test plan say this; T5 also checks git diff --quiet main -- test/hub/registry-before.json.
scope: 
source: P-031
supersedes:
tier: project
created: 2026-10-25
---

# Approved, with one change: do not edit registry-before.json; it stays the frozen record of P-030's split. Touches now include test/hub/registry.test.ts and test/mcp.test.ts. In registry.test.ts, check that the pre-split commands, help lines and tools are unchanged rather than that nothing was added: compare inventory() restricted to BEFORE's keys with BEFORE, and require BEFORE's command and tool names to be a subset of REGISTRY.from's (so later command-adding plans need no edit there). In mcp.test.ts add dispatch to the sorted tool list. P-031's Approach, T5, AC11 and test plan say this; T5 also checks git diff --quiet main -- test/hub/registry-before.json.

Answer to Q-5212df (architect): Adding the dispatch command and MCP tool (per Approach, dispatch.reg.ts plus one index line) breaks two tests outside touches: test/hub/registry.test.ts (4 of 6 compare COMMANDS, the tools list and REGISTRY.from against the frozen registry-before.json snapshot from P-030) and test/mcp.test.ts line 48 (the exact sorted tool-name list, after a build). Proposed fix: add dispatch to the mcp.test.ts tool list; in registry.test.ts compare against BEFORE plus the dispatch command and tool (or add dispatch to registry-before.json). May I add test/mcp.test.ts, test/hub/registry.test.ts and test/hub/registry-before.json to touches and make that change, or do you prefer another approach?
