---
id: K-2026-10-23-a-refused-command-writes-nothing
type: convention
title: A refused command writes nothing
scope: packages/crew/src/hub/core/workspace.ts, packages/crew/src/hub/cli.ts, packages/crew/src/hub/mcp.ts
source: 
supersedes:
tier: project
created: 2026-10-23
---

# A refused command writes nothing

Commands stage writes in the Workspace and flush only on success; ledger events append in a beforeFlush hook. Do every check before any side effect that isn't staged (git switch, running a process).
