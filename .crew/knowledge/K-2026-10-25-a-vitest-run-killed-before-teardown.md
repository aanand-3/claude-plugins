---
id: K-2026-10-25-a-vitest-run-killed-before-teardown
type: gotcha
title: A vitest run killed before teardown leaves its crew-test-run-<pid>-* root in TMPDIR; the next run's globalSetup sweeps roots whose pid is dead, so leftovers clear themselves on the next run
scope: packages/crew/test/setup/**, packages/crew/vitest.config.ts
source: P-041
supersedes:
tier: project
created: 2026-10-25
---

# A vitest run killed before teardown leaves its crew-test-run-<pid>-* root in TMPDIR; the next run's globalSetup sweeps roots whose pid is dead, so leftovers clear themselves on the next run

Seen during P-041 mutation check; avoids anyone hand-deleting roots of live parallel runs
