---
id: CHORE-022
type: chore
title: Code formatter that formats on save
status: triaged
priority: P3
goal:
plan:
created: 2026-10-25
closed:
---

# CHORE-022: Code formatter that formats on save

## Summary
The repo has no formatter (no prettier/biome config, no format script). The executive wants code formatted on save: pick a formatter for packages/crew (TS/JS/JSON/MD), add its config and a format script, and a PostToolUse hook on Edit|Write that formats the edited file (settings.json hook is the human's to add; the guidelines settings template can render it). Raised 2026-10-25 by Arpit Anand. Do not reformat the whole tree while G-007 plans are in flight: one repo-wide format commit would conflict with every open plan worktree; land it after Wave 1 merges, or format only edited files until then.

## Done when
- [ ]

## Notes
- 2026-10-26: status new → triaged — priority P3
