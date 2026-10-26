---
id: BUG-050
type: bug
title: Hub ui stops answering while agents work: every change rebuilds the 16 s graph synchronously
status: triaged
severity: S2
priority: P1
goal: G-007
plan:
created: 2026-10-26
closed:
---

# BUG-050: Hub ui stops answering while agents work: every change rebuilds the 16 s graph synchronously

## Summary
With agents active, the hub ui stops answering: the Inbox page stays on "Loading the Inbox", recent activity goes blank, and `/api/inbox` and `/api/activity` time out. Every ledger or activity write sends a `change` event; the page refetches `/api/graph` and `/api/activity`, and `/api/graph` rebuilds the whole graph synchronously in about 16 s. Changes arrive faster than one rebuild finishes, so requests queue on the one event loop and the inbox never gets a turn.

## Environment
main with `.crew/bin` from 25fd09e (P-063), macOS, Node 26.5, `crew.mjs ui --port 8765`, unattended runner plus 3–5 agents working. Ledger 3,881 lines (3.2 MB), activity 8,000 lines (1.2 MB).

## Steps to reproduce
1. Run `node .crew/bin/crew.mjs ui --port 8765` while the runner has several agents working.
2. Open the Inbox page, or watch Overview's recent activity, for a few minutes.
3. `curl --max-time 60 http://127.0.0.1:8765/api/inbox`.

## Expected
The ui stays live: `/api/inbox` answers in well under a second, and activity keeps showing while agents work.

## Actual
`/api/inbox` and `/api/activity` both time out at 60 s. The server sits at ~31% CPU with its main thread inside one synchronous request handler. The browser shows hundreds of `/api/graph` and `/api/activity` requests, many unanswered.

## Evidence
- `export --json` (same `buildGraph`) takes 16.05 s wall, 6.1 s user; `inbox` from the CLI takes 0.75 s.
- CPU profile of that build (15.6 s total): `buildGraph` 14.7 s → `findings` 13.3 s, of which `git` via `spawnSync` 8.3 s (`planHome` → `currentBranch`, one git process per plan per build) and `knowledge` 4.6 s, almost all in `globRe` 4.1 s (glob-to-regex recompiled on every comparison). `drift` 3.5 s.
- `sample` of the ui process: 1442/1442 samples in one JS call from `on_headers_complete`, in `Array.prototype.some` → `String.prototype.replace` → regexp compile.
- `server.ts`: `/api/graph` calls `buildGraph(open())` per request with no cache; every write under the ledger dir triggers `notify()` (150 ms debounce only).

## Impact
G-007's outcome ("the human can watch every agent live in the hub and answer what only they decide from the hub") fails exactly when the team is busy. Workaround: `crew.mjs status` and `crew.mjs inbox` from a terminal.

## Notes
Directions, not a spec: cache git answers (branch per worktree) and compiled glob regexes for the length of one build; skip or cache `findings` when no hub document changed (activity-only writes shouldn't rebuild the graph); serve `/api/inbox` without building the graph; coalesce rebuilds so at most one runs and the latest result is reused.
- 2026-10-26: status new → triaged — priority P1, severity S2
