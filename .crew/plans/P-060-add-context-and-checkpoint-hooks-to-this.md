---
id: P-060
title: Add context and checkpoint hooks to this repo and check them in doctor
goal: G-001
items: FEAT-002
touches:
depends_on:
status: draft
branch: plan/P-060-add-context-and-checkpoint-hooks-to-this
pr:
created: 2026-10-26
started:
completed:
---

# P-060: Add context and checkpoint hooks to this repo and check them in doctor

## Context
G-001 AC2 needs the hub's context at session start. FEAT-002 (rescoped by the Architect): the guard, usage and activity hooks are already in this repo's .claude/settings.json, and the guidelines template (plugins/crew/skills/guidelines/templates/settings.json) already carries SessionStart `crew.mjs context` and Stop/PreCompact `checkpoint --auto`. This repo's settings.json has only the track_plan_draft SessionStart hook, so the three are missing here. settings.json is protected: it changes through the guidelines refresh path (or the human), not by a developer editing it directly.

## Scope
**In:**
- Merge the three hooks into this repo's settings.json via the guidelines refresh path; doctor check for them (draft intent; the Architect sets the final scope).

**Out (explicitly not doing):**
- Changes to the guard, usage and activity hooks (already present).

## Acceptance criteria
- [ ] To be written by the Architect (this repo's settings.json has the three hooks; doctor reports them).

## Approach

## Design

## Tasks
- [ ] T1: … → verify: …

## Test plan
**Targeted checks:**
-

## Rollout & rollback

## Risks & open questions
-

## Handoff

## Progress log

## Outcome
- This repo's .claude/settings.json carries the SessionStart context hook and the Stop and PreCompact `checkpoint --auto` hooks, merged in via the guidelines refresh path.
- `doctor` (views/doctor.ts HOOKS) reports whether those three hooks are present.
- Detailed scope, acceptance criteria and tasks: the Architect's spec.
