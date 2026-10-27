---
id: K-2026-10-27-land-no-id-with-two-or-more-landable
type: decision
title: land (no ID) with two or more landable plans stacks them in merge order as one squash commit each on a fresh detached candidate worktree (.claude/worktrees/land-batch-<pid>, hub.setup installs it), rebuilt per commit, runs hub.full_suite once on the tip, and fast-forwards the base to the chain re-parented on the current base via merge-tree; a conflict or build failure against earlier batch plans drops a plan to the next batch without a bounce (at position 1 it bounces as today); a red suite bisects prefixes, bounces the first red one's plan, lands the green prefix and retries the rest in the next batch; single plans and land P-### keep today's path; suites records carry plans
scope: packages/crew/src/hub/commands/work/land.ts, packages/crew/src/hub/commands/work/land-steps.ts, packages/crew/src/hub/commands/work/batch.ts, packages/crew/src/hub/commands/work/suite.ts
source: P-079
supersedes:
tier: project
created: 2026-10-27
---

# land (no ID) with two or more landable plans stacks them in merge order as one squash commit each on a fresh detached candidate worktree (.claude/worktrees/land-batch-<pid>, hub.setup installs it), rebuilt per commit, runs hub.full_suite once on the tip, and fast-forwards the base to the chain re-parented on the current base via merge-tree; a conflict or build failure against earlier batch plans drops a plan to the next batch without a bounce (at position 1 it bounces as today); a red suite bisects prefixes, bounces the first red one's plan, lands the green prefix and retries the rest in the next batch; single plans and land P-### keep today's path; suites records carry plans

FEAT-071: one 11-22 min suite per plan queued four accepted plans for about an hour; one run per batch with O(log n) bisect on red keeps conflicts and failures with the developer who owns them
