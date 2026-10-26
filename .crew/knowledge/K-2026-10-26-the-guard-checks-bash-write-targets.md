---
id: K-2026-10-26-the-guard-checks-bash-write-targets
type: decision
title: The guard checks Bash write targets against paths.write, exempting /dev/*, the real os.tmpdir() and /tmp, and git checkout/restore operands; the Edit/Write path keeps refusing temp-dir files for those roles. Every variable in a target is expanded (known assignments, $(mktemp) as a temp path, for-loop words and last-segment glob matches per value) and any that stays unknown is refused
scope: packages/crew/src/hub/commands/team/guard.ts, packages/crew/src/hub/commands/team/targets.ts, packages/crew/src/hub/commands/team/hubcall.ts
source: 
supersedes:
tier: project
created: 2026-10-26
---

# The guard checks Bash write targets against paths.write, exempting /dev/*, the real os.tmpdir() and /tmp, and git checkout/restore operands; the Edit/Write path keeps refusing temp-dir files for those roles. Every variable in a target is expanded (known assignments, $(mktemp) as a temp path, for-loop words and last-segment glob matches per value) and any that stays unknown is refused

BUG-033/011/013: paths.write held only for the Edit tools; exempting temp dirs on the Edit path too would loosen a guardrail, which is reserved for the human
