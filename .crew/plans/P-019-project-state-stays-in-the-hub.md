---
id: P-019
title: Project state stays in the hub
goal: G-001
items: BUG-006, BUG-007, BUG-009, BUG-010
touches: CLAUDE.md, packages/crew/src/hub/**, packages/crew/test/**, plugins/crew/skills/hub/SKILL.md, plugins/crew/skills/hub/dist/**, plugins/crew/skills/guidelines/templates/CLAUDE.project.md, plugins/crew/skills/global-setup/assets/CLAUDE.global.md, .crew/bin/crew.mjs
depends_on: P-017
status: done
branch: plan/P-019-project-state-stays-in-the-hub
pr:
created: 2026-10-24
started: 2026-10-24
completed: 2026-10-24
assignee: developer
---

# P-019: Project state stays in the hub

## Context
Delivers BUG-006, BUG-007, BUG-009 and BUG-010 under G-001 (Shared context: the hub). BUG-007 (the guard matches relative paths as given, not resolved against the hook's `cwd`) is the same path resolution T3 needs, so it lands here. BUG-009 (`>|` and `>&FILE` redirects) and BUG-010 (`cd` inside `{ }`, `if`, `builtin`/`command`, or to a variable) are bypasses of T3's rules found in QA, folded in with the single-operand `ln -s` false deny the review noted. P-018's hand-over ended up only in a Claude side-session notes folder outside the repo, which breaks G-001's outcome ("nothing important lives only in chat"). Root cause, found while reviewing P-018:
- The repo has no CLAUDE.md. The only "the hub is your only memory" line is in `agents/director.md`, which reaches the Director agent alone. A main session that runs a plan with `--as ROLE` (as P-018 did) is told nothing.
- The app's side-session instructions tell a session to leave hand-over notes in that external folder. With no project rule, they win. Claude's memory folder and the scratchpad are sinks of the same kind.
- The guard covers subagents only, and has no rule for writes outside the repo. `check` can't see outside files.
- The rule ships nowhere either: the plugin's `CLAUDE.project.md` template and `CLAUDE.global.md` don't say it, and hub `init` writes no CLAUDE.md. Every crew project has the same gap.

## Scope
**In:**
- **One rule, one wording**, in a marked section (`<!-- crew:hub-state -->`): everything the next person or agent needs goes through `crew.mjs`:
  - where work stands → `handoff` and `log`;
  - findings and follow-ups → `new-item`;
  - what to know → `learn`;
  - questions → `ask`.

  Places outside the repo (side-session notes folders, the scratchpad, Claude's memory, `/tmp`) hold only pointers to hub IDs, never the facts. When other instructions say to leave notes elsewhere, write to the hub and leave a pointer there.
- **This repo:** a `CLAUDE.md` with that section (written by the new `init`), so every session here loads it: main, side and subagent sessions.
- **`init`:** writes the section into the project's `CLAUDE.md`. It creates the file, appends to an existing one, and leaves it unchanged when the marker is already there.
- **`check`:** hints when `CLAUDE.md` lacks the section (`init` adds it).
- **Guard:** refuses a crew subagent's `Write`/`Edit`/`MultiEdit`/`NotebookEdit`, and Bash write targets, outside the repository and its plan worktrees. The system temp directory stays allowed for throwaway files. The main session is left alone, as today.
- **Plugin docs:** the hub SKILL.md (next to "Who you are and the ledger"), the guidelines skill's `CLAUDE.project.md` (*How we work*) and global-setup's `CLAUDE.global.md` (*Defaults*) carry the same rule.
- Rebuild dist, re-vendor `.crew/bin/crew.mjs`.

**Out (explicitly not doing):**
- Anything that watches the main session's writes outside the repo: no hook can see them, so the CLAUDE.md rule is the only lever there.
- Changing the Claude app's side-session instructions (not ours).
- Re-rendering or rewording the agent templates: subagents load the project CLAUDE.md.

## Acceptance criteria
- [ ] This repo's `CLAUDE.md` holds the hub-state section, and `check` here gives no hint about it (git grep + `check`).
- [ ] `init` on a repo with no CLAUDE.md creates one with the section; on a CLAUDE.md without it, appends the section and keeps the existing text; a second `init` changes nothing (vitest).
- [ ] `check` hints when CLAUDE.md is missing or lacks the section, and stops once `init` has added it (vitest).
- [ ] The guard refuses a crew subagent's Write and Edit, and a Bash `>` redirect, to a path outside the repo. Examples: a side-session notes folder, `~/.claude/projects/*/memory/`. It allows paths in the repo, in a plan worktree and under the temp dir, and leaves the main session alone (vitest).
- [ ] The guard resolves a relative or symlinked path before matching `paths.protected` and the outside-repo rule: a protected hub file reached through a symlink or by a relative path from a subdirectory `cwd` is refused (vitest, BUG-007).
- [ ] The hub SKILL.md, `CLAUDE.project.md` and `CLAUDE.global.md` state the rule (git grep for `crew:hub-state` or its wording).
- [ ] The guard's Bash parsing covers the forms found in QA: `>|` and `>&FILE` redirects (`>&2`, `2>&1` and `>&-` stay allowed); a `cd` after `{`, `if`/`then`/`while`/`do`, `!`, `builtin` or `command`; a variable at the start of a `cd` or write target, resolved from the command's own assignments or the environment and refused when unknown; and `ln -s TARGET` with one operand, checked at the link it creates (vitest, BUG-009, BUG-010).

## Approach
- **Section text:** one constant in the hub (`HUB_STATE_RULE` with its marker). `init` and `check` use it, and the templates repeat the wording.
- **init** (`commands/work/planning.ts`): read `CLAUDE.md` at the repo root; if the marker is missing, append `\n<section>` (or write the file with just the section). Print what it did.
- **check** (`commands/views/checks.ts`, `hygiene`): a hint when the marker is missing.
- **Guard** (`commands/team/guard.ts`, the "every subagent" block): resolve each write path with `real()`. Refuse when it is neither under the main checkout's root (`git.worktrees()[0]`; plan worktrees live under it in `.claude/worktrees/`) nor under the real `os.tmpdir()`/`/tmp`. Relative paths resolve against the hook's `cwd`. Applies to crew and non-crew subagents alike, like `paths.protected`.
- Tests are vitest e2e, built on P-017's `test/hub/e2e` helpers once it merges (hence `depends_on: P-017`).

## Tasks
- [x] T1: `HUB_STATE_RULE`; `init` writes it into CLAUDE.md → verify: `cd packages/crew && npx vitest run test/hub/e2e -t hub_state_init`
- [x] T2: `check` hint → verify: `npx vitest run test/hub/e2e -t hub_state_check`
- [x] T3: guard resolves paths against `cwd` (BUG-007) and refuses subagent writes outside the repo → verify: `npx vitest run test/hub/e2e -t "guard_outside_repo|guard_resolves_paths|guard_shell_forms"`
- [x] T4: hub SKILL.md, `CLAUDE.project.md`, `CLAUDE.global.md` → verify: AC6 grep
- [x] T5: rebuild dist, re-vendor, run `init` here to write this repo's CLAUDE.md → verify: `node .crew/bin/crew.mjs check` shows no hub-state hint

## Test plan
**Targeted checks:**
- Regression test (BUG-006): vitest `-t guard_outside_repo` writes a crew subagent's hand-over to a side-session notes path and expects a deny (it passes through today), and `-t hub_state_check` expects the hint on a repo without the section (no hint today).
- AC1: `git grep -n "crew:hub-state" CLAUDE.md`; `node .crew/bin/crew.mjs check` has no hub-state hint.
- AC2: vitest `-t hub_state_init` (no file, existing file, run twice).
- AC3: vitest `-t hub_state_check`.
- AC4: vitest `-t guard_outside_repo` (side-session notes path, memory path, repo path, plan worktree path, temp path, main session).
- AC5 (BUG-007): vitest `-t guard_resolves_paths` (protected file via a symlink, via a relative path from a subdirectory `cwd`).
- AC7 (BUG-009, BUG-010): vitest `-t guard_shell_forms`.
- AC6: `git grep -n "crew:hub-state\|pointers to hub IDs" -- plugins/crew/skills/hub/SKILL.md plugins/crew/skills/guidelines/templates/CLAUDE.project.md plugins/crew/skills/global-setup/assets/CLAUDE.global.md`.

**Full suite (before merge, and in CI):** `hub.full_suite` in `.crew/config.yaml`.

## Rollout & rollback
- Existing crew projects get the section when they next run `init`; `check` tells them.
- Users refresh `~/.claude/CLAUDE.md` with global-setup.
- Rollback: revert the commit. The CLAUDE.md section is plain text and can stay.

## Risks & open questions
- The guard could block a legitimate subagent write outside the repo, such as a tool cache in the home directory. Edits and redirects only; programs the agent runs are unaffected, and temp stays allowed.
- Wording drift between the constant and the three templates. The AC6 grep checks for the marker or the key phrase; keep them identical.

## Handoff

_Generated 2026-10-24 by `crew.mjs handoff` from the ledger._

- P-019: Project state stays in the hub [in-review] tasks 5/5 — claimed by Arpit Anand (wt:P-019-project-state-stays-in-the-hub-6705230f)
- last checkpoint 2026-10-24 13:33 at T3 (6239707) by Arpit Anand; since then 0 commit(s), 17 uncommitted file(s): .crew/bin/crew.mjs, .crew/plans/P-019-project-state-stays-in-the-hub.md, packages/crew/src/hub/commands/team/guard.ts, packages/crew/src/hub/commands/views/checks.ts, packages/crew/src/hub/commands/work/planning.ts, packages/crew/src/hub/core/work/model.ts, packages/crew/test/hub/e2e/basics.test.ts, packages/crew/test/hub/e2e/guard.test.ts
- ✓ cd packages/crew && npx vitest run test/hub/e2e -t "hub_state_init|hub_state_check|guard_outside_repo|guard_resolves_paths" (AC 2,3,4,5)
- ✓ cd packages/crew && npm run typecheck && npm test (AC 1,2,3,4,5,6)
- ✗ git grep -n "crew:hub-state" CLAUDE.md && ! node .crew/bin/crew.mjs --as qa --run-id qa:adccae42060d501d5 check 2>&1 | grep -i "hub-state\|CLAUDE.md" (AC 1)
- ✓ git grep --untracked -n "crew:hub-state" CLAUDE.md && ! node .crew/bin/crew.mjs --as qa --run-id qa:adccae42060d501d5 check 2>&1 | grep -i "hub-state\|CLAUDE.md" (AC 1)
- ✓ cd packages/crew && npx vitest run test/hub/e2e -t hub_state_init (AC 2)
- ✓ cd packages/crew && npx vitest run test/hub/e2e -t hub_state_check (AC 3)
- ✓ cd packages/crew && npx vitest run test/hub/e2e -t guard_outside_repo (AC 4)
- ✓ cd packages/crew && npx vitest run test/hub/e2e -t guard_resolves_paths (AC 5)
- ✓ git grep -n "crew:hub-state\|pointers to hub IDs" -- plugins/crew/skills/hub/SKILL.md plugins/crew/skills/guidelines/templates/CLAUDE.project.md plugins/crew/skills/global-setup/assets/CLAUDE.global.md (AC 6)
- ✓ cd packages/crew && npm run typecheck && npm test && npm run build (AC 1,2,3,4,5,6,7)
- evidence: AC1 ✓ (self), AC2 ✓ (self), AC3 ✓ (self), AC4 ✓ (self), AC5 ✓ (self), AC6 ✓ (self), AC7 ✓ (self)

Latest log:
- 2026-10-24: BUG-010: guard cd tracking misses { cd; }, if cd, builtin/command cd, cd $VAR (outside-repo and paths.protected)
- 2026-10-24: status in-review → in-progress — fold in BUG-009, BUG-010 and the single-operand ln case
- 2026-10-24: BUG-009/BUG-010 and the one-operand ln fixed in writeTargets: one REDIRECT pattern (>|, >&FILE; >&N and >&- skipped), segments() no longer splits >|, PREFIX words skipped before the command, leading variables expanded from in-command assignments then the environment (unknown → refused), ln -s TARGET checked at ./basename. New test guard_shell_forms fails on the round-2 guard and passes now.

## Progress log

- 2026-10-24: status draft → ready
- 2026-10-24: assigned to the developer role
- 2026-10-24: status ready → in-progress — branch plan/P-019-project-state-stays-in-the-hub
- 2026-10-24: Guard: outside-repo writes are allowed in any of the repo's worktrees (not only the main checkout), the temp dirs and /dev/; ~ and $HOME are expanded and quotes dropped in Bash targets. real() now resolves through the nearest existing ancestor.
- 2026-10-24: test/tools/global-setup.test.ts: the pre-rename fixture's text 'old' matched 'hold only pointers' in the new global rule; the fixture now uses 'the old block'.
- 2026-10-24: init here also vendored .crew/bin/studio.html (this repo's copy predates the design studio); left out of this plan.
- 2026-10-24: status in-progress → in-review
- 2026-10-24: review: changes requested — 1) paths.protected bypass across worktrees (guard.ts:99): rel() is relative to the hook cwd's toplevel, so a subagent whose cwd is a plan/isolated worktree can Write the MAIN checkout's .crew/policy.yaml (or a sibling worktree's) — rel becomes ../../../.crew/policy.yaml, no protected glob matches, and the new outside rule (guard.ts:103-106) explicitly allows it because any worktree is a home. Reproduced: cwd=P-019 worktree, file_path=<main>/.crew/policy.yaml -> no deny. Fix: compute rel against the repo worktree (root or any git.worktrees() path) that contains abs(p), longest match first, then strip .claude/worktrees/<x>/ as today; add a guard_resolves_paths case for a protected file in the main checkout reached from a worktree cwd, and one in a sibling worktree. 2) False denies on read operands (guard.ts:83, 122): writeTargets returns every operand of cp/ln/install, so 'cp ~/.npmrc fixtures/npmrc' and 'ln -s /opt/homebrew/bin/node bin/node' are refused as outside-repo writes (reproduced). For the outside rule use only the destination of cp/ln/install (last non-flag operand, or the -t dir); mv and rm operands stay writes. Keep the conservative all-operands check for paths.protected if you like. Add allow cases to guard_outside_repo. 3) Easy bypass of the outside rule (guard.ts:122): 'cd ~/.claude/projects/x/memory && echo hi > plan.md' resolves plan.md against the hook cwd and passes (reproduced). Track a leading cd <dir> per command chain and resolve later relative targets against it (or treat a cd outside the homes followed by a write as outside); add a test. Nits, fix while there: the deny text reads 'the command writes to /x is outside the repository' (guard.ts:107/123) — reword so it parses; redirects '&> f' and '2> f' are not captured (guard.ts:77), so 'echo x &> ~/.claude/notes.md' passes both rules — include &> and N> targets (excluding >&N). Everything else (init, check hint, HUB_STATE_RULE, docs, AC6 grep, dist/vendor, global-setup fixture change, modules under 300 lines) is good.
- 2026-10-24: status in-review → in-progress — changes requested: 1) paths.protected bypass across worktrees (guard.ts:99): rel() is relative to the hook cwd's toplevel, so a subagent whose cwd is a plan/isolated worktree can Write the MAIN checkout's .crew/policy.yaml (or a sibling worktree's) — rel becomes ../../../.crew/policy.yaml, no protected glob matches, and the new outside rule (guard.ts:103-106) explicitly allows it because any worktree is a home. Reproduced: cwd=P-019 worktree, file_path=<main>/.crew/policy.yaml -> no deny. Fix: compute rel against the repo worktree (root or any git.worktrees() path) that contains abs(p), longest match first, then strip .claude/worktrees/<x>/ as today; add a guard_resolves_paths case for a protected file in the main checkout reached from a worktree cwd, and one in a sibling worktree. 2) False denies on read operands (guard.ts:83, 122): writeTargets returns every operand of cp/ln/install, so 'cp ~/.npmrc fixtures/npmrc' and 'ln -s /opt/homebrew/bin/node bin/node' are refused as outside-repo writes (reproduced). For the outside rule use only the destination of cp/ln/install (last non-flag operand, or the -t dir); mv and rm operands stay writes. Keep the conservative all-operands check for paths.protected if you like. Add allow cases to guard_outside_repo. 3) Easy bypass of the outside rule (guard.ts:122): 'cd ~/.claude/projects/x/memory && echo hi > plan.md' resolves plan.md against the hook cwd and passes (reproduced). Track a leading cd <dir> per command chain and resolve later relative targets against it (or treat a cd outside the homes followed by a write as outside); add a test. Nits, fix while there: the deny text reads 'the command writes to /x is outside the repository' (guard.ts:107/123) — reword so it parses; redirects '&> f' and '2> f' are not captured (guard.ts:77), so 'echo x &> ~/.claude/notes.md' passes both rules — include &> and N> targets (excluding >&N). Everything else (init, check hint, HUB_STATE_RULE, docs, AC6 grep, dist/vendor, global-setup fixture change, modules under 300 lines) is good.
- 2026-10-24: QA: AC1-AC6 targeted checks pass; full typecheck+test (263) + build pass, skills tree unchanged by build. Hand probes independently reproduce the architect's review items 1-3 and the &>/2> nit (also '1> f'); not filed as bugs to avoid duplicating the review. Extra: a '>' inside quotes (echo 'a > ~/b') is a false outside-repo deny. AC1's check needs 'git grep --untracked' while CLAUDE.md is uncommitted.
- 2026-10-24: Review fixes: rel() matches within the checkout that holds the path (other worktrees' protected files were writable); cp/ln/install count only their destination; cd/pushd are followed through the chain; 2>, 1>> and &> are writes; deny messages reworded. Two new vitest cases fail on the reviewed guard and pass now.
- 2026-10-24: status in-progress → in-review
- 2026-10-24: BUG-009: guard misses >| and >&FILE redirects (outside-repo and paths.protected)
- 2026-10-24: BUG-010: guard cd tracking misses { cd; }, if cd, builtin/command cd, cd $VAR (outside-repo and paths.protected)
- 2026-10-24: status in-review → in-progress — fold in BUG-009, BUG-010 and the single-operand ln case
- 2026-10-24: BUG-009/BUG-010 and the one-operand ln fixed in writeTargets: one REDIRECT pattern (>|, >&FILE; >&N and >&- skipped), segments() no longer splits >|, PREFIX words skipped before the command, leading variables expanded from in-command assignments then the environment (unknown → refused), ln -s TARGET checked at ./basename. New test guard_shell_forms fails on the round-2 guard and passes now.
- 2026-10-24: status in-progress → in-review
- 2026-10-24: BUG-011: mid-path variables (.crew/$X, /tmp/$X/x, loop vars) are neither expanded nor refused; bypasses paths.protected and the outside rule
- 2026-10-24: BUG-012: cd still untracked in '( (' with a space, function bodies, case arms; install -d checks only the last operand
- 2026-10-24: status in-review → done

## Outcome
- **What shipped:**
  - `HUB_STATE_RULE` (`core/work/model.ts`) is the one copy of the rule, under the `<!-- crew:hub-state -->` marker.
    - `init` creates `CLAUDE.md` with it, appends it to an existing one, and leaves the file alone once the marker is there.
    - `check` hints when the marker is missing.
  - This repo has a `CLAUDE.md` with the section, so every session here (main, side or subagent) loads it.
  - **The guard** (every subagent; the main session is untouched as before):
    - refuses Write/Edit/MultiEdit/NotebookEdit and Bash write targets outside the repository's worktrees, the temp dirs and `/dev/` (BUG-006);
    - resolves every path against the hook's `cwd` and through symlinks before matching, including `paths.protected` (BUG-007).
    - matches a path within the checkout that holds it (deepest worktree first), so every worktree's protected files are protected from any other;
    - in Bash: counts only the destination of `cp`/`ln`/`install`, follows `cd`/`pushd` through the chain (newlines included), and treats `2>`, `1>>` and `&>` redirects as writes;
    - also covers `>|` and `>&FILE` (fd duplication like `>&2` stays allowed), a `cd` behind `{`, `if`/`then`, `!`, `builtin` or `command`, and `ln -s TARGET` with one operand (BUG-009, BUG-010);
    - expands a leading variable from the command's own assignments or the environment, and refuses a write target it can't resolve.
  - The hub SKILL.md, `CLAUDE.project.md` and `CLAUDE.global.md` carry the same wording.
  - Dist is rebuilt and `.crew/bin/crew.mjs` re-vendored.
  - Four vitest cases fail on the old code and pass now: `hub_state_init`, `hub_state_check`, `guard_outside_repo`, `guard_resolves_paths`. The review fixes add two more cases, and `guard_shell_forms` covers BUG-009/BUG-010. The full suite is 266/266, and QA's 80 hand probes pass except the known quoted-`>` case.
- **Not done:** the main session's writes outside the repo stay unguarded (no hook sees them), as scoped. Static checks can't see writes made by programs (`dd of=…`, `python -c "open(…)"`), and a `>` inside a quoted string is read as a redirect. Failing closed on unknown variables also refuses a write to a loop variable such as `> "$f.bak"`. `.crew/bin/studio.html` is still not vendored here.
Learnings: none
