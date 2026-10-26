---
id: K-2026-10-26-the-guards-shell-parser-hubcall-ts-parse
type: gotcha
title: The guard's shell parser (hubcall.ts parse) ends a simple command at every ( and ), so name() and a case arm's pattern) become commands of their own, and a function or arm body starts a fresh command. Prefix skipping (skipPrefix) only needs function NAME and case WORD in PATTERN
scope: packages/crew/src/hub/commands/team/*.ts
source: 
supersedes:
tier: project
created: 2026-10-26
---

# The guard's shell parser (hubcall.ts parse) ends a simple command at every ( and ), so name() and a case arm's pattern) become commands of their own, and a function or arm body starts a fresh command. Prefix skipping (skipPrefix) only needs function NAME and case WORD in PATTERN

P-058 found three of BUG-012's five repros already denied on the base. Anyone extending cd tracking or hub-call detection should test against parse() output rather than assume shell grammar
