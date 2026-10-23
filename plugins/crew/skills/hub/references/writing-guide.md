# Writing hub documents

A tracked document is a contract between whoever plans the work and whoever does it, which is often Claude in a later session with no memory of this one. Write so that a reader with only the repo can execute and verify it.

## Quality bar

### Project plan
| Section | Good | Bad |
|---|---|---|
| Objectives | 2–4 measurable outcomes ("pilot consultants complete 3 migrations without engineering help") | A feature list |
| Success measures | Metric, baseline, target, when measured | "Users are happy" |
| Milestones | Each has a goal, a target date the user agreed to, and summarized exit criteria | Dates without scope, or scope without dates |
| Cadence & capacity | Sprint length, starting capacity *and why* (e.g. "1 dev + Claude, ~4 focused days → 20 pts"), ceremonies | Missing; capacity copied from the default without thought |

### Milestone
| Section | Good | Bad |
|---|---|---|
| Goal | What becomes possible, for whom | "Finish G-001 and G-002" |
| Exit criteria | Checkable list: function, quality (no open S1/S2), operations (deployed, monitored, rollback tested), docs | "All done" |

### RAID
Every risk has a probability, an impact, an **owner** and a **mitigation**. Risks are things that *might* happen; things happening now are Issues. Close or retire risks at each sprint review.

### Items
| Type | Good | Bad |
|---|---|---|
| FEAT | A one-line summary of the user value; a user story when it comes from a user | "Add button" |
| BUG | Exact steps from a clean state; expected vs actual; version and environment; evidence; impact and workaround; severity | "Login broken" |
| CHORE | What and why, the cost of not doing it, and when it's done | "Refactor stuff" |
| SPIKE | One question, a hard timebox, the output it produces (ADR, recommendation, follow-up items) | Open-ended research |

UI plans (projects with `docs/design/DESIGN.md`) also end with a task like `Visual QA → verify: check_design.py --all clean; screenshots at 375/1280 px, light and dark, match DESIGN.md`.

### Sprint
| Section | Good | Bad |
|---|---|---|
| Goal | One sentence that every committed plan serves | A list of plan IDs |
| Review | Shipped (demo-able), not shipped and why, unplanned work, goal met?, forecast change | "Went well" |
| Retro | Specific Keep / Stop / Try. Each Try is an action someone can do next sprint | Vague feelings; ten tries |

### Goal
| Section | Good | Bad |
|---|---|---|
| Outcome | What changes for whom, in one or two sentences | A list of features; "implement X" |
| Scope | Explicit **Out**, which prevents creep | Only "In"; vague areas |
| Acceptance criteria | User-visible and checkable at the end of the goal | Restating plan titles; "works well" |
| Breakdown | 2–6 vertical slices in delivery order, one line each, with a rough estimate and dependencies: `Title — what it delivers (5 pts) (after X)`. Each becomes a FEAT item. | Layer-by-layer slices ("DB", "API", "UI") that ship nothing alone; no estimates |

### Plan
| Section | Good | Bad |
|---|---|---|
| Context | Why this, why now; links to the goal, ADRs and earlier plans | A copy of the title |
| Scope | In **and** Out; Out names the tempting adjacent work | Empty Out |
| Acceptance criteria | Observable behavior: inputs → outputs, error cases, non-functional limits where relevant. Each maps to a test or a demonstrable check | "Code is clean", "tests pass", "feature works" |
| Approach | Key decisions and why; modules/files touched; assumptions; what is reused | A restatement of the tasks |
| Tasks | 3–8 steps, each ≤ ~half a day, in order, each ending `→ verify: <command, test or check>` | "Implement backend", or tasks with no way to verify them |
| Test plan | Which tests cover which criterion (unit / integration / e2e / manual); bugs name the regression test that fails before the fix | "Add tests" |
| Rollout & rollback | Migrations, flags, config, observability, how to back out; or "n/a — internal refactor, no runtime change" | Empty on a change that touches data or config |
| Risks & open questions | Concrete unknowns, each with a mitigation or an owner | "None" on non-trivial work |

**Slicing:** prefer thin vertical slices that deliver something working end to end, then widen. A plan should be mergeable on its own and leave `main` releasable.

**Sizing:** at most `max_plan_points` (default 8), 3–8 tasks, and a PR a reviewer can read in one sitting. If it's bigger, split it.

**Estimating:** points are relative. Calibrate against a reference: 1 = a config or copy change with a test; 3 = one endpoint or screen with tests; 5 = a feature touching two layers plus a migration; 8 = the largest thing that still fits in one PR. 13 means "split me".

## Worked example — goal draft

```markdown
## Outcome
Consultants can connect a client's HubSpot and Salesforce sandboxes to Ferry securely, so discovery and migration can run without sharing passwords.

## Scope
**In:**
- OIDC sign-in for Ferry users; tenant-scoped data
- OAuth connection flow per platform; encrypted token storage; connection health check
- Audit events for connect/disconnect

**Out:**
- Marketo (next goal); service-account / API-key auth; self-serve signup

## Acceptance criteria
- [ ] A signed-in consultant connects a HubSpot and a Salesforce sandbox and sees both as "healthy"
- [ ] Tokens are encrypted at rest; a DB dump contains no usable token
- [ ] Every connect/disconnect appears in the audit log with user and time
- [ ] Users of tenant A cannot see tenant B's connections (API-level test)

## Breakdown
- OIDC sign-in & tenancy — JWT validation, tenant model, current-user dependency (5 pts)
- Connection model & encryption — Connection entity, AES-GCM with key IDs, audit events (5 pts) (after OIDC sign-in)
- HubSpot OAuth connect — authorize/callback, token refresh, health check (5 pts) (after Connection model)
- Salesforce OAuth connect — same flow for Salesforce, sandbox/prod login URL (3 pts) (after Connection model)
- Connections UI — list, connect, disconnect, health status (8 pts) (after HubSpot OAuth connect)

## Notes
ADR-0006 (auth & credentials). Open: key management (env key now, KMS later). See the brief.
```

## Worked example: plan draft

```markdown
## Context
Second slice of G-001 (Connections), delivers FEAT-002; committed to S-02. OIDC sign-in (P-003) gives us an authenticated user and a tenant. Platform tokens now need somewhere safe to live before any OAuth flow can store them. Decisions follow ADR-0006.

## Scope
**In:**
- `Connection` domain entity + persistence (tenant-scoped)
- `CredentialCipher` port + AES-GCM adapter with key IDs (rotation-ready)
- `audit_events` table + recording for connect/disconnect
- REST: list / get / delete connection (create happens in the OAuth plans)

**Out:**
- OAuth flows (P-005, P-006); KMS integration (backlog); UI

## Acceptance criteria
- [ ] Creating a connection stores the token encrypted; reading it back via the repository returns the original token
- [ ] Ciphertext records the key ID; data encrypted with an old key still decrypts after a key change
- [ ] `GET /api/v1/connections` returns only the caller's tenant's connections (cross-tenant test)
- [ ] `DELETE /api/v1/connections/{id}` removes the connection and writes an audit event with user and time
- [ ] Tokens never appear in logs or API responses (test asserts on captured logs and response bodies)

## Approach
- Domain: `Connection(id, tenant_id, platform, label, status, created_by)`. Credentials go in a separate `EncryptedSecret` value (ciphertext, nonce, key_id).
- Port `CredentialCipher` in `domain/ports`; adapter `adapters/crypto/aesgcm.py` uses `cryptography`. Keys come from settings (`CREDENTIALS_KEYS` = id→key map, plus `CREDENTIALS_ACTIVE_KEY_ID`).
- Persistence: SQLAlchemy models `connections` and `audit_events`; Alembic migration; every query filters by `tenant_id` in the repository.
- Reuses the `current_user` dependency from P-003.
- Assumption: one active key at a time. Rotation means adding a key and switching the active ID.

## Tasks
- [ ] T1: domain entity + `CredentialCipher` port + in-memory fake → verify: unit tests for entity rules; port conformance suite passes for the fake
- [ ] T2: AES-GCM adapter with key IDs → verify: conformance suite passes; old-key decrypt test
- [ ] T3: persistence models, repository, migration → verify: integration tests (round-trip, tenant filter); `alembic upgrade head` on compose DB
- [ ] T4: audit event recording → verify: integration test asserts the row on delete
- [ ] T5: REST list/get/delete + error envelope → verify: API tests incl. cross-tenant 404 and no token in responses
- [ ] T6: log redaction check → verify: test captures logs during create/delete and asserts no token substring

## Test plan
- Unit: entity rules; cipher conformance suite run against the fake and the AES-GCM adapter (AC 1, 2).
- Integration (compose Postgres): repository round-trip, tenant filter, audit row on delete (AC 1, 3, 4).
- API: list/get/delete including the cross-tenant 404; response bodies and captured logs contain no token (AC 3, 5).

## Rollout & rollback
- Migration adds `connections` and `audit_events`; downgrade drops them (no data yet).
- New settings `CREDENTIALS_KEYS` and `CREDENTIALS_ACTIVE_KEY_ID` go in `.env.example`; startup fails fast if they're missing.
- Rollback: revert the PR and `alembic downgrade -1`. Nothing reads these tables yet.

## Risks & open questions
- Key loss makes tokens unrecoverable. Mitigation: documented key backup in the README; KMS in the backlog.
- Should `DELETE` also revoke the token at the platform? Proposal: yes, in the OAuth plans (follow-up noted).
```

## Worked example — bug report

```markdown
## Summary
Login returns 500 instead of 422 when the email is empty.

## Environment
test env, commit 4f2c1a9, Chrome 129

## Steps to reproduce
1. Open /login
2. Leave the email empty, enter any password
3. Submit

## Expected
422 with `{"error": {"code": "validation_error", "field": "email"}}`; the form shows "Email is required".

## Actual
500; the UI shows the generic error toast. Log: `KeyError: 'email'` in `auth/service.py:41` (request id 7f3a…).

## Evidence
Request id 7f3a9c in the test logs; screenshot attached to the PR.

## Impact
Every user who submits without an email; workaround: none needed (user error), but it pages on-call via the 5xx alert.
```
Captured with `new-item bug "Login 500 on empty email" --from … --severity S3`. Triaged P1 rather than the default P2 because it pages on-call: `triage BUG-004 --priority P1 --points 1`.

## Worked example — spike

```markdown
## Question
Can we use HubSpot's CRM export API for full-sandbox discovery within rate limits, or do we need webhooks + incremental sync?

## Timebox
1 day.

## Output
ADR-0008 with the recommendation and measured numbers; follow-up FEAT items for the chosen approach.
```

## Worked example — sprint review & retro

```markdown
## Review
- Shipped: P-004 Connection model (FEAT-002), P-005 HubSpot OAuth (FEAT-003); demoed connect + health check in test.
- Not shipped: P-006 Salesforce OAuth — sandbox login URL issue (RAID I-2); carried over.
- Unplanned: P-007 fix for BUG-004 (P1, 1 pt).
- Goal ("a consultant can connect HubSpot"): met.
- Forecast: M-01 moved from 🟢 to 🟡 — 8 pts carried; considering moving Connections UI polish to M-02.

## Retro
**Keep:**
- Writing the test plan before the code

**Stop:**
- Starting a plan before its dependency is merged

**Try:**
- Time-box third-party sandbox setup to half a day and log blockers in RAID immediately
```

## Common failures to avoid
- **Skeletons:** placeholders, or only a one-line Context. The script refuses to create them; don't work around it.
- **Plans written too early:** writing a plan for every item up front produces stale plans. Write plans for the current and next sprint only; everything later stays as estimated items.
- **Untracked work:** a bug fixed or a chore done without an item never shows up in velocity, release notes or the status report. Capture first, even with a one-line `--why`.
- **Overcommitting:** a sprint planned above velocity fails quietly. Respect the capacity warning and leave slack for bugs.
- **Unestimated backlog:** the milestone forecast is only as good as its estimates. Triage regularly.
- **Acceptance criteria nobody can check:** if you can't name the test or command, rewrite the criterion.
- **Tasks split by layer, not behavior:** prefer tasks that each end in something verifiable.
- **Missing Out scope:** it's how reviewers spot scope creep.
