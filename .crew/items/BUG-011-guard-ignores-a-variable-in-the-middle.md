---
id: BUG-011
type: bug
title: Guard ignores a variable in the middle of a Bash write target
status: triaged
severity: S3
priority: P2
goal: G-007
plan: P-051
created: 2026-10-24
closed:
---

# BUG-011: Guard ignores a variable in the middle of a Bash write target

## Summary
`writeTargets` expands, or else marks unresolved, only a variable at the start of a target (`$D/x`, `${D}/x`). A variable later in the path is kept literally, as in `.crew/$X`, `docs/$f` or `/tmp/$X/x`. The literal string then looks like an ordinary path inside the repo or the temp dir, so it is neither refused as unresolvable nor matched against `paths.protected`. When the variable holds `..` segments or a protected file name, the write lands outside the repo or on a protected file while the guard allows it. This includes loop variables (`for f in …; do … > .crew/$f`). The P-019 round-3 design says an unresolvable target is refused; that holds only for a leading variable.

## Environment
Branch plan/P-019-project-state-stays-in-the-hub, base 6239707 plus the uncommitted P-019 working tree as of the third review round (AC7 `guard_shell_forms` passing). Built guard `plugins/crew/skills/hub/dist/crew.mjs`, macOS.

## Steps to reproduce
1. In the plan worktree `$WT`: `printf '%s' '{"agent_type":"crew-developer","agent_id":"a","tool_name":"Bash","tool_input":{"command":"X=policy.yaml; echo x > .crew/$X"},"cwd":"'$WT'"}' | node plugins/crew/skills/hub/dist/crew.mjs guard`
2. Repeat with these commands:
   - `X=policy.yaml; echo x > .crew/${X}`
   - `for f in policy.yaml; do echo x > .crew/$f; done`
   - `X=policy.yaml; cp evil .crew/$X`
   - `X=../Users/aanand; echo hi > /tmp/$X/x`
   - `X=../../../..; echo hi > docs/$X/x`
   - `for f in ../../../../x; do echo hi > docs/$f; done`

## Expected
Each one is denied. The first four write the protected `.crew/policy.yaml`. The last three write outside the repository (`/Users/aanand/x`, and four levels above the worktree). Either expand the known variable (`X=…` in the same command) and match the result, or refuse a target with any unresolved `$` in it, as is already done for a leading variable.

## Actual
All seven pass (no output). The leading forms are denied: `D=~/.claude; echo hi > $D/x`, `echo hi > $NOPE_UNSET/x`, and `D=~; X=notes.md; echo hi > $D/$X`.

## Evidence
QA probe `.crew/drafts/qa-p019-probe5.sh`, which prints "XX  X=policy.yaml; echo x > .crew/$X … exp=deny got=pass", "XX  X=../Users/aanand; echo hi > /tmp/$X/x … got=pass", "XX  for f in policy.yaml; do echo x > .crew/$f; done … got=pass" and "XX  X=policy.yaml; cp evil .crew/$X … got=pass".

## Impact
A crew subagent can overwrite the policy, hook settings, agent definitions or CLI, or write project state outside the repo, by putting part of the path in a variable. This is a deliberate-bypass form: an agent rarely writes it by accident. The in-repo loop `for f in a b; do echo hi > docs/$f.md; done` is legitimate and is allowed today. A strict "refuse any `$`" fix would refuse it; expanding known assignments, and refusing only what stays unknown, would keep it working only when the loop list is known.

## Notes
Found while re-testing P-019 round 3 (BUG-009, BUG-010 fixes).
- 2026-10-26: status new → triaged — priority P2, severity S3
- 2026-10-26: re-triaged: priority P2, severity S3
