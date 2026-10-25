---
id: BUG-013
type: bug
title: Guard refuses writes through $(mktemp) and loop variables
status: triaged
severity: S3
priority: P2
goal: G-007
plan: P-051
created: 2026-10-24
closed:
---

# BUG-013: Guard refuses writes through $(mktemp) and loop variables

## Summary
P-019's guard refuses a write target that starts with an unresolvable variable. Two common legitimate subagent commands hit it: 'tmp=$(mktemp -d) && echo x > "$tmp/a"' (only a plain VAR=value is recorded, so $(...) never resolves) and 'for f in src/*.ts; do sed -i s/a/b/ "$f"; done' (loop variable). Found in P-019's round-3 architect review. Possible fix: a variable set from $(mktemp ...) counts as a temp path; 'for VAR in <glob>' resolves to the glob's directory. Weigh together with BUG-011 (mid-path variables are neither expanded nor refused).

## Environment
Main checkout on main at b39b036, vendored hub `.crew/bin/crew.mjs` (byte-identical to `plugins/crew/skills/hub/dist/crew.mjs`), macOS. Source: `packages/crew/src/hub/commands/team/guard.ts`, `writeTargets()` (the `set` regex records only `VAR=value` segments, and `expand()` resolves a leading `$NAME` from those or `process.env`) and `decide()` (it refuses any target that still starts with `$`).

## Steps to reproduce
1. Write a PreToolUse payload: `{"tool_name":"Bash","agent_type":"crew-developer","agent_id":"repro","cwd":"<main checkout>","tool_input":{"command":"tmp=$(mktemp -d) && echo x > \"$tmp/a\""}}`.
2. Run `node .crew/bin/crew.mjs guard < payload.json` from the main checkout.
3. Repeat with these commands in place of step 1's:
   - `for f in packages/crew/src/hub/commands/team/*.ts; do sed -i "" s/a/b/ "$f"; done`
   - `for f in a b; do touch "$f"; done`
   - `echo x > "$(mktemp)"`
   - `tmp=$(mktemp -d); cp README.md "$tmp/"`
4. For comparison, run `tmp=/tmp/x && echo x > "$tmp/a"` and `echo x > "$TMPDIR/a"`.

## Expected
The guard resolves each target and lets the command through, because every write lands in the temp dir or in repo files that no rule protects:
- A variable set from `$(mktemp …)` counts as a temp path, and so does a bare `$(mktemp …)` target.
- A `for VAR in <words or glob>` loop variable resolves to each word or glob match. Each one is checked against `paths.protected`, outside-repo, and (once BUG-033 lands) `paths.write`, so the loop is allowed only when every value would be.

## Actual
The guard denies every command in steps 1 and 3 with the same reason. Only the commands in step 4 pass, giving no output.
- `tmp=$(mktemp -d) && echo x > "$tmp/a"`: `crew guard: the command writes to $tmp/a, which the guard can't resolve (an unknown variable); use a literal path`
- `for f in …/*.ts; do sed -i … "$f"; done`: `… writes to $f, which the guard can't resolve …`
- `for f in a b; do touch "$f"; done`: `… writes to $f …`
- `echo x > "$(mktemp)"`: `… writes to $(mktemp) …`
- `tmp=$(mktemp -d); cp README.md "$tmp/"`: `… writes to $tmp/ …`

## Evidence
Reproduced on 2026-10-26 by piping each payload into `node .crew/bin/crew.mjs guard` (agent_type crew-developer, cwd the main checkout). Each refused case printed `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny",…}}`, and the step-4 controls printed nothing (exit 0). The guard also refused the architect's own Bash call that wrote these payloads with `echo … > "$tmp/a"` inside a quoted argument. This is the same false positive in day-to-day use.

## Impact
This is a false positive, not a hole: nothing unsafe gets through. But common subagent idioms fail: a scratch dir from `mktemp -d`, and loops over files for `sed -i`/`touch`/`cp`. Agents then fall back to literal paths, unrolled commands, or an interpreter heredoc. The guard can't see the heredoc route at all (BUG-021/BUG-033), so this refusal pushes agents toward the less-guarded path.

## Notes
- Belongs in the planned guard plan with BUG-033, BUG-021 and BUG-011. All four change how `writeTargets()`/`decide()` resolve Bash write targets. BUG-011 (refuse or expand mid-path variables) makes more commands unresolvable, so it widens this false positive unless the `$(mktemp)` and `for` resolution land in the same plan. BUG-033 adds `paths.write` to Bash targets, and that check needs loop values resolved per value.
- Resolving a `for` glob to its directory alone (the Summary's first idea) is too coarse. A loop over `.crew/bin/*` or `.claude/agents/*` must still hit `paths.protected`, so match the glob itself (or each expansion) against the rules.
- `hubcall.ts` already has a real shell tokenizer (`parse()`), and the target resolver could reuse it instead of the `segments()`/`words()` split.
- The goal is G-001, but the related guard bugs sit under G-007. The PM may want to re-goal it at triage.
- 2026-10-26: Confirmed at b39b036 via crew.mjs guard payloads (crew-developer): $(mktemp) vars, bare $(mktemp) targets and for-loop vars are all refused as unresolvable; filled Steps/Expected/Actual/Evidence/Impact/Notes. Recommend folding into the guard plan with BUG-033/BUG-021/BUG-011.
- 2026-10-26: status new → triaged — priority P2, severity S3
