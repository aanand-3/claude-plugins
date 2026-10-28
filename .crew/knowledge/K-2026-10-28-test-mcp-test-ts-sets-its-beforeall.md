---
id: K-2026-10-28-test-mcp-test-ts-sets-its-beforeall
type: gotcha
title: test/mcp.test.ts sets its beforeAll timeout to 120_000 inline, so vitest --hookTimeout does not lengthen it; under heavy machine load the sample-project setup exceeds it and all 6 tests skip
scope: packages/crew/test/mcp.test.ts
source: P-087
supersedes:
tier: project
created: 2026-10-28
---

# test/mcp.test.ts sets its beforeAll timeout to 120_000 inline, so vitest --hookTimeout does not lengthen it; under heavy machine load the sample-project setup exceeds it and all 6 tests skip

a developer or QA rerunning with --hookTimeout under load will see the same timeout and may mistake it for a code failure
