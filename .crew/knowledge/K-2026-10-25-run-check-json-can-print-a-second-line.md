---
id: K-2026-10-25-run-check-json-can-print-a-second-line
type: gotcha
title: run --check --json can print a second line after the JSON: when the goal queue moves the focus in a repo with plan_worktrees, the store's flush appends 'hub: committed on <base> (<sha>)' to stdout
scope: packages/crew/src/hub/commands/team/autonomy.ts
source: P-033
supersedes:
tier: project
created: 2026-10-25
---

# run --check --json can print a second line after the JSON: when the goal queue moves the focus in a repo with plan_worktrees, the store's flush appends 'hub: committed on <base> (<sha>)' to stdout

the focus move is a hub write committed at flush, after run() printed the JSON; a runner (P-034) parsing stdout as one JSON document should parse the first line only
