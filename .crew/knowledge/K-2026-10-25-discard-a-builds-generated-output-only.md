---
id: K-2026-10-25-discard-a-builds-generated-output-only
type: gotcha
title: Discard a build's generated output only under plugins/crew/skills/hub/dist (git checkout -- plugins/crew/skills/hub/dist); a wider checkout of plugins/crew/skills reverts a plan's uncommitted edits to SKILL.md, agents and templates
scope: plugins/crew/skills/**
source: P-027
supersedes:
tier: project
created: 2026-10-25
---

# Discard a build's generated output only under plugins/crew/skills/hub/dist (git checkout -- plugins/crew/skills/hub/dist); a wider checkout of plugins/crew/skills reverts a plan's uncommitted edits to SKILL.md, agents and templates

P-027 QA ran git checkout -- plugins/crew/skills and wiped the developer's uncommitted T7 edits in the plan worktree
