---
id: P-063
title: Guard refuses only real access to secrets files
goal: G-007
items: BUG-042
touches: packages/crew/src/hub/commands/team/guard.ts, packages/crew/src/hub/commands/team/secretrefs.ts, packages/crew/src/hub/commands/team/targets.ts, packages/crew/src/hub/commands/team/hubcall.ts, packages/crew/test/hub/secretrefs.test.ts, packages/crew/test/hub/e2e/guard.test.ts
depends_on:
status: in-progress
branch: plan/P-063-guard-refuses-only-real-access
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
---

# P-063: Guard refuses only real access to secrets files

## Context
The guard's secrets check (`secrets.files`) refuses any Bash command whose text contains a secrets filename, even when the name is only prose in a heredoc body or a string in a script. On 2026-10-26 this hit the PM filing BUG-041 and the Architect speccing P-062; both then used the Edit/Write tools instead, working around a guard refusal (see K-2026-10-26-when-the-guard-refuses-an-action-report). It also blocks legitimate writing about secrets handling (specs, tests, bug reports). Goal G-007, item BUG-042. The guard files changed by P-058 and P-056 have landed, so the architect may touch them.

Today the check is one line, `guard.ts` `decide()`: `words(cmd).some((w) => hits(policy.secrets.files, w))`, where `words()` splits the whole raw command text on whitespace, quotes and `=`. Every token anywhere (quoted prose, heredoc bodies, inline code) is matched as a path.

## Scope
**In:**
- The secrets check refuses commands that would access a secrets file: as a path argument, a redirect target, or a file an interpreter or tool may open.
- Commands whose text only mentions a secrets filename in quoted prose, or in a heredoc body whose target is a non-secrets file, are allowed.
- Regression tests for both directions.

**Out (explicitly not doing):**
- Changing which files count as secrets (`secrets.files` contents).
- Weakening or restructuring any other guard check (the Read-tool secrets check, paths.protected, paths.write, inline-script refusal, identity).
- Reworking how other roles handle guard refusals.
- Closing gaps the current check also has (see Risks): recursive tools (`grep -r PATTERN .`, `find . -exec cat`), script files that open a secrets file themselves, unresolved variables.

## Acceptance criteria
- [ ] AC1 · A Bash heredoc writing a non-secrets drafts file whose prose mentions a secrets filename (`cat > .crew/drafts/x.md <<'EOF'` … body naming a dotenv file … `EOF`) is not refused (regression test; fails before the fix).
- [ ] AC2 · A script whose source text mentions a secrets filename can be written to a non-secrets file with a heredoc, and that script file run on a non-secrets file (`python3 <script.py> docs/a.md`), and neither command is refused (regression test). Inline interpreter code (`python3 -c`, `node -e`, a script fed on stdin) that names a secrets filename stays refused: the guard can't tell a mention from an `open()` there, so it fails closed. (Architect refinement of the PM's AC2: the conservative side, as the Risks section asked.)
- [ ] AC3 · Quoted prose that mentions a secrets filename is not refused in the arguments of a hub call (`node .crew/bin/crew.mjs new-item … "<text naming a dotenv file>"`), `echo`, `printf`, a `git commit`/`git tag` `-m`/`--message` value, or a `grep`/`rg` pattern searching non-secrets files (tests for each).
- [ ] AC4 · Real access is still refused (a test for each): a path argument (`cat`, `head`, `grep PATTERN FILE`, `cp FILE x`, `source FILE`, `. FILE`; relative, `./`-prefixed, quoted, absolute and nested, e.g. `certs/a.pem`); an output redirect target (`>`, `>>`); an input redirect (`< FILE`); an option value (`--env-file=FILE`) and `@FILE`; a variable assignment or `for` list holding the name; a glob that matches it (`cat .en*` with the file present; an unlistable glob such as `cat */*.pem`); `$(cat FILE)`; `sh -c "cat FILE"` and `eval "cat FILE"`; inline interpreter code naming it; a heredoc body naming it that is fed to a shell, an interpreter or `xargs`, or to `cat` piped into one (`cat <<EOF | sh`).
- [ ] AC5 · The refusal message for real access in Bash is unchanged, exactly `the command touches a secret file (secrets.files)`; the Read-tool refusal is unchanged.
- [ ] AC6 · No other guard behaviour changes: the existing cases in `test/hub/e2e/guard.test.ts`, `test/hub/e2e/guard-writes.test.ts`, `test/hub/targets.test.ts` and `test/hub/hubcall.test.ts` pass without edits.

## Approach
Replace the token scan with a check built on the guard's shell parser (`hubcall.ts` `parse()`), which already separates words, redirect targets and heredoc / here-string bodies, nested `$(…)` and subshells included. Two modes:

1. **Path mode, everywhere.** Every place the shell names a file is matched as a whole path against `secrets.files`: each word's dequoted value, redirect targets (output and, new, input), option and assignment values, globs expanded. A whole quoted sentence is one word, so `"see the dotenv file"` is no path and does not match; `".env"`-style quoted path arguments still do.
2. **Token mode (today's rule), only where text may be code or may become arguments.** The current `words()` split is kept and applied to text the guard can't interpret: arguments of every command except a short list of prose commands, and heredoc / here-string bodies unless they are plainly data. This is the fail-closed side: anything not on the allow lists keeps today's behaviour.

So the change only ever *removes* refusals for (a) quoted multi-word prose in the arguments of `echo`, `printf`, the hub, `git -m` and `grep`/`rg`, and (b) heredoc bodies fed to plain data commands when nothing in the command line can run them. Everything else refuses at least what it refuses today, plus new path-mode catches (input redirects, unlistable globs).

The logic lives in a new module `secretrefs.ts` (targets.ts is at 243 lines and the 300-line limit binds, K-2026-10-23-every-module-stays-under-300-lines); `guard.ts` calls it in place of the token scan, keeping the message.

## Design
`packages/crew/src/hub/commands/team/secretrefs.ts` exports
`touchesSecret(cmd: string, cwd: string, globs: string[], hit: (p: string) => boolean): boolean`.
`hit` is the guard's existing `(p) => hits(policy.secrets.files, p)` (so `rel()`, checkouts and `./` handling stay as they are); `globs` is `policy.secrets.files`, used only for the unlistable-glob sample names; `cwd` is `h.cwd || top`, where `for`/word globs are listed.

For each simple command `c` of `parse(cmd)` (nested ones included):

**Path mode** — `touchesSecret` is true when `hit()` is true for any candidate:
- for each word in `c.words` (head and arguments) and each redirect target in `c.targets` and `c.inputs`: its values via `expand(raw, look)` with `look` = the environment (as `writeTargets` does; an unresolved word falls back to its dequoted `value`), and for each value: the value itself, the part after the first `=`, the part after a leading `@`, the part after the last `:`; each with a leading `./` stripped.
- a value from a word with an unquoted glob (`expand(...).glob`): its matches via `globbed(v, resolve(cwd))` (exported from targets.ts). When `globbed` returns null (a glob in a directory segment), the word counts as a hit when the shell glob of its last segment matches a sample name of any secrets glob: that glob's last segment with each `*` and `?` replaced by `x` (so `**/*.pem` gives `x.pem`). Fail closed: an unlistable glob that could reach a secrets file is refused.

**Token mode** — `touchesSecret` is also true when today's rule hits on:
- the argument words of `c` (as raw text, run through the existing `words()` split, moved from guard.ts to secretrefs.ts), unless the command's head is a prose command: `echo`, `printf`, `grep`, `egrep`, `fgrep`, `rg`, or the executed hub program (`hubWord(c)` non-null). For `git`, only the value after `-m`/`--message` (or `-m=`/`--message=`) of `commit`/`tag` is exempt; every other git word is token-scanned. The head is found past `skipPrefix` and the wrappers `inlineScript` skips (`env`, `nohup`, `nice`, `exec`, `timeout`, `xargs`); extract that loop from `inlineScript` into an exported `headIndex(c: Simple): number` in targets.ts and use it in both (no behaviour change to `inlineScript`). A prose command's words still get path mode, so `grep x <secrets file>` and `echo hi > <secrets file>` stay refused.
- each body in `c.bodies`, unless both: `c`'s head is a data command (`cat`, `tee`, `head`, `tail`, `wc`, `sort`, `uniq`, `tr`, `cut`, `grep`, `base64`, or the hub program), and no simple command anywhere in `parse(cmd)` runs stdin or text as code or arguments: a head (via `headIndex`) that is a shell (`SHELL`), an interpreter (`INTERPRETER`, the hub program excepted), `xargs`, `parallel`, `eval`, `source`, `.` or `read`. This blocks `cat <<EOF | sh`, `cat <<EOF | xargs cat` and `while read f; do cat "$f"; done <<EOF`.

**Parser** — `hubcall.ts`: `Simple` gains `inputs: Word[]`, the target word of each input redirection `< WORD` and `<> WORD` (not `<&N`/`<&-`, not heredocs, here-strings or `<(…)`); `parse()`'s final filter keeps a command with only inputs. Export `hubWord`. Nothing else in hubcall.ts changes; `withIdentity` ignores `inputs`.

**Guard** — `guard.ts` line 138 becomes
`if (touchesSecret(cmd, h.cwd || top, policy.secrets.files, (w) => hits(policy.secrets.files, w))) return { deny: "the command touches a secret file (secrets.files)" };`
at the same position (after the write-target checks, before the approval check), with the same message. Remove `words` from guard.ts (it moves to secretrefs.ts); `segments` stays.

**Targets** — `targets.ts`: export `globbed`, `INTERPRETER`, `SHELL` and the new `headIndex`; no other change.

## Tasks
- [x] T1 · `hubcall.ts`: add `Simple.inputs` (input redirection targets per Design) and export `hubWord`. Verify: `npx vitest run test/hub/hubcall.test.ts` passes unchanged; the `inputs` cases in `test/hub/secretrefs.test.ts` (T5) pass.
- [x] T2 · `targets.ts`: export `globbed`, `INTERPRETER`, `SHELL`; extract `headIndex(c)` from `inlineScript`'s head loop and use it there. Verify: `npx vitest run test/hub/targets.test.ts test/hub/e2e/guard-writes.test.ts` pass unchanged; `wc -l` of targets.ts under 300.
- [x] T3 · New `secretrefs.ts` with `touchesSecret` per Design (path mode, token mode, prose and data lists), moving `words()` there; under 300 lines. Verify: `npx vitest run test/hub/secretrefs.test.ts`.
- [x] T4 · `guard.ts`: call `touchesSecret` in place of the token scan, same position and message; drop the unused `words`. Verify: `npm run build`, then `npx vitest run test/hub/e2e/guard.test.ts test/hub/e2e/guard-writes.test.ts`.
- [x] T5 · Tests. `test/hub/secretrefs.test.ts` (new, unit, a temp dir holding a dotenv file and a `certs/a.pem`, with `hit` built from the default `secrets.files`): every AC2–AC4 case in both directions, plus `inputs` parsing. `test/hub/e2e/guard.test.ts`: a new `it("the secrets check refuses real access only (BUG-042)")` through `hook()` with a crew agent (role with no paths.write, e.g. developer, so inline scripts reach the secrets check) asserting AC1, AC2, AC3 allowed and a representative AC4 set denied with exactly the AC5 message; plus a Read of a dotenv file still denied with its message. Show AC1 fails before the fix: write base guard.ts from `git show main:packages/crew/src/hub/commands/team/guard.ts` into the worktree, `npm run build`, run the new case and record that it fails, then restore from `git show HEAD:…` (K-2026-10-25-a-plan-task-that-says-to-git-stash) and rebuild. Verify: the targeted checks below.

## Test plan
**Targeted checks:** (in the plan worktree, `cd packages/crew`; `npm ci --prefer-offline` first in a fresh worktree; the e2e tests run the built bundle, so `npm run build` after source changes, and the built files are not part of the plan's change, K-2026-10-24-release-builds-the-generated-files-plans)
- AC1: `npx vitest run test/hub/e2e/guard.test.ts -t "BUG-042"` passes after the fix and its heredoc case fails against the base guard.ts (T5 procedure); also covered in `test/hub/secretrefs.test.ts`.
- AC2, AC3: `npx vitest run test/hub/secretrefs.test.ts test/hub/e2e/guard.test.ts -t "BUG-042|secret"`.
- AC4: `npx vitest run test/hub/secretrefs.test.ts` (each refused form, one assertion per form) and the e2e BUG-042 case's denied set.
- AC5: the e2e BUG-042 case asserts the exact reason `crew guard: the command touches a secret file (secrets.files)` and the Read refusal text.
- AC6: `npx vitest run test/hub/e2e/guard.test.ts test/hub/e2e/guard-writes.test.ts test/hub/targets.test.ts test/hub/hubcall.test.ts` pass, and `git diff main -- packages/crew/test/hub/e2e/guard-writes.test.ts packages/crew/test/hub/targets.test.ts packages/crew/test/hub/hubcall.test.ts` is empty; guard.test.ts's diff only adds the new case.
- All: `npm run typecheck`.

## Rollout & rollback
Ships with the next vendored hub refresh (Release builds the bundle and refreshes `.crew/bin` after merge). No data, policy or config change. Rollback: revert the plan's commit and refresh `.crew/bin`; the guard returns to the token scan (strictly more refusals, never fewer).

## Risks & open questions
- Not a shell: the check is best effort on `parse()`. Where it can't rule real access out it keeps today's token scan (inline interpreter code, shell `-c`/`eval` strings, bodies a shell/interpreter/xargs/read can reach, arguments of every non-prose command such as `sed`, `awk`, `jq`, `find`). Those keep today's false positives (e.g. `sed -i 's/x/<dotenv name>/' docs/a.md` stays refused), deliberately.
- Prose commands are exempt from token mode only; their words still get path mode, so `echo <dotenv name>` (a bare name as its own word) stays refused. Accepted.
- Gaps the current check also has, left as they are (not a weakening): `grep -r` / `find` over a directory holding a secrets file, a script file that opens one, an unresolved `$VAR` holding one from outside the command. Worth a separate item if the team wants them closed.
- The unlistable-glob sample rule can refuse broad globs such as `cat src/*/*` (any last segment `*` matches `x.pem`). Accepted: fail closed, and rare in agent commands.

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-063: Guard refuses only real access to secrets files [in-review] tasks 5/5 — claimed by Arpit Anand (developer:a15018def85344c14)
- last checkpoint 2026-10-26 11:59 at T5 (63dfd06) by Arpit Anand; since then 0 commit(s), 2 uncommitted file(s): plugins/crew/skills/hub/dist/crew.mjs, plugins/crew/skills/hub/dist/mcp.mjs
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —, AC6 —

Latest log:
- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-063-guard-refuses-only-real-access

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-063-guard-refuses-only-real-access
- 2026-10-26: status in-progress → in-review
- 2026-10-26: review: changes requested — Real access slips through an unquoted heredoc body. With an unquoted delimiter bash runs command substitutions in the body, so cat > docs/x.md <<EOF with a body line $(cat <dotenv>) (also a backtick form, $(<<dotenv>) and ${X:-$(cat <dotenv>)}) copies the secret into docs/x.md. touchesSecret returns false for all four today (probed against secretrefs.ts); the old token scan refused them, so this breaks AC4 (real access still refused) and the Rollout claim that the change only removes refusals for prose. Fix in hubcall.ts parse() + secretrefs.ts: record per body whether its heredoc delimiter was quoted (target.raw has a quote or backslash), and treat an unquoted-delimiter body that contains $( , ${ or a backtick as not data, so it gets the token scan (or parse its substitutions and path-check them). Quoted-delimiter bodies and unquoted prose bodies (the existing tee docs/b.md case) stay allowed. Add refused cases for the four forms to test/hub/secretrefs.test.ts and one to the e2e BUG-042 case. Everything else checks out: diff matches Design, touches respected, files under 300 lines, typecheck and the five targeted suites (100 tests) pass, existing test files unedited.
- 2026-10-26: status in-review → in-progress — changes requested: Real access slips through an unquoted heredoc body. With an unquoted delimiter bash runs command substitutions in the body, so cat > docs/x.md <<EOF with a body line $(cat <dotenv>) (also a backtick form, $(<<dotenv>) and ${X:-$(cat <dotenv>)}) copies the secret into docs/x.md. touchesSecret returns false for all four today (probed against secretrefs.ts); the old token scan refused them, so this breaks AC4 (real access still refused) and the Rollout claim that the change only removes refusals for prose. Fix in hubcall.ts parse() + secretrefs.ts: record per body whether its heredoc delimiter was quoted (target.raw has a quote or backslash), and treat an unquoted-delimiter body that contains $( , ${ or a backtick as not data, so it gets the token scan (or parse its substitutions and path-check them). Quoted-delimiter bodies and unquoted prose bodies (the existing tee docs/b.md case) stay allowed. Add refused cases for the four forms to test/hub/secretrefs.test.ts and one to the e2e BUG-042 case. Everything else checks out: diff matches Design, touches respected, files under 300 lines, typecheck and the five targeted suites (100 tests) pass, existing test files unedited.

## Outcome
The guard's Bash secrets check is now `touchesSecret` in the new `secretrefs.ts`: path mode resolves real candidates (path arguments, redirect targets in and out, option values, `@FILE`, assignments, `for` lists, globs incl. unlistable ones) and token mode keeps the old token scan wherever real access can't be ruled out (inline interpreter code, `sh -c`/`eval` strings, heredoc bodies a shell/interpreter/xargs can reach, arguments of non-prose commands, a hub call's `--run` value, and wrapper/assignment words before a prose command). Prose in heredocs written to files, `echo`/`printf`, hub-call text, commit/tag messages and grep/rg patterns is no longer refused. The refusal message is unchanged. The new e2e BUG-042 case failed on the base guard.ts (the AC1 heredoc was denied) and passes now; secretrefs.test.ts, guard, guard-writes, targets and hubcall tests pass (100), with no edits to the existing test files.
Learnings: K-2026-10-26-the-guards-bash-secrets-check-matches
