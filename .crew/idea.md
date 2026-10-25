---
id: IDEA
title: crew: an agent team from idea to ship
status: proposed
focus: G-007
created: 2026-10-23
decided:
---

# crew: an agent team from idea to ship

## Problem
Building software with AI agents today means one agent per session with no shared memory: each session re-reads the
repo, forgets decisions, repeats approaches that already failed, drifts from the goal and reports work done without
evidence. Human-oriented trackers (sprints, points, milestones) don't help an agent pick work up where another left off,
and there is no structure for several specialised agents to work on one project without colliding.

## Outcome
crew carries a project from idea to shipped: a human executive initiates and decides the idea, and a team of role agents
(Director, PM, Architect, Developer, QA, Release) plans, builds, tests and ships it against a shared context (the hub),
learning across projects as it goes. Humans sit where the project's mode puts them.

## Success criteria
- [ ] A fresh or crashed session resumes a half-done plan from the hub alone, without re-reading the repo broadly and without repeating a recorded failed attempt (eval scenario)
- [ ] Parallel agents can't take the same plan, and every plan's done state carries evidence from a run other than its implementer
- [ ] A decided idea becomes an implementation plan through the agent team's kickoff, with the human approving only what the mode and reserved decisions require
- [ ] The role agents ship at least one real project end to end on the golden sample projects, scored by the evaluation harness
- [ ] Role metrics (QA bounce rate, repeated-mistake rate) fall across projects once self-learning is on

## Research
docs/vision.md records the design: the three-layer model (project state, ledger, memory; context computed from them), the
operating model, policy layering, and the five workstreams.

## Direction
Agent-first and lean: remove the human-only PM layer instead of making it optional; build the shared context (Workstream C)
first because every other workstream reads and writes it; then ideation (A) and the agent team (T) in parallel, evaluation
(E) alongside T, and self-learning (L) last. Rejected: one master plan for everything (too big for one context or PR);
refactoring the tracker's domain model in place (the old assumptions would leak back); a Claude-Code-only core (the CLI and
MCP tools carry everything; hooks only automate).

## Constraints
One maintainer as executive; Node ≥ 20 with no install for projects (single-file bundles); every module under 300 lines;
breaking changes ship together as crew 1.0.

## Progress log
- 2026-10-23: status exploring → researching — vision written: docs/vision.md
- 2026-10-23: status researching → proposed — Workstream C built on branches; awaiting the executive's decision
- 2026-10-23: focus — → G-001
- 2026-10-25: focus G-001 → G-006
- 2026-10-25: focus G-006 → G-007
