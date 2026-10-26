---
id: K-2026-10-26-land-records-a-landing-before-cleanup
type: decision
title: land records a landing before cleanup: after the squash is on the base, landed() logs 'landed on <base> as <sha>' first; worktree removal, branch deletion and dependant updates never throw, and a cleanup failure is a warning with exit 0. A failed git worktree remove may be finished only by deleting the plan's own worktree folder when every leftover is OS junk (.DS_Store, ._*, Thumbs.db, desktop.ini, the worktree's .git file, empty dirs), then git worktree prune; any other leftover keeps the folder and is reported
scope: packages/crew/src/hub/commands/work/land.ts
source: 
supersedes:
tier: project
created: 2026-10-26
---

# land records a landing before cleanup: after the squash is on the base, landed() logs 'landed on <base> as <sha>' first; worktree removal, branch deletion and dependant updates never throw, and a cleanup failure is a warning with exit 0. A failed git worktree remove may be finished only by deleting the plan's own worktree folder when every leftover is OS junk (.DS_Store, ._*, Thumbs.db, desktop.ini, the worktree's .git file, empty dirs), then git worktree prune; any other leftover keeps the folder and is reported

BUG-040: Finder recreating .DS_Store made git worktree remove fail after P-057's squash, and land reported a landed plan as not landed, skipping the log, branch deletion and dependants
