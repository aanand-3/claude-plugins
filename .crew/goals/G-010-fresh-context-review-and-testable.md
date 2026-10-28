---
id: G-010
title: Fresh-context review and testable standards (port from EGM)
status: proposed
priority: P2
created: 2026-10-28
completed:
integration_branch:
---

# G-010: Fresh-context review and testable standards (port from EGM)

## Outcome
Specs are reviewed by context-free readers before a plan can be ready. Review findings and their resolutions are first-class hub data. Rubrics are canonical files that agents and reviewers cite. Docs that drift from code are flagged. Skills and agents have behaviour tests that prove these properties.

## Scope
**In:**
- canonical standards and template upgrades (track B): rubrics agents and reviewers cite, vendored agent templates that match the plugin's (today the designer, developer, pm, qa and release templates lack the "answer Q-..." rule and `agents --check` reports clean)
- a findings model: ledger events, `findings`, `resolve`, with severity and persisted resolution
- fresh-context spec review (track A): read-only reviewer agents with no history, CLAUDE.md or memory, a dispatch entry and a readiness gate set by policy
- docs drift: a deterministic pointer check plus a drift-review lens (track C)
- skill and agent behaviour tests, SKILL.md size cap (track D)

**Out:**
- multi-harness packaging (Codex, Antigravity), onboard bootstrap contracts, release attestation, EGM's contributor governance

## Acceptance criteria
- A plan cannot move to ready under lifecycle policy without a fresh-context spec review with no unresolved blocking findings.
- `crew.mjs findings` lists findings with IDs and severity; `resolve` records how each was resolved.
- Rubrics live as canonical files cited by reviewer prompts.
- A docs-drift check flags a doc pointer that no longer matches code.
- Behaviour tests for skills and agents run in the test suite; `agents --check` fails when vendored templates differ from the plugin's.

## Success metrics

## Breakdown
- FEAT-076: Canonical standards and template upgrades (track B) — rubrics, vendored template drift check.
- FEAT-077: Findings model — ledger events, `findings`, `resolve`.
- FEAT-078: Fresh-context spec review — reviewer agents, dispatch entry, readiness gate.
- FEAT-079: Docs drift — pointer check and drift-review lens.
- FEAT-080: Skill and agent behaviour testing.

## Notes & decisions
Source: draft looks-like-there-s-more-giggly-backus.md (EGM read at commit b3a3595), which holds the proposed plans P-a to P-e, the order and the reconcile list for the Architect.

## Progress log
