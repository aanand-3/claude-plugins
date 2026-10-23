---
id: K-2026-10-23-a-desktop-app-session-started-from
type: gotcha
title: A desktop-app session started from another session does not load project agents from .claude/agents, even when they were committed before it started
scope: .claude/agents/**, plugins/crew/skills/team/SKILL.md
source: 
supersedes:
tier: project
created: 2026-10-23
---

# A desktop-app session started from another session does not load project agents from .claude/agents, even when they were committed before it started

The first /crew:team run on BUG-001 (session started via start_session in this worktree) had only built-in subagent types; crew-director was missing although agents --check was clean. Start the team run from a session the user opens directly in the worktree, or reload agents, and check the agent list before handing over.
