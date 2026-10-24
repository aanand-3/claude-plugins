---
id: K-2026-10-24-release-runs-hub-full-suite-after-making
type: gotcha
title: Release runs hub.full_suite after making the plan's one commit, not before
scope: .crew/config.yaml, plugins/crew/skills/hub/agents/release.md
source: P-018
supersedes:
tier: project
created: 2026-10-24
---

# Release runs hub.full_suite after making the plan's one commit, not before

full_suite ends with git diff --exit-code -- plugins/crew/skills/hub/dist, which fails while the rebuilt dist is still uncommitted in the plan worktree (P-018)
