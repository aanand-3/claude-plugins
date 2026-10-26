---
id: K-2026-10-26-goal-breakdown-lines-split-title-from
type: decision
title: Goal Breakdown lines split title from description only at a spaced dash, never a colon; a leading FEAT:/CHORE:/SPIKE: prefix sets the item type; bugs are not created from a Breakdown (new-item bug --from, then list BUG-### by ID)
scope: packages/crew/src/hub/commands/work/backlog.ts, plugins/crew/skills/hub/templates/goal.md
source: P-073
supersedes:
tier: project
created: 2026-10-26
---

# Goal Breakdown lines split title from description only at a spaced dash, never a colon; a leading FEAT:/CHORE:/SPIKE: prefix sets the item type; bugs are not created from a Breakdown (new-item bug --from, then list BUG-### by ID)

BUG-045: the colon split cut titles like 'SPIKE: ...' to 'SPIKE'; a bug needs a full report at capture
