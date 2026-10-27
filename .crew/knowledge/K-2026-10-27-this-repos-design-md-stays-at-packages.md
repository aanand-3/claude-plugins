---
id: K-2026-10-27-this-repos-design-md-stays-at-packages
type: decision
title: This repo's DESIGN.md stays at packages/crew/docs/design/DESIGN.md; tools and agents find it through design.file in .crew/config.yaml, never a hard-coded docs/design path
scope: .crew/config.yaml, plugins/crew/skills/hub/agents/designer.md, plugins/crew/skills/design/**
source: P-085
supersedes:
tier: project
created: 2026-10-27
---

# This repo's DESIGN.md stays at packages/crew/docs/design/DESIGN.md; tools and agents find it through design.file in .crew/config.yaml, never a hard-coded docs/design path

P-014 moved it next to the package; check_design.ts and readDesign already follow design.file, so config, not a move, is the fix (CHORE-027)
