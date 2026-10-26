---
id: P-058
title: Guard cd tracking covers spaced subshells, functions and case arms
goal: G-007
items: BUG-012
touches:
depends_on:
status: draft
branch: plan/P-058-guard-cd-tracking-covers-spaced
pr:
created: 2026-10-26
started:
completed:
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
- [ ] Each of the five commands in the item's repro is denied as a write outside the repository.
- [ ] Forms that were already denied (`{ cd ~; ...; }`, `if cd ~; then ...`, `(cd ~; ...)`, `while ...; do cd ~; ...`) still are.
- [ ] `install -d` with several operands checks every operand.
- [ ] Regression tests fail before the fix and pass after.

## Approach
(Architect.)

## Tasks
- [ ] T1: (Architect.)

## Test plan
**Targeted checks:**
- (Architect.)

## Rollout & rollback
Ships in the bundle; the guard reaches this repo through refresh-bin. Rollback: revert the commit.

## Risks & open questions
- P-056 (guard labels) and P-051 also change the guard; expect a textual overlap in the guard's source.

## Handoff

## Progress log

## Outcome
