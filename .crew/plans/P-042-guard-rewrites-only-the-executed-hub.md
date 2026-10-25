---
id: P-042
title: Guard rewrites only the executed hub program
goal: G-007
items: BUG-017, CHORE-020
touches: packages/crew/src/hub/commands/team/guard.ts, packages/crew/src/hub/commands/team/hubcall.ts, packages/crew/test/hub/e2e/guard.test.ts, packages/crew/test/hub/hubcall.test.ts, packages/crew/test/hub-worktrees.test.ts
depends_on: P-030
status: done
branch: plan/P-042-guard-rewrites-only-the-executed-hub
pr:
created: 2026-10-25
started: 2026-10-25
completed: 2026-10-25
assignee: developer
---

# P-042: Guard rewrites only the executed hub program

## Context
BUG-017 (S2, P1, goal G-007): the guard (packages/crew/src/hub/commands/team/guard.ts, the rewrite near line 202)
adds the agent's role and run-id flags after every hub-executable word in a hub command segment, not only after the
program being run. It corrupts quoted hub arguments (learn/log/checkpoint text) and breaks a hub path held in a
shell variable. On 2026-10-25 it also did real damage: during P-039 QA a `bash <script> <args>` call whose argument
named the hub executable had the flags injected, shifting the script's positional arguments; the script ran in the
main checkout and made 9 commits on main (9839313..1dba548) over .crew/policy.yaml, config.yaml and .crew/bin. The
team paused and main was repaired in ecc446a. Notes: K-2026-10-25-the-guard-injects-its-role-and-run-flags,
K-2026-10-25-the-crew-guard-refuses-any-hub-call, K-2026-10-25-the-guard-injects-the-agents-role.

Root cause: the rewrite splits the command on `&&`, `||`, `;`, `|`, `&` and newlines with no notion of quotes or
heredocs, decides per piece with `runsHub` (fails open to "runs the hub" for any head not in OPERAND_OF, or any piece
containing a RUNNER word such as `bash` or `node`), and then regex-replaces every `crew.mjs` word in the piece.

CHORE-020 (a git alias with `!` runs the hub with no identity) stays in this plan: it is the same detection code and
the same two files, and splitting it would serialise two plans on guard.ts. Its fix here is a refusal, not an
injection (see Approach).

## Scope
**In:**
- The guard injects identity only right after the word that is the executed hub program of a simple command,
  once per hub call, never into argument text, script arguments, quoted strings or heredoc bodies.
- Hub calls the guard can see but cannot safely give identity to (a hub path in a variable, nested shell code such
  as `sh -c`/`eval`/`xargs`/`find -exec`/`node -e`, a git `!` alias, a heredoc fed to a shell) are refused with a
  reason that says to call the hub directly.
- CHORE-020: the git `!` alias form is refused (no hub run without identity through it).
- The command parsing moves into a new module, packages/crew/src/hub/commands/team/hubcall.ts, so guard.ts stays
  well under 300 lines; guard.ts drops `runsHub`, `RUNNER` and `OPERAND_OF` once unused.
- Regression cases in guard.test.ts (e2e, through the hook) and unit cases in test/hub/hubcall.test.ts.

**Out (explicitly not doing):**
- The human-approval flag refusal (`CREW_CLI.test(cmd) && /--approved-by\b/`) stays exactly as it is, including its
  refusal of the flag named in argument text; loosening it is a separate decision.
- The `--as` / `--run-id` / `CREW_*` claim checks, `writeTargets`, the tools.deny matching and the `agents` check
  keep their current behaviour (they still use `segments`/`words`).
- A hub run the command line doesn't show (a script that runs the hub itself, `$HUB` from the environment, a git
  alias defined in an earlier call): the guard can't see it, so it stays without identity (the hub then acts in no
  role, which role gates refuse).
- Correcting the already-corrupted knowledge entries and item texts (K-2026-10-24-p-022-waits-on-p-020-rather-than,
  CHORE-020's summary, others): a separate hub cleanup.
- Restricting where QA scripts may run; the vendored .crew/bin refresh (Release's).

## Acceptance criteria
- [ ] AC1: A hub call whose quoted argument names the hub executable (learn `--why`, log, checkpoint `--note` or
      `--verify` text) is rewritten with the identity flags exactly once, right after the executed hub path, and the
      argument reaches the hub exactly as typed (the stored knowledge body has no injected flags).
- [ ] AC2: `bash <script> <args>` with an argument naming the hub executable is left unchanged by the guard (the
      hook returns no decision), so the script gets its positional arguments as typed; the same holds when the
      command starts with `VAR=value` assignments (`X=1 bash <script> <hub> P-001`; logged on BUG-017 2026-10-25).
- [ ] AC3: A heredoc body that names the hub executable (`cat > f <<'EOF'` … `EOF`) is left unchanged.
- [ ] AC4: A hub path held in a shell variable (`C="node .crew/bin/<hub>"; $C next`) is refused with a reason that
      names the variable form and says to call the hub literally.
- [ ] AC5: Nested shell code naming the hub executable (`bash -c '…'`, `eval '…'`, `xargs node <hub> …`,
      `find … -exec`, `node -e '…'`) and a git alias with `!` running the hub (CHORE-020) are refused with a reason
      that says to call the hub directly.
- [ ] AC6: Hub calls the guard can see run still get identity: each of several chained calls (`&&`, `;`, `|`, newline),
      a call after `VAR=…` assignments or `{`/`(`/`if`/`time`/`command` prefixes, `node --no-warnings <hub>`, a
      directly executed `<path>/crew.mjs`, and a call inside `$(…)` or backticks (also inside double quotes).
- [ ] AC7: A hub call naming the human-approval flag is still refused, both directly and inside `bash -c '…'`; the
      `--as`/`--run-id`/`CREW_*` claim refusals are unchanged.
- [ ] AC8: The existing guard e2e tests in guard.test.ts pass unchanged.
- [ ] AC9: Each new guard.test.ts case for AC1–AC5 fails against the base branch's guard.ts.
- [ ] AC10: guard.ts and hubcall.ts each stay under 300 lines, and hubcall.ts is pure (no fs, git or store
      imports; at most node:path).
- [ ] AC11: packages/crew/test/hub-worktrees.test.ts's guard test ("injects identity only where the hub runs, not
      where crew.mjs is a file operand") holds the new behaviour: `find . -exec node .crew/bin/crew.mjs next \;` is
      asserted denied with a reason containing "directly" (it no longer expects injection), and every other case in
      it passes unchanged.

## Approach
1. **hubcall.ts: a small shell tokenizer.** Walk the command once, character by character, tracking single quotes
   (no escapes inside), double quotes (backslash escapes; `$(…)` and backticks still open inside them), backslash
   escapes outside quotes, and comments (`#` at a word start outside quotes). Outside quotes, `&&`, `||`, `;`, `|`,
   `&`, newline, `(` and `)` end a word and a simple command. Each word records its raw start/end offsets and its
   dequoted value. `$(…)`, backticks and `<(…)` bodies are tokenized recursively (their simple commands are treated
   like top-level ones; offsets stay offsets into the original string). A heredoc operator (`<<WORD`, `<<-WORD`,
   `<<'WORD'`, `<<"WORD"`, not `<<<`) marks its body — the lines after the current line up to the terminator line —
   as opaque: never rewritten, and only inspected for the shell-fed case in step 3.
2. **The executed hub program.** For each simple command, skip leading `NAME=value` assignments and prefix words
   (`{`, `!`, `if`, `then`, `else`, `elif`, `do`, `while`, `until`, `time`, `builtin`, `command`, `exec`, `env`,
   `nohup`); the next word is the head. The hub word is the head itself when its dequoted basename is `crew.mjs`, or,
   when the head's basename is `node`/`bun`/`deno`, the first word after the head that doesn't start with `-` and
   whose basename is `crew.mjs`. Insert ` --as ROLE --run-id RUN` at that word's raw end offset — once per simple
   command, nowhere else. A hub word anywhere else (an argument to `bash script`, `echo`, `grep`, `cat`, a quoted
   argument of a hub call) is left alone.
3. **Refusals** (checked before injecting; the first one found wins), only when the command names the hub
   executable at all:
   - variable head: a simple command whose head starts with `$` (or is a quoted `"$…"`) — "a hub path held in a
     shell variable can't be given your identity; call the hub literally (node .crew/bin/<hub> …)";
   - nested code: a simple command with head `sh`/`bash`/`zsh`/`dash`/`ksh` and a `-c` option, `eval`, `xargs`,
     `parallel`, `watch`, `timeout`, `nice`, `sudo`, `ssh`, `find`/`fd` with `-exec`/`-execdir`/`-ok`/`-x`, or
     `node`/`bun`/`deno` with `-e`/`-p`/`--eval`/`--print`, any of whose later words names the hub; a `git` command
     with a word whose dequoted value starts with `!` or contains `=!` and names the hub (CHORE-020); a heredoc body
     naming the hub whose simple command's head is a shell — "the guard can't give your identity to a hub call
     inside nested shell code; call the hub directly as its own command".
   The hub name check is "a word or heredoc body containing `crew.mjs`" (the guard's existing `CREW_CLI`).
4. **API.** `export function withIdentity(cmd: string, flags: string): { command: string } | { deny: string }` in
   hubcall.ts; pure, no I/O. In guard.ts the identity block keeps its claim checks and replaces the
   `split(...).map(runsHub ...)` rewrite with a call to it: a deny becomes the guard's deny, an unchanged command
   returns null, a changed one returns `{ input: { ...input, command } }`. Remove `runsHub`, `RUNNER` and `OPERAND_OF`
   from guard.ts (unused after the change); `segments`, `words`, `hubCommand`, `CREW_CLI` stay.
5. The approval-flag check at guard.ts line 179 is untouched and runs before the identity block, so AC7 holds by
   construction; the tests pin it.

## Tasks
- [x] T1: Write packages/crew/src/hub/commands/team/hubcall.ts (`withIdentity`: tokenizer, heredocs, recursive substitutions, hub-word detection, injection, refusals; Approach 1–4) → verify: `cd packages/crew && npx vitest run test/hub/hubcall.test.ts` (AC1–AC6 at unit level, AC10)
- [x] T2: Write packages/crew/test/hub/hubcall.test.ts (quoted `&&`/`;`/`|` in a `--note` stays one command; escaped quotes; `#` comments; `node --no-warnings <hub>`; direct `<path>/crew.mjs`; assignment and keyword prefixes; `$(…)`, backticks, `"$(…)"`; `<<EOF`, `<<-EOF`, `<<'EOF'`, `<<<`; each refusal of Approach 3 with a non-refused neighbour: `bash script.sh <hub>`, `node script.js <hub>`, `git log -- <hub>`, `cat <<EOF` naming the hub) → verify: `cd packages/crew && npx vitest run test/hub/hubcall.test.ts` (runs from source, no build)
- [x] T3: Wire `withIdentity` into guard.ts's identity block and remove `runsHub`, `RUNNER`, `OPERAND_OF` → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/guard.test.ts` with the pre-existing cases unmodified, and `wc -l src/hub/commands/team/guard.ts src/hub/commands/team/hubcall.ts` both under 300 (AC8, AC10)
- [x] T4: Add the regression cases of the Test plan to packages/crew/test/hub/e2e/guard.test.ts, one `it` per incident shape, including the `sh -c` run of the rewritten learn call → verify: the T3 command passes; then in the plan worktree `git stash push -- packages/crew/src/hub/commands/team/guard.ts`, `npm run build`, `npx vitest run test/hub/e2e/guard.test.ts` shows each new AC1–AC5 case failing, `git stash pop`, `npm run build`; both runs recorded in the checkpoint (AC1–AC7, AC9)
- [x] T5: In packages/crew/test/hub-worktrees.test.ts (guard describe, ~line 246), remove the `find . -exec …` entry
      and its "fails closed" framing from the injection `cases` list and assert instead that
      `hook(r, "find . -exec node .crew/bin/crew.mjs next \\;")` has `permissionDecision` "deny" and a
      `permissionDecisionReason` containing "directly"; update the comment above the `ls x\nnode …` case so it no
      longer says fails closed through an operand-taking command (that case is a plain newline-chained hub call
      now); no other case and no source file changes → verify: `cd packages/crew && npx vitest run
      test/hub-worktrees.test.ts -t "injects identity"` passes, and `npm run build && npx vitest run
      test/hub/e2e/guard.test.ts test/hub/hubcall.test.ts` still pass (AC11, AC8)

## Test plan
Targeted checks only (the e2e file runs the built bundle, so build first: `cd packages/crew && npm run build`).
- AC1 — guard.test.ts "the guard injects identity only after the executed hub program": for
  `node .crew/bin/crew.mjs learn decision "X" --why "rebuild dist/crew.mjs and dist/mcp.mjs"`, a checkpoint with
  `--note "ran node .crew/bin/crew.mjs next"` and a log call with the hub path in its text, `updatedInput.command`
  equals the input with ` --as qa --run-id qa:a1` inserted once after the first `.crew/bin/crew.mjs`; the learn call,
  run with `sh -c` in the test repo, stores a body containing `rebuild dist/crew.mjs and dist/mcp.mjs` and no `--as`.
- AC2 — guard.test.ts "a script's arguments are left alone": `bash .crew/drafts/x.sh /abs/.crew/bin/crew.mjs P-001`
  , `sh x.sh .crew/bin/crew.mjs` and `X=1 QA_DIR=/x bash .crew/drafts/x.sh /abs/.crew/bin/crew.mjs P-001` give no
  decision (`hook` returns null); hubcall.test.ts's AC2 list has the same `VAR=value` case.
- AC3 — guard.test.ts "heredoc bodies are left alone": `cat > /tmp/x.sh <<'EOF'\nnode .crew/bin/crew.mjs next\nEOF`
  gives no decision.
- AC4 — guard.test.ts "a hub path in a variable is refused": `C="node .crew/bin/crew.mjs"; $C next` is denied with a
  reason containing "variable".
- AC5 — guard.test.ts "nested hub calls are refused": `bash -c 'node .crew/bin/crew.mjs next'`,
  `eval "node .crew/bin/crew.mjs next"`, `echo next | xargs node .crew/bin/crew.mjs`,
  `node -e "require('child_process').execSync('node .crew/bin/crew.mjs next')"` and
  `git -c 'alias.x=!node .crew/bin/crew.mjs next' x` are each denied with a reason containing "directly".
- AC6 — hubcall.test.ts prefix/substitution cases, plus guard.test.ts: `cd "$(node .crew/bin/crew.mjs context P-001)"`
  is rewritten inside the substitution; the existing chained-calls assertion (line 38) still holds.
- AC7 — guard.test.ts: the existing approval/claim cases (lines 40–47) still deny, plus
  `bash -c 'node .crew/bin/crew.mjs move P-001 done --approved-by Amit'` is denied with "never pass --approved-by".
- AC8 — `npx vitest run test/hub/e2e/guard.test.ts` after the build: all pre-existing `it` blocks pass unmodified.
- AC9 — the T4 stash run: each AC1–AC5 case fails against the base guard.ts.
- AC10 — `wc -l packages/crew/src/hub/commands/team/guard.ts packages/crew/src/hub/commands/team/hubcall.ts`; read
  hubcall.ts's imports.
- AC11 — `cd packages/crew && npx vitest run test/hub-worktrees.test.ts -t "injects identity"` passes on the plan branch.

## Rollout & rollback
n/a for the source change; the vendored .crew/bin copy is refreshed by the next release (refresh-bin). Rollback is a
revert of the plan's commit; agents keep the old workaround (avoid the hub name in argument text) meanwhile.

## Risks & open questions
- Fail-closed refusals may block a harmless command that only reads the hub file inside nested code (e.g. a
  `node -e` that reads dist/crew.mjs). Accepted: the reason tells the agent how to rephrase; better than corrupting
  the command.
- A script that runs the hub itself gets no identity (the guard can't see it). Accepted, out of scope; the hub acts
  in no role there and role gates refuse.
- The tokenizer is best effort, not a full shell parser (no arithmetic, no `case` patterns, no nested heredocs
  inside substitutions). Anything it can't place keeps the old safety net: the approval and claim checks scan the
  whole command text.

## Handoff

_Generated 2026-10-25 by `crew.mjs handoff` from the ledger._

- P-042: Guard rewrites only the executed hub program [in-review] tasks 4/5 — claimed by Arpit Anand (developer:a9602839fa6e2d4d5)
- last checkpoint 2026-10-25 14:13 at T5 (178c1ed) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/guard.test.ts -t 'executed hub program' (AC 1)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/guard.test.ts test/hub/hubcall.test.ts -t 'left alone' (AC 2)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/guard.test.ts test/hub/hubcall.test.ts -t 'variable' (AC 4)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/guard.test.ts test/hub/hubcall.test.ts -t 'nested|git alias' (AC 5)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/guard.test.ts test/hub/hubcall.test.ts -t 'visible hub calls|chained|prefixes|calls inside' (AC 6)
- ✓ cd packages/crew && npx vitest run test/hub/e2e/guard.test.ts (AC 8)
- ✓ cd packages/crew && npx vitest run test/hub/hubcall.test.ts -t 'pure and small' (AC 10)
- ✓ Copied the worktree to a scratch dir, put the base guard.ts (git show aabe422:...) and no hubcall.ts there, rebuilt, ran guard.test.ts: all 5 new BUG-017 cases (AC1-AC5) fail, the 13 pre-existing pass. Worktree untouched. (AC 9) (reported)
- ✓ wc -l: guard.ts 218, hubcall.ts 224 (both <300); hubcall.ts only import is basename from node:path (pure). (AC 10) (reported)
- ✓ git diff vs merge-base: the only removed line in guard.test.ts is the import line (extended); no pre-existing it block edited; 18/18 pass incl. the X=1 QA_DIR=/x bash case. (AC 8) (reported)
- next: T5: In packages/crew/test/hub-worktrees.test.ts (guard describe, ~line 246), remove the `find . -exec …` entry
- evidence: AC1 ✓, AC2 ✓, AC3 ✓, AC4 ✓, AC5 ✓, AC6 ✓, AC7 ✓, AC8 ✓, AC9 ✓, AC10 ✓, AC11 —

Latest log:
- 2026-10-25: Release: NOT merged. Full suite on 6fc4be0 (plan branch merged with main, rebuilt, refresh-bin ok) fails: hub-worktrees.test.ts 'injects identity only where the hub runs' (line 248, a hook result lacks updatedInput.command; reproduces alone in ~2s); view.test.ts beforeAll timed out at 120s (likely load). Sent back via Director.
- 2026-10-25: Architect diagnosis of Release's full-suite failure: test/hub-worktrees.test.ts guard test passes on main, fails on the P-042 branch only at its last case, find -exec with a hub call. That case pinned the pre-P-042 fail-closed injection; P-042's AC5 and decision K-2026-10-25-the-guard-gives-identity-only-to-a-hub refuse it instead, so the guard is right and the test is stale. The spec missed this second guard test file. Re-specced: touches add packages/crew/test/hub-worktrees.test.ts, AC11 and T5 (test-only change: assert deny with reason containing directly for that case, drop the fails-closed comment). done has no transitions without --force, so reopening waits on the Director/human.
- 2026-10-25: status done → in-progress — full-suite failure: test/hub-worktrees.test.ts 'injects identity only where the hub runs' find -exec case is now denied by the new guard (AC5), test is stale

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-042-guard-rewrites-only-the-executed-hub
- 2026-10-25: status in-progress → in-review
- 2026-10-25: review: changes requested — Code is right and matches the spec: touches exact, hubcall.ts pure (node:path only), 224 and 218 lines, typecheck clean, hubcall.test.ts 10/10 and e2e guard.test.ts 18/18 after a build, AC9 base run recorded at T4, and it merges cleanly onto main (P-030 did not touch guard.ts). One change: the VAR=value shape logged on BUG-017 in 463c393 behaves correctly (I checked X=1 bash x.sh <hub path> P-001 against withIdentity: unchanged) but no test pins it. AC2 and its test plan now name it. Add X=1 QA_DIR=/x bash .crew/drafts/x.sh /abs/.crew/bin/<hub> P-001 to the AC2 loop in test/hub/e2e/guard.test.ts ('a script's arguments are left alone', expect hook null) and to the AC2 list in test/hub/hubcall.test.ts ('the hub named as an argument is left alone'). No source change needed. Rebuild and re-run both files; then back to review.
- 2026-10-25: status in-review → in-progress — changes requested: Code is right and matches the spec: touches exact, hubcall.ts pure (node:path only), 224 and 218 lines, typecheck clean, hubcall.test.ts 10/10 and e2e guard.test.ts 18/18 after a build, AC9 base run recorded at T4, and it merges cleanly onto main (P-030 did not touch guard.ts). One change: the VAR=value shape logged on BUG-017 in 463c393 behaves correctly (I checked X=1 bash x.sh <hub path> P-001 against withIdentity: unchanged) but no test pins it. AC2 and its test plan now name it. Add X=1 QA_DIR=/x bash .crew/drafts/x.sh /abs/.crew/bin/<hub> P-001 to the AC2 loop in test/hub/e2e/guard.test.ts ('a script's arguments are left alone', expect hook null) and to the AC2 list in test/hub/hubcall.test.ts ('the hub named as an argument is left alone'). No source change needed. Rebuild and re-run both files; then back to review.
- 2026-10-25: status in-progress → in-review
- 2026-10-25: status in-review → done
- 2026-10-25: Release: NOT merged. Full suite on 6fc4be0 (plan branch merged with main, rebuilt, refresh-bin ok) fails: hub-worktrees.test.ts 'injects identity only where the hub runs' (line 248, a hook result lacks updatedInput.command; reproduces alone in ~2s); view.test.ts beforeAll timed out at 120s (likely load). Sent back via Director.
- 2026-10-25: Architect diagnosis of Release's full-suite failure: test/hub-worktrees.test.ts guard test passes on main, fails on the P-042 branch only at its last case, find -exec with a hub call. That case pinned the pre-P-042 fail-closed injection; P-042's AC5 and decision K-2026-10-25-the-guard-gives-identity-only-to-a-hub refuse it instead, so the guard is right and the test is stale. The spec missed this second guard test file. Re-specced: touches add packages/crew/test/hub-worktrees.test.ts, AC11 and T5 (test-only change: assert deny with reason containing directly for that case, drop the fails-closed comment). done has no transitions without --force, so reopening waits on the Director/human.
- 2026-10-25: status done → in-progress — full-suite failure: test/hub-worktrees.test.ts 'injects identity only where the hub runs' find -exec case is now denied by the new guard (AC5), test is stale
- 2026-10-25: status in-progress → in-review
- 2026-10-25: status in-review → done
- 2026-10-25: merged to main as 7594b48 (squash); full suite green on the plan commit (suite exit 0); no rollout needed, vendored .crew/bin refreshed in the plan commit

## Outcome
Learnings: K-2026-10-25-a-plan-task-that-says-to-git-stash
