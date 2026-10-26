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
trust boundaries and accepted risks as `learn risk` entries, the audit summary in the ledger, the audit steps in the security template, and the wontfix rule for S1/S2 security bugs

The threat model is hub knowledge, not a docs file: `learn risk "<fact>" --why … --scope "<globs>"` records each trust boundary or accepted risk, and `recall --type risk` reads them back. Each audit starts from them and ends with an `audit` ledger event (range, scans, findings, risks recorded).

The PM can reject any item with a note alone (`commands/work/backlog.ts:57-60`). An S1/S2 security bug closed as wontfix needs the human's `--approved-by` or a matching `risk` knowledge entry.

Slice of G-008 (Whole-project security): Threat model and audit procedure — `learn risk` entries, the audit summary in the ledger, and the audit steps in the security template

## User story

## Acceptance criteria
- [ ] the first audit records the trust boundaries and accepted risks as `risk` knowledge entries with scopes
- [ ] `crew.mjs audit` lists the `risk` entries (`recall --type risk`) and the previous audit's ledger summary
- [ ] `triage --reject wontfix` on an S1/S2 security bug fails without `--approved-by` or a matching `risk` knowledge entry

## Notes
- 2026-10-26: triaged from G-008 breakdown
- 2026-10-26: threat model moved from `docs/security/threat-model.md` to `learn risk` entries (second review of G-008)
