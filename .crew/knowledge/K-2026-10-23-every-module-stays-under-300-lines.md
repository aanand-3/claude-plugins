---
id: K-2026-10-23-every-module-stays-under-300-lines
type: convention
title: Every module stays under 300 lines, and src/core never imports src/commands
scope: packages/crew/src/hub/**, plugins/crew/skills/**
source: 
supersedes:
tier: project
created: 2026-10-23
---

# Every module stays under 300 lines, and src/core never imports src/commands

Both are tested (test/structure.test.ts, tests/crew/test_plugin_contents.py). Split by responsibility instead of growing a file; core is pure rules and data, commands do the work.
