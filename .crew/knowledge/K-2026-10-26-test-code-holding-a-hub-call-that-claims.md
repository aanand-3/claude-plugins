---
id: K-2026-10-26-test-code-holding-a-hub-call-that-claims
type: gotcha
title: Test code holding a hub call that claims another role (the as-flag with qa, pm...) cannot be written through a Bash heredoc or inline python: the guard refuses the whole command. Use the Edit or Write tool for such fixtures
scope: packages/crew/test/**
source: 
supersedes:
tier: project
created: 2026-10-26
---

# Test code holding a hub call that claims another role (the as-flag with qa, pm...) cannot be written through a Bash heredoc or inline python: the guard refuses the whole command. Use the Edit or Write tool for such fixtures

the guard scans the full Bash command text for role claims, heredoc bodies included
