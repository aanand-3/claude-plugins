---
id: K-2026-10-26-the-guards-bash-secrets-check-matches
type: decision
title: The guard's Bash secrets check matches whole paths from the shell parser (words, option/assignment values, output and input redirects, globs; unlistable globs fail closed) and keeps the old token scan wherever text may be code or become arguments: arguments of every command except echo, printf, grep/rg, the hub and git -m values, and heredoc bodies unless fed to a data command (cat, tee, ...) in a line with no shell, interpreter, xargs, eval, source or read. Message unchanged. Lives in commands/team/secretrefs.ts (P-063)
scope: packages/crew/src/hub/commands/team/guard.ts, packages/crew/src/hub/commands/team/secretrefs.ts, packages/crew/src/hub/commands/team/targets.ts, packages/crew/src/hub/commands/team/hubcall.ts
source: 
supersedes:
tier: project
created: 2026-10-26
---

# The guard's Bash secrets check matches whole paths from the shell parser (words, option/assignment values, output and input redirects, globs; unlistable globs fail closed) and keeps the old token scan wherever text may be code or become arguments: arguments of every command except echo, printf, grep/rg, the hub and git -m values, and heredoc bodies unless fed to a data command (cat, tee, ...) in a line with no shell, interpreter, xargs, eval, source or read. Message unchanged. Lives in commands/team/secretrefs.ts (P-063)

BUG-042: prose naming a secrets file in heredoc bodies and hub-call text was refused, pushing agents to Edit/Write workarounds; only removing refusals for plainly-data text keeps real protection fail-closed
