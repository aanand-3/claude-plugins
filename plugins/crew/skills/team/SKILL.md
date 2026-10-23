---
name: team
description: Run the crew agent team on this project — the Director (a subagent) staffs PM, Architect, Developer, QA and Release agents through the hub until the ask is done, a human decision is needed, the team is paused or the budget runs out. Use when the user says "/crew:team <ask>", "let the team work on X", "fix BUG-001 with the team", "continue" a team run, or wants the agents to take the backlog forward.
argument-hint: "<ask, e.g. \"fix BUG-001\"> | continue"
---

# Run the team

The executive (the user) talks to this session; the work happens one level down. This session renders the agents if needed,
hands the ask to **crew-director**, and brings back what needs a human. The Director staffs the role agents; the hub
(`node .crew/bin/crew.mjs …`) is everyone's shared memory, and the guard hook verifies who each agent is.

```
you ── this session ── crew-director ─┬─ crew-pm ─ crew-architect ─ crew-developer (own worktree) ─ crew-qa ─ crew-release
```

## Before the first run (each step once; skip what is already in place)
1. **Hub.** `.crew/` must exist (`/crew:hub init`, or kickoff/onboard with the hub module).
2. **Policy.** The team runs best under the lifecycle preset: each step belongs to one role and you approve the goal set.
   If `.crew/policy.yaml` has no `preset: lifecycle`, show the user what it does (`crew.mjs policy show` after) and add it
   only with their yes — a policy change is theirs.
3. **Guard.** `.claude/settings.json` must run `crew.mjs guard` as a PreToolUse hook (the guidelines settings template has
   it; `/crew:guidelines --refresh` adds it). Without it agents could act as any role: stop and say so.
4. **Agents.** `node .crew/bin/crew.mjs agents --check`; if anything is missing or stale, `node .crew/bin/crew.mjs agents`
   and list what changed. Agent definitions are only read at session start: if they were just written, tell the user to
   start a new session (or `/agents` reload) before the first run.
5. **Commit.** Developer agents work in their own git worktrees, which start from the last commit: commit hub changes
   (`chore(hub): …`) before handing over.

## Each run
1. `node .crew/bin/crew.mjs context --as executive` — show the user, in a few lines, what the team will start from.
2. Hand the ask to the Director: an Agent call with `subagent_type: crew-director` and a prompt with the user's words
   verbatim (or "continue: take the focus goal forward"). One Director at a time.
3. Relay its report: what moved, what is blocked, usage. For each **escalation** (`crew.mjs questions --to executive`),
   put the question and options to the user. Record their answer with
   `crew.mjs answer Q-… "<their decision>" --approved-by <their name>` only when they gave that decision in this
   conversation; an approval for one step is never reused for another.
4. Continue (hand "continue" to the Director again) while the user wants the team to keep going and nothing waits on them.

## Rules
- This session never does the roles' work itself and never approves on the user's behalf.
- Stop and report when the Director reports an escalation, a pause, an exhausted budget or a done goal.
