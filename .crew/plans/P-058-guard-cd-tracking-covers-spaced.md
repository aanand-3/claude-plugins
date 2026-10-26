---
id: P-058
title: Guard cd tracking covers spaced subshells, functions and case arms
goal: G-007
items: BUG-012
touches: packages/crew/src/hub/commands/team/hubcall.ts, packages/crew/src/hub/commands/team/targets.ts, packages/crew/test/hub/targets.test.ts, packages/crew/test/hub/hubcall.test.ts, packages/crew/test/hub/e2e/guard.test.ts, packages/crew/test/hub/e2e/guard-writes.test.ts
depends_on:
status: done
branch: plan/P-058-guard-cd-tracking-covers-spaced
pr:
created: 2026-10-26
started: 2026-10-26
completed: 2026-10-26
assignee: developer
---

# P-058: Guard cd tracking covers spaced subshells, functions and case arms

## Context
BUG-012 (G-007, S3/P3). After the BUG-010 fix, the guard's cd tracking still misses a spaced subshell `( ( cd ~; ... ) )`, function bodies (`f() { cd ~; ...; }; f`, `function f { cd ~; ...; }; f`) and case arms (`case x in x) cd ~; ...;; esac`), so a later relative write resolves against the hook cwd and passes. `install -d ~/a docs/b` also checks only the last operand. The forms work against the outside-repo rule and `paths.protected`. P-051 left this item out and ported the existing `cd` behaviour as it was, so it is still open.

## Scope
**In:**
- cd tracking treats a lone `(`, case arms, and function heads (`name()`, `function name`) as prefixes, so the five repro commands are denied.
- `install -d` checks every operand as a destination.
- Regression tests for each of the five commands.

**Out (explicitly not doing):**
- Nested shells (`sh -c "..."`): a general static-checking limit. A fail-closed rule for `sh|bash|zsh -c` with a redirect is a separate decision for the architect to raise, not part of this plan.

## Acceptance criteria
- [ ] AC1 · As a developer agent in a plan worktree, the guard denies each of the item's five repros with `the command writes to <path>, outside the repository; …`:
  - `( ( cd ~; echo hi > x.md ) )`
  - `f() { cd ~; echo hi > x.md; }; f`
  - `function f { cd ~; echo hi > x.md; }; f`
  - `case x in x) cd ~; echo hi > x.md;; esac`
  - `install -d ~/a docs/b`
- [ ] AC2 · The same forms that reach a protected path are denied as protected: `f() { cd .crew; echo x > policy.yaml; }; f` and `case x in x) cd .crew; echo x > policy.yaml;; esac`.
- [ ] AC3 · The forms already denied still are: `{ cd ~; …; }`, `if cd ~; then … fi`, `(cd ~; …)`, `while …; do cd ~; …; done`, `builtin cd ~ && …`, `command cd ~ && …`. Harmless commands still pass: `( echo hi > x.md )`, `f() { echo hi > x.md; }; f`, `case $x in a) echo hi > x.md;; esac` and `install -d docs/a docs/b` in the worktree.
- [ ] AC4 · `writeTargets` (unit) returns `~/x.md` for each of the cd forms, and `["~/a", "docs/b"]` for `install -d ~/a docs/b`. `install src dest` still returns only `dest`.
- [ ] AC5 · Hub-call identity injection still finds a hub call behind the new prefixes: a hub `next` call wrapped in `( … )`, behind `f() {` or in a case arm still gets the role and run flags. `npm run typecheck` passes.

## Approach
- **The prefix list (`hubcall.ts`).** `PREFIX` is shared by `writeTargets` and the hub-call finder. A command's leading words are skipped while they are:
  - an assignment or a `PREFIX` word, with `PREFIX` gaining a lone `(`;
  - a function head: `name()`, or `name` followed by `()`, or `function name` (with an optional `()`), each followed by `{`;
  - a case head and arm: `case WORD in`, then a pattern word ending in `)` (`x)`, `a|b)`, `*)`). An arm after `;;` starts its own command (the parser already splits there), whose leading `pattern)` is skipped the same way, and `esac` alone is no command.

  The skipping goes into one exported helper, `skipPrefix(words): number`, used by both `writeTargets` (targets.ts, today's loop at line 162) and `hubCommand` (hubcall.ts line 175), so they can't drift.
- **Function bodies run where they are defined.** A `cd` inside a body is tracked as if it ran inline and stays in effect afterwards. That is conservative, since it fails toward denying, and enough for a static check.
- **`install -d` (targets.ts).** With `-d`/`--directory` among the args, every operand is a destination. Otherwise it is the last operand, or the `-t` operand, as today.
- **Collision with P-056.** P-056 changes guard.ts and core/memory/activity.ts; this plan changes only hubcall.ts and targets.ts (230 and 240 lines, both under 300), so they don't collide and no dependency is needed. Nested shells (`sh -c "…"`) stay out, as the item says.

## Tasks
- [x] T1: `skipPrefix` in hubcall.ts (lone `(`, function heads, case heads and arms) used by `hubCommand` and `writeTargets` → verify: `cd packages/crew && npx vitest run test/hub/targets.test.ts test/hub/hubcall.test.ts`. New unit cases for the four cd forms, the harmless forms, and a hub call behind `(`, `f() {` and a case arm (AC4, AC5)
- [x] T2: `install -d` takes every operand → verify: `npx vitest run test/hub/targets.test.ts -t "install"` (AC4)
- [x] T3: Guard e2e for the five repros, the protected-path variants, and the previously denied and harmless forms → verify: `npm run build && npx vitest run test/hub/e2e/guard.test.ts test/hub/e2e/guard-writes.test.ts`, then `git checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md` (AC1–AC3)

## Test plan
**Targeted checks** (from `packages/crew/`):
- AC4, AC5 → `npx vitest run test/hub/targets.test.ts test/hub/hubcall.test.ts`; `npm run typecheck`
- AC1–AC3 → `npm run build && npx vitest run test/hub/e2e/guard.test.ts test/hub/e2e/guard-writes.test.ts` (restore the generated build output after)
- Regression: the new AC1 cases fail on main (the repros pass there) and pass after.

## Rollout & rollback
Ships in the bundle; the guard reaches this repo through refresh-bin. Rollback: revert the commit.

## Risks & open questions
- P-056 (guard labels) changes guard.ts and activity.ts; this plan touches neither, so there is no overlap and no dependency. P-051 is done.
- Adding `(` and function or case heads to the skipped prefix could hide a word an earlier rule matched as a command head. The harmless-form cases (AC3) and the existing guard suites cover it.

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-058: Guard cd tracking covers spaced subshells, functions and case arms [in-review] tasks 3/3 — claimed by Arpit Anand (developer:a023f1c3f99597d85)
- last checkpoint 2026-10-26 08:24 at T3 (7c93acd) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-058-guard-cd-tracking-covers-spaced/packages/crew && npx vitest run test/hub/targets.test.ts test/hub/hubcall.test.ts (AC 4)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-058-guard-cd-tracking-covers-spaced/packages/crew && npm run build >/dev/null 2>&1 && npx vitest run test/hub/e2e/guard.test.ts test/hub/e2e/guard-writes.test.ts ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-058-guard-cd-tracking-covers-spaced checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md plugins/crew/docs; exit $r (AC 1,2,3)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-058-guard-cd-tracking-covers-spaced/packages/crew && npm run typecheck && npx vitest run test/hub/targets.test.ts test/hub/hubcall.test.ts (AC 4,5)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-058-guard-cd-tracking-covers-spaced/packages/crew && npm run typecheck >/dev/null && npm run build >/dev/null 2>&1 && npx vitest run test/hub/targets.test.ts test/hub/hubcall.test.ts test/hub/e2e/guard.test.ts test/hub/e2e/guard-writes.test.ts ; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-058-guard-cd-tracking-covers-spaced checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md plugins/crew/docs; exit $r (AC 1,2,3,4,5)
- evidence: AC1 ✓ (self), AC2 ✓ (self), AC3 ✓ (self), AC4 ✓ (self), AC5 ✓ (self)

Latest log:
- 2026-10-26: status in-progress → in-review
- 2026-10-26: review: changes requested — The cd tracking, install -d and the tests are right. The first limit is acceptable: a case pattern named cd reads as a bare cd, which fails toward deny. The second needs doing now. inlineScript (targets.ts) is the paths.write rule for roles limited to .crew/drafts/ (BUG-021). It still has its own prefix loop, so 'function f { python3 -c "<writes>"; }; f' hides an inline script from that rule. That lets a drafts-only role write anywhere, the same class of hole as BUG-012, in a file already in touches. Fix: in inlineScript's loop, after the WRAPPER branch, skip with skipPrefix instead of the ASSIGN/PREFIX test: s = skipPrefix(c.words.slice(h)); if s is 0 break, else h += s. Then wrappers and prefixes can still interleave. Add unit cases in targets.test.ts's inlineScript block: 'function f { python3 -c x; }; f' and 'case x in x) node -e y;; esac' return the interpreter, and 'function f { echo hi; }; f' returns null. Add one e2e case in guard-writes.test.ts: a drafts-only role (e.g. qa) running 'function f { python3 -c "open(1)"; }; f' is denied with the inline-script message.
- 2026-10-26: status in-review → in-progress — changes requested: The cd tracking, install -d and the tests are right. The first limit is acceptable: a case pattern named cd reads as a bare cd, which fails toward deny. The second needs doing now. inlineScript (targets.ts) is the paths.write rule for roles limited to .crew/drafts/ (BUG-021). It still has its own prefix loop, so 'function f { python3 -c "<writes>"; }; f' hides an inline script from that rule. That lets a drafts-only role write anywhere, the same class of hole as BUG-012, in a file already in touches. Fix: in inlineScript's loop, after the WRAPPER branch, skip with skipPrefix instead of the ASSIGN/PREFIX test: s = skipPrefix(c.words.slice(h)); if s is 0 break, else h += s. Then wrappers and prefixes can still interleave. Add unit cases in targets.test.ts's inlineScript block: 'function f { python3 -c x; }; f' and 'case x in x) node -e y;; esac' return the interpreter, and 'function f { echo hi; }; f' returns null. Add one e2e case in guard-writes.test.ts: a drafts-only role (e.g. qa) running 'function f { python3 -c "open(1)"; }; f' is denied with the inline-script message.

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-058-guard-cd-tracking-covers-spaced
- 2026-10-26: status in-progress → in-review
- 2026-10-26: review: changes requested — The cd tracking, install -d and the tests are right. The first limit is acceptable: a case pattern named cd reads as a bare cd, which fails toward deny. The second needs doing now. inlineScript (targets.ts) is the paths.write rule for roles limited to .crew/drafts/ (BUG-021). It still has its own prefix loop, so 'function f { python3 -c "<writes>"; }; f' hides an inline script from that rule. That lets a drafts-only role write anywhere, the same class of hole as BUG-012, in a file already in touches. Fix: in inlineScript's loop, after the WRAPPER branch, skip with skipPrefix instead of the ASSIGN/PREFIX test: s = skipPrefix(c.words.slice(h)); if s is 0 break, else h += s. Then wrappers and prefixes can still interleave. Add unit cases in targets.test.ts's inlineScript block: 'function f { python3 -c x; }; f' and 'case x in x) node -e y;; esac' return the interpreter, and 'function f { echo hi; }; f' returns null. Add one e2e case in guard-writes.test.ts: a drafts-only role (e.g. qa) running 'function f { python3 -c "open(1)"; }; f' is denied with the inline-script message.
- 2026-10-26: status in-review → in-progress — changes requested: The cd tracking, install -d and the tests are right. The first limit is acceptable: a case pattern named cd reads as a bare cd, which fails toward deny. The second needs doing now. inlineScript (targets.ts) is the paths.write rule for roles limited to .crew/drafts/ (BUG-021). It still has its own prefix loop, so 'function f { python3 -c "<writes>"; }; f' hides an inline script from that rule. That lets a drafts-only role write anywhere, the same class of hole as BUG-012, in a file already in touches. Fix: in inlineScript's loop, after the WRAPPER branch, skip with skipPrefix instead of the ASSIGN/PREFIX test: s = skipPrefix(c.words.slice(h)); if s is 0 break, else h += s. Then wrappers and prefixes can still interleave. Add unit cases in targets.test.ts's inlineScript block: 'function f { python3 -c x; }; f' and 'case x in x) node -e y;; esac' return the interpreter, and 'function f { echo hi; }; f' returns null. Add one e2e case in guard-writes.test.ts: a drafts-only role (e.g. qa) running 'function f { python3 -c "open(1)"; }; f' is denied with the inline-script message.
- 2026-10-26: status in-progress → in-review
- 2026-10-26: status in-review → accepted
- 2026-10-26: landed on main as 6dbda0b
- 2026-10-26: status accepted → done

## Outcome
`skipPrefix(words)` in hubcall.ts now skips assignments, prefix words (plus a lone `(`), `function NAME`, `case WORD in PATTERN` and a lone `esac`. `headAt` (the hub-call finder) and `writeTargets` both use it. `install -d`/`--directory` checks every operand. Unit cases cover AC4/AC5, and the guard e2e block `guard_cd_forms` covers AC1–AC3 from a plan worktree.
Notes: three of the five repros (`( ( cd ~ … ) )`, `f() { … }`, case arms) already passed on the base. The P-051 parser splits at every `(`/`)`, so `name()` and `pattern)` end their own commands. Only `function f {` and `install -d` really needed fixing. The cost of that split is that a case pattern named `cd` or `pushd` reads as a bare `cd` (it fails toward deny). After review, `inlineScript` uses `skipPrefix` too, so it sees `function f { python3 -c …; }` (a drafts-only role is denied).
Learnings: K-2026-10-26-the-guards-shell-parser-hubcall-ts-parse
