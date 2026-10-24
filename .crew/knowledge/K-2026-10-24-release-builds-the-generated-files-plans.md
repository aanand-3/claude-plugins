---
id: K-2026-10-24-release-builds-the-generated-files-plans
type: convention
title: Release builds the generated files; plans change source and tests only
scope: packages/crew/**, plugins/crew/skills/hub/dist/**, plugins/crew/skills/*/scripts/**, plugins/crew/skills/hub/agents/release.md, plugins/crew/skills/hub/agents/developer.md
source: P-023
supersedes: K-2026-10-23-rebuild-the-bundles-and-commit-them
tier: project
created: 2026-10-24
---

# Release builds the generated files; plans change source and tests only

Generated files (plugins/crew/skills/hub/dist/**, plugins/crew/skills/*/scripts/*.mjs) are marked linguist-generated in .gitattributes and are never in a plan's touches, so code plans stop serializing on them. A developer may run hub.build to exercise checks that run the bundle; Release discards those, brings the plan's branch up to the base, runs hub.build (.crew/config.yaml) and commits the result in the plan's one commit; hub.full_suite and CI then run the bundle check (test/dist.test.ts and git diff --exit-code -- plugins/crew/skills). Plans specced before P-023 (P-020, P-021, P-022) release as specced.
