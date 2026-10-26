---
id: K-2026-10-26-b-keep-merge-conflicts
type: decision
title: B: keep merge conflicts with the developer, the only role that writes code. land bounces a conflicted plan to the developer (accepted -> in-progress); the developer resolves and checkpoints, the architect re-reviews the merge diff, QA re-checks, the PM re-accepts. Release never resolves conflicts and its paths.write is not widened. Fix BUG-036 by making Release's instructions say to let land bounce a conflict rather than resolve it.
scope: 
source: BUG-036
supersedes:
tier: project
created: 2026-10-26
---

# B: keep merge conflicts with the developer, the only role that writes code. land bounces a conflicted plan to the developer (accepted -> in-progress); the developer resolves and checkpoints, the architect re-reviews the merge diff, QA re-checks, the PM re-accepts. Release never resolves conflicts and its paths.write is not widened. Fix BUG-036 by making Release's instructions say to let land bounce a conflict rather than resolve it.

Answer to Q-544d38 (executive): Release cannot resolve merge conflicts since P-051 binds its Bash writes to paths.write. Choose A: widen release paths.write to plan worktrees, or B: keep conflicts with the developer (land already bounces conflicted plans there).
