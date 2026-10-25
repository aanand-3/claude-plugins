---
id: P-042
title: Guard rewrites only the executed hub program
goal: G-007
items: BUG-017, CHORE-020
touches: packages/crew/src/hub/commands/team/guard.ts, packages/crew/test/hub/e2e/guard.test.ts
depends_on: P-030
status: draft
branch: plan/P-042-guard-rewrites-only-the-executed-hub
pr:
created: 2026-10-25
started:
completed:
---

# P-042: Guard rewrites only the executed hub program

## Context
BUG-017 (S2, P1, goal G-007): the guard (packages/crew/src/hub/commands/team/guard.ts, the rewrite near line 189)
adds the agent's role and run-id flags after every hub-executable word in a hub command segment, not only after the
program being run. It corrupts quoted hub arguments (learn/log/checkpoint text) and breaks a hub path held in a
shell variable. On 2026-10-25 it also did real damage: during P-039 QA a `bash <script> <args>` call whose argument
named the hub executable had the flags injected, shifting the script's positional arguments; the script ran in the
main checkout and made 9 commits on main (9839313..1dba548) over .crew/policy.yaml, config.yaml and .crew/bin. The
team paused and main was repaired in ecc446a. Notes: K-2026-10-25-the-guard-injects-its-role-and-run-flags,
K-2026-10-25-the-crew-guard-refuses-any-hub-call.
CHORE-020 (a git alias with `!` runs the hub with no identity) is in the same function (RUNNER detection) and the
same two files, so it rides along instead of becoming a second plan that conflicts on guard.ts.

## Scope
**In:**
- The guard injects identity only after the token that is the executed hub program (the segment's head after
  `node`), never into argument text, script arguments or a quoted string.
- A hub path held in a variable either works or is refused with a clear reason.
- CHORE-020: `!` (git alias shell escape) counts as a runner in the guard's RUNNER detection.
- Regression cases in packages/crew/test/hub/e2e/guard.test.ts: learn/log/checkpoint text naming the hub executable
  is stored as typed; `bash script <arg naming it>` is left unchanged; the variable form; the `!` alias.

**Out (explicitly not doing):**
- Any file other than the two in touches (no other guard-adjacent code, no agent text, no vendored .crew/bin refresh).
- Correcting the already-corrupted knowledge entries (K-2026-10-24-p-022-waits-on-p-020-rather-than and others):
  a separate hub cleanup.
- Restricting where QA scripts may run (a separate item if wanted).

## Acceptance criteria
- [ ] A hub call whose quoted argument names the hub executable is stored exactly as typed, with the identity flags
      added once after the executed program.
- [ ] `bash <script> <args>` with an argument naming the hub executable reaches the script with its arguments unchanged.
- [ ] A hub path held in a shell variable works or is refused with a clear reason.
- [ ] A git alias with `!` running the hub is given the identity (CHORE-020).
- [ ] Each case above has a test in guard.test.ts that fails on today's guard.ts.

## Approach
<!-- Architect -->

## Tasks
<!-- Architect -->

## Test plan
<!-- Architect -->

## Rollout & rollback
n/a for the source change; the vendored .crew/bin copy is refreshed by the next release (refresh-bin).

## Risks & open questions
- Whether CHORE-020 belongs here or in its own plan is the Architect's call; it shares the function, so splitting
  means two plans serialised on guard.ts.

## Handoff

## Progress log

## Outcome
