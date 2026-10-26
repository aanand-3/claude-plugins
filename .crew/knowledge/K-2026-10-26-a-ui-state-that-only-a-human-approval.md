---
id: K-2026-10-26-a-ui-state-that-only-a-human-approval
type: gotcha
title: A UI state that only a human approval creates (an answered escalation, a follow-up card) cannot be seeded by an agent for the design screenshot loop: the guard refuses the human-approval flag in Bash and agent calls to the page's command endpoint
scope: packages/crew/ui/**
source: 
supersedes:
tier: project
created: 2026-10-26
---

# A UI state that only a human approval creates (an answered escalation, a follow-up card) cannot be seeded by an agent for the design screenshot loop: the guard refuses the human-approval flag in Bash and agent calls to the page's command endpoint

P-072's developer could not screenshot the follow-up card; plan such visual checks for QA or the Designer with a human-seeded scratch repo
