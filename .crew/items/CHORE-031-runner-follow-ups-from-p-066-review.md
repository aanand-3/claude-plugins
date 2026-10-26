---
id: CHORE-031
type: chore
title: Runner follow-ups from P-066 review
status: triaged
priority: P3
goal: G-007
plan:
created: 2026-10-26
closed:
---

# CHORE-031: Runner follow-ups from P-066 review

## Summary
Two minor points from the P-066 review: (1) status --write now puts the live **Runner:** line (pid, pass, age) into the generated status file, so each regeneration churns it; consider omitting it when writing. (2) A pass that ignores a forwarded SIGTERM/SIGHUP keeps the runner waiting until a second signal; SIGHUP from a closed terminal may also hit EIO on stdout. Neither blocks: a lock left behind by a crashed runner is taken over as stale.

## Done when
- [ ]

## Notes
- 2026-10-26: status new → triaged — priority P3
