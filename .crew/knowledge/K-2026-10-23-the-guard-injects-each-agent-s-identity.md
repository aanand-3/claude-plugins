---
id: K-2026-10-23-the-guard-injects-each-agent-s-identity
type: decision
title: The guard injects each agent's identity by rewriting its tool input
scope: plugins/crew/skills/guidelines/templates/settings.json, packages/hub/src/core/ledger.ts
source: G-003
supersedes:
tier: project
created: 2026-10-23
---

# The guard injects each agent's identity by rewriting its tool input

T0 spike (Claude Code, headless): a settings-level PreToolUse hook receives agent_type (the agent's name) and agent_id for every subagent tool call, nested ones included (crew-probe → crew-inner), and none for the main session. Returning hookSpecificOutput.updatedInput rewrote both a Bash command (echo ORIGINAL → REWRITTEN) and MCP tool arguments ({} → {role: qa}; the hub answered as QA). So the guard injects --as/--run (MCP: as/run) from the verified agent instead of trusting the agent to pass them. updatedInput replaces the whole input: the guard must merge, not overwrite.
