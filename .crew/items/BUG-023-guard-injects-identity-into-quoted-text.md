---
id: BUG-023
type: bug
title: Guard injects identity into quoted text that mentions the hub CLI
status: duplicate
severity:
priority:
goal:
plan:
created: 2026-10-25
closed: 2026-10-25
---

# BUG-023: Guard injects identity into quoted text that mentions the hub CLI

## Summary
The guard's identity injection rewrites every `crew.mjs` word in a hub-running shell segment, including occurrences inside quoted argument text. Free text recorded through the hub (checkpoint `--verify`, `log`, `ask`) comes out with ` --as <role> --run-id <run>` spliced into it.

## Environment
P-026 worktree at 5fd068b plus the uncommitted P-026 changes, local, macOS. The code is `packages/crew/src/hub/commands/team/guard.ts` `decide`, the identity block (`part.replace(/(\bcrew\.mjs)(?=["'\s]|$)/g, ...)`). P-026 did not change it; the behaviour is older than P-026.

## Steps to reproduce
1. As a crew subagent (for example crew-qa), run through Bash:
   `node .crew/bin/crew.mjs checkpoint P-026 --verify "piped payloads to the built crew.mjs guard" --result pass --ac 5`
2. Read the recorded checkpoint text (the command's output, or `crew.mjs context P-026` / the event ledger).

## Expected
Only the leading `crew.mjs` that runs the hub gets `--as qa --run-id qa:…`. The quoted text is recorded exactly as written.

## Actual
The recorded text reads `piped payloads to the built crew.mjs --as qa --run-id qa:a873c497045163fb1 guard`. The global regex also matches the `crew.mjs` inside the quoted argument.

## Evidence
The P-026 checkpoint recorded on 2026-10-25 for AC5 (QA's `--verify` entry) has the injected flags inside its description.

## Impact
Any agent's hub free text that mentions `crew.mjs` gets the flags spliced in, and the run id ends up in evidence and log text. Workaround: don't write the literal `crew.mjs` in argument text.

## Notes
Fix direction: inject only after the first `crew.mjs` token that `runsHub`/`hubCommand` identifies as the executable, not after every match in the segment.
- 2026-10-25: status new → duplicate — Duplicate of BUG-017 (triaged P2): same cause, the guard's global replace of every hub CLI word in a hub segment (guard.ts decide identity block), same symptom of identity flags spliced into quoted argument text. BUG-023's P-026 AC5 checkpoint text is further evidence for BUG-017.
