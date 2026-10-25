---
id: K-2026-10-25-the-guard-injects-the-agents-role
type: gotcha
title: The guard injects the agent's role and run flags after every literal crew.mjs in an agent's Bash command, including text inside heredocs and inline scripts
scope: packages/crew/src/**, plugins/crew/skills/**
source: P-027
supersedes:
tier: project
created: 2026-10-25
---

# The guard injects the agent's role and run flags after every literal crew.mjs in an agent's Bash command, including text inside heredocs and inline scripts

An inline python or sed edit whose replacement text mentions crew.mjs gets the identity flags written into the source file (and a command that mentions the run flag is refused); write such edit scripts with the Write tool to a scratch file and run that
