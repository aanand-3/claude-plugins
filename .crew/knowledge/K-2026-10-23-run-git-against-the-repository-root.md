---
id: K-2026-10-23-run-git-against-the-repository-root
type: gotcha
title: Run git against the repository root, never the current directory
scope: packages/hub/src/core/git.ts
source: FEAT-001
supersedes:
tier: project
created: 2026-10-23
---

# Run git against the repository root, never the current directory

git ls-tree resolves paths from the cwd, so from a subdirectory the hub saw no other branches and reused IDs (a second CHORE-001). Store construction sets git.useRoot(root); every call gets -C root.
