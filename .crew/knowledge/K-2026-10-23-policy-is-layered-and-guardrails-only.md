---
id: K-2026-10-23-policy-is-layered-and-guardrails-only
type: decision
title: Policy is layered and guardrails only tighten
scope: packages/hub/src/core/policy.ts, packages/hub/src/commands/policy.ts
source: IDEA
supersedes:
tier: project
created: 2026-10-23
---

# Policy is layered and guardrails only tighten

built-in → org playbook (pinned by ref) → org role → project → project role → project team. Protection lists are unions, force_push/no_verify can only turn off, budgets never exceed an org ceiling, a deny beats an allow; an invalid policy blocks every move. Mode defaults to ai-assisted. (docs/vision.md → Policy)
