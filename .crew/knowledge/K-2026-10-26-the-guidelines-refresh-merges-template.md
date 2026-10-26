---
id: K-2026-10-26-the-guidelines-refresh-merges-template
type: decision
title: The guidelines refresh merges template hooks into an existing .claude/settings.json with merge_settings.mjs: add-only, a hook is present when its event has a group with the same matcher holding the identical command; nothing else in the file changes, and it needs no packs: list. doctor reports the SessionStart context and Stop/PreCompact checkpoint hooks as WARN (only the guard FAILs).
scope: packages/crew/src/tools/guidelines/merge_settings.ts, plugins/crew/skills/guidelines/templates/settings.json, plugins/crew/skills/guidelines/SKILL.md, packages/crew/src/hub/commands/views/doctor.ts
source: P-060
supersedes:
tier: project
created: 2026-10-26
---

# The guidelines refresh merges template hooks into an existing .claude/settings.json with merge_settings.mjs: add-only, a hook is present when its event has a group with the same matcher holding the identical command; nothing else in the file changes, and it needs no packs: list. doctor reports the SessionStart context and Stop/PreCompact checkpoint hooks as WARN (only the guard FAILs).

No code merged hooks before (step 5 was a hand merge, compose_rules exits without packs:), and hooks only automate what the CLI carries (portable core), so their absence degrades but does not break the loop
