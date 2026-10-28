---
id: CHORE-002
type: chore
title: MCP exposes no agents tool
status: triaged
priority: P3
goal: G-003
plan: P-087
created: 2026-10-23
closed:
---

# CHORE-002: MCP exposes no agents tool

## Summary
crew.mjs agents / agents --check exist only on the CLI (found in T2); an MCP tool would let agents see stale definitions without shelling out.

## Done when
- [ ]

## Notes
- 2026-10-26: status new → triaged — priority P3
- 2026-10-26: Architect (Q-e45ff2 follow-up): likely obsolete. The MCP doctor tool (views/doctor.reg.ts) already reports agents not rendered or out of date, and rendering stays CLI-only on purpose (guard.ts:140 treats agents without --check as a policy write). Suggest wontfix unless a read-only agents --check MCP tool is wanted.
