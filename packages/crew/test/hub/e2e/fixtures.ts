/** The drafts the hub's end-to-end tests feed `new-*` (ported from tests/crew/test_hub.py). */
export const IDEA_DRAFT = `## Problem
Consultants migrate CRM data by hand; it takes weeks and loses history.

## Outcome
A consultant migrates a client's CRM without engineering help.

## Success criteria
- [ ] 3 pilot migrations complete without engineering help
- [ ] no data loss in a full-sandbox comparison

## Direction
Hosted web app; rejected: a CLI (consultants don't use terminals).
`;

export const GOAL_DRAFT = `## Outcome
Users can sign up and manage their account.

## Scope
**In:**
- signup, password reset

**Out:**
- SSO

## Acceptance criteria
- [ ] a new user can sign up and log in

## Candidate plans
- Signup endpoint — POST /signup with email verification
- Password reset — token by email

## Notes
See ADR-0002.
`;

export const PLAN_DRAFT = `## Context
First slice of the accounts goal.

## Scope
**In:**
- POST /signup

**Out:**
- SSO

## Acceptance criteria
- [ ] 201 on valid input; 409 on duplicate email

## Tasks
- [ ] T1: route + DTOs → verify: api test
- [ ] T2: service + repository → verify: unit test

## Test plan
API tests for 201/409; unit tests for the service.

## Risks
- email provider choice
`;

export const BUG_DRAFT = `## Environment
local, commit abc123

## Steps to reproduce
1. POST /login with an empty email

## Expected
422 with a validation error

## Actual
500 Internal Server Error
`;

/** What the 0.1.0 kickoff produced in Ferry: a template with only a one-line context. */
export const SKELETON_PLAN = `---
id: P-009
title: Skeleton
goal:
status: draft
branch: plan/P-009-skeleton
---

# P-009: Skeleton

## Context
One line.

## Scope
**In:**
-

**Out (explicitly not doing):**
-

## Acceptance criteria
<!-- Verifiable. -->
- [ ]

## Tasks
- [ ] T1: … → verify: …
`;
