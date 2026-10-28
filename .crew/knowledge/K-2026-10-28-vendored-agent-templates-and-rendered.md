---
id: K-2026-10-28-vendored-agent-templates-and-rendered
type: decision
title: Vendored agent templates and rendered agents are refreshed only by the human (init from the plugin, then agents); the hub detects drift from the plugin's templates in agents --check and check hints, and never syncs them automatically
scope: packages/crew/src/hub/commands/team/agents.ts, .crew/templates/agents/**, .claude/agents/**
source: 
supersedes:
tier: project
created: 2026-10-28
---

# Vendored agent templates and rendered agents are refreshed only by the human (init from the plugin, then agents); the hub detects drift from the plugin's templates in agents --check and check hints, and never syncs them automatically

both are paths.protected so agents cannot rewrite their own definitions; auto-sync via refresh-bin would widen that and still leave .claude/agents stale (BUG-060, P-094)
