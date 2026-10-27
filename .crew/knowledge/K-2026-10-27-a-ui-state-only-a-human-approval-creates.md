---
id: K-2026-10-27-a-ui-state-only-a-human-approval-creates
type: convention
title: A UI state only a human approval creates (a follow-up card, an answered escalation) can still be screenshotted by the Designer: serve the plan worktree's hub (dist crew.mjs ui --no-open --port 0), put a small node proxy in front that rewrites the Host header and appends mock entries to GET /api/inbox, and drive Chrome over CDP with the worktree's src/tools/design/cdp.ts (bundled with esbuild plus a createRequire banner); nothing is written to the ledger
scope: packages/crew/ui/**
source: 
supersedes:
tier: project
created: 2026-10-27
---

# A UI state only a human approval creates (a follow-up card, an answered escalation) can still be screenshotted by the Designer: serve the plan worktree's hub (dist crew.mjs ui --no-open --port 0), put a small node proxy in front that rewrites the Host header and appends mock entries to GET /api/inbox, and drive Chrome over CDP with the worktree's src/tools/design/cdp.ts (bundled with esbuild plus a createRequire banner); nothing is written to the ledger

P-072's design review was stalled on the belief that a follow-up card can't be seeded by an agent; mocking the read endpoint gives full-size 375/900/1440 light/dark screenshots without the approval flag
