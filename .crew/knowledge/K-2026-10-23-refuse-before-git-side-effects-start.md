---
id: K-2026-10-23-refuse-before-git-side-effects-start
type: gotcha
title: Refuse before git side effects: start once made a branch and then refused
scope: packages/hub/src/commands/workflow.ts
source: 
supersedes:
tier: project
created: 2026-10-23
---

# Refuse before git side effects: start once made a branch and then refused

An open blocking question was checked inside move(), after start had run git switch -c, leaving a stray branch. Checks that can refuse go before any git call.
