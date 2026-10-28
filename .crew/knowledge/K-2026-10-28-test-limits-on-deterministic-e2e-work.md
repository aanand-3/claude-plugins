---
id: K-2026-10-28-test-limits-on-deterministic-e2e-work
type: decision
title: Test limits on deterministic e2e work are hang deadlines: vitest testTimeout and hookTimeout 300 s, Repo.run kills a child after 300 s with a 'timed out' error; resume/context summarise a failing check as its FAIL line plus first error line, never the last line
scope: packages/crew/vitest.config.ts, packages/crew/test/helpers/repo.ts, packages/crew/src/hub/commands/work/**
source: 
supersedes:
tier: project
created: 2026-10-28
---

# Test limits on deterministic e2e work are hang deadlines: vitest testTimeout and hookTimeout 300 s, Repo.run kills a child after 300 s with a 'timed out' error; resume/context summarise a failing check as its FAIL line plus first error line, never the last line

BUG-055: 10 s hook default, 60 s spawn kill and 30 s per-test overrides failed fine code under load from parallel agents, and the last line of vitest output is decoration
