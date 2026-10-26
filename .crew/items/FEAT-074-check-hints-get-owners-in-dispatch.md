---
id: FEAT-074
type: feat
title: Check hints get owners in dispatch
status: triaged
priority: P1
goal: G-007
plan:
created: 2026-10-26
closed:
origin: FEAT-072
---

# FEAT-074: Check hints get owners in dispatch

## Summary
`check` emits structured hints (ref, kind, text) instead of plain strings (commands/views/checks.ts), and dispatch maps each kind to an owner, so no hint is left unowned. Split from FEAT-072 AC4; unowned hints stall delivery today.

## User story
As the executive, I want every `check` hint routed to the role that can fix it, so that hints stop piling up unowned.

## Acceptance criteria
- [ ] `check` emits structured hints (ref, kind, text).
- [ ] Dispatch routes by kind: knowledge hints (scope matches no file, superseded but still cited, risk with no owner) to the Architect; plan hints (changes outside touches, file vs ledger mismatch, off-focus plan, waits on unfinished dependencies, overlap-only depends) to the plan owner; landing artefacts (branch with no plan file or worktree, closed but still claimed, branch not found) to Release; drafts, plans written ahead, untriaged count, item whose plan was dropped, P0 bug with no plan and goal-shape hints to the PM; focus hints to the Director. Setup hints (no idea.md, CLAUDE.md section, code graph, .project) stay unrouted, left to doctor.
- [ ] One dispatch entry per owner and ref; a hint is resolved when check stops emitting it.
- [ ] The hub records the pass on which each hint was first seen (used later by the stale-hint stall in FEAT-066).
- [ ] Test: a fixture with one hint of each kind gives the expected owner entries in `dispatch --json`, and fixing the cause removes the entry.

## Notes
The stale-hint stall is not part of this item: it goes to FEAT-066 (G-009), using the first-seen pass recorded here. Source: Q-b1501e, Q-232a2b. Priority after FEAT-071 (P0) and BUG-050. Executive call: G-007 is at 39/47 plans closed, so this item keeps G-007 open longer; alternative is the head of G-009 next to FEAT-066 (escalated on the hub).
- 2026-10-26: status new → triaged — priority P1
- 2026-10-26: re-triaged: priority P1
