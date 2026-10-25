---
id: K-2026-10-25-hub-commits-stay-ordinary-git-commits
type: decision
title: Hub commits stay ordinary git commits that run every hook; a project allows them on the base branch with a path rule in its own pre-commit (all staged paths under .crew/, as crew's git-setup hook does), and doctor probes that rule without committing (temp index + git hook run); the hub never uses --no-verify, plumbing or an allow-all variable
scope: packages/crew/src/hub/core/work/hubstate.ts, packages/crew/src/hub/commands/views/doctor.ts, plugins/crew/skills/git-setup/assets/githooks/**
source: SPIKE-005
supersedes:
tier: project
created: 2026-10-25
---

# Hub commits stay ordinary git commits that run every hook; a project allows them on the base branch with a path rule in its own pre-commit (all staged paths under .crew/, as crew's git-setup hook does), and doctor probes that rule without committing (temp index + git hook run); the hub never uses --no-verify, plumbing or an allow-all variable

SPIKE-005: crew's git-setup hooks already pass the hub's commit --only (verified), only foreign hooks that refuse every main commit fail; skipping hooks would defeat the project's protection, and editing a project's hooks is the human's call
