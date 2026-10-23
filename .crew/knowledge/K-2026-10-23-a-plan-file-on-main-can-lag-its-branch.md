---
id: K-2026-10-23-a-plan-file-on-main-can-lag-its-branch
type: gotcha
title: A plan file on main can lag its branch: staffing reads status from the ledger's last move and live claims
scope: packages/hub/src/commands/team.ts
source: 
supersedes:
tier: project
created: 2026-10-23
---

# A plan file on main can lag its branch: staffing reads status from the ledger's last move and live claims

start moves a plan to in-progress on its new plan branch, so main still says ready. staff (team.ts) treats a claimed plan as in-progress and otherwise uses the ledger's last move, or it would propose a plan another developer already holds.
