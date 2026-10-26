---
id: P-063
title: Guard refuses only real access to secrets files
goal: G-007
items: BUG-042
touches:
depends_on:
status: draft
branch: plan/P-063-guard-refuses-only-real-access
pr:
created: 2026-10-26
started:
completed:
---

# P-063: Guard refuses only real access to secrets files

## Context
The guard's secrets check (`secrets.files`) refuses any Bash command whose text contains a secrets filename, even when the name is only prose in a heredoc body or a string in a script. On 2026-10-26 this hit the PM filing BUG-041 and the Architect speccing P-062; both then used the Edit/Write tools instead, working around a guard refusal (see K-2026-10-26-when-the-guard-refuses-an-action-report). It also blocks legitimate writing about secrets handling (specs, tests, bug reports). Goal G-007, item BUG-042. The guard files changed by P-058 and P-056 have landed, so the architect may touch them.

## Scope
**In:**
- The secrets check refuses commands that would access a secrets file: as a path argument, a redirect target, or a file an interpreter opens.
- Commands whose text only mentions a secrets filename in quoted prose, or in a heredoc body whose target is a non-secrets file, are allowed.
- Regression tests for both directions.

**Out (explicitly not doing):**
- Changing which files count as secrets (`secrets.files` contents).
- Weakening or restructuring any other guard check.
- Reworking how other roles handle guard refusals.

## Acceptance criteria
- [ ] A Bash heredoc writing a non-secrets drafts file whose prose mentions a secrets filename is not refused (regression test; fails before the fix).
- [ ] A script that edits a non-secrets file and mentions a secrets filename only in its text is not refused (regression test).
- [ ] Reading, writing, copying, cat-ing or grepping an actual secrets file is still refused, including a path argument, a redirect target, and a file opened by an interpreter (tests for each).
- [ ] The refusal message for a real access still names the secrets check.

## Approach
(architect)

## Design

## Tasks
(architect)

## Test plan
**Targeted checks:**
(architect)

## Rollout & rollback
(architect)

## Risks & open questions
- Distinguishing "text mention" from "interpreter opens the file" without a full shell parser may be imprecise; the architect should choose the conservative side wherever a real access cannot be ruled out, and say so.

## Handoff

## Progress log

## Outcome
