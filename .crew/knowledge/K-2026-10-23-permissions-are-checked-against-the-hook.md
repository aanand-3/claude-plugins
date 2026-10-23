---
id: K-2026-10-23-permissions-are-checked-against-the-hook
type: gotcha
title: Permissions are checked against the hook's rewritten input: inject without changing the command's prefix
scope: plugins/crew/skills/guidelines/templates/settings.json
source: G-003
supersedes:
tier: project
created: 2026-10-23
---

# Permissions are checked against the hook's rewritten input: inject without changing the command's prefix

T0 spike: with Bash(touch a.txt) allowed, a PreToolUse rewrite to touch b.txt was refused — the permission check sees the rewritten command. Returning updatedInput with no permissionDecision applies the rewrite and leaves the normal permission flow intact (an unapproved write was still refused), so the guard never needs to — and must not — return allow. Insert --as/--run right after crew.mjs so allow rules like Bash(node .crew/bin/crew.mjs:*) keep matching; never prefix an export.
