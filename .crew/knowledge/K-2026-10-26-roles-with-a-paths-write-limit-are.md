---
id: K-2026-10-26-roles-with-a-paths-write-limit-are
type: decision
title: Roles with a paths.write limit are refused inline and stdin interpreter scripts (python -c/-, node -e/-p, perl/ruby -e, php -r, an interpreter fed a pipe, heredoc or here-string), sh -c or shell stdin, and eval; developer and architect keep them. Script files and build tools stay a documented gap
scope: packages/crew/src/hub/commands/team/guard.ts, packages/crew/src/hub/commands/team/targets.ts
source: 
supersedes:
tier: project
created: 2026-10-26
---

# Roles with a paths.write limit are refused inline and stdin interpreter scripts (python -c/-, node -e/-p, perl/ruby -e, php -r, an interpreter fed a pipe, heredoc or here-string), sh -c or shell stdin, and eval; developer and architect keep them. Script files and build tools stay a documented gap

BUG-021: no parser can see what an inline script writes, and draft-only roles used one to rewrite hub items after the Edit tool was refused; refusing tightens a guardrail, so it is not reserved, and accepting the gap would contradict G-003's criterion
