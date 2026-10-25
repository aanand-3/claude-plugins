---
id: K-2026-10-25-claude-codes-auto-mode-permission-check
type: gotcha
title: Claude Code's auto-mode permission check denies a Release subagent refresh-bin (even --check) as modifying a protected shared resource, so refresh-bin --check is out of hub.full_suite and the executive's session refreshes .crew/bin on main after each merge
scope: 
source: 
supersedes:
tier: project
created: 2026-10-25
---

# Claude Code's auto-mode permission check denies a Release subagent refresh-bin (even --check) as modifying a protected shared resource, so refresh-bin --check is out of hub.full_suite and the executive's session refreshes .crew/bin on main after each merge

Found 2026-10-25 on P-029's release after the P-024 rollout (c3c468e); suite check dropped in 571ae57; retry Release's refresh-bin in a fresh session
