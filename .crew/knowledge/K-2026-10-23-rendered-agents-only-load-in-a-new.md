---
id: K-2026-10-23-rendered-agents-only-load-in-a-new
type: gotcha
title: Rendered agents only load in a new session
scope: .claude/agents/**, plugins/crew/skills/team/SKILL.md
source: 
supersedes:
tier: project
created: 2026-10-23
---

# Rendered agents only load in a new session

Claude Code reads .claude/agents/ when a session starts: after crew.mjs agents, the session that rendered them can't spawn crew-director (Agent type not found). The team skill tells the user to start a new session after rendering; the first /crew:team run here needs one too.
