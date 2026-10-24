---
id: K-2026-10-24-p-022-waits-on-p-020-rather-than
type: decision
title: P-022 waits on P-020 rather than narrowing its touches to dodge the overlap
scope: packages/crew/src/hub/core/text.ts, plugins/crew/skills/hub/dist/**
source: 
supersedes:
tier: project
created: 2026-10-24
---

# P-022 waits on P-020 rather than narrowing its touches to dodge the overlap

The slug fix must rebuild and commit dist/crew.mjs --as architect --run-id architect:a173e6610bdd97359 and dist/mcp.mjs with the source (bundle convention), and P-020 owns test/** and dist/**; concurrent bundle rebuilds always conflict. P-020 is already in review, so sequencing costs little. Existing -s- slugs are not migrated: slugs are computed only at creation and K-IDs are cited elsewhere.
