---
id: K-2026-10-25-the-guard-reads-a-sed-i-expression-s-old
type: gotcha
title: The guard reads a sed -i expression (s/old/new/) as a write target, so a multi-file sed -i is refused as writing outside the repository; use the Edit tool or a node -e replace instead
scope: packages/**
source: P-037
supersedes:
tier: project
created: 2026-10-25
---

# The guard reads a sed -i expression (s/old/new/) as a write target, so a multi-file sed -i is refused as writing outside the repository; use the Edit tool or a node -e replace instead

sed -i with resolvePolicy(this.ws.root, ...) in its pattern was denied: the guard took /resolvePolicy(this.home,, as the destination path
