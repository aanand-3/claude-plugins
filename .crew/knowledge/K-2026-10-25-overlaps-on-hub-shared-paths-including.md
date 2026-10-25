---
id: K-2026-10-25-overlaps-on-hub-shared-paths-including
type: decision
title: Overlaps on hub.shared paths, including test files, never block staffing; there is no test-file special case in footprint.ts
scope: packages/crew/src/hub/core/work/footprint.ts, packages/crew/src/hub/commands/team/team.ts, packages/crew/src/hub/commands/views/checks.ts, .crew/config.yaml
source: SPIKE-004
supersedes:
tier: project
created: 2026-10-25
---

# Overlaps on hub.shared paths, including test files, never block staffing; there is no test-file special case in footprint.ts

SPIKE-004: test-only overlaps are new cases added to the same test file and usually merge cleanly; when they don't, the merge queue (P-032) sends the second plan back with the conflicting files, and the full suite at release catches a behaviour clash. Listing test globs (e.g. packages/crew/test/**/*.test.ts) in hub.shared covers this with the same mechanism as registries and docs, so footprint.ts needs one rule, not two. Test helpers and fixtures are not shared: they change behaviour for every test. A touch counts as shared only when it is a literal path a shared glob matches, or is itself a shared glob, so a broad glob like packages/crew/test/** still blocks and plans list exact files (FEAT-028).
