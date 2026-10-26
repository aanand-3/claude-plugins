---
id: BUG-033
type: bug
title: Guard applies a role's paths.write only to Edit/Write, not Bash writes
status: done
severity: S2
priority: P1
goal: G-007
plan: P-051
created: 2026-10-26
closed: 2026-10-26
completed: 2026-10-26
---

# BUG-033: Guard applies a role's paths.write only to Edit/Write, not Bash writes

## Summary
2026-10-26: the pm (paths.write .crew/drafts/**) filled BUG-032's sections in .crew/items/ with a python3 heredoc (activity pm:a8a85ae352e55ab7d 21:12:50Z); the Edit tool was refused for the same file earlier (P-050 PM). guard.ts decide() checks paths.write only for EDITS tools; Bash writeTargets are checked against paths.protected and outside-repo only, and interpreter heredocs (python3/node -e) aren't parsed for targets at all.

## Environment
Main checkout on main at 672201c, with the vendored hub `.crew/bin/crew.mjs` (refreshed after P-049) and macOS. Source: `packages/crew/src/hub/commands/team/guard.ts` (`decide()`, `writeTargets()`). Policy: the lifecycle preset (`packages/crew/src/hub/core/team/presets.ts`) gives director, pm, qa and release `paths.write: [.crew/drafts/**]`. Architect and developer get no `paths.write` from the preset.

## Steps to reproduce
1. From the main checkout, pipe a PreToolUse payload into the guard: `node .crew/bin/crew.mjs guard < payload.json`, with `{"agent_type":"crew-pm","agent_id":"x1","tool_name":"Bash","tool_input":{"command":"echo x > .crew/items/BUG-999-x.md"},"cwd":"<main checkout>","hook_event_name":"PreToolUse"}`.
2. Repeat with each of these Bash commands. Each one writes `.crew/items/BUG-999-x.md`:
   - `cat > .crew/items/BUG-999-x.md <<'EOF'` … `EOF`
   - `echo x | tee .crew/items/BUG-999-x.md`
   - `cp .crew/drafts/x.md .crew/items/BUG-999-x.md`
   - `sed -i '' 's/a/b/' .crew/items/BUG-999-x.md`
   - `python3 - <<'PY'` / `open('.crew/items/BUG-999-x.md','w').write('x')` / `PY`
   - `node -e "require('fs').writeFileSync('.crew/items/BUG-999-x.md','x')"`
3. For comparison, send the same file as `tool_name: Write` (`file_path` = `<main checkout>/.crew/items/BUG-999-x.md`). Also send a Bash `echo x > .crew/policy.yaml`.

## Expected
Every write in steps 1 and 2 is denied, because the target lies outside `.crew/drafts/**`. The denial should match the Write tool's: "crew guard: the pm role may only write .crew/drafts/** (paths.write)". A role's `paths.write` should bind every write the guard can see, whichever tool makes it.

## Actual
- Steps 1 and 2: all seven commands pass. The guard prints nothing and exits 0.
- Step 3: the Write payload is denied with "the pm role may only write .crew/drafts/** (paths.write)". The Bash redirect into `.crew/policy.yaml` is denied with "the command writes to .crew/policy.yaml, which the crew policy protects (paths.protected)".

So the guard does find the Bash targets: it uses them for `paths.protected`. It just never checks them against `paths.write`.

There are two separate causes:
1. **Parsed targets skip `paths.write`.** This covers redirect, cat heredoc, tee, cp and sed -i. `decide()` computes `writeTargets(cmd)` and checks those targets only for `paths.protected`, unresolved `$` variables, hub-state copies (`forked`) and outside-repo (guard.ts lines 157–166). The `paths.write` check (lines 182–184) is `if (path && policy.paths.write.length && !hits(policy.paths.write, path))`, and `path` is set only for the `EDITS` tools (Edit, Write, MultiEdit, NotebookEdit; line 148). For Bash, `path` is `""`.
2. **Interpreter writes are invisible.** This covers the python3 heredoc and `node -e`. `writeTargets()` reads only redirects and the operands of `WRITERS` (rm, mv, cp, ln, chmod, chown, truncate, tee, install, touch, mkdir), plus `sed -i` and `git checkout/restore/rm/mv`. A script body run by an interpreter yields no target. This is BUG-021. The same payload aimed at the protected `.crew/policy.yaml` (`python3 - <<'PY'` / `open('.crew/policy.yaml','w')…`) also passes, so the interpreter gap defeats `paths.protected` and the outside-repo check for every subagent, not only `paths.write`.

## Evidence
- 2026-10-26: the pm filled BUG-032's sections in `.crew/items/` with a python3 heredoc (activity pm:a8a85ae352e55ab7d, 21:12:50Z), after the Edit tool had been refused for the same file (P-050 PM run).
- The probe payloads for the steps above (2026-10-26, Architect) gave these results: Write → deny (paths.write); Bash redirect, cat heredoc, tee, cp, sed -i, python3 heredoc, node -e → pass; Bash redirect to `.crew/policy.yaml` → deny (paths.protected); python3 heredoc to `.crew/policy.yaml` → pass.
- `packages/crew/test/hub/e2e/guard.test.ts`, "the guard applies the role's policy" (line 248), covers `paths.write` for Edit/Write only. No test sends a Bash write against `paths.write`.

## Impact
- **Who it affects.** `paths.write` is the only write limit on the four draft-only roles. Today it is advisory for anything written through Bash. A pm, qa, director or release agent can rewrite items, plans, docs or source code with a plain `>` or `cp`, with no interpreter trick needed. G-003's criterion "a role cannot use a tool or write a path its policy denies" is not met.
- **Why roles take this route.** It happens by accident, not only on purpose. The Edit refusal sends roles to Bash when no hub command does what they need, as with BUG-032 and BUG-021's CHORE-016.
- **BUG-021 is wrong on one point.** It says Bash write targets the guard can parse are already checked against `paths.write`. They are not: that is cause 1 here.
- **What a fix must allow.** Applying `paths.write` to Bash targets must let the writes these roles make every day through. That means `/dev/*` (`2>/dev/null`, `>/dev/null`, which `writeTargets` reports as targets) and the temp dirs that `outside()` already allows. A naive check would refuse every `cmd 2>/dev/null` from a pm. Note that the Edit path refuses temp-dir files for these roles today.
- **Interpreter scripts (cause 2).** No parser can recover their targets. The plan has to choose a policy: refuse inline or stdin interpreter scripts (`python3 -`, `-c`, `node -e`, `perl -e/-i`, `ruby -e`) for roles that have `paths.write`, or accept the gap and document it.
- Suggested severity: S2 (a policy guardrail that does not hold), priority P1 under G-007.

## Notes
- Duplicates in part BUG-021 (interpreter scripts, cause 2). Overlaps BUG-011 (a variable in the middle of a write target), BUG-012 (cd tracking, `install -d`) and BUG-013 (`$(mktemp)` and loop variables).
- **One plan with BUG-011 and BUG-021: yes.** All of them change `writeTargets()` and `decide()` in `guard.ts` and the cases in `guard.test.ts`. They also interact:
  - Once `paths.write` applies to Bash, BUG-011's unresolved middle variable becomes a `paths.write` bypass as well as a `paths.protected` one.
  - The "refuse what can't be resolved" rule (BUG-011, and BUG-021 for interpreters) is the same decision taken for each check.

  Splitting them would put three plans on the same function. BUG-012 and BUG-013 are parser-shape fixes in the same function and could join, or follow as a second plan with `--depends`, if the first plan should stay small.
- **Goals differ.** BUG-011 is filed under G-001, BUG-021 under G-003 and BUG-033 under G-007. The PM should choose the plan's goal.
- 2026-10-26: Architect completed the report: probed the vendored guard as crew-pm. Write to .crew/items is denied (paths.write); Bash redirect, cat heredoc, tee, cp, sed -i, python3 heredoc and node -e into .crew/items all pass. Two causes: decide() applies paths.write only when path is set (EDITS tools), never to writeTargets() output; interpreter scripts yield no targets (BUG-021, also bypasses paths.protected). Fix must exempt /dev/* and temp dirs. Recommend one plan with BUG-011 and BUG-021 (same writeTargets/decide and guard.test.ts); suggested S2/P1.
- 2026-10-26: status new → triaged — priority P1, severity S2
- 2026-10-26: status triaged → done — Fixed by P-051 (6273d49, landed)
