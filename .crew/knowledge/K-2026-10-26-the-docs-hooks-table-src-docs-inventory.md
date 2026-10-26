---
id: K-2026-10-26-the-docs-hooks-table-src-docs-inventory
type: gotcha
title: The docs hooks table (src/docs/inventory.ts RUNS regex) reads a hook's script flags only when no quote follows the .mjs name: node "$CLAUDE_PROJECT_DIR/.crew/bin/x.mjs" --flag renders as x.mjs without --flag, so changing a template hook's quoting changes plugins/crew/docs/context-and-memory.md and fails test/docs.test.ts
scope: plugins/crew/skills/guidelines/templates/settings.json, packages/crew/src/docs/**
source: P-060
supersedes:
tier: project
created: 2026-10-26
---

# The docs hooks table (src/docs/inventory.ts RUNS regex) reads a hook's script flags only when no quote follows the .mjs name: node "$CLAUDE_PROJECT_DIR/.crew/bin/x.mjs" --flag renders as x.mjs without --flag, so changing a template hook's quoting changes plugins/crew/docs/context-and-memory.md and fails test/docs.test.ts

P-060's byte-exact track_plan_draft --session hook hit this; spec docs pages into touches or fix RUNS when a template hook's quoting changes
