---
id: FEAT-072
type: feat
title: Harden what the team learns: knowledge and check hints become code, guard, policy and process
status: triaged
priority: P1
goal: G-005
plan:
created: 2026-10-26
closed:
---

# FEAT-072: Harden what the team learns: knowledge and check hints become code, guard, policy and process

## Summary
Knowledge and `check` hints today are only read: `recall` brings entries back into an agent's prompt, and hints are printed with no owner. Nothing asks whether a gotcha or convention should become enforcement (a guard rule, a `check`, a test, a policy key, a gate or lifecycle step, a template or process change, or a code fix), so lessons repeat until someone files an item by hand. Add a harden step: every gotcha and convention gets a disposition, non-recall dispositions become linked backlog items, recurrence reopens the disposition, and hints get owners through dispatch.

## User story
As the executive, I want what the team learns and what `check` reports to turn into code, guard, policy and process changes, so that the same mistake can't happen twice instead of only being remembered.

## Acceptance criteria
- [ ] Knowledge entries of type gotcha and convention carry a `harden:` disposition: `recall`, `check`, `guard`, `policy`, `gate`, `template`, `process` or `code`. A new entry without one gets a dispatch entry for the Architect to set it.
- [ ] A disposition other than `recall` creates (or links) a backlog item for it, recorded on the entry; when that item's plan lands, the entry is superseded by, or points to, the enforcement that replaced it.
- [ ] A one-off pass dispositions the existing 63 gotchas and 12 conventions, and reports which became items.

## Notes
Executive's request 2026-10-26. Examples where hardening happened only by hand that day: "the team session never runs a role's step with --as" (a convention) became guard enforcement through BUG-043/P-065; "checkpoint and handoff never tick tasks" (a gotcha) became a hub refusal through BUG-048/P-067. `check` that day: 0 errors, 14 hints, none owned (stale knowledge scopes, a superseded entry still cited by P-062, P-064 file vs ledger mismatch, stray .vitest output outside P-062's touches, 8 plans written ahead, 3 unconverted drafts). Complements G-005's lesson loop (FEAT-016–018), which keeps lessons as recalled text and leaves out automatic prompt edits.
- 2026-10-26: status new → triaged — priority P1
- 2026-10-26: Executive (Q-088a6e): dropped the recurrence criterion (now FEAT-073) and the hint-owner criterion (now FEAT-074) from the body.
- 2026-10-26: Narrowed per Architect Q-b1501e: scope is AC1, AC2, AC5 only. AC3 (recurrence reopens disposition) is FEAT-073 (G-005, depends on FEAT-072 and FEAT-018); AC4 (hint owners) is FEAT-074. Item body still lists AC3/AC4: PM cannot edit it, Architect to drop them in the plan spec.
