---
id: K-2026-10-28-layout-sweep-waits-for-the-hub-ui
type: decision
title: layout_sweep waits for the hub UI to finish loading (no [aria-busy=true], 60 s deadline, exit 2 after it or on the UI's load-error page) before scanning a route, and scans board:backlog only once its Backlog tab is selected; it does not require app-specific route markers, so stub pages over --url still sweep
scope: packages/crew/src/tools/design/layout_sweep.ts, packages/crew/test/tools/layout-sweep.test.ts
source: 
supersedes:
tier: project
created: 2026-10-28
---

# layout_sweep waits for the hub UI to finish loading (no [aria-busy=true], 60 s deadline, exit 2 after it or on the UI's load-error page) before scanning a route, and scans board:backlog only once its Backlog tab is selected; it does not require app-specific route markers, so stub pages over --url still sweep

BUG-057: settle() accepted the loading skeleton as a settled page, so under load routes were scanned before the data arrived (missing or mislabelled #/board findings); waiting in tests cannot fix what the sweep scans, and a scan of a loading or error page must never read as clean
