---
id: K-2026-10-28-test-hub-e2e-inbox-test-ts-ui-api-inbox
type: gotcha
title: test/hub/e2e/inbox.test.ts 'ui: /api/inbox … (AC5)' sets an inline 30_000 ms timeout and takes ~30 s under heavy load (averages above 100), so it times out on main too; a timeout there alone is not evidence against a plan
scope: packages/crew/test/hub/e2e/inbox.test.ts
source: P-084
supersedes:
tier: project
created: 2026-10-28
---

# test/hub/e2e/inbox.test.ts 'ui: /api/inbox … (AC5)' sets an inline 30_000 ms timeout and takes ~30 s under heavy load (averages above 100), so it times out on main too; a timeout there alone is not evidence against a plan

P-084: it failed in the worktree and on main when both ran together at load ~180; it passed on main alone at load ~107
