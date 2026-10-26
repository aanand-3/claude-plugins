---
id: G-008
title: Whole-project security
status: proposed
priority: P1
created: 2026-10-26
completed:
integration_branch:
---

# G-008: Whole-project security

## Outcome
Security has an owner. A Security role reviews every plan that touches security-sensitive paths before it is accepted, and audits the whole project at a regular cadence. Issues that fall between plans, or that slip past the Architect and QA, become tracked bugs instead of going unnoticed.

## Scope
**In:**
- a built-in `security` role: an agent template (from the generic template, with a review loop like the Architect's), a model in policy, drafts-only writes, never implements
- a per-plan security gate: `security.paths` in config.yaml, `review --security --approve|--changes` pinned to the branch sha, a dispatch entry after the design review and before QA. This reuses the path-scoped review gate the Designer introduced (`isUiPlan`, review kind `design`).
- a whole-project audit on a cadence: `security.audit_every` landed plans, plus one before a goal closes. `audit` events in the ledger, computed from the ledger with no cron. A dispatch entry when an audit is due. A `crew.mjs audit` command that prints the inputs, records the audit, and starts one on demand.
- a deterministic audit baseline: a whole-tree secrets scan (`src/shared/secrets.ts`), the stack's dependency audit, and guard bypass self-tests
- `docs/security/threat-model.md` (assets, trust boundaries, accepted risks), kept by Security and the starting point of every audit
- findings filed as BUG items with a severity (S1 already dispatches as urgent)
- `init` and `doctor` defaults so other projects get the gate and the cadence

**Out:**
- Security editing code or fixing findings: fixes go through the backlog like any other bug
- external SAST/DAST services and a scheduled cloud runner (SPIKE-001)
- re-reviewing every past plan: the first audit covers the whole tree once, and later audits cover the range since the last one plus the baseline scans

## Acceptance criteria
- [ ] `crew.mjs agents --check` is clean with the security role, and its rendered agent carries `crew-role: security`, a write limit that allows drafts only, and the model from policy
- [ ] a plan whose touches overlap `security.paths` can't be accepted without `review --security --approve`; a code change after the approval makes it stale, and dispatch sends the plan back to `security`
- [ ] a plan that doesn't touch `security.paths` never gets a security entry
- [ ] after `security.audit_every` plans land, `dispatch` shows exactly one `security` audit entry; the focus goal can't close while that audit is due; `audit --record` clears it
- [ ] `crew.mjs audit` on a fixture with a planted secret, a vulnerable dependency and a known guard bypass reports all three
- [ ] audit findings show up as BUG items with a severity, and an S1 finding dispatches as urgent
- [ ] `docs/security/threat-model.md` exists, and the first audit updates it
- [ ] on a sample project, `init` sets the security defaults and `doctor` checks them

## Success metrics
- security bugs found by audits vs found later (target: most found by audits)
- plans landed between audits (target: at most `audit_every`)

## Breakdown
- FEAT-052: Security role — template, ROLES/ACTIONS/preset entries, drafts-only writes, policy model, rendered by `agents`
- FEAT-053: Security review gate — `security.paths`, `isSecurityPlan`, `review --security`, dispatch entry and role queue (reusing the Designer's path-scoped gate)
- FEAT-054: Audit cadence — ledger `audit` events, due computation, dispatch entry, goal-closure hold, `audit` command
- FEAT-055: Audit baseline scans — whole-tree secrets scan, dependency audit, guard bypass self-tests
- FEAT-056: Threat model and audit procedure — `docs/security/threat-model.md` and the audit steps in the security template
- FEAT-057: Security defaults for other projects — `init` and `doctor` set and check `security.paths` and `audit_every`

## Notes & decisions
- 2026-10-26 (executive): Security both audits the whole project and gates sensitive plans; the crew builds it as a goal.
- Why a built-in role, not a charter-only one: dispatch decides which role each entry goes to (`dispatch.ts`), so a charter-only role would never be launched. The gate and the audit need hub code.
- Design: `.crew/drafts/with-the-current-crew-distributed-deer.md`.

## Progress log
- 2026-10-26: proposed from a design session: Security role audits the whole project on a cadence and gates plans on security.paths; reuses the Designer's path-scoped review gate, the audit trigger is new. Design: .crew/drafts/with-the-current-crew-distributed-deer.md. Related: CHORE-027 (designer not rendered here).
