---
id: K-2026-10-25-the-crew-guard-reads-text-inside-a-bash
type: gotcha
title: The crew guard reads text inside a Bash heredoc as shell redirects: a '>' or a path-like string in the heredoc body (a regex, a JS arrow) can be refused as a write outside the repository
scope: .crew/**, packages/crew/src/hub/commands/team/guard.ts
source: P-030
supersedes:
tier: project
created: 2026-10-25
---

# The crew guard reads text inside a Bash heredoc as shell redirects: a '>' or a path-like string in the heredoc body (a regex, a JS arrow) can be refused as a write outside the repository

P-030: python heredocs editing TS files containing regexes and '=>' were refused with 'writes to /^\s+...' and 'writes to /scripts'; writing the script with the Write tool or editing with Edit works
