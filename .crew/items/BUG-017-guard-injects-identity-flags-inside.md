---
id: BUG-017
type: bug
title: Guard injects identity flags inside quoted hub arguments
status: triaged
severity: S2
priority: P1
goal: G-007
plan: P-042
created: 2026-10-24
closed:
---

# BUG-017: Guard injects identity flags inside quoted hub arguments

## Summary
The guard injects `--as ROLE --run-id RUN` after every `crew.mjs` word in a hub command segment, including occurrences inside a quoted argument. A `learn … --why "… dist/crew.mjs and …"` call therefore stores the identity flags in the knowledge body, and a command that holds the hub path in a shell variable breaks. Replaces BUG-016, whose title blamed `learn`'s parsing; the cause is the guard's rewrite.

## Environment
main at 152650b; packages/crew/src/hub/commands/team/guard.ts line 189 (`part.replace(/(\bcrew\.mjs)(?=["'\s]|$)/g, …)`); any crew agent running a hub command through Bash.

## Steps to reproduce
1. As a crew agent, run `node .crew/bin/crew.mjs learn decision "X" --why "rebuild dist/crew.mjs and dist/mcp.mjs"`.
2. Open the new knowledge file.
3. Separately, run `C="node .crew/bin/crew.mjs"; $C next`.

## Expected
The identity flags are added once, right after the executable path being run; argument text is stored as typed, and the variable form either works or is refused with a clear reason.

## Actual
The body reads `dist/crew.mjs --as architect --run-id architect:… and dist/mcp.mjs`. The variable form fails with `no such file or directory: node .crew/bin/crew.mjs --as pm --run-id pm:…` (the rewrite lands inside the assignment's quoted string, so `$C` expands to one word).

## Evidence
.crew/knowledge/K-2026-10-24-p-022-waits-on-p-020-rather-than.md body, first sentence. The variable-form failure was reproduced by the PM on 2026-10-24.

## Impact
Every agent-written knowledge entry, log or item text that mentions `crew.mjs` is corrupted with run ids; workaround: avoid the word `crew.mjs` in argument text and call the hub literally.

## Notes
Fix in the guard: rewrite only the token that is the executed program (the segment's head after `node`), not later matches. The corrupted K entry needs its body corrected once fixed.
- 2026-10-24: status new → triaged — priority P2, severity S3
- 2026-10-25: More evidence: the injected identity flags (role and run id) also land inside log and checkpoint arguments, not only learn bodies. P-022's QA log of 2026-10-24 18:49 has them right after the vendored hub path in its note text; P-023's QA checkpoints (AC1 note, AC2 recall check) carry them twice inside the quoted command. See ledger --ref P-022 and ledger --ref P-023.
- 2026-10-25: INCIDENT 2026-10-25 (escalated from S3/P2): during P-039 QA a bash script call whose argument named the hub executable had the guard's role and run-id flags injected after that word, shifting the script's positional arguments. The script then ran in the main checkout and made 9 commits on main (9839313..1dba548) over .crew/policy.yaml, config.yaml and .crew/bin; the team was paused and main was repaired in ecc446a. Same root cause as this report (the guard rewrites every hub-executable word in the segment, not only the program being run), now hitting script arguments as well as quoted hub arguments. See K-2026-10-25-the-guard-injects-its-role-and-run-flags and K-2026-10-25-the-crew-guard-refuses-any-hub-call.
- 2026-10-25: re-triaged: priority P1, severity S2
- 2026-10-25: Also broken by the guard's rewrite (reported by P-039's QA, 2026-10-25): a Bash command that starts with an env assignment, VAR=value <cmd> …, gets its arguments shifted the same way. P-042 should cover it.
