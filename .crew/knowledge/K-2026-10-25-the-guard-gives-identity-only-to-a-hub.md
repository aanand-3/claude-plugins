---
id: K-2026-10-25-the-guard-gives-identity-only-to-a-hub
type: decision
title: The guard gives identity only to a hub call it sees run: the executed program of a simple command (also inside $(...), backticks, subshells and groups); a hub path that is only an argument, quoted text or a heredoc body is left alone; a hub path in a variable or inside nested shell code (sh -c, eval, xargs, find -exec, node -e, a git ! alias, a heredoc fed to a shell) is refused with a reason
scope: packages/crew/src/hub/commands/team/guard.ts, packages/crew/src/hub/commands/team/hubcall.ts
source: 
supersedes:
tier: project
created: 2026-10-25
---

# The guard gives identity only to a hub call it sees run: the executed program of a simple command (also inside $(...), backticks, subshells and groups); a hub path that is only an argument, quoted text or a heredoc body is left alone; a hub path in a variable or inside nested shell code (sh -c, eval, xargs, find -exec, node -e, a git ! alias, a heredoc fed to a shell) is refused with a reason

BUG-017 incident: rewriting every hub-path word corrupted argument text and shifted a QA script's positional arguments, which then committed over policy files on main; refusing what it can't place keeps the guard fail-closed without corrupting commands (P-042)
