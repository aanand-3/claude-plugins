# Reference

<!-- The generated blocks below are rewritten from the code by `npm run docs` in packages/crew (`npm run build` runs it too). Edit the prose around them, never inside them. -->

## CLI commands

Every command runs as `node .crew/bin/crew.mjs <command>` (`packages/crew/src/hub/cli.ts:COMMANDS`). A command with an
MCP tool runs the same code through the tool; the rest are CLI only.

<!-- generated:commands -->
| Command | MCP tool | Registered in |
|---|---|---|
| `init` | CLI only | `commands/work/planning.reg.ts` |
| `new-idea` | CLI only | `commands/work/planning.reg.ts` |
| `new-goal` | CLI only | `commands/work/planning.reg.ts` |
| `focus` | `focus` | `commands/work/planning.reg.ts` |
| `new-plan` | CLI only | `commands/work/planning.reg.ts` |
| `migrate` | CLI only | `commands/work/migrate.reg.ts` |
| `new-item` | `new_item` | `commands/work/backlog.reg.ts` |
| `triage` | `triage` | `commands/work/backlog.reg.ts` |
| `start` | CLI only | `commands/work/workflow.reg.ts` |
| `move` | `move` | `commands/work/workflow.reg.ts` |
| `log` | `log` | `commands/work/workflow.reg.ts` |
| `release` | CLI only | `commands/work/workflow.reg.ts` |
| `usage` | `usage` | `commands/work/workflow.reg.ts` |
| `policy` | CLI only | `commands/team/policy.reg.ts` |
| `activity` | CLI only | `commands/team/activity.reg.ts` |
| `watch` | CLI only | `commands/team/activity.reg.ts` |
| `run` | CLI only | `commands/team/autonomy.reg.ts` |
| `ledger` | `ledger` | `commands/memory/ledger.reg.ts` |
| `learn` | `learn` | `commands/memory/knowledge.reg.ts` |
| `recall` | `recall` | `commands/memory/knowledge.reg.ts` |
| `checkpoint` | `checkpoint` | `commands/work/execution.reg.ts` |
| `resume` | `resume` | `commands/work/execution.reg.ts` |
| `handoff` | `handoff` | `commands/work/execution.reg.ts` |
| `review` | `review` | `commands/work/review.reg.ts` |
| `merge-order` | `merge_order` | `commands/work/release.reg.ts` |
| `refresh-bin` | CLI only | `commands/work/release.reg.ts` |
| `suite` | CLI only | `commands/work/suite.reg.ts` |
| `suites` | `suites` | `commands/work/suite.reg.ts` |
| `land` | CLI only | `commands/work/land.reg.ts` |
| `context` | `context` | `commands/memory/context.reg.ts` |
| `current` | `current` | `commands/views/advisor.reg.ts` |
| `next` | `next` | `commands/views/advisor.reg.ts` |
| `guard` | CLI only | `commands/team/guard.reg.ts` |
| `reassign` | `reassign` | `commands/team/team.reg.ts` |
| `assign` | `assign` | `commands/team/team.reg.ts` |
| `staff` | `staff` | `commands/team/team.reg.ts` |
| `dispatch` | `dispatch` | `commands/team/dispatch.reg.ts` |
| `pause` | `pause` | `commands/team/liveness.reg.ts` |
| `agents` | CLI only | `commands/team/agents.reg.ts` |
| `ask` | `ask` | `commands/team/questions.reg.ts` |
| `escalate` | `escalate` | `commands/team/questions.reg.ts` |
| `answer` | `answer` | `commands/team/questions.reg.ts` |
| `questions` | `questions` | `commands/team/questions.reg.ts` |
| `inbox` | `inbox` | `commands/team/inbox.reg.ts` |
| `export` | CLI only | `commands/views/export.reg.ts` |
| `ui` | CLI only | `commands/views/ui.reg.ts` |
| `design` | `design` | `commands/views/design.reg.ts` |
| `check` | `check` | `commands/views/checks.reg.ts` |
| `doctor` | `doctor` | `commands/views/doctor.reg.ts` |
| `status` | `status` | `commands/views/reports.reg.ts` |
<!-- /generated -->

## MCP tools

From `packages/crew/src/hub/mcp.ts:TOOLS`.

<!-- generated:mcp-tools -->
| Tool | CLI command | What it does |
|---|---|---|
| `focus` | `focus` | Set the focus goal the team works toward now (`crew.mjs focus`). |
| `new_item` | `new-item` | Capture a backlog item (`crew.mjs new-item`). |
| `triage` | `triage` | Triage a new item (`crew.mjs triage`): set priority/severity/goal, or reject it with a note. |
| `move` | `move` | Move a document to a new status (`crew.mjs move`). |
| `log` | `log` | Append a dated line to a document's log (`crew.mjs log`). |
| `usage` | `usage` | Record tokens and cost this run used (`crew.mjs usage`); feeds budgets and the executive view. |
| `ledger` | `ledger` | Recent events from the shared ledger and the live claims (`crew.mjs ledger --json`). |
| `learn` | `learn` | Record one fact the team should remember (`crew.mjs learn`): a decision, learning, gotcha, convention or risk, with why, scoped to the paths it applies to. |
| `recall` | `recall` | The knowledge that applies (`crew.mjs recall --json`): to a plan's touches, to paths, or to a topic. |
| `checkpoint` | `checkpoint` | Record where the work on a plan stands (`crew.mjs checkpoint`): the step, the commit and dirty files, a check you ran with its result and the acceptance criteria it covers, or an approach that failed and why. |
| `resume` | `resume` | Where a plan's work stopped (`crew.mjs resume`): last checkpoint vs git now, check results, approaches not to retry, the next task and each criterion's evidence. |
| `handoff` | `handoff` | Write the resume view into the plan's Handoff section (`crew.mjs handoff`), before ending a session. |
| `review` | `review` | Code review of a plan in review (`crew.mjs review`): approve, or request changes, which sends it back to the developer. |
| `merge_order` | `merge-order` | What Release merges next (`crew.mjs merge-order`): done plans with unmerged branches, dependencies first; plans waiting on an unmerged dependency; merged branches to delete. |
| `suites` | `suites` | Recorded full-suite runs (`crew.mjs suites`), newest first: ts, ref, run, worktree, slot, wait_ms, run_ms, exit. |
| `context` | `context` | What you need right now (`crew.mjs context`): for a plan, where the work stands, its goal, criteria with evidence, tasks, blockers and questions, knowledge in scope; without one, the idea, focus, your next steps and the team. |
| `next` | `next` | The single best next step (`crew.mjs next`); with a role, that role's own queue, questions to it first. |
| `current` | `current` | Where work stands: the focus goal and the plan on the current branch (`crew.mjs current`). |
| `assign` | `assign` | Open a ready plan for a role (`crew.mjs assign`): records who implements it; `start` then needs the assignment. |
| `staff` | `staff` | What can run in parallel now (`crew.mjs staff`): ready plans whose dependencies are done, that overlap nothing in progress or each other, within budgets.max_agents, each routed to a team; and why the others wait. |
| `reassign` | `reassign` | Move stuck work to another run (`crew.mjs reassign`): releases a stale claim (limits.stale_claim_hours) and assigns the plan again; the next agent takes it over with start, which resumes its branch. |
| `dispatch` | `dispatch` | Who works on what next (`crew.mjs dispatch`): one entry {role, ref, task, resume} per actionable document |
| `pause` | `pause` | Pause the team (`crew.mjs pause`), or resume it with resume: true: while paused, staff and start refuse. |
| `ask` | `ask` | Ask another role a question (`crew.mjs ask`), recorded so it isn't lost. |
| `escalate` | `escalate` | Escalate to the executive (`crew.mjs escalate`): reserved decisions, a goal at risk, anything only a human can settle. |
| `answer` | `answer` | Answer a question addressed to your role (`crew.mjs answer`); decision: true also records it as a decision entry. |
| `questions` | `questions` | Open questions between roles (`crew.mjs questions --json`). |
| `inbox` | `inbox` | What waits on the human (`crew.mjs inbox --json`): goals to approve, escalations and plan steps the policy gates to a human, each with its question, options, what it holds and the command a human runs. |
| `design` | `design` | The design studio's live state (`crew.mjs design show`): DESIGN.md's direction, status and revision, the page's stage, shortlist, pinned variants, screen reviews, and the steps it handed to Claude. |
| `check` | `check` | Validate .crew/ (`crew.mjs check`): ERROR and HINT lines; an error result means problems were found. |
| `doctor` | `doctor` | Whether this project is ready for the autonomous loop (`doctor --json`): each check's id, level (ok, warn, fail), detail and fix; an error result means a check failed. |
| `status` | `status` | Status report for the project (`crew.mjs status`); write=true also saves it to .crew/status.md. |
| `graph` |  | Every tracked document (idea, goals, items, plans) with status, gates, relations and the focus, as JSON (`crew.mjs export --json`). |
<!-- /generated -->

## UI actions

What the hub UI may run (`packages/crew/src/hub/server.ts:ACTIONS`).

<!-- generated:ui-actions -->
| Action |
|---|
| `move` |
| `log` |
| `triage` |
| `focus` |
| `design-save` |
| `design-studio` |
| `answer` |
| `approve-goal` |
<!-- /generated -->

## Skills

<!-- generated:skills -->
| Skill | What it does | Invoked by |
|---|---|---|
| `codemap` | Set up graphify for a project | the user or Claude |
| `design` | Give a web frontend one deliberate, modern visual design and keep every page on it | the user or Claude |
| `discover` | Interview the user to capture a new project's requirements and technical decisions (project type, language/framework, database, cache, containers, architecture, auth) and record them as .crew/config.yaml, docs/project-brief.md, docs/architecture.md and ADRs. | the user or Claude |
| `git-setup` | Initialize git for a project with the team's conventions | the user or Claude |
| `global-setup` | Install or refresh the team's global working principles (Karpathy-style guidelines: think before coding, simplicity first, surgical changes, goal-driven execution) into the user's ~/.claude/CLAUDE.md. | the user only |
| `guidelines` | Generate a project's Claude Code setup and engineering guidelines from its recorded stack | the user or Claude |
| `hub` | The team's shared context in .crew/ | the user or Claude |
| `kickoff` | Kick off a new software project end to end | the user or Claude |
| `onboard` | Bring crew into an existing codebase | the user or Claude |
| `research` | Research a product idea before building it | the user or Claude |
| `team` | Run the crew agent team on this project | the user or Claude |
<!-- /generated -->
