---
id: K-2026-10-23-agent-frontmatter-values-are-yaml
type: gotcha
title: Agent frontmatter values are YAML: a charter or description containing ': ' must be quoted
scope: packages/crew/src/hub/commands/team/agents.ts, plugins/crew/skills/hub/agents/**
source: 
supersedes:
tier: project
created: 2026-10-23
---

# Agent frontmatter values are YAML: a charter or description containing ': ' must be quoted

Claude Code parses agent frontmatter as YAML; an unquoted 'owns design: tokens' turns the description into a broken mapping and the agent fails to load. agents.ts quotes such values (JSON double-quoted strings are valid YAML).
