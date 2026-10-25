---
id: BUG-012
type: bug
title: Guard's cd tracking misses spaced subshells, function bodies and case arms; install -d checks one operand
status: triaged
severity: S3
priority: P3
goal: G-007
plan:
created: 2026-10-24
closed:
---

# BUG-012: Guard's cd tracking misses spaced subshells, function bodies and case arms; install -d checks one operand

## Summary
These forms remain after the BUG-010 fix, which added `{ ! if then else elif do while until builtin command time` as prefix words:
- `( ( cd ~; … ) )`: a `(` standing alone as a word becomes the empty string after `^\(+` is stripped, so it is neither a prefix nor `cd`. `(cd ~; …)` without the space is caught.
- `f() { cd ~; …; }; f` and `function f { cd ~; …; }; f`: the segment's head is `f()` or `function`.
- `case x in x) cd ~; …;; esac`: the head is `case`.

In each case the later relative write resolves against the hook cwd and passes. Separately, `install -d ~/a docs/b` creates every operand as a directory, but only the last operand is checked as the destination.

## Environment
Branch plan/P-019-project-state-stays-in-the-hub, base 6239707 plus the uncommitted P-019 working tree as of the third review round. Built guard `plugins/crew/skills/hub/dist/crew.mjs`, macOS.

## Steps to reproduce
1. In the plan worktree `$WT`: `printf '%s' '{"agent_type":"crew-developer","agent_id":"a","tool_name":"Bash","tool_input":{"command":"( ( cd ~; echo hi > x.md ) )"},"cwd":"'$WT'"}' | node plugins/crew/skills/hub/dist/crew.mjs guard`
2. Repeat with these commands:
   - `f() { cd ~; echo hi > x.md; }; f`
   - `function f { cd ~; echo hi > x.md; }; f`
   - `case x in x) cd ~; echo hi > x.md;; esac`
   - `install -d ~/a docs/b`

## Expected
Each one is denied as a write outside the repository.

## Actual
All five pass (no output). `{ cd ~; echo hi > x.md; }`, `if cd ~; then …`, `(cd ~; …)` and `while …; do cd ~; …` are denied.

## Evidence
QA probe `.crew/drafts/qa-p019-probe5.sh`, which prints "XX  ( ( cd ~; echo hi > x.md ) ) exp=deny got=pass", "XX  f() { cd ~; echo hi > x.md; }; f … got=pass", "XX  function f { … } … got=pass", "XX  case x in x) cd ~; … got=pass" and "XX  install -d ~/a docs/b … got=pass".

## Impact
These are deliberate-bypass forms that agents rarely write by accident. They work against the outside-repo rule and against `paths.protected` (e.g. `f() { cd .crew; echo x > policy.yaml; }; f`).

## Notes
A nested shell (`sh -c "cd ~ && echo > x"`, `nohup sh -c …`) also passes. That is a general limit of static checking rather than part of this bug, but it may be worth a fail-closed rule for `sh|bash|zsh -c` with a redirect inside. A possible fix: treat a lone `(`, `case … )` arms and function heads (`name()`, `function name`) as prefixes; for `install -d`, check every operand.
- 2026-10-26: status new → triaged — priority P3, severity S3
