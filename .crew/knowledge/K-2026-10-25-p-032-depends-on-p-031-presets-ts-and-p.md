---
id: K-2026-10-25-p-032-depends-on-p-031-presets-ts-and-p
type: decision
title: P-032 depends on P-031 (presets.ts) and P-043 (runSuite, release.md); P-021 depends on P-031 and P-032 (presets.ts, model.ts, config.yaml) and its e2e and hub-skill globs are narrowed to exact files
scope: packages/crew/src/hub/core/team/presets.ts, packages/crew/src/hub/core/work/model.ts
source: P-032
supersedes:
tier: project
created: 2026-10-25
---

# P-032 depends on P-031 (presets.ts) and P-043 (runSuite, release.md); P-021 depends on P-031 and P-032 (presets.ts, model.ts, config.yaml) and its e2e and hub-skill globs are narrowed to exact files

Each pair edits the same lifecycle preset or flow and the later plan builds on the earlier one's gates; narrowing cannot separate one shared non-hub.shared file
