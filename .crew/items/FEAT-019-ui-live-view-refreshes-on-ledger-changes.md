---
id: FEAT-019
type: feat
title: UI live view refreshes on ledger changes
status: done
priority: P1
goal: G-007
plan: P-027
created: 2026-10-23
closed: 2026-10-26
completed: 2026-10-26
---

# FEAT-019: UI live view refreshes on ledger changes

## Summary
The ui server watches .crew/, .git/refs and .git/HEAD only: questions, usage, claims and checkpoints (all in <git common dir>/crew/ledger.jsonl) don't refresh the page, and in a linked worktree .git is a file so the git paths aren't watched at all. Watch the ledger path from Ledger.at() and the common dir's refs.

## User story

## Acceptance criteria
- [ ]

## Notes
- 2026-10-23: status new → triaged — priority P3
- 2026-10-25: re-triaged: priority P1
- 2026-10-26: status triaged → done — delivered by P-027
