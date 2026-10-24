---
id: BUG-009
type: bug
title: Guard misses the >| and >&FILE redirect forms
status: triaged
severity: S3
priority: P2
goal: G-001
plan: P-019
created: 2026-10-24
closed:
---

# BUG-009: Guard misses the >| and >&FILE redirect forms

## Summary
`writeTargets` finds redirect targets with `/>{1,2}\s*([^\s;&|<>]+)/`. A target that starts with `|` or `&` is never captured, so two valid bash file redirects produce no write target:
- `>| file`, the noclobber override;
- `>& file`, stdout and stderr to a file (same as `&> file`).

Both rules miss them, the P-019 outside-repo rule and `paths.protected`. `segments()` also splits `>|` at the `|`, so the target ends up as the head of a separate "command". Found while re-testing P-019 after the guard fixes for the fd-redirect review item, which now handle `2>`, `1>`, `3>`, `&>` and `&>>` correctly.

## Environment
Branch plan/P-019-project-state-stays-in-the-hub, base 6239707 plus the uncommitted P-019 working tree as of the second review round. Built guard `plugins/crew/skills/hub/dist/crew.mjs`, macOS.

## Steps to reproduce
1. In the plan worktree `$WT`: `printf '%s' '{"agent_type":"crew-developer","agent_id":"a","tool_name":"Bash","tool_input":{"command":"echo hi >| ~/x"},"cwd":"'$WT'"}' | node plugins/crew/skills/hub/dist/crew.mjs guard`
2. Repeat with `echo hi >& ~/x`, `echo x >| .crew/policy.yaml` and `echo x >& .crew/policy.yaml`.

## Expected
Each one is denied. The first two are outside-repo writes ("… is outside the repository; project state stays in the hub …"). The last two write a protected file ("… which the crew policy protects (paths.protected)").

## Actual
All four print nothing (pass). `echo hi > ~/x`, `ls &> ~/x` and `echo x > .crew/policy.yaml` are denied.

## Evidence
QA probe `.crew/drafts/qa-p019-probe4.sh`, which prints "XX  echo hi >| ~/x … exp=deny got=pass" and "XX  echo x >& .crew/policy.yaml … exp=deny got=pass".

## Impact
A crew subagent can write a hand-over outside the repo, or overwrite the policy, the hook settings or the CLI, using either redirect form. There is no workaround in the guard. Agents rarely write these forms by accident, so this is mainly a deliberate bypass.

## Notes
The fix needs care: `>&N` (a digit) and `>&-` are fd duplication or closing, not files, and must stay allowed (`ls >&2` and `2>&1` pass today, correctly). The `>|` case also needs `segments()` not to split on that `|`.
- 2026-10-24: status new → triaged — priority P2, severity S3
