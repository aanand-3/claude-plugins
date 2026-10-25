---
id: K-2026-10-25-plans-go-in-review-accepted-pm-gate-plan
type: decision
title: Plans go in-review → accepted (PM, gate plan.accepted, with QA evidence and review) → done (PM, gate plan.done: only that the plan is landed, no worktree and its branch merged or squash-merged into the base). land lands accepted plans and never moves to done; accepted → in-progress always takes the plan.landed gate (release under the lifecycle preset), keeps the developer's claim and counts toward max_bounces. in-review → done is removed. Mode gates ai-assisted and human-led gate plan.accepted instead of plan.done. accepted is neither CLOSED nor ACTIVE; it is LIVE for overlaps and FORWARD for questions; items stay in-progress until done; start still waits for done.
scope: packages/crew/src/hub/core/work/model.ts, packages/crew/src/hub/commands/work/workflow.ts, packages/crew/src/hub/commands/work/release.ts, packages/crew/src/hub/commands/work/land.ts, packages/crew/src/hub/core/team/presets.ts, packages/crew/src/hub/core/team/policy.ts, plugins/crew/skills/hub/agents/**
source: 
supersedes:
tier: project
created: 2026-10-25
---

# Plans go in-review → accepted (PM, gate plan.accepted, with QA evidence and review) → done (PM, gate plan.done: only that the plan is landed, no worktree and its branch merged or squash-merged into the base). land lands accepted plans and never moves to done; accepted → in-progress always takes the plan.landed gate (release under the lifecycle preset), keeps the developer's claim and counts toward max_bounces. in-review → done is removed. Mode gates ai-assisted and human-led gate plan.accepted instead of plan.done. accepted is neither CLOSED nor ACTIVE; it is LIVE for overlaps and FORWARD for questions; items stay in-progress until done; start still waits for done.

Executive decision folded into P-032 (2026-10-25): PM owns done, done means on the base, and a failed merge or suite goes back to the developer with no force and no human approval
