---
id: K-2026-10-23-portable-core-the-cli-and-mcp-tools
type: decision
title: Portable core: the CLI and MCP tools carry everything, hooks only automate
scope: packages/crew/src/hub/mcp.ts, plugins/crew/skills/guidelines/templates/settings.json
source: IDEA
supersedes:
tier: project
created: 2026-10-23
---

# Portable core: the CLI and MCP tools carry everything, hooks only automate

Other harnesses can drive the hub through MCP or the CLI; Claude Code hooks (SessionStart context, Stop/PreCompact checkpoint) are an accelerator, never a dependency.
