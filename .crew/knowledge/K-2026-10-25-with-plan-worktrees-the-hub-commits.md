---
id: K-2026-10-25-with-plan-worktrees-the-hub-commits
type: decision
title: With plan worktrees, the hub commits a plan's code on its branch at every checkpoint and at hand-over to review; generated, .crew/ and secrets.files paths stay out, and Release still squashes to one commit
scope: packages/crew/src/hub/commands/work/execution.ts, packages/crew/src/hub/commands/work/review.ts, packages/crew/src/hub/commands/work/workflow.ts, plugins/crew/skills/hub/agents/developer.md
source: P-028
supersedes:
tier: project
created: 2026-10-25
---

# With plan worktrees, the hub commits a plan's code on its branch at every checkpoint and at hand-over to review; generated, .crew/ and secrets.files paths stay out, and Release still squashes to one commit

P-028 (W1-b): an approval must pin a commit that holds the reviewed code (BUG-014), and the done gate must see the plan's worktree from any checkout (CHORE-014 item 2). Hub-made commits keep the developer rule 'never git commit yourself' and keep generated files out (K-2026-10-24-release-builds-the-generated-files-plans). Squash on land keeps one commit per plan on the base (FEAT-022).
