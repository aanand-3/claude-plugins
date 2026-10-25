---
id: K-2026-10-25-plan-status-lives-in-the-main-checkout
type: gotcha
title: Plan status lives in the main checkout; plan branches carry no hub copy that can lag
scope: packages/crew/src/hub/commands/team/team.ts
source: P-026
supersedes: K-2026-10-23-a-plan-file-on-main-can-lag-its-branch
tier: project
created: 2026-10-25
---

# Plan status lives in the main checkout; plan branches carry no hub copy that can lag

Since P-026 every hub write commits on the base branch in the main checkout, so start's move to in-progress is on main at once; staff no longer has to work around a plan file on main that lags its branch (K-2026-10-25-hub-documents-have-one-home-the-main).
