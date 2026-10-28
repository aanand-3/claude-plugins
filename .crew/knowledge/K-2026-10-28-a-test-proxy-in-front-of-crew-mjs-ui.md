---
id: K-2026-10-28-a-test-proxy-in-front-of-crew-mjs-ui
type: gotcha
title: A test proxy in front of crew.mjs ui must rewrite the Host header to the hub's own host:port: the server answers any other Host with 403 (its DNS-rebinding guard), so the sweep's api/graph fetch got an error body and failed with 'Cannot read properties of undefined'
scope: packages/crew/test/**, packages/crew/src/hub/server.ts
source: P-092
supersedes:
tier: project
created: 2026-10-28
---

# A test proxy in front of crew.mjs ui must rewrite the Host header to the hub's own host:port: the server answers any other Host with 403 (its DNS-rebinding guard), so the sweep's api/graph fetch got an error body and failed with 'Cannot read properties of undefined'

P-092's proxy cases failed until the proxy set host to the target's host
