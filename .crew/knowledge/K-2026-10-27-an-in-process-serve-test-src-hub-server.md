---
id: K-2026-10-27-an-in-process-serve-test-src-hub-server
type: gotcha
title: An in-process serve() test (src/hub/server.ts) has no ui.html next to SCRIPT_DIR, so GET / fails and the page token is unreachable; stage the shell on the served Store without flushing: store.ws.write(join(SCRIPT_DIR, UI_FILE), DATA_SLOT)
scope: packages/crew/test/**, packages/crew/src/hub/server.ts
source: P-078
supersedes:
tier: project
created: 2026-10-27
---

# An in-process serve() test (src/hub/server.ts) has no ui.html next to SCRIPT_DIR, so GET / fails and the page token is unreachable; stage the shell on the served Store without flushing: store.ws.write(join(SCRIPT_DIR, UI_FILE), DATA_SLOT)

P-078's AC6 POST test needed the hub-token from the page; renderHtmlShell reads through the Workspace, which serves staged writes
