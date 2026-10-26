---
id: K-2026-10-26-skill-md-frontmatter-in-plugins-crew
type: gotcha
title: SKILL.md frontmatter in plugins/crew/skills is not strict YAML: some descriptions hold ': ' unquoted (global-setup), so a YAML parser throws; read it one key: value per line
scope: plugins/crew/skills/*/SKILL.md, packages/crew/src/docs/**
source: P-025
supersedes:
tier: project
created: 2026-10-26
---

# SKILL.md frontmatter in plugins/crew/skills is not strict YAML: some descriptions hold ': ' unquoted (global-setup), so a YAML parser throws; read it one key: value per line

src/docs/inventory.ts first parsed it with the yaml package and the docs test crashed on global-setup's description
