---
id: FEAT-002
type: feat
title: Hub hooks in this repo
status: done
priority: P1
goal: G-001
plan: P-060
created: 2026-10-23
closed: 2026-10-26
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
- 2026-10-26: RESCOPE (PM grooming): guard, usage and activity hooks are already in .claude/settings.json. Remaining: this repo's settings.json lacks the SessionStart 'crew.mjs context' hook and the Stop/PreCompact 'checkpoint --auto' hooks that the guidelines template has; optionally a doctor check for them. No plan opened; settings.json untouched; how it is done is the human's choice.
- 2026-10-26: status triaged → done — delivered by P-060
