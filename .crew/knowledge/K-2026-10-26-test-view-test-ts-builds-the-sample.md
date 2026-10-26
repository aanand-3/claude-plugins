---
id: K-2026-10-26-test-view-test-ts-builds-the-sample
type: gotcha
title: test/view.test.ts builds the sample project (about 80 hub calls) inside a beforeAll with the default 120000 ms hookTimeout, so it times out on main too when the machine is heavily loaded; a timeout there alone is not evidence against a plan
scope: packages/crew/test/view.test.ts, packages/crew/scripts/sample-project.mjs
source: 
supersedes:
tier: project
created: 2026-10-26
---

# test/view.test.ts builds the sample project (about 80 hub calls) inside a beforeAll with the default 120000 ms hookTimeout, so it times out on main too when the machine is heavily loaded; a timeout there alone is not evidence against a plan

P-064's land bounced on it; on 2026-10-26 it timed out alone on main (139.8 s) and in the P-064 worktree (121.7 s) with load averages 213/169/118
