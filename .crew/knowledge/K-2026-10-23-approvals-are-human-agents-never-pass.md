---
id: K-2026-10-23-approvals-are-human-agents-never-pass
type: decision
title: Approvals are human: agents never pass --approved-by on their own
scope: 
source: IDEA
supersedes:
tier: project
created: 2026-10-23
---

# Approvals are human: agents never pass --approved-by on their own

Human gates and reserved decisions (deciding or killing the idea, production deploy, publish, spend, delete data, policy change) need a named human on the CLI; MCP and the UI refuse them and --force never bypasses them. An agent passes --approved-by only to carry an approval the human gave for that exact step.
