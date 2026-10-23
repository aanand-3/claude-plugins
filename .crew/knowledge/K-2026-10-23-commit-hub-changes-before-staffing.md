---
id: K-2026-10-23-commit-hub-changes-before-staffing
type: convention
title: Commit hub changes before staffing developers
scope: plugins/crew/skills/hub/agents/**, plugins/crew/skills/team/**
source: 
supersedes:
tier: project
created: 2026-10-23
---

# Commit hub changes before staffing developers

isolation: worktree agents start from the last commit; an uncommitted ready status or assignee in the main checkout is invisible to them (the ledger is shared, files are not). director.md and the team skill say so.
