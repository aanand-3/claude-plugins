---
id: K-2026-10-26-specced-as-p-078-ready-items-bug-050-no
type: decision
title: Specced as P-078 (ready; items BUG-050; no dependencies). Fix: (1) globRe memoizes its RegExp per glob (the 4.1 s); (2) Store.branch() asks git once per Store, used by planHome and branchPlans (the per-plan spawnSync, 8.3 s); (3) the ui builds the graph off its event loop in an async child process (export --json) through a new LiveGraph that coalesces builds (one running, one queued, waiters share it), reuses the last graph while nothing changed, and does not invalidate on activity-feed appends. ACs: /api/inbox and /api/activity answer in <500 ms during a 2 s build; 5 concurrent /api/graph = 1 build; export --json at most half today's wall time. Touches: src/hub/server.ts, src/hub/livegraph.ts (new), core/memory/knowledge.ts, core/store.ts, test/hub/livegraph.test.ts (new), test/hub/e2e/live-ui.test.ts. server.ts also changes in P-072 (in review): different hunks, merge queue resolves.
scope: packages/crew/src/hub/server.ts, packages/crew/src/hub/livegraph.ts
source: BUG-050
supersedes:
tier: project
created: 2026-10-26
---

# Specced as P-078 (ready; items BUG-050; no dependencies). Fix: (1) globRe memoizes its RegExp per glob (the 4.1 s); (2) Store.branch() asks git once per Store, used by planHome and branchPlans (the per-plan spawnSync, 8.3 s); (3) the ui builds the graph off its event loop in an async child process (export --json) through a new LiveGraph that coalesces builds (one running, one queued, waiters share it), reuses the last graph while nothing changed, and does not invalidate on activity-feed appends. ACs: /api/inbox and /api/activity answer in <500 ms during a 2 s build; 5 concurrent /api/graph = 1 build; export --json at most half today's wall time. Touches: src/hub/server.ts, src/hub/livegraph.ts (new), core/memory/knowledge.ts, core/store.ts, test/hub/livegraph.test.ts (new), test/hub/e2e/live-ui.test.ts. server.ts also changes in P-072 (in review): different hunks, merge queue resolves.

Answer to Q-e42acb (architect): Executive ask (Q-b27342): spec the fix for BUG-050 from the evidence in the item (16 s buildGraph; findings 13.3 s: per-plan git spawnSync 8.3 s, globRe 4.1 s). Goal: the ui keeps answering while the team is busy. Move the plan to ready once the PM has opened it.
