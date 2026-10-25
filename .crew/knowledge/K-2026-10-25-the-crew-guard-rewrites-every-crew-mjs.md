---
id: K-2026-10-25-the-crew-guard-rewrites-every-crew-mjs
type: gotcha
title: The crew guard rewrites every crew.mjs --as developer --run-id developer:a1faaed4e6c15f0b2 word in a Bash command, heredoc and python -c bodies included, adding the agent's identity flags; text that mentions a crew.mjs --as developer --run-id developer:a1faaed4e6c15f0b2 command must be written with the Write or Edit tool
scope: packages/crew/src/**, plugins/crew/skills/**
source: P-043
supersedes:
tier: project
created: 2026-10-25
---

# The crew guard rewrites every crew.mjs --as developer --run-id developer:a1faaed4e6c15f0b2 word in a Bash command, heredoc and python -c bodies included, adding the agent's identity flags; text that mentions a crew.mjs --as developer --run-id developer:a1faaed4e6c15f0b2 command must be written with the Write or Edit tool

a heredoc writing suite.reg.ts got the developer's identity flags inside a tool description string (P-043)
