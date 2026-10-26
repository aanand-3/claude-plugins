---
id: G-009
title: One runner, many views
status: active
priority: P1
created: 2026-10-26
completed:
integration_branch:
---

# G-009: One runner, many views

## Outcome
One runner process per clone drives the crew loop, and every chat session and the hub ui is a view onto it: a human can see why nothing moves, ask for work, expedite a plan and steer from anywhere, and only runner passes launch crew agents.

## Scope
**In:**
- Spike: the hook facts runner-only launches depend on (draft step 2).
- Expedite and steering from anywhere (draft step 5, without the ask-closing fix, which is on G-007): `expedite <ref>`, dispatch ordering with caps, ui `ask`/`expedite`/`pause`/`resume` actions and a runner panel, notifications (`answered`, `expedited-started`/`done`, pass report listing dispatched entries).
- Runner-only launches (draft step 6): `launch: runner|any` policy key, guard refusals for crew launches outside the runner, refusal hints, worktree sessions, doctor reporting.
- The rollout (draft step 7): refresh `.crew/bin` and start the runner after the lock lands; re-render agents and restart `ui` after steering lands; ship runner-only launches with `launch: any`, then the human sets `launch: runner`.

**Out:**
- The identity fix, runner lock and idle mode, and closing asks: they are on G-007 and are prerequisites here.
- Treating the guard as a security boundary: it stays an accident-preventer (terminal and MCP tools, script files and a crash all get around it).
- Interrupting a running agent or exceeding `max_agents`: urgent work takes the next round and the next free slot.

## Acceptance criteria
- [ ] The hook facts are recorded: whether a `claude -p` hook sees the parent environment, which tool name and fields an agent launch carries, and whether nested subagents can launch subagents.
- [ ] `expedite <ref>` moves the ref's entry to the front of `dispatch --json` within the caps (at most max(1, max_agents-1) per round, at most 3 open); a blocked ref returns its wait reason; dependencies, holds and gates are never overridden.
- [ ] The ui can `ask`, `expedite`, `pause` and `resume`, and shows the runner state, last stop reason and the start command.
- [ ] Under `launch: runner`, a crew launch from a session, a SendMessage resume, a nested agent and a worktree session are each denied with a ready command and the runner line; a launch from a runner pass is allowed.
- [ ] A plan cannot be opened for a goal other than the focus without being surfaced (the "G-001 plan opened while G-007 was the focus" gap is closed or explained by the refusal).
- [ ] Each plan lands with targeted tests and a passing full suite.

## Success metrics
A session no longer launches agents by hand; the human works from one terminal tab and any number of views.

## Breakdown
- FEAT-060: SPIKE: Hook facts for runner-only launches — answers the three hook questions (parent environment in `claude -p`, agent-launch tool name and fields, nested subagents) before the guard work.
- FEAT-061: Expedite and steering from anywhere — `expedite <ref>`, dispatch ordering within caps, ui ask/expedite/pause/resume actions with a runner panel, and the new notification kinds.
- FEAT-062: Runner-only launches — the `launch: runner|any` policy key and the guard refusals for crew launches that are not runner passes, with doctor reporting.

## Notes & decisions
Source: .crew/drafts/yes-pm-logs-them-recursive-sparkle.md. Human decisions: the guard enforces runner-only launches; urgent work takes the next round and the next free slot. Starts after G-007 closes. Rollout order: runner lock lands, human starts the runner; steering lands, agents re-rendered and ui restarted; runner-only launches land with `launch: any`, then the human sets `launch: runner`.

## Progress log
- 2026-10-26: Q-24ba43/Q-73467a: items FEAT-065 (escalate gate), FEAT-066 (Director stall entries), FEAT-067 (Director pass before runner stop), CHORE-030 (ask routing and docs) captured and triaged under G-009. Goal document NOT yet updated: PM may write only .crew/drafts/**. Pending edit by executive: Outcome add 'exceptions reach the Director first; the executive only sees what the Director escalates'; Scope In add Director-first exceptions (escalate gate; dispatch stall entries for 2x-refused refs, no-progress passes, permission denials; one Director-only pass before a no-progress or escalation stop); Scope Out add 'Director never launches agents, runner stays role-less'; prerequisite BUG-044 on G-007; Breakdown add FEAT-065..067, CHORE-030; add 4 acceptance criteria per Q-24ba43 answer (incl. P-060 BUG-048 regression test). Notes line 'Starts after G-007 closes' stays.
- 2026-10-26: status proposed → active (approved by Arpit Anand)
