---
id: P-051
title: Guard binds Bash writes to paths.write and resolves or refuses unknown targets
goal: G-007
items: BUG-033, BUG-021, BUG-011, BUG-013, BUG-002
touches: packages/crew/src/hub/commands/team/guard.ts, packages/crew/test/hub/e2e/guard.test.ts
depends_on:
status: draft
branch: plan/P-051-guard-binds-bash-writes-to-paths-write
pr:
created: 2026-10-26
started:
completed:
---

# P-051: Guard binds Bash writes to paths.write and resolves or refuses unknown targets

## Context
G-007 guard bugs that all change `writeTargets()` and `decide()` in `packages/crew/src/hub/commands/team/guard.ts` and the cases in `packages/crew/test/hub/e2e/guard.test.ts`. The Architect recommends one plan (see BUG-033 Notes): splitting would put several plans on the same function, and the fixes interact. Once `paths.write` applies to Bash targets, an unresolved mid-path variable (BUG-011) becomes a `paths.write` bypass, and the "refuse what can't be resolved" decision is the same for variables and for interpreter scripts.

Items:
- BUG-033 (P1, S2): `decide()` applies a role's `paths.write` only to Edit/Write (when `path` is set), never to the Bash `writeTargets()`. A pm rewrote items with a redirect, heredoc, `tee`, `cp`, `sed -i`. The fix must still allow `/dev/*` and the temp dirs.
- BUG-021 (P1, S2): an inline or stdin interpreter script (`python3 -`, `-c`, `node -e`, `perl -e/-i`, `ruby -e`) writes any file with no target visible, which also defeats `paths.protected` and the outside-repo check. Choose: refuse such scripts for roles with `paths.write`, or accept and document the gap.
- BUG-011 (P2, S3): a variable in the middle of a write target (`.crew/$X`, `/tmp/$X/x`, loop variables) is neither expanded nor refused. Expand known assignments, refuse what stays unknown.
- BUG-013 (P2, S3): false positive, the guard refuses `$(mktemp)`-derived targets and `for` loop variables. Resolve `$(mktemp ...)` as a temp path, and resolve a `for` variable per value or glob match (not by directory alone, so `.crew/bin/*` still hits `paths.protected`). Lands with BUG-011, otherwise BUG-011 widens this false positive. `hubcall.ts` `parse()` is a real shell tokenizer the resolver could reuse.
- BUG-002 (P3, S3): the guard lets a subagent run `crew.mjs init`, which can overwrite `.crew/bin` and `.crew/templates/agents` when run from a non-vendored copy. Deny `hubCommand(c) === "init"` for subagents in `decide()`, next to the `agents` check.

Goal: G-007 (the guard bugs group; BUG-011 and BUG-021 carried other goals and are now triaged under G-007).

## Scope
**In:**
- Apply `paths.write` to Bash write targets, exempting `/dev/*` and temp dirs (BUG-033).
- Decide and implement the policy for inline/stdin interpreter scripts (BUG-021).
- Expand known mid-path variables and refuse unresolved ones (BUG-011); resolve `$(mktemp)` and `for` loop variables per value (BUG-013).
- Deny `crew.mjs init` from subagents (BUG-002).

**Out:**
- BUG-012 (cd tracking, `install -d`): same function, may follow as a second plan with `--depends`.
- Release's `refresh_bin` route.

## Acceptance criteria
- [ ] Each BUG-033 repro command (redirect, cat heredoc, tee, cp, sed -i, python3 heredoc, node -e) is denied for the pm with the `paths.write` message; `2>/dev/null` and temp-dir writes still pass.
- [ ] An inline/stdin interpreter script is refused for roles with a `paths.write` limit (or the chosen policy is documented), including against `.crew/policy.yaml`.
- [ ] BUG-011's seven commands are denied; `for f in a b; do echo hi > docs/$f.md; done` is allowed.
- [ ] BUG-013's `$(mktemp)` and `for` loop commands are allowed when every value passes, and denied when any value is protected.
- [ ] `crew.mjs init` is denied for subagents from `.crew/bin`, the dist build and a plugin-cache path.
- [ ] Regression cases for each in `guard.test.ts`.

## Approach
For the Architect. Points raised in the items: one shared "refuse what can't be resolved" decision per check; consider reusing the `hubcall.ts` tokenizer; the Edit path refuses temp-dir files for these roles today, so decide whether Bash should differ.

## Tasks
- [ ] T1: Apply `paths.write` to Bash targets with `/dev/*` and temp exemptions → verify: guard test for BUG-033 repros
- [ ] T2: Interpreter script policy → verify: guard test
- [ ] T3: Variable resolution (mid-path, `$(mktemp)`, `for`) → verify: guard tests
- [ ] T4: Deny `init` for subagents → verify: guard test

## Test plan
**Targeted checks:**
- `packages/crew/test/hub/e2e/guard.test.ts` (new cases per AC).

## Rollout & rollback
n/a for the Architect to confirm; the vendored `.crew/bin/crew.mjs` needs Release's `refresh_bin` after merge.

## Risks & open questions
- Interpreter scripts: refuse or accept the gap (Architect to decide; escalate if reserved).
- Stricter Bash checks may refuse commands roles run daily; the exemptions must be complete.

## Handoff

## Progress log

## Outcome
