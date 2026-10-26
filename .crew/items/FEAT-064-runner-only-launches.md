---
id: FEAT-064
type: feat
title: Runner-only launches
status: triaged
priority: P1
goal: G-009
plan:
created: 2026-10-26
closed:
---

# FEAT-064: Runner-only launches

## Summary
Make the guard enforce that only runner passes launch crew agents. Source: draft step 6 ("Plan C"); after the hook-facts spike, the runner lock (FEAT-059) and P-060.

- Policy key `launch: runner|any` in `policy.yaml`; it only tightens across policy layers and `init` defaults to `any`. Doctor reports the mode and whether the runner is alive, and recommends `runner`.
- Under `runner` the guard refuses: Agent, Task, a resume or SendMessage targeting a `crew-*` agent, unless the caller descends from the lock holder (process ancestry, token as a cross-check); any crew launch from inside a subagent; `claude` started from a crew agent's Bash.
- The refusal gives a ready command (`expedite P-060`, or `ask --to director "..."`) and the runner line; it never names the token or lock path.
- Sessions in a plan worktree: the hook resolves the main checkout's `crew.mjs`.
- Failures decided on purpose: a failed lock read is a denial; a crash on import fails open (the documented escape). Refusals go through the existing `deny` so FEAT-058 can record them.
- Ships with `launch: any` so it cannot block its own release; then the PM or Director escalates the policy change and the human sets `launch: runner`.
Touches `guard.ts`, `core/team/policy.ts`, `doctor.ts`, the skill's step-2 gate, `docs/policy.md`.

Gap this closes: in this session a G-001 plan was opened while G-007 was the focus, because sessions launch and steer agents by hand with no single driver; with launches going only through the runner and the goal queue, work off the focus is surfaced instead of started ad hoc.

## User story
As the human, I want only the runner to launch crew agents, so that there is one driver and a session cannot start work off the focus.

## Acceptance criteria
- [ ] Under `launch: runner`, a crew launch from a session, a SendMessage resume, a nested agent and a worktree session are each denied with the hint.
- [ ] A launch from a runner pass passes.
- [ ] Doctor reports the launch mode and runner liveness.
- [ ] `launch: any` is the init default and the plan lands without blocking itself.

## Notes
Goal G-009. Source draft: .crew/drafts/yes-pm-logs-them-recursive-sparkle.md step 6.
- 2026-10-26: goal hint G-009 (by Arpit Anand)
- 2026-10-26: status new → triaged — priority P1
- 2026-10-26: re-triaged: priority P1
