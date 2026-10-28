---
id: K-2026-10-28-once-a-land-has-merged-main-into-a-plan
type: gotcha
title: Once a land has merged main into a plan branch and rebuilt .crew/bin/crew.mjs on it, a later land conflicts on .crew/bin/crew.mjs, which is in paths.protected, so the developer cannot finish the merge; while the merge is open the worktree's own hub CLI has conflict markers and every hub call there crashes
scope: .crew/bin/**, packages/crew/src/hub/commands/work/land.ts
source: P-066
supersedes:
tier: project
created: 2026-10-28
---

# Once a land has merged main into a plan branch and rebuilt .crew/bin/crew.mjs on it, a later land conflicts on .crew/bin/crew.mjs, which is in paths.protected, so the developer cannot finish the merge; while the merge is open the worktree's own hub CLI has conflict markers and every hub call there crashes

P-066's second land bounced this way; the developer had to abort the merge
