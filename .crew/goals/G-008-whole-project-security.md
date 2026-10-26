---
id: G-008
title: Whole-project security
status: active
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
- a built-in `security` role: an agent template (from the generic template, with a review loop like the Architect's), a model in policy, drafts-only writes (`.crew/drafts/**`, like QA and the PM), never implements; everything it produces goes through hub commands, so it is tracked
- a per-plan security gate: `security.paths` in `.crew/policy.yaml` (protected; changing it is the human's `policy.change`), decided on the plan's `touches` plus the files it actually changes against the base (rechecked at accept), `review --security --approve|--changes` pinned to the branch sha, a dispatch entry after the design review and before QA. This reuses the path-scoped review gate the Designer introduced (`isUiPlan`, review kind `design`).
- a whole-project audit on a cadence: `security.audit_every` (in policy.yaml) landed plans, plus one before a goal closes. `audit` events in the ledger, computed from the ledger with no cron. A dispatch entry when an audit is due. A `crew.mjs audit` command that prints the inputs, records the audit, and starts one on demand; `audit --waive` (human only, logged) releases a stuck hold.
- a deterministic audit baseline: a whole-tree secrets scan (`src/shared/secrets.ts`), the stack's dependency audit, and guard bypass self-tests
- the threat model as hub knowledge: trust boundaries and accepted risks recorded with `learn risk … --scope <globs>`, read back with `recall --type risk`; every audit starts from them, and its summary (range, scans, findings, risks recorded) is the `audit` ledger event
- findings filed as BUG items with a severity (S1 already dispatches as urgent); closing an S1/S2 security bug as wontfix needs the human's approval or a matching `risk` knowledge entry
- guard denials recorded in the ledger (role, run, rule), reviewed by every audit; a role that keeps hitting the guard goes to the Director
- `init` and `doctor` defaults so other projects get the gate and the cadence

**Out:**
- Security editing code or fixing findings: fixes go through the backlog like any other bug
- external SAST/DAST services and a scheduled cloud runner (SPIKE-001)
- re-reviewing every past plan: the first audit covers the whole tree once, and later audits cover the range since the last one plus the baseline scans

## Acceptance criteria
- [ ] `crew.mjs agents --check` is clean with the security role, and its rendered agent carries `crew-role: security`, a write limit of `.crew/drafts/**` only, and the model from policy
- [ ] a plan whose touches or actual changes (vs the base) overlap `security.paths` can't be accepted without `review --security --approve`; a code change after the approval makes it stale, and dispatch sends the plan back to `security`
- [ ] a plan that declares narrow touches but edits a file in `security.paths` still gets a security entry and can't be accepted without the review
- [ ] a plan that neither declares nor changes a path in `security.paths` never gets a security entry
- [ ] an agent that edits `security.paths` or `audit_every` is refused by the guard (policy.yaml is protected)
- [ ] after `security.audit_every` plans land, `dispatch` shows exactly one `security` audit entry; the focus goal can't close while that audit is due; `audit --record` clears it, and `audit --waive` (human only) releases it with a ledger entry
- [ ] `crew.mjs audit` on a fixture with a planted secret, a vulnerable dependency and a known guard bypass reports all three
- [ ] audit findings show up as BUG items with a severity, and an S1 finding dispatches as urgent
- [ ] `triage --reject wontfix` on an S1/S2 security bug fails without `--approved-by` (human) or a matching `risk` knowledge entry
- [ ] every guard denial appears in the ledger with role, run and rule; `crew.mjs audit` lists them since the last audit; a role over the denial limit gets a Director entry
- [ ] the first audit records the project's trust boundaries and accepted risks as `risk` knowledge entries; the next audit's `crew.mjs audit` lists them (`recall --type risk`) with the range since the last audit
- [ ] the guard refuses the Security agent writing anything outside `.crew/drafts/**`
- [ ] on a sample project, `init` sets the security defaults and `doctor` checks them

## Success metrics
- security bugs found by audits vs found later (target: most found by audits)
- plans landed between audits (target: at most `audit_every`)

## Breakdown
- FEAT-052: Security role — template, ROLES/ACTIONS/preset entries, drafts-only writes, policy model, rendered by `agents`
- FEAT-053: Security review gate — `security.paths` in policy.yaml, `isSecurityPlan` on touches plus actual changes, `review --security`, dispatch entry and role queue (reusing the Designer's path-scoped gate)
- FEAT-054: Audit cadence — ledger `audit` events, due computation, dispatch entry, goal-closure hold, `audit` command, human-only `audit --waive`
- FEAT-055: Audit baseline scans — whole-tree secrets scan, dependency audit, guard bypass self-tests
- FEAT-056: Threat model and audit procedure — trust boundaries and accepted risks as `learn risk` entries, the audit summary in the ledger, the audit steps in the security template, and the wontfix rule for S1/S2 security bugs
- FEAT-057: Security defaults for other projects — `init` and `doctor` set and check `security.paths` and `audit_every`
- FEAT-058: Record guard denials — every denial lands in the ledger (role, run, rule); audits review them; repeated denials go to the Director

## Notes & decisions
- 2026-10-26 (executive): Security both audits the whole project and gates sensitive plans; the crew builds it as a goal.
- Why a built-in role, not a charter-only one: dispatch decides which role each entry goes to (`dispatch.ts`), so a charter-only role would never be launched. The gate and the audit need hub code.
- 2026-10-26 review of the goal (before approval): security settings live in policy.yaml, not config.yaml (config.yaml is unprotected); the gate keys on actual changes, not only declared touches (drift outside touches is only a hint today, `views/checks.ts:96`); Security's write limit includes `docs/security/**` (the drafts-only preset would make the guard refuse the threat model, `guard.ts:155-170`); guard denials were only hook output (`guard.ts:199-200`), now recorded; security wontfix needs the human or an accepted risk; `audit --waive` avoids a stuck hold.
- 2026-10-26 (executive, second review): Security stays drafts-only and the threat model is hub knowledge, not `docs/security/threat-model.md`. `docs/` is product content that changes only through a plan, and the hub commits only `.crew/` state (`core/work/hubstate.ts:11`), so a docs file written by Security would sit uncommitted on main and skip review. This reverses the earlier `docs/security/**` write limit. Related: CHORE-028 (the Architect's ADRs have the same gap).
- Design: `.crew/drafts/with-the-current-crew-distributed-deer.md`.

## Progress log
- 2026-10-26: proposed from a design session: Security role audits the whole project on a cadence and gates plans on security.paths; reuses the Designer's path-scoped review gate, the audit trigger is new. Design: .crew/drafts/with-the-current-crew-distributed-deer.md. Related: CHORE-027 (designer not rendered here).
- 2026-10-26: pre-approval review: six fixes applied — security settings in policy.yaml; gate on actual changes; Security writes docs/security/**; guard denials recorded (FEAT-058); S1/S2 security wontfix needs human or accepted risk; human-only audit --waive
- 2026-10-26: second review: Security back to drafts-only; threat model as learn risk entries + audit ledger summary instead of docs/security/threat-model.md (FEAT-052, FEAT-056). Related gaps: CHORE-027 (designer paths), CHORE-028 (ADRs).
- 2026-10-26: status proposed → active (approved by Arpit Anand)
