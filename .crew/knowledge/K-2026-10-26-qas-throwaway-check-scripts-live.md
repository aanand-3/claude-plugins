---
id: K-2026-10-26-qas-throwaway-check-scripts-live
type: decision
title: QA's throwaway check scripts live in the main checkout's .crew/scratch/P-###/: gitignored via .crew/.gitignore, excluded from commitWork (NOT_CODE), writable only by QA among drafts-only roles, removed when the plan moves to done or dropped
scope: .crew/scratch/**, packages/crew/src/hub/core/team/presets.ts, packages/crew/src/hub/core/git.ts, packages/crew/src/hub/commands/work/workflow.ts, plugins/crew/skills/hub/agents/qa.md
source: P-068
supersedes:
tier: project
created: 2026-10-26
---

# QA's throwaway check scripts live in the main checkout's .crew/scratch/P-###/: gitignored via .crew/.gitignore, excluded from commitWork (NOT_CODE), writable only by QA among drafts-only roles, removed when the plan moves to done or dropped

drafts/ is for documents that become hub documents; scripts there piled up and needed manual cleanup (CHORE-029)
