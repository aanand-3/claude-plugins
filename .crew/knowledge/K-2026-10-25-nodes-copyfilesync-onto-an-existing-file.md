---
id: K-2026-10-25-nodes-copyfilesync-onto-an-existing-file
type: gotcha
title: Node's copyFileSync onto an existing file gives the target the source's mode
scope: packages/crew/src/hub/**
source: P-024
supersedes:
tier: project
created: 2026-10-25
---

# Node's copyFileSync onto an existing file gives the target the source's mode

libuv fchmods the destination to the source mode; refresh-bin re-applies the target's own mode with chmodSync so a vendored 0755 crew.mjs --as developer --run-id developer:af588eed65e640684 stays executable
