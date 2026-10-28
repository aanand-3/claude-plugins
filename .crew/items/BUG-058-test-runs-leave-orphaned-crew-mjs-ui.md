---
id: BUG-058
type: bug
title: Test runs leave orphaned crew.mjs ui servers running
status: new
severity:
priority:
goal:
plan:
created: 2026-10-28
closed:
origin: P-092
---

# BUG-058: Test runs leave orphaned crew.mjs ui servers running

## Summary
Test runs and agents that start `crew.mjs ui` leave the server running when they finish, so orphaned hub UI servers pile up on the machine.

## Environment
Local, main at ff07cd8 and later, macOS on an 8-core Mac, 2026-10-28.

## Steps to reproduce
1. Run a land, or a targeted run of tests that start a hub UI (for example `npx vitest run test/tools/layout-sweep.test.ts`, including a run that fails or times out).
2. After it finishes, list processes: `ps -axo pid,ppid,etime,command | grep 'crew.mjs ui'`.

## Expected
No `crew.mjs ui --no-open --port 0` process outlives the test or agent that started it.

## Actual
On 2026-10-28, six orphaned servers had parent pid 1:
- one from the P-062 worktree's dist, alive for 1h40, since the 12:26 land suite;
- five from main's `plugins/crew/skills/hub/dist`, alive for 28–33 min, spawned during P-092's developer test runs (the layout-sweep proxy cases and the base-build checks).

Earlier the same day, three Designer screenshot servers from P-072 and two QA servers from P-078 were also left running.

## Evidence
`ps` listing taken by the executive's session before it stopped them: pids 24106, 50294, 51731, 80032, 81258 and 81901.

## Impact
Each idle server rebuilds the hub graph on every hub change, at about 16 s per build (BUG-050). Leaked servers add load that can push timing-sensitive tests past their limits (BUG-057), and they make every land slower. The workaround is to find and kill them by hand.

## Notes
Tests and agents that start a hub UI should stop it on every exit path, including failure and timeout.
- 2026-10-28: goal hint G-007 (by Arpit Anand)
- 2026-10-28: More evidence (executive's session, 10-28): 9 orphaned headless Chrome trees (63 processes) with parent pid 1 - 3 crew-sweep-* up for over a day, 1 crew-test-run-94046 (P-062 land suite, about 2 h), 5 probe-chrome-* (about 45-50 min, from the Architect's P-092 probe). Stopped. Architect's P-092 review also found sweepThroughProxy leaks hub, sweep and Chrome on vitest timeout.
