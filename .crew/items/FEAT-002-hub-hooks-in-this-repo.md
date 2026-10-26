---
id: FEAT-002
type: feat
title: Hub hooks in this repo
status: triaged
priority: P1
goal: G-001
plan:
created: 2026-10-23
closed:
---

# FEAT-002: Hub hooks in this repo

## Summary
SessionStart context and Stop/PreCompact checkpoints in .claude/settings.json

Slice of G-001 (Shared context: the hub): Hub hooks in this repo — SessionStart context and Stop/PreCompact checkpoints in .claude/settings.json

## User story

## Acceptance criteria
- [ ]

## Notes
- 2026-10-23: triaged from G-001 breakdown
- 2026-10-26: RESCOPE: guard (PreToolUse), usage (SubagentStop) and activity (PostToolUse) hooks are in .claude/settings.json, and the template plugins/crew/skills/guidelines/templates/settings.json already has SessionStart 'crew.mjs context' and Stop/PreCompact 'checkpoint --auto' (execution.ts autoWorktrees; test context.test.ts 'the SessionStart hook runs context'). Remaining: this repo's .claude/settings.json lacks those three hooks (SessionStart only runs track_plan_draft). Merge them in (settings.json is protected: human or guidelines --refresh), and optionally have doctor (views/doctor.ts HOOKS) report them. Needed for G-001 AC2 (context at session start).
