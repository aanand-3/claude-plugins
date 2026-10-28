---
id: CHORE-032
type: chore
title: Ignore packages/crew/.vitest/ so QA reporter output is never committed
status: done
priority: P2
goal: G-007
plan: P-082
created: 2026-10-26
closed: 2026-10-28
origin: P-062
---

# CHORE-032: Ignore packages/crew/.vitest/ so QA reporter output is never committed

## Summary
QA's --reporter=json/junit runs wrote packages/crew/.vitest/json/output.json and junit/output.xml, which checkpoints 672a8f0 and 1b5be25 committed on plan/P-062 and caused a review bounce. Add packages/crew/.vitest/ to .gitignore (and check the checkpoint staging honours it).

## Done when
- [ ]

## Notes
- 2026-10-26: status new → triaged — priority P2
- 2026-10-28: status triaged → done — delivered by P-082
