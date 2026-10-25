---
id: BUG-021
type: bug
title: Guard lets a role write outside paths.write through an inline interpreter script
status: triaged
severity: S2
priority: P1
goal: G-007
plan: P-051
created: 2026-10-25
closed:
---

# BUG-021: Guard lets a role write outside paths.write through an inline interpreter script

## Summary
The PreToolUse guard enforces a role's `paths.write` on Edit/Write and on the Bash write targets it can parse (`writeTargets()`), but a Bash command that runs an interpreter on an inline script (`python3 - "$f" <<'EOF' … open(p).write(…)`, and by the same route `node -e`, `perl -i`, `ruby -e`) writes any file without the guard seeing a target. A pm agent, limited to `.crew/drafts/**`, rewrote a backlog item this way; its next Edit to the same file was refused.

## Environment
main at fc812e2; packages/crew/src/hub/commands/team/guard.ts (`decide()`, `writeTargets()`); lifecycle preset (pm `paths.write: .crew/drafts/**`); a /crew:team run on 2026-10-25 (PM run pm:acd83708f5ef7cb9e, triaging CHORE-016 in the P-025 worktree).

## Steps to reproduce
1. As the crew-pm agent, run in Bash: `f=.crew/items/CHORE-016-….md && python3 - "$f" <<'EOF'` with a script that opens `sys.argv[1]` and writes new content.
2. Then, as the same agent, Edit the same file.

## Expected
Step 1 is refused like step 2: "crew guard: the pm role may only write .crew/drafts/** (paths.write)" — or, if the target can't be determined, an interpreter running an inline or stdin script is refused for roles with a `paths.write` limit.

## Actual
Step 1 succeeds and rewrites the item's Done-when section. Step 2 is refused with the paths.write message. The guard also injected `--as pm --run-id pm:…` into the heredoc text, which landed in the file (the BUG-017 pattern).

## Evidence
CHORE-016's Done-when section was written by step 1 (its last line held the injected flags until the executive fixed it on 2026-10-25). The Director reported the bypass in its hand-back the same day.

## Impact
`paths.write` is a guardrail the policy promises ("a role cannot use a tool or write a path its policy denies", G-003's acceptance criterion); any role can sidestep it with an inline interpreter, deliberately or (as here) when no hub command does what it needs. Suggested severity S2. Related: BUG-011/012/013 (other writeTargets gaps), BUG-017 (flag injection), and the missing hub command for editing an item's checklist that sent the PM to Bash.

## Notes
- 2026-10-26: status new → triaged — priority P1, severity S2
