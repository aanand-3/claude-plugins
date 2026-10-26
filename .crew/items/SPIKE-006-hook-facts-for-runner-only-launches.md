---
id: SPIKE-006
type: spike
title: Hook facts for runner-only launches
status: triaged
priority: P1
goal:
plan:
created: 2026-10-26
closed:
---

# SPIKE-006: Hook facts for runner-only launches

## Summary
Check the hook facts that runner-only launches (guard refusing crew launches outside runner passes) depend on, before the guard work is specced. Source: draft step 2.

## Question
Three sub-questions, answered with evidence from a real `claude -p` run:
1. Does a hook in a `claude -p` session see the parent process's environment (so `CREW_RUNNER` can reach the guard)?
2. Which tool name and fields does an agent launch carry in the hook input: Agent or Task, `subagent_type`, or `resume`?
3. Can nested subagents launch subagents?

## Timebox
Half a day. Stop when it runs out and report what is known.

## Output
A recorded finding per question (a `learn` entry each, plus the findings below), with the hook JSON captured as evidence, and a recommendation on how the guard identifies a runner-pass descendant (ancestry vs token). Follow-up items if a fact changes the design of the runner-only-launches item.

## Findings
<!-- Filled when done. -->

## Notes
Goal G-009. Blocks the runner-only launches item. Source draft: .crew/drafts/yes-pm-logs-them-recursive-sparkle.md step 2.
- 2026-10-26: goal hint G-009 (by Arpit Anand)
- 2026-10-26: status new → triaged — priority P1
