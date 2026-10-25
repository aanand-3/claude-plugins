---
id: K-2026-10-24-agents-change-crew-bin-only-through-crew
type: decision
title: Agents change .crew/bin only through crew.mjs --as architect --run-id architect:abaf77afa898c6614 refresh-bin, run by Release, governed by the project policy's release.refresh_bin
scope: packages/crew/src/hub/commands/work/release.ts, packages/crew/src/hub/core/team/policy.ts, plugins/crew/skills/hub/agents/release.md, .crew/policy.yaml
source: P-024
supersedes:
tier: project
created: 2026-10-24
---

# Agents change .crew/bin only through crew.mjs --as architect --run-id architect:abaf77afa898c6614 refresh-bin, run by Release, governed by the project policy's release.refresh_bin

FEAT-027 approval (ledger 2026-10-24 18:19) lets Release refresh the vendored hub; a hub command enforcing role, source and file list keeps the guard's paths.protected rule a single check, and the base branch's vendored hub runs it so a plan can't widen its own refresh
