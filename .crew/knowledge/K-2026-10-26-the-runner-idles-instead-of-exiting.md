---
id: K-2026-10-26-the-runner-idles-instead-of-exiting
type: decision
title: The runner idles instead of exiting on a stop condition or an empty dispatch: one runner report with idle and a stopped notification per distinct reason, re-check on a ledger change or a 2s-to-60s backoff; it exits only on a signal (exit 130, stopped interrupted), --max-passes or 2 passes without progress. No new notify kind or ledger event type
scope: packages/crew/src/hub/commands/team/runner.ts, packages/crew/src/hub/commands/team/autonomy.ts, plugins/crew/skills/team/SKILL.md
source: P-066
supersedes:
tier: project
created: 2026-10-26
---

# The runner idles instead of exiting on a stop condition or an empty dispatch: one runner report with idle and a stopped notification per distinct reason, re-check on a ledger change or a 2s-to-60s backoff; it exits only on a signal (exit 130, stopped interrupted), --max-passes or 2 passes without progress. No new notify kind or ledger event type

Later answers, approvals, asks and resume must reach a running runner (G-007 AC5); reusing report and stopped keeps the policy schema and ledger event list unchanged
