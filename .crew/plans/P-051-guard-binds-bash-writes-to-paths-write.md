---
id: P-051
title: Guard binds Bash writes to paths.write and resolves or refuses unknown targets
goal: G-007
items: BUG-033, BUG-021, BUG-011, BUG-013, BUG-002
touches: packages/crew/src/hub/commands/team/guard.ts, packages/crew/src/hub/commands/team/targets.ts, packages/crew/src/hub/commands/team/hubcall.ts, packages/crew/test/hub/targets.test.ts, packages/crew/test/hub/hubcall.test.ts, packages/crew/test/hub/e2e/guard.test.ts, packages/crew/test/hub/e2e/guard-writes.test.ts, plugins/crew/skills/hub/references/model.md
depends_on:
status: ready
branch: plan/P-051-guard-binds-bash-writes-to-paths-write
pr:
created: 2026-10-26
started:
completed:
---

# P-051: Guard binds Bash writes to paths.write and resolves or refuses unknown targets

## Context
G-007 guard bugs. All of them change how `writeTargets()` and `decide()` in
`packages/crew/src/hub/commands/team/guard.ts` treat a Bash command. They form one plan because the fixes interact. Once
`paths.write` applies to Bash targets, an unresolved mid-path variable (BUG-011) also bypasses `paths.write`. The rule
"refuse what can't be resolved" is one decision, whether the unknown is a variable or an interpreter script.

Items:
- **BUG-033 (P1, S2).** `decide()` checks `paths.write` only when `path` is set, which happens for the EDITS tools only.
  Bash targets get `paths.protected`, unknown-variable, hub-copy and outside-repo checks, but never `paths.write`. In
  practice a pm rewrote items with a redirect, a heredoc, `tee`, `cp` or `sed -i`.
- **BUG-021 (P1, S2).** An inline or stdin interpreter script (`python3 -`, `python3 -c`, `node -e`, `perl -pi -e`,
  `ruby -e`) can write any file with no visible target. That defeats `paths.write`, `paths.protected` and the
  outside-repo check.
- **BUG-011 (P2, S3).** A variable in the middle of a target (`.crew/$X`, `/tmp/$X/x`, `docs/$f`) is kept as literal
  text. It is neither expanded nor refused.
- **BUG-013 (P2, S3).** A false positive: targets that come from `$(mktemp …)` or from a `for` loop variable are refused
  as unresolvable.
- **BUG-002 (P3, S3).** A subagent can run `crew.mjs init`. Run from a non-vendored copy, it overwrites `.crew/bin` and
  `.crew/templates/agents`.

Today `writeTargets()` splits the command with regexes (`segments()`, `words()`, `REDIRECT`). This is why a `>` inside
quoted text or a heredoc body counts as a write (gotcha K-2026-10-25-the-crew-guard-reads-text-inside-a-bash). The
`hubcall.ts` `parse()` is a real tokenizer: it handles quotes, heredocs, `$(…)`, backticks and subshells. This plan
rebuilds target resolution on top of it.

Decisions that bind this plan:
- The guard's best-effort design and its refusals of nested shell code (K-2026-10-25-the-guard-gives-identity-only-to-a-hub).
- Loosening a guardrail is reserved for the human (docs/vision.md, Reserved decisions). For that reason the Edit/Write
  path keeps refusing temp-dir files for roles with `paths.write`. Only the new Bash check exempts temp dirs, and since
  Bash has no `paths.write` check today, that check is purely a tightening.
- Modules stay under 300 lines. `guard.ts` is at 218, so target resolution moves to a new `targets.ts`.
  `guard.test.ts` is at 281, so the new e2e cases go in a new `guard-writes.test.ts`.

## Scope
**In:**
- Bash write targets are checked against the role's `paths.write`. Targets under `/dev/`, `os.tmpdir()` and `/tmp` are
  exempt, after realpath. So are the operands of `git checkout` / `git restore`, which put back committed content and
  author nothing (BUG-033).
- Roles with a `paths.write` limit are refused inline and stdin interpreter scripts, `sh -c` / shell stdin, and `eval`
  (BUG-021; see Approach 4).
- Variables are expanded anywhere in a target, not only at its start. Known assignments resolve; `$(mktemp …)` counts as
  a temp path; a `for` variable resolves to each listed word or glob match. Whatever stays unknown is refused
  (BUG-011, BUG-013).
- `crew.mjs init` is denied for every subagent (BUG-002).
- Resolution runs on `parse()`, so heredoc bodies and quoted text are no longer write targets.
- `references/model.md` documents the Bash write rules and the gap that remains.

**Out:**
- BUG-012 (cd tracking edge cases, `install -d`). The existing `cd` behaviour is ported as it is.
- Writes the guard can't see: a script *file* run by an interpreter, build tools (`npm run`, `make`), `git clean`,
  `find -exec`, `xargs` command lines. These are documented as the gap, not closed.
- Changing the Edit/Write path's temp-dir rule. That would loosen it, which is reserved.
- Release's `refresh_bin` route. Release's generated-files steps also move into `land` with P-032.
- The agent definition templates (`plugins/crew/skills/hub/agents/*.md`). The deny messages say what to do instead.

## Acceptance criteria
"Denied" means the hook prints `permissionDecision: "deny"` with the quoted reason text. "Allowed" means no deny: the
hook prints nothing, or only an `updatedInput` with identity. Role cases use a policy that gives pm and qa
`paths.write: [".crew/drafts/**"]` and gives developer no `paths.write` (`preset: lifecycle`).

- [ ] AC1 (BUG-033) · As crew-pm, each of these is denied with "may only write .crew/drafts/** (paths.write)":
  - `echo x > .crew/items/BUG-999-x.md`
  - `cat > .crew/items/BUG-999-x.md <<'EOF'` / `x` / `EOF`
  - `echo x | tee .crew/items/BUG-999-x.md`
  - `cp .crew/drafts/x.md .crew/items/BUG-999-x.md`
  - `sed -i '' 's/a/b/' .crew/items/BUG-999-x.md`
  - `echo x > docs/notes.md`
  - from a plan worktree cwd, `echo x > src/a.ts`

  These are allowed as crew-pm:
  - `echo x > .crew/drafts/a.md`, also from a plan worktree cwd
  - `ls 2>/dev/null`
  - `node x.js > /dev/null 2>&1`
  - `echo x > /tmp/a.txt`
  - `echo x > <os.tmpdir()>/a.txt`
  - `git checkout -- docs/a.md`
  - `node .crew/bin/crew.mjs next 2>/dev/null`, which gets identity

  As crew-developer, `echo x > docs/notes.md` is allowed. A pm Write of a temp-dir file is still denied (the Edit/Write
  path is unchanged).
- [ ] AC2 (BUG-021) · As crew-pm and as crew-qa, each of these is denied with "inline" and "(paths.write)" in the
  reason:
  - `python3 - <<'PY'` / `open('.crew/items/x.md','w').write('x')` / `PY`
  - the same heredoc writing `.crew/policy.yaml`
  - `python3 -c "print(1)"`
  - `node -e "require('fs').writeFileSync('.crew/items/x.md','x')"`
  - `node -p 1`
  - `perl -pi -e 's/a/b/' docs/a.md`
  - `ruby -e 'File.write("x","y")'`
  - `cat s.py | python3`
  - `python3 <<< "print(1)"`
  - `bash -c 'echo x > .crew/items/x.md'`
  - `sh <<'EOF'` / `echo x` / `EOF`
  - `eval "echo x > a"`
  - `timeout 5 node -e 1`

  These are allowed for both roles:
  - `node script.js`
  - `python3 -m json.tool .crew/drafts/a.json`
  - `node --version`
  - `python3 --version`
  - `bash .crew/drafts/x.sh`

  As crew-developer, `node -e 1` and the python3 heredoc writing `.crew/items/x.md` are allowed.
- [ ] AC3 (BUG-011) · As crew-developer, BUG-011's seven commands are denied:
  - "protected": `X=policy.yaml; echo x > .crew/$X`, `X=policy.yaml; echo x > .crew/${X}`,
    `for f in policy.yaml; do echo x > .crew/$f; done`, `X=policy.yaml; cp evil .crew/$X`
  - "outside the repository": `X=../Users/aanand; echo hi > /tmp/$X/x`, `X=../../../..; echo hi > docs/$X/x`,
    `for f in ../../../../x; do echo hi > docs/$f; done`

  `echo hi > docs/$CREW_TEST_UNSET/x` is denied with "can't resolve". `for f in a b; do echo hi > docs/$f.md; done`
  and `X=a; echo hi > docs/$X.md` are allowed. As crew-pm, `X=items; echo x > .crew/$X/a.md` is denied for
  paths.write and `X=drafts; echo x > .crew/$X/a.md` is allowed.
- [ ] AC4 (BUG-013) · As crew-developer, with `src/a.ts` and `src/b.ts` in the test repo, these are allowed:
  - `tmp=$(mktemp -d) && echo x > "$tmp/a"`
  - `echo x > "$(mktemp)"`
  - `tmp=$(mktemp -d); cp README.md "$tmp/"`
  - `for f in a b; do touch "$f"; done`
  - `for f in src/*.ts; do sed -i '' s/a/b/ "$f"; done`

  These are denied:
  - "protected": `for f in .crew/bin/*; do echo x > "$f"; done` and
    `for f in a.md .crew/policy.yaml; do echo x > "$f"; done`
  - "can't resolve": `for f in $(ls); do touch "$f"; done` and
    `tmp=$(mktemp -d .crew/bin/x.XXXX); echo x > "$tmp/a"`

  As crew-pm, `tmp=$(mktemp -d) && echo x > "$tmp/a"` is allowed.
- [ ] AC5 (BUG-002) · As crew-pm, crew-developer and Explore, these are denied with "init" in the reason:
  `node .crew/bin/crew.mjs init`, `node plugins/crew/skills/hub/dist/crew.mjs init` and
  `node ~/.claude/plugins/cache/x/crew/skills/hub/dist/crew.mjs init`. `node .crew/bin/crew.mjs next` still gets
  identity. In the main session (no `agent_type`), `node .crew/bin/crew.mjs init` is allowed.
- [ ] AC6 · Heredoc bodies and quoted text are not write targets. As crew-developer,
  `cat > /tmp/x.ts <<'EOF'` / `const f = (a) => a > b;` / `echo > ~/x` / `EOF` is allowed. So is
  `node .crew/bin/crew.mjs log P-001 "wrote > ~/x"`, with identity injected.
- [ ] AC7 · Every `it` block already in `test/hub/e2e/guard.test.ts` and `test/hub/hubcall.test.ts` passes unmodified.
- [ ] AC8 · `test/hub/targets.test.ts` unit-tests `targets.ts` from source. `guard.ts`, `targets.ts` and `hubcall.ts`
  each stay under 300 lines, `targets.ts` imports nothing from `src/hub/core`, and `npm run typecheck` passes.
- [ ] AC9 · `references/model.md` states three things in its policy section. Bash write targets are checked against
  `paths.write`, with `/dev`, temp dirs and git restores exempt. Roles with `paths.write` are refused inline
  interpreter and shell scripts. A script file or build tool a role runs is not seen by the guard.

## Approach
1. **parse() records output redirections** (`hubcall.ts`). `Simple` gains `targets: Word[]`, holding the target word
   of each `>`, `>>`, `>|`, `&>`, `&>>` and `>&WORD` redirection. It excludes `>&N`, `>&-`, input `<`, heredoc
   delimiters, here-strings and process substitutions. `withIdentity` ignores the new field, so `hubcall.test.ts` stays
   as it is. Keep `parse()` pure.
2. **`targets.ts`** exports two functions:
   - `writeTargets(cmd, cwd): string[]` replaces the version in guard.ts.
   - `inlineScript(cmd): string | null` returns the head of the first offending command.

   `writeTargets` walks `parse(cmd)` in order and keeps a variable table. Each name maps to a list of values or to
   *unknown*. It handles these cases:
   - **Assignments.** A word-only `NAME=v` command, `export`/`local`/`declare`/`readonly NAME=v`, and prefix
     assignments are recorded with `v` expanded. A `NAME=$(mktemp …)` assignment is recorded as a temp path.
   - **`for NAME in w…`.** Each word is expanded. A word whose last path segment holds `*`, `?` or `[` is matched
     against `readdirSync` of its directory, relative to cwd and the current `cd` dir. No match leaves the literal word,
     as bash does. A glob in an earlier segment, or a `for` with no `in` list, makes NAME unknown. So does
     `read NAME` or `$(…)`/backticks other than mktemp.
   - **Targets.** Redirection targets, the destination of `cp`/`ln`/`install` (with `-t`), the operands of the WRITERS
     commands, `sed -i`, and `git checkout/restore/rm/mv`. Port the current rules, including `cd`/`pushd` tracking and
     PREFIX words.
   - **Expansion.** Every `$NAME` or `${NAME}` in a target is expanded, whatever its position, as the cartesian product
     of its values. A name the command never assigns falls back to `process.env`. `$(mktemp)` and `$(mktemp -d|-q|-u|-t
     PREFIX …)` become `<real tmpdir>/mktemp.XXXXXX`. A mktemp with a template or `-p`/`--tmpdir` is unknown.
   - **Unresolved targets.** A target with an unknown name, a `${…}` with an operator, a non-mktemp `$(…)`, or more
     than 64 expansions stays as text containing `$`. decide() refuses it as "can't resolve".

   `git checkout/restore` operands are returned marked as restores, so they can skip `paths.write`. A
   `{ path, restore }` shape or a second list are both fine.
3. **decide()** keeps its order for every subagent: protected, then can't resolve (now any target containing `$` or a
   backtick), then hub copy, then outside, then secrets, then `--approved-by`, then `agents`. Next to `agents` it adds
   `hubCommand(c) === "init"`, with the reason "`crew.mjs init` vendors the hub and its agent templates, which only the
   human installs (paths.protected)". In the role section, after `tools.deny`, when `policy.paths.write.length` is set:
   - If `inlineScript(cmd)` returns something, deny with "the <role> role may only write <globs> (paths.write); an
     inline or stdin <head> script hides what it writes: use a hub command, or the Write tool on a path in paths.write".
   - Otherwise, take the first target that is not exempt and not in `paths.write` and deny with "the command writes to
     <rel>; the <role> role may only write <globs> (paths.write)". Exempt means under `/dev/`, under real
     `os.tmpdir()` or real `/tmp`, or a git restore.

   The Edit/Write `paths.write` check stays as it is.
4. **`inlineScript`.** It skips PREFIX words, assignments and the wrappers `env`, `nohup`, `nice`, `exec`,
   `timeout <n>` and `xargs` (with its options) to find the head. The head is offending in these cases:
   - **Interpreters.** It is one of `python`, `python2`, `python3`, `python3.N`, `node`, `nodejs`, `bun`, `deno`,
     `perl`, `ruby` or `php`, and one of the following holds:
     - it has an inline flag: python `-c`; node/bun `-e`/`-p`/`--eval`/`--print`; deno `eval`; a perl/ruby option
       cluster containing `e` or `E`; php `-r`;
     - its first operand is `-`;
     - it has no operand and no `-m`, `--version`, `-V`, `-h` or `--help`. This covers pipes, heredocs, here-strings
       and `< file`.
   - **Shells.** It is one of `sh`, `bash`, `zsh`, `dash` or `ksh`, and it has a `-c` cluster or no script operand.
   - **eval.** The head is `eval`.

   This applies only to roles with a `paths.write` limit (decision recorded on this plan). Developer and architect
   keep `node -e`.

## Tasks
- [ ] T1: `hubcall.ts` `parse()` records output redirection targets (Approach 1) → verify: `cd packages/crew && npx vitest run test/hub/hubcall.test.ts` passes unmodified (AC7)
- [ ] T2: Write `targets.ts` (`writeTargets`, `inlineScript`; Approach 2 and 4) and its unit regression test `test/hub/targets.test.ts`, covering each AC's command shapes: mid-path and braced variables, `for` words and globs (a temp dir with files), mktemp forms, unknowns, restores, heredoc/quoted text, each interpreter, shell and wrapper form with an allowed neighbour → verify: `cd packages/crew && npx vitest run test/hub/targets.test.ts` (AC2–AC4, AC6, AC8)
- [ ] T3: Wire `targets.ts` into `decide()` (remove `writeTargets` and `REDIRECT` from `guard.ts`; keep `segments`, `words`, `hubCommand`), add the init deny and the role-section Bash `paths.write` and inline-script checks (Approach 3) → verify: `cd packages/crew && npm run build && npx vitest run test/hub/e2e/guard.test.ts` passes unmodified (AC7); `wc -l src/hub/commands/team/{guard,targets,hubcall}.ts` each under 300; `npm run typecheck` passes (AC8)
- [ ] T4: Write the e2e regression test `test/hub/e2e/guard-writes.test.ts`, one `it` per AC1–AC6 named "paths.write binds Bash writes (BUG-033)", "inline scripts are refused for roles with paths.write (BUG-021)", "mid-path variables are expanded or refused (BUG-011)", "mktemp and for-loop targets resolve per value (BUG-013)", "subagents can't run crew.mjs init (BUG-002)", "heredoc bodies and quoted text are not write targets" → verify: after `npm run build`, `npx vitest run test/hub/e2e/guard-writes.test.ts` passes; then copy the new guard.ts, hubcall.ts and targets.ts to the scratchpad, write the base guard.ts and hubcall.ts from `git show <base>:<path>`, rebuild and confirm the AC1–AC5 cases fail, restore the three files from the scratchpad copies and rebuild; both runs recorded in the checkpoint
- [ ] T5: Document the Bash write rules and the remaining gap in `references/model.md`, in the policy paragraph after "the `guard` hook enforces …" (AC9) → verify: `grep -n "inline" plugins/crew/skills/hub/references/model.md` shows the new text

## Test plan
These are targeted checks only. The e2e files run the built bundle, so build first with
`cd packages/crew && npm run build`.
- AC1: `npx vitest run test/hub/e2e/guard-writes.test.ts -t "BUG-033"`
- AC2: `npx vitest run test/hub/e2e/guard-writes.test.ts -t "BUG-021"` and
  `npx vitest run test/hub/targets.test.ts -t "inline"`
- AC3: `npx vitest run test/hub/e2e/guard-writes.test.ts -t "BUG-011"` and
  `npx vitest run test/hub/targets.test.ts -t "variable"`
- AC4: `npx vitest run test/hub/e2e/guard-writes.test.ts -t "BUG-013"` and
  `npx vitest run test/hub/targets.test.ts -t "mktemp|for"`
- AC5: `npx vitest run test/hub/e2e/guard-writes.test.ts -t "BUG-002"`
- AC6: `npx vitest run test/hub/e2e/guard-writes.test.ts -t "heredoc"`
- AC7: `npx vitest run test/hub/e2e/guard.test.ts test/hub/hubcall.test.ts`
- AC8: `npx vitest run test/hub/targets.test.ts`, `npm run typecheck`, and
  `wc -l src/hub/commands/team/{guard,targets,hubcall}.ts`
- AC9: `grep -n "inline" plugins/crew/skills/hub/references/model.md`

## Rollout & rollback
Rollout: Release lands the plan as usual. The vendored `.crew/bin/crew.mjs` then needs refreshing (`refresh_bin`; the
executive's session refreshes `.crew/bin` on main after each merge, per K-2026-10-25-claude-codes-auto-mode-permission-check).
Until then the old guard keeps running. Rollback: revert the plan's commit and refresh `.crew/bin` again.

## Risks & open questions
- **Daily commands of the draft-only roles.** These now get refused:
  - QA's `cmd | tee out.txt` and `node -e` probes. QA should write outputs and probe scripts in its scratchpad,
    which is exempt as a temp dir.
  - Release's "remove new untracked" generated files with `rm` (release.md step 3). `git checkout --` is exempt,
    and P-032's `land` takes over the whole step.
  If either bites before P-032 lands, file a bug rather than widening the exemptions in this plan.
- **The interpreter rule is a speed bump, not a wall.** A script file, or a build tool, still writes unseen. The rule
  stops the accidental route BUG-021 and BUG-033 observed, and model.md states the gap.
- **The `for`-glob expansion reads the filesystem at hook time.** A file created earlier in the same command line is
  not seen. The literal-glob fallback then applies, which is the shell's behaviour for no match.
- **Overlap.** P-035 (ready) also adds a rule to `guard.ts` and cases to `guard.test.ts`. The test file is
  `hub.shared`; `guard.ts` is not, so staffing sequences the two plans. The edits are in different blocks. P-032's
  touches don't overlap this plan.

## Handoff

## Progress log

- 2026-10-26: status draft → ready

## Outcome
