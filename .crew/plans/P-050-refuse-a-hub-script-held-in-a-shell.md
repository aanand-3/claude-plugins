---
id: P-050
title: Refuse a hub script held in a shell variable
goal: G-007
items: BUG-031
touches: packages/crew/src/hub/commands/team/hubcall.ts, packages/crew/test/hub/hubcall.test.ts
depends_on:
status: draft
branch: plan/P-050-refuse-a-hub-script-held-in-a-shell
pr:
created: 2026-10-26
started:
completed:
---

# P-050: Refuse a hub script held in a shell variable

## Context
BUG-031 (P1, goal G-007): some crew-agent hub calls reach the ledger with role null and run wt:<worktree>. Root cause
(reproduced 2026-10-26): agents keep the hub path in a shell variable, `C=<main>/.crew/bin/crew.mjs; node $C checkpoint …`.
`refusal()` in packages/crew/src/hub/commands/team/hubcall.ts denies a variable only as the command head (`$C …`), and
`hubWord()` only sees a literal `crew.mjs` script after a runtime, so `withIdentity` returns the command unchanged, the guard
prints nothing and the call runs without `--as` / `--run-id`. Expected: a hub call either carries identity or is refused.

## Scope
**In:**
- `refusal()` also returns the VARIABLE message when a runtime (node, bun, deno) head runs a script word that starts with `$`
  and the whole command names crew.mjs.
- Regression tests in the existing hubcall test file.

**Out (explicitly not doing):**
- Resolving variables to give them identity (the call must be literal).
- The hook failing open on a slow or failed guard, and the auto-mode classifier denials (the bug's knock-on); capture as
  separate items if still seen after this fix.
- Any change to the literal-form rewriting.

## Acceptance criteria
- [ ] AC1: `C=<path>/crew.mjs; node $C checkpoint …` (and the `bun` / `deno` / `"$C"` / `${C}` spellings) is denied by `withIdentity` with the VARIABLE message, so it never runs unattributed.
- [ ] AC2: the literal forms (`node .crew/bin/crew.mjs …`, absolute path, `cd … &&`, loops, a command not naming crew.mjs such as `node $X build.js`) behave as before: rewritten once, or unchanged.
- [ ] AC3: `npm run typecheck` passes in packages/crew and the hub test files (hubcall.test.ts, guard tests) pass.

## Approach
The assignment `C=…crew.mjs` and `node $C …` are separate simple commands, and `refusal(c)` sees one at a time, so it needs
the whole-command fact: compute `HUB.test(cmd)` once in `withIdentity` (already true there) and pass it to `refusal(c, hub)`.
In the RUNTIMES branch, find the first non-flag word after the head (same rule as `hubWord`); if its raw text matches
`/^"?\$[A-Za-z_{]/` and `hub` is true, return VARIABLE. Reuse the existing regex and message; no new concepts.

## Tasks
- [ ] T1: in hubcall.ts, make `refusal()` return VARIABLE for a runtime head whose script word is a `$VAR` while the command names crew.mjs → verify: `withIdentity("C=/x/.crew/bin/crew.mjs; node $C checkpoint P-1", flags)` returns a deny containing "variable".
- [ ] T2: in the existing hubcall tests, add the variable-script cases (denied, VARIABLE message) and keep literal-form cases green → verify: `npx vitest run test/hub/hubcall.test.ts` passes; the new cases fail without T1.

## Test plan
**Targeted checks:**
- packages/crew/test/hub/hubcall.test.ts (covers `withIdentity`): new cases in "hub calls the guard can't give identity to are refused" for `C=…; node $C …`, `bun`/`deno`, `"$C"`, `${C}` (AC1); a `node $X build.js` command without crew.mjs stays unchanged and the literal forms stay rewritten (AC2). These are the regression tests: they fail before T1.
- The guard test file that exercises `guard.ts` (find with `grep -l guard packages/crew/test/hub`), run in full (AC3).
- `npm run typecheck` in packages/crew (AC3).

## Rollout & rollback
n/a — internal guard change; revert the commit to back out.

## Risks & open questions
- A command that mentions crew.mjs only in text and runs `node $X script.js` elsewhere is now denied; acceptable (the guard errs toward refusing, and the message tells the agent to call the hub literally).

## Handoff

## Progress log

## Outcome
