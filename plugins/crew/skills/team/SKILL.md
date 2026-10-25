---
name: team
description: Run the crew agent team on this project — the hub dispatches the work and this session launches the Director, PM, Architect, Developer, QA and Release agents it names until the ask is done, a human decision is needed, the team is paused or the budget runs out. Use when the user says "/crew:team <ask>", "let the team work on X", "fix BUG-001 with the team", "continue" a team run, or wants the agents to take the backlog forward.
argument-hint: "<ask, e.g. \"fix BUG-001\"> | continue"
---

# Run the team

The executive (the user) talks to this session; the work happens one level down. This session renders the agents if needed,
runs the hub's dispatch — one role agent per entry — and brings back what needs a human. The hub decides who works on
what (`crew.mjs dispatch`) and is everyone's shared memory (`node .crew/bin/crew.mjs …`); the guard hook verifies who
each agent is. The Director handles the exceptions dispatch gives it: questions, stale or blocked work, a stall, the
next focus.

```
you ── this session ── dispatch ─┬─ crew-director ─ crew-pm ─ crew-architect ─ crew-developer ─ crew-qa ─ crew-release
                                   (one agent per entry; each plan: one shared worktree)
```

## Before the first run (each step once; skip what is already in place)
1. **Hub.** `.crew/` must exist (`/crew:hub init`, or kickoff/onboard).
2. **Policy.** The team runs best under the lifecycle preset: each step belongs to one role and you approve the goal set.
   If `.crew/policy.yaml` has no `preset: lifecycle`, show the user what it does (`crew.mjs policy show` after) and add it
   only with their yes — a policy change is theirs.
3. **Guard.** `.claude/settings.json` must run `crew.mjs guard` as a PreToolUse hook (the guidelines settings template has
   it; `/crew:guidelines --refresh` adds it). Without it agents could act as any role: stop and say so.
4. **Agents.** `node .crew/bin/crew.mjs agents --check`; if anything is missing or stale, `node .crew/bin/crew.mjs agents`
   and list what changed. Agent definitions are only read at session start: if they were just written, tell the user to
   start a new session (or `/agents` reload) before the first run.
5. **Plan worktrees.** The team works one shared worktree per plan: `hub:` in `.crew/config.yaml` must have
   `plan_worktrees: true` (add it, and re-render the agents: the developer then has no worktree of its own). `new-plan`
   creates each plan's branch and worktree; every role works on the plan's code there, and Release makes its one commit
   and squash-merges when the plan is complete. Hub documents live in the main checkout only: every hub command, from
   any checkout, writes them there and commits them on the base branch (`chore(hub): …`), so keep the main checkout on
   the base branch. `migrate --gather` brings back copies that older worktrees still hold.
6. **Commit the setup.** Plan worktrees start from the last commit: commit the hub's setup (policy, config, agents)
   once, `chore(hub): …`. Hub documents commit themselves after that.

## Each run
1. `node .crew/bin/crew.mjs context --as executive` — show the user, in a few lines, what the team will start from. If
   the user gave an ask (`/crew:team fix BUG-001`), put it in the hub first, in their words: an item, or a question to
   the Director (`crew.mjs ask --to director "<their words>"`), so dispatch routes it.
2. A pass:
   1. `node .crew/bin/crew.mjs run --check` — STOP → report why to the user and end.
   2. `node .crew/bin/crew.mjs dispatch --json` — its `entries`, each `{role, ref, task, resume}`.
   3. For each entry, in parallel: launch `crew-<role>` (an Agent call) with the ref and the task — or, when `resume`
      names a run whose agent this session's roster holds (the agent ID follows the colon in the run), resume that
      agent with SendMessage instead. Keep the roster (run → agent ID) from each Agent result.
   4. Wait for the reports.
   5. Repeat until dispatch has no entries or `run --check` says STOP.

   This session never chooses the routing: it runs what dispatch gives, nothing else.
3. Relay what moved, what is blocked, usage. For each **escalation** (`crew.mjs questions --to executive`),
   put the question and options to the user. Record their answer with
   `crew.mjs answer Q-… "<their decision>" --approved-by <their name>` only when they gave that decision in this
   conversation; an approval for one step is never reused for another.
4. Continue with another pass while the user wants the team to keep going and nothing waits on them. A `resume` whose
   agent isn't in this session's roster (a new session, or the agent said its context is filling up) is a hint only:
   start a fresh agent; the hub has everything it needs (`resume P-###`).

## Unattended
`node .crew/bin/crew.mjs run` prints a loop that hands "continue" to the Director until `run --check` says stop (an
escalation with no plan or item to hold — an escalation about one holds only that document — or escalations holding
everything open, a pause, an exhausted project budget, no approved goal left — a done focus goal moves on to the next approved one), and a one-shot form for a scheduler.
Offer it when the user wants the team to keep going without them. With `notify:` in the policy
(`{command: "<shell>", on: [escalation, budget, stale, goal-done, paused]}`) the hub runs that command with each event
as JSON on stdin — ntfy, a Slack webhook, mail: the user's choice, and a policy change, so theirs to make. A
SubagentStop hook (`crew.mjs usage --hook`, in the guidelines settings template) records each agent's tokens, so
token budgets apply.

## Rules
- This session never does the roles' work itself and never approves on the user's behalf.
- Stop and report when `run --check` says STOP, or an agent reports an escalation, a pause, an exhausted budget or a done goal.
