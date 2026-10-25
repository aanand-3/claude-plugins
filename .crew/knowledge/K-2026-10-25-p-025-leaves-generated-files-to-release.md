---
id: K-2026-10-25-p-025-leaves-generated-files-to-release
type: decision
title: P-025 leaves generated files to Release, waits on P-023, and shares only cli.ts with P-021/P-024 without depends_on
scope: packages/crew/src/docs/**, packages/crew/src/hub/core/work/transition-gates.ts, packages/crew/src/hub/cli.ts, plugins/crew/docs/**
source: P-025
supersedes:
tier: project
created: 2026-10-25
---

# P-025 leaves generated files to Release, waits on P-023, and shares only cli.ts with P-021/P-024 without depends_on

Plans change source and tests only (K-2026-10-24-release-builds-the-generated-files-plans), so dist/** and .crew/bin/crew.mjs --as architect --run-id architect:a36c552371e21197a are out of P-025's touches, removing the P-022 and plugins/crew/skills/hub/** overlaps; doc blocks regenerate through npm run build, which P-023's hub.build runs at release, hence depends_on P-023. The remaining cli.ts overlap is one export keyword on the COMMANDS line, which P-021 and P-024 don't edit, so staffing sequences them and whichever lands second rebases. The gate map lives in core/work/transition-gates.ts (workflow.ts is at 283/300 lines and diagrams.ts must import only core for the UI).
