---
id: K-2026-10-26-the-team-session-never-runs-a-roles-hub
type: convention
title: The team session never runs a role's hub step by passing --as ROLE; it launches that role's agent (crew-pm, crew-architect, ...) to do it, even for a one-line command
scope: 
source: 
supersedes:
tier: project
created: 2026-10-26
---

# The team session never runs a role's hub step by passing --as ROLE; it launches that role's agent (crew-pm, crew-architect, ...) to do it, even for a one-line command

Human correction 2026-10-26: the session ran 'assign P-060 --to developer --as pm' itself, so the ledger credited the PM with an assignment the PM never made.
