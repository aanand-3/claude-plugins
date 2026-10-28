---
id: CHORE-027
type: chore
title: Designer agent is not vendored or rendered in this repo
status: done
priority: P2
goal:
plan: P-085
created: 2026-10-26
closed: 2026-10-28
---

# CHORE-027: Designer agent is not vendored or rendered in this repo

## Summary
P-021 added the designer role but this repo has no .crew/templates/agents/designer.md, no .claude/agents/crew-designer.md and no roles.designer model in policy.yaml; agents --check reports crew-designer.md missing, so dispatch's design-review entries can't launch here. agents and template paths are guard-protected, so the human vendors and renders it.

The Designer also gets no work here because two more pieces are missing:
- `.crew/config.yaml` has no `design:` section, so `design.ui_paths` is empty, `isUiPlan` is false for every plan (`core/work/footprint.ts:46-49`), and dispatch never sends a design review.
- The design skill and the Designer read `docs/design/DESIGN.md` at the repo root (`plugins/crew/skills/hub/agents/designer.md:11`, `skills/design/SKILL.md:9`), but this repo keeps it at `packages/crew/docs/design/DESIGN.md` (moved there by P-014). Either move it to the root or make the path configurable (e.g. `design.doc` in config.yaml) and point the Designer and the design checker at it.

## Done when
- [ ] `crew.mjs agents --check` is clean, and `.claude/agents/crew-designer.md` exists with the model from `roles.designer` in policy.yaml
- [ ] `design.ui_paths` in `.crew/config.yaml` lists the hub UI's paths, and a plan that touches one gets a `design review` entry in `dispatch`
- [ ] the Designer and the design checker find this repo's DESIGN.md without a manual path

## Notes
- 2026-10-26: status new → triaged — priority P2
- 2026-10-28: status triaged → done — delivered by P-085
