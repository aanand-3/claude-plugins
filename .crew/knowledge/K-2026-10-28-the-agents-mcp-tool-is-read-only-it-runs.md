---
id: K-2026-10-28-the-agents-mcp-tool-is-read-only-it-runs
type: decision
title: The agents MCP tool is read-only: it runs agents --check only; rendering agent definitions stays a CLI command the human runs
scope: packages/crew/src/hub/commands/team/agents*.ts
source: 
supersedes:
tier: project
created: 2026-10-28
---

# The agents MCP tool is read-only: it runs agents --check only; rendering agent definitions stays a CLI command the human runs

agent definitions are paths.protected and the guard already denies agents without --check; an MCP render tool would bypass that
