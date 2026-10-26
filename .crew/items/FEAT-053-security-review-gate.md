---
id: FEAT-053
type: feat
title: Security review gate
status: triaged
priority: P1
goal: G-008
plan:
created: 2026-10-26
closed:
---

# FEAT-053: Security review gate

## Summary
`security.paths` in policy.yaml, `isSecurityPlan` on touches plus actual changes, `review --security`, dispatch entry and role queue (reusing the Designer's path-scoped gate)

Slice of G-008 (Whole-project security): Security review gate — `security.paths` in policy.yaml, `isSecurityPlan` on touches plus actual changes, `review --security`, dispatch entry and role queue (reusing the Designer's path-scoped gate).

Two bypasses to close. (1) `isUiPlan` checks declared `touches` only (`core/work/footprint.ts:46-49`), and changes outside touches are only a hint (`views/checks.ts:96`); the security check must also use the files the plan changes against the base, rechecked at accept. (2) `config.yaml` is not in `paths.protected` (`core/team/policy.ts:27-28`), so `security.paths` lives in `.crew/policy.yaml`, where changing it is the human's `policy.change`.

## User story

## Acceptance criteria
- [ ] a plan whose touches overlap `security.paths` can't be accepted without `review --security --approve`; a code change after the approval makes it stale and dispatch sends it back to `security`
- [ ] a plan that declares narrow touches but edits a file in `security.paths` still gets a security entry and can't be accepted without the review
- [ ] a plan that neither declares nor changes a path in `security.paths` never gets a security entry
- [ ] an agent edit of `security:` in `.crew/policy.yaml` is refused by the guard

## Notes
- 2026-10-26: triaged from G-008 breakdown
- 2026-10-26: sharpened from the pre-approval review of G-008 (see the goal's Notes & decisions)
