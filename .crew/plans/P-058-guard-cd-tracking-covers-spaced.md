---
id: P-058
title: Guard cd tracking covers spaced subshells, functions and case arms
goal: G-007
items: BUG-012
touches: packages/crew/src/hub/commands/team/hubcall.ts, packages/crew/src/hub/commands/team/targets.ts, packages/crew/test/hub/targets.test.ts, packages/crew/test/hub/hubcall.test.ts, packages/crew/test/hub/e2e/guard.test.ts, packages/crew/test/hub/e2e/guard-writes.test.ts
depends_on:
status: ready
branch: plan/P-058-guard-cd-tracking-covers-spaced
pr:
created: 2026-10-26
started:
completed:
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
- [ ] T1: `skipPrefix` in hubcall.ts (lone `(`, function heads, case heads and arms) used by `hubCommand` and `writeTargets` → verify: `cd packages/crew && npx vitest run test/hub/targets.test.ts test/hub/hubcall.test.ts`. New unit cases for the four cd forms, the harmless forms, and a hub call behind `(`, `f() {` and a case arm (AC4, AC5)
- [ ] T2: `install -d` takes every operand → verify: `npx vitest run test/hub/targets.test.ts -t "install"` (AC4)
- [ ] T3: Guard e2e for the five repros, the protected-path variants, and the previously denied and harmless forms → verify: `npm run build && npx vitest run test/hub/e2e/guard.test.ts test/hub/e2e/guard-writes.test.ts`, then `git checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md` (AC1–AC3)

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

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role

## Outcome
