---
id: BUG-010
type: bug
title: Guard's cd tracking misses cd inside { }, if/then, builtin/command, and a variable directory
status: done
severity: S3
priority: P2
goal: G-001
plan: P-019
created: 2026-10-24
closed: 2026-10-26
completed: 2026-10-26
---

# BUG-010: Guard's cd tracking misses cd inside { }, if/then, builtin/command, and a variable directory

## Summary
The guard now resolves relative write targets that follow a `cd DIR` in the chain, the fix for review item 3. But it only notices `cd` when `cd` (or `pushd`) is the first word of a segment, after a leading `(` is stripped. Four forms get past it:
- `{ cd ~; …; }`: the head is `{`;
- `if cd ~; then …; fi`: the head is `if`;
- `builtin cd ~` and `command cd ~`: the head is `builtin` or `command`;
- `cd $D` with a variable: `$D` is kept as a literal relative directory, so `$D/x` resolves inside the repo.

In each case the later relative write resolves against the hook cwd and passes. This defeats the outside-repo rule (AC4) and `paths.protected` alike.

## Environment
Branch plan/P-019-project-state-stays-in-the-hub, base 6239707 plus the uncommitted P-019 working tree as of the second review round. Built guard `plugins/crew/skills/hub/dist/crew.mjs`, macOS.

## Steps to reproduce
1. In the plan worktree `$WT`: `printf '%s' '{"agent_type":"crew-developer","agent_id":"a","tool_name":"Bash","tool_input":{"command":"{ cd ~; echo hi > x.md; }"},"cwd":"'$WT'"}' | node plugins/crew/skills/hub/dist/crew.mjs guard`
2. Repeat with these commands:
   - `if cd ~; then echo hi > x.md; fi`
   - `builtin cd ~ && echo hi > x.md`
   - `command cd ~ && echo hi > x.md`
   - `D=~/.claude; cd $D && echo hi > x.md`
3. Repeat with a protected target: `{ cd .crew; echo x > policy.yaml; }` and `builtin cd .crew && echo x > policy.yaml`.

## Expected
Each one is denied. Steps 1–2 are outside-repo writes. Step 3 writes the protected `.crew/policy.yaml`. For the variable case, an unresolvable `cd` target should fail closed: a later relative write counts as outside, or as unknown.

## Actual
All of them pass (no output). `cd ~ && echo hi > x.md`, `(cd ~; echo hi > x.md)`, `pushd ~ && …` and `cd .crew && echo x > policy.yaml` are denied.

## Evidence
QA probe `.crew/drafts/qa-p019-probe4.sh`, which prints "XX  { cd ~; echo > x; } exp=deny got=pass", "XX  if cd ~; then echo > x; fi … got=pass", "XX  builtin cd ~ && echo > x … got=pass", "XX  command cd ~ … got=pass", "XX  cd $D && echo > x (var) … got=pass", "XX  { cd .crew; echo x > policy.yaml; } … got=pass" and "XX  builtin cd .crew && echo x > policy.yaml … got=pass".

## Impact
A crew subagent can still keep project state outside the repo, or write a protected file, by wrapping `cd` in a group, a conditional or a builtin prefix. It's a bypass, and the plain forms agents usually write are caught.

## Notes
A possible fix: skip a leading `{`, `if`, `then`, `else`, `elif`, `do`, `while`, `until`, `!`, `builtin` or `command` before looking for `cd`. For a `cd` target with `$`, other than `$HOME`/`${HOME}`, or with a command substitution, treat later relative targets as unresolved and deny, or match them conservatively.
- 2026-10-24: status new → triaged — priority P2, severity S3
- 2026-10-26: DONE: fixed by P-019 (152650b). guard.test.ts 'guard_shell_forms' denies every form in the report: '{ cd ~; ...; }', 'if cd ~; then ...', 'builtin cd', 'command cd', 'D=~/.claude; cd $D', and the .crew/policy.yaml variants; targets.ts expands variables or leaves them unresolved (fail closed). Still on main after P-051. No remaining work.
- 2026-10-26: status triaged → done — DONE per Architect review: fixed by P-019 (152650b).
