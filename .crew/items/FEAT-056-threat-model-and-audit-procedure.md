---
id: FEAT-056
type: feat
title: Threat model and audit procedure
status: triaged
priority: P1
goal: G-008
plan:
created: 2026-10-26
closed:
---

# FEAT-056: Threat model and audit procedure

## Summary
`docs/security/threat-model.md`, the audit steps in the security template, and the wontfix rule for S1/S2 security bugs

The PM can reject any item with a note alone (`commands/work/backlog.ts:57-60`). An S1/S2 security bug closed as wontfix needs the human's `--approved-by` or a matching accepted-risk entry in the threat model.

Slice of G-008 (Whole-project security): Threat model and audit procedure — `docs/security/threat-model.md` and the audit steps in the security template

## User story

## Acceptance criteria
- [ ] `docs/security/threat-model.md` exists (assets, trust boundaries, accepted risks), and the first audit updates it
- [ ] `triage --reject wontfix` on an S1/S2 security bug fails without `--approved-by` or a matching accepted-risk entry

## Notes
- 2026-10-26: triaged from G-008 breakdown
