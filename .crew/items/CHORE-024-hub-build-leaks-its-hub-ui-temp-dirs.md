---
id: CHORE-024
type: chore
title: Hub build leaks its hub-ui temp dirs
status: done
priority: P2
goal: G-007
plan: P-046
created: 2026-10-25
closed: 2026-10-26
completed: 2026-10-26
---

# CHORE-024: Hub build leaks its hub-ui temp dirs

## Summary
bundlePage in packages/crew/build.mjs:55 makes a mkdtemp `hub-ui-*` output dir for each vite build and never
removes it, so each hub build leaves 2 dirs (ui.html and studio.html) in os.tmpdir(). Release found it after P-041.
It runs outside vitest, so P-041's test teardown does not catch it. Release, QA and every plan that rebuilds the hub
add to it; left alone it grows the same way BUG-025 did, more slowly.

## Done when
- [ ] A hub build (`node packages/crew/build.mjs`) leaves no new hub-ui-* dirs in os.tmpdir() (count before = after).
- [ ] The bundled ui.html and studio.html are unchanged.

## Notes
Related: BUG-025 (test suite temp-dir leak, fixed by P-041 in the tests only). This one is product/build code,
which P-041 explicitly left out. Likely fix: rmSync(outDir, { recursive: true, force: true }) in bundlePage's finally.
- 2026-10-25: status new → triaged — priority P2
- 2026-10-26: status triaged → done — delivered by P-046
