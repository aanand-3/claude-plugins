---
id: K-2026-10-26-the-ready-check-only-accepts-a-task-when
type: convention
title: The ready check only accepts a task when its verify arrow is on the task's first line: write each task as one line
scope: .crew/plans/**, packages/crew/src/hub/core/work/doc.ts, packages/crew/src/hub/core/work/gates.ts
source: 
supersedes:
tier: project
created: 2026-10-26
---

# The ready check only accepts a task when its verify arrow is on the task's first line: write each task as one line

Re-recorded from the unmerged branch claude/crew-bug-001-9d4b01 (3b7246a): Doc.checklist reads tasks line by line, so a task wrapped onto a second line before its verify arrow fails the ready check; still true on main (core/work/doc.ts, gates.ts).
