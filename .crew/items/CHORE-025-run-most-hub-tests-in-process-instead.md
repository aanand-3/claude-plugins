---
id: CHORE-025
type: chore
title: Run most hub tests in-process instead of spawning the bundle
status: triaged
priority: P3
goal:
plan:
created: 2026-10-25
closed:
---

# CHORE-025: Run most hub tests in-process instead of spawning the bundle

## Summary
Most hub tests spawn a fresh node process on the 527 KB dist/crew.mjs --as pm --run-id pm:afd92e802ab9f4580 per hub call (about 485 tr() call sites, 82 repo.node(), plus git init/commit per Repo.create) across 371 tests. Running them through cli.ts main(argv, open) in-process, keeping a small e2e set that spawns the real bundle, would cut suite time and load far more than capping workers. Follow-up to BUG-028, which only locks and caps. Also consider one shared sample-project fixture per file.

## Done when
- [ ] Most hub tests call cli.ts main(argv, open) in-process; a small named e2e set still spawns the bundle
- [ ] Full suite wall time and peak load are measurably lower than the durations recorded by BUG-028's plan

## Notes
- 2026-10-25: status new → triaged — priority P3
