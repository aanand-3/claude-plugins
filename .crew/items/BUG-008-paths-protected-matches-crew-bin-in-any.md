---
id: BUG-008
type: bug
title: paths.protected matches .crew/bin in any directory
status: done
severity: S4
priority: P3
goal:
plan:
created: 2026-10-24
closed: 2026-10-26
completed: 2026-10-26
---

# BUG-008: paths.protected matches .crew/bin in any directory

## Summary
The protected-path rule for .crew/bin/... matches at any depth, not only the project root and plan worktrees, so an unrelated nested .crew/bin (a fixture, a vendored example) is protected too. Found during P-017.

## Environment
Hub at main a4a4f99 (`.crew/bin/crew.mjs guard`), default policy (`paths.protected` includes `.crew/bin/**`), macOS, re-checked 2026-10-26 by the Architect.

## Steps to reproduce
1. In a fresh git repo, run `crew.mjs init`, add `.claude/agents/crew-developer.md` with `crew-role: developer`, and `mkdir -p test/fixtures/sample/.crew/bin`.
2. Pipe guard hook payloads for agent `crew-developer` into `crew.mjs guard`:
   - Write `test/fixtures/sample/.crew/bin/crew.mjs` (cwd = repo root), and the same path absolute;
   - Write `.crew/bin/crew.mjs` with cwd = `test/fixtures/sample` (the P-017-era trigger: a cwd-relative path);
   - Bash `cp a test/fixtures/sample/.crew/bin/crew.mjs`, `cd test/fixtures/sample && cp a .crew/bin/crew.mjs`, and `cp a .crew/bin/crew.mjs` with cwd = the fixture.
3. Control: Write `.crew/bin/crew.mjs` with cwd = repo root.

## Expected
Only the project's own `.crew/bin/**` (the root of the main checkout or of a plan worktree, `.claude/worktrees/<x>/.crew/bin/**`) is denied with "protected by the crew policy (paths.protected)"; a nested fixture's `.crew/bin` is writable.

## Actual
On current main the guard behaves as expected: every nested-fixture write in step 2 passes (no hook output), and only the control in step 3 is denied. The bug does not reproduce any more.

## Evidence
- Reproduction script kept outside the repo (Architect scratchpad, `bug008.sh`); outputs as above.
- Cause at report time (P-017, commit 3bcd939): `guard.ts` `rel()` used a relative tool path verbatim, so `.crew/bin/x` written from a nested cwd matched the anchored glob `^\.crew/bin(?:/.*)?$`. `globRe` (core/memory/knowledge.ts) was and is anchored at the start, so depth alone never matched.
- Fixed by P-019 (BUG-007, commit 152650b) and P-026: `rel()` now resolves the path against the hook's cwd (`abs`) and takes it relative to the deepest checkout that holds it (`checkouts()`), so a nested `.crew/bin` reads as `test/fixtures/sample/.crew/bin/...` and doesn't match.
- Not covered by a test: `test/hub/e2e/guard.test.ts` ("guard_resolves_paths" cases) asserts only the denials, never that a nested `.crew/bin` is allowed.

## Impact
None today. Before P-019 an agent working in a fixture directory could not write that fixture's `.crew/bin`.

## Notes
Suggested triage: close as fixed by P-019 (BUG-007's path resolution). Optionally add one negative assertion to `guard.test.ts` ("guard_resolves_paths: relative and symlinked paths…": a Write of `fixtures/x/.crew/bin/crew.mjs`, and of `.crew/bin/crew.mjs` with cwd `fixtures/x`, returns null) to the next plan that touches the guard tests; it does not need a plan of its own. By design, a nested directory that is its own git repository (the hook's cwd resolves to its top level) keeps its `.crew/bin` protected.
- 2026-10-26: Architect: filled Environment, Steps, Expected, Actual, Evidence, Impact, Notes. Does not reproduce on main a4a4f99: nested fixture .crew/bin writes pass the guard; fixed by P-019 (BUG-007 path resolution). Suggest closing as fixed; optional negative assertion in guard.test.ts.
- 2026-10-26: status new → triaged — priority P3, severity S4
- 2026-10-26: Already fixed on main (P-019/BUG-007 152650b, P-026); does not reproduce. Triaged P3/S4 only to keep it in the backlog; close as fixed with P-45's general close. Optional negative assertion in guard.test.ts.
- 2026-10-26: status triaged → done — Already fixed by P-019 (BUG-007 path resolution) and P-026; Architect re-check found it does not reproduce
