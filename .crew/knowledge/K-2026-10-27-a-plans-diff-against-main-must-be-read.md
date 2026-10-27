---
id: K-2026-10-27-a-plans-diff-against-main-must-be-read
type: gotcha
title: A plan's diff against main must be read as git diff main...HEAD (three dots): hub commits land on main while a plan is open, so a two-dot git diff --stat main also lists .crew/ plan and item files the plan never touched
scope: .crew/plans/**
source: P-082
supersedes:
tier: project
created: 2026-10-27
---

# A plan's diff against main must be read as git diff main...HEAD (three dots): hub commits land on main while a plan is open, so a two-dot git diff --stat main also lists .crew/ plan and item files the plan never touched

P-082 AC3 says git diff --stat main; the two-dot form showed 8 unrelated .crew/ files next to packages/crew/.gitignore
