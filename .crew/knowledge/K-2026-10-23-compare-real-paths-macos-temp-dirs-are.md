---
id: K-2026-10-23-compare-real-paths-macos-temp-dirs-are
type: gotcha
title: Compare real paths: macOS temp dirs are reached through /var → /private/var
scope: packages/crew/src/hub/core/store.ts
source: 
supersedes:
tier: project
created: 2026-10-23
---

# Compare real paths: macOS temp dirs are reached through /var → /private/var

Drafts weren't consumed in tests because the draft path and the repo root differed only by the symlink; consume() compares realpathSync of both.
