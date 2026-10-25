---
id: K-2026-10-25-hub-writes-are-committed-on-the-base
type: convention
title: Hub writes are committed on the base branch as they happen; no manual commit is needed before staffing
scope: plugins/crew/skills/hub/agents/**, plugins/crew/skills/team/**
source: P-026
supersedes: K-2026-10-23-commit-hub-changes-before-staffing
tier: project
created: 2026-10-25
---

# Hub writes are committed on the base branch as they happen; no manual commit is needed before staffing

Since P-026 each hub write commits only hub documents on the main checkout (chore(hub): ...), and plan worktrees read hub state through crew.mjs --as pm --run-id pm:a17ef03451a4baf54 from the main checkout, so an uncommitted ready status or assignee can no longer be invisible to a worktree agent.
