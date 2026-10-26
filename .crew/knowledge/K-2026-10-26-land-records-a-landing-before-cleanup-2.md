---
id: K-2026-10-26-land-records-a-landing-before-cleanup-2
type: decision
title: land records a landing before cleanup, then finishes a failed git worktree remove safely: only after the squash is on the base and only while git lists that exact path as the plan's worktree on its plan/P-### branch, it sweeps OS junk and retries the removal up to 3 times; then P-061's junk-only delete; then a full delete plus git worktree prune only when nothing can be lost (no status entry but tracked deletions and OS junk, branch merged or squash-merged into the base, every ignored file regenerable - node_modules, dist, build, coverage, .cache, __pycache__, *.tsbuildinfo - and none matching policy secrets.files); never following symlinks; any doubt or error keeps the folder and warns
scope: packages/crew/src/hub/commands/work/land.ts, packages/crew/src/hub/commands/work/worktree-cleanup.ts
source: P-062
supersedes: K-2026-10-26-land-records-a-landing-before-cleanup
tier: project
created: 2026-10-26
---

# land records a landing before cleanup, then finishes a failed git worktree remove safely: only after the squash is on the base and only while git lists that exact path as the plan's worktree on its plan/P-### branch, it sweeps OS junk and retries the removal up to 3 times; then P-061's junk-only delete; then a full delete plus git worktree prune only when nothing can be lost (no status entry but tracked deletions and OS junk, branch merged or squash-merged into the base, every ignored file regenerable - node_modules, dist, build, coverage, .cache, __pycache__, *.tsbuildinfo - and none matching policy secrets.files); never following symlinks; any doubt or error keeps the folder and warns

BUG-041: a removal that fails early (Finder rewriting .DS_Store) left the folder and its registration for manual cleanup before done; deleting is irreversible, so the test is conservative and lives in commands/work/worktree-cleanup.ts
