---
id: P-050
title: Refuse a hub script held in a shell variable
goal: G-007
items: BUG-031
touches: packages/crew/src/hub/commands/team/hubcall.ts, packages/crew/test/hub/hubcall.test.ts
depends_on:
status: in-review
branch: plan/P-050-refuse-a-hub-script-held-in-a-shell
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
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
  (`$C`, `"$C"`, `${C}`). It only runs on commands that name crew.mjs (`withIdentity` returns early otherwise), so no extra
  input is needed.
- Regression tests in the existing hubcall test file.

**Out (explicitly not doing):**
- Resolving variables to give them identity (the call must be literal).
- The hook failing open on a slow or failed guard, and the auto-mode classifier denials (the bug's knock-on); capture as
  separate items if still seen after this fix.
- Any change to the literal-form rewriting.

## Acceptance criteria
- [ ] AC1: `C=<path>/crew.mjs; node $C checkpoint …` (and the `bun` / `deno` / `"$C"` / `${C}` spellings) is denied by `withIdentity` with the VARIABLE message, so it never runs unattributed.
- [ ] AC2: the literal forms (`node .crew/bin/crew.mjs …`, absolute path, `cd … &&`, loops, a command not naming crew.mjs such as `node $X build.js`) behave as before: rewritten once, or unchanged.
- [ ] AC3: `npm run typecheck` passes in packages/crew, and `npx vitest run test/hub/hubcall.test.ts test/hub/e2e/guard.test.ts` passes there.

## Approach
The assignment `C=…crew.mjs` and `node $C …` are separate simple commands, and `refusal(c)` sees one at a time. The
whole-command fact is already established: `withIdentity` returns `{ command }` unchanged when `!HUB.test(cmd)`, so every
call to `refusal` is for a command that names crew.mjs. No parameter and no assignment tracking (Architect, 2026-10-26):
in the RUNTIMES branch, take the first non-flag word after the head (same rule as `hubWord`); if its raw text matches the
existing `/^"?\$[A-Za-z_{]/`, return VARIABLE. Update `refusal`'s doc comment to say it is only called once the command
names crew.mjs. Reuse the existing regex and message; no new concepts. hubcall.ts stays under 300 lines.

## Tasks
- [x] T1: in hubcall.ts, make `refusal()` return VARIABLE for a runtime head whose script word is a `$VAR` while the command names crew.mjs → verify: `withIdentity("C=/x/.crew/bin/crew.mjs; node $C checkpoint P-1", flags)` returns a deny containing "variable".
- [x] T2: in the existing hubcall tests, add the variable-script cases (denied, VARIABLE message) and keep literal-form cases green → verify: `npx vitest run test/hub/hubcall.test.ts` passes; the new cases fail without T1.

## Test plan
**Targeted checks:**
- packages/crew/test/hub/hubcall.test.ts (covers `withIdentity`): new cases in "hub calls the guard can't give identity to are refused" for `C=…; node $C …`, `bun`/`deno`, `"$C"`, `${C}` (AC1); a `node $X build.js` command without crew.mjs stays unchanged and the literal forms stay rewritten (AC2). These are the regression tests: they fail before T1.
- packages/crew/test/hub/e2e/guard.test.ts (exercises `guard.ts`, which calls `withIdentity`), run in full; unchanged by this plan (AC3).
- `npm run typecheck` in packages/crew (AC3).
- No command or MCP tool is added, so test/hub/registry.test.ts and test/mcp.test.ts are unaffected and not in touches.

## Rollout & rollback
n/a — internal guard change; revert the commit to back out.

## Risks & open questions
- A command that mentions crew.mjs only in text and runs `node $X script.js` elsewhere is now denied; acceptable (the guard errs toward refusing, and the message tells the agent to call the hub literally).

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-050: Refuse a hub script held in a shell variable [in-review] tasks 2/2 — claimed by Arpit Anand (developer:a9ea1cd409887c67c)
- last checkpoint 2026-10-25 21:03 at T2 (d6c473e) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- evidence: AC1 —, AC2 —, AC3 —

Latest log:
- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-050-refuse-a-hub-script-held-in-a-shell

## Progress log

- 2026-10-26: PM: plan opened from BUG-031 fast lane; blocked at ready: BUG-031 not triaged because its Steps to reproduce, Expected and Actual sections are empty, and the pm role cannot edit .crew/items (paths.write is .crew/drafts only).
- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-050-refuse-a-hub-script-held-in-a-shell
- 2026-10-26: status in-progress → in-review

## Outcome
Learnings: none
