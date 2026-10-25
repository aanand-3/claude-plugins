---
id: K-2026-10-25-unattended-runs-use-claude-p-permission
type: decision
title: Unattended runs use claude -p --permission-mode dontAsk with the allow-list in .claude/settings.json; the human inbox is the only notification channel for now (no notify: in the policy)
scope: 
source: 
supersedes:
tier: project
created: 2026-10-25
---

# Unattended runs use claude -p --permission-mode dontAsk with the allow-list in .claude/settings.json; the human inbox is the only notification channel for now (no notify: in the policy)

Executive's choice, 2026-10-25: dontAsk refuses anything not allowed instead of hanging, and the crew guard hook still runs in every mode
