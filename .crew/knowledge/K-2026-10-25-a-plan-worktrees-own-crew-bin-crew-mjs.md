---
id: K-2026-10-25-a-plan-worktrees-own-crew-bin-crew-mjs
type: gotcha
title: A plan worktree's own .crew/bin/crew.mjs --as developer --run-id developer:a60138d3f67a3e5f0 can predate the hub refresh on main; run the main checkout's .crew/bin/crew.mjs --as developer --run-id developer:a60138d3f67a3e5f0 from the worktree, or checkpoint does not commit the plan's code. The checkpoint commit also skips .crew/config.yaml even when it is plan work (P-029 hub.shared), so Release must carry it into the plan's commit.
scope: .crew/**
source: P-029
supersedes:
tier: project
created: 2026-10-25
---

# A plan worktree's own .crew/bin/crew.mjs --as developer --run-id developer:a60138d3f67a3e5f0 can predate the hub refresh on main; run the main checkout's .crew/bin/crew.mjs --as developer --run-id developer:a60138d3f67a3e5f0 from the worktree, or checkpoint does not commit the plan's code. The checkpoint commit also skips .crew/config.yaml even when it is plan work (P-029 hub.shared), so Release must carry it into the plan's commit.

P-029 T7: worktree hub checkpoint made no commit; main hub committed c1e3c32 but left .crew/config.yaml uncommitted
