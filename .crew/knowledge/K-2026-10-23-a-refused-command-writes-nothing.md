---
id: K-2026-10-23-a-refused-command-writes-nothing
type: convention
title: A refused command writes nothing
scope: packages/hub/src/core/workspace.ts, packages/hub/src/cli.ts, packages/hub/src/mcp.ts
source: 
supersedes:
tier: project
created: 2026-10-23
---

# A refused command writes nothing

Commands stage writes in the Workspace and flush only on success; ledger events append in a beforeFlush hook. Do every check before any side effect that isn't staged (git switch, running a process).
