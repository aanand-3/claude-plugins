---
id: K-2026-10-25-each-command-registers-its-cli-spec-help
type: decision
title: Each command registers its CLI spec, help lines and MCP tool in a <module>.reg.ts beside its module, listed in commands/index.ts; the command reference is a whole generated file, references/commands.md
scope: packages/crew/src/hub/cli.ts, packages/crew/src/hub/mcp.ts, packages/crew/src/hub/registry.ts, packages/crew/src/hub/commands/**, plugins/crew/skills/hub/SKILL.md, plugins/crew/skills/hub/references/commands.md
source: P-030
supersedes:
tier: project
created: 2026-10-25
---

# Each command registers its CLI spec, help lines and MCP tool in a <module>.reg.ts beside its module, listed in commands/index.ts; the command reference is a whole generated file, references/commands.md

P-030 (W1-e): registration files beside the modules leave the command modules untouched, so the split runs in parallel with plans editing them, and keep large modules (workflow.ts) under 300 lines. A generated reference must be a whole linguist-generated file (P-023's rule: no plan lists generated paths, Release rebuilds them); a generated table inside hand-written SKILL.md would make every command-adding plan regenerate and commit part of SKILL.md. Adding a command: edit its module and its .reg.ts; a new module adds one line to commands/index.ts (hub.shared).
