---
id: K-2026-10-25-don-t-symlink-node-modules-into
type: gotcha
title: Don't symlink node_modules into a scratch clone to run the build: esbuild then embeds the absolute resolved path in skill scripts (verify_evidence.mjs), so the bundle check reports a diff unrelated to the change. Run npm ci in the clone.
scope: packages/crew/build.mjs, plugins/crew/skills/*/scripts/**
source: P-023
supersedes:
tier: project
created: 2026-10-25
---

# Don't symlink node_modules into a scratch clone to run the build: esbuild then embeds the absolute resolved path in skill scripts (verify_evidence.mjs), so the bundle check reports a diff unrelated to the change. Run npm ci in the clone.

Found in P-023's AC1 dry run
