---
id: K-2026-10-26-the-runner-lock-is-one-file-in-git
type: decision
title: The runner lock is one file in <git common dir>/crew/runner/ (try once, never wait), with the heartbeat and the current per-pass CREW_RUNNER token in state.json beside it; stale only on the same machine id when the pid is gone or its process start time differs; both use the lock module extracted to core/lock.ts that suite also uses
scope: packages/crew/src/hub/core/lock.ts, packages/crew/src/hub/commands/team/runner.ts, packages/crew/src/hub/commands/team/runnerlock.ts, packages/crew/src/hub/commands/work/suite.ts, packages/crew/src/hub/commands/team/guard.ts
source: P-066
supersedes:
tier: project
created: 2026-10-26
---

# The runner lock is one file in <git common dir>/crew/runner/ (try once, never wait), with the heartbeat and the current per-pass CREW_RUNNER token in state.json beside it; stale only on the same machine id when the pid is gone or its process start time differs; both use the lock module extracted to core/lock.ts that suite also uses

One runner per clone that every worktree and view can see; pid reuse after a reboot must not leave a lock stuck, and FEAT-064 reads the lock holder and token from the same place
