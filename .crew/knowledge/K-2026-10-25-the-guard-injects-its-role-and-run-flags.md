---
id: K-2026-10-25-the-guard-injects-its-role-and-run-flags
type: gotcha
title: The guard injects its role and run flags into 'bash <script> <args>' when an argument names crew.mjs, shifting the script's positional arguments; a QA script then ran in the main checkout and committed over .crew/policy.yaml, config.yaml and .crew/bin. Scripts take paths from environment variables, check every cd, and never run git add -A
scope: 
source: 
supersedes:
tier: project
created: 2026-10-25
---

# The guard injects its role and run flags into 'bash <script> <args>' when an argument names crew.mjs, shifting the script's positional arguments; a QA script then ran in the main checkout and committed over .crew/policy.yaml, config.yaml and .crew/bin. Scripts take paths from environment variables, check every cd, and never run git add -A

Incident on 2026-10-25 during P-039 QA: 9 commits 9839313..1dba548 on main; team paused for a human revert
