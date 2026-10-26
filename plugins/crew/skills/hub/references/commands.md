# Hub commands

<!-- Generated from packages/crew/src/hub/commands/*/*.reg.ts by `npm run build`. Do not edit. -->

Every command runs as `node .crew/bin/crew.mjs <command>` and takes `--as ROLE` / `--run-id ID` (who is acting).
Where a command has an MCP tool, the tool runs the same code with the same gates (never `--force`); call it when the
plugin's `hub` tools are available. Commands without one stay on the CLI.

## work/planning

```text
init                                          create the .crew/ structure
new-idea TITLE --from DRAFT                   the project's idea (problem, outcome, success criteria)
new-goal TITLE --from DRAFT [--priority P1]   an outcome; each Breakdown line becomes a FEAT item
focus G-###                                   the goal the team works toward now
new-plan TITLE --from DRAFT [--goal] [--items FEAT-001,BUG-002] [--touches "src/a/**, docs/b.md"] [--depends P-002]
```

| Command | MCP tool |
|---|---|
| `init` | — |
| `new-idea` | — |
| `new-goal` | — |
| `focus` | `focus` |
| `new-plan` | — |

- `focus`: Set the focus goal the team works toward now (`crew.mjs focus`).

## work/migrate

```text
migrate                                       convert a project-kit .project/ directory into .crew/
migrate --gather                              bring hub documents other checkouts hold into the main checkout
```

| Command | MCP tool |
|---|---|
| `migrate` | — |

## work/backlog

```text
new-item feat|bug|chore|spike TITLE (--from DRAFT | --why TEXT) [--goal] [--priority] [--severity]
triage ID [--priority P1] [--severity S2] [--goal G-001] [--approved-by NAME]
triage ID --reject wontfix|duplicate --note TXT
```

| Command | MCP tool |
|---|---|
| `new-item` | `new_item` |
| `triage` | `triage` |

- `new_item`: Capture a backlog item (`crew.mjs new-item`). Give exactly one of `from` (a draft file with the item template's sections) or `why` (one-paragraph summary). Priority or severity at intake triage it if the triage gate passes.
- `triage`: Triage a new item (`crew.mjs triage`): set priority/severity/goal, or reject it with a note.

## work/workflow

```text
start PLAN_ID · move ID STATUS [--note] · log ID TEXT      (ID: IDEA, G-###, P-###, FEAT/BUG/CHORE/SPIKE-###)
         start/move/triage take --approved-by NAME: a human approving a gated or reserved step (never an agent)
release PLAN_ID [--note TXT] [--force]        give up a claim (another run's claim needs --force)
usage [--tokens-in N] [--tokens-out N] [--cost USD] [--model M] [--ref ID]   record what a run used
usage --hook                                  SubagentStop hook: a crew agent's tokens and final report from its transcript
```

| Command | MCP tool |
|---|---|
| `start` | — |
| `move` | `move` |
| `log` | `log` |
| `release` | — |
| `usage` | `usage` |

- `move`: Move a document to a new status (`crew.mjs move`). Gates (Definition of Ready, WIP limit, policy role gates) apply; there is no force. Steps the policy reserves for a human (human gates, reserved decisions) are refused here: escalate to the human, who approves on the CLI with --approved-by.
- `log`: Append a dated line to a document's log (`crew.mjs log`).
- `usage`: Record tokens and cost this run used (`crew.mjs usage`); feeds budgets and the executive view.

## team/policy

```text
policy show [--role R] [--team T] [--json] · policy check      the effective policy and where each value comes from
```

| Command | MCP tool |
|---|---|
| `policy` | — |

## team/activity

```text
activity --hook                               PostToolUse hook: one activity event per tool call of a crew agent
watch [--ref ID] [--limit 20]                 the live feed (tool calls and ledger events), followed until Ctrl-C
```

| Command | MCP tool |
|---|---|
| `activity` | — |
| `watch` | — |

## team/autonomy

```text
run [--check] [--json]                        run the team unattended: the loop, and whether it may go on (exit 1: stop)
run --until-done [--max-passes N] [--command CMD]  the local runner: preflight, then one pass at a time until it stops (default 20 passes; 0 done, 1 no progress or limit, 2 preflight)
```

| Command | MCP tool |
|---|---|
| `run` | — |

## memory/ledger

```text
ledger [--ref ID] [--type T] [--limit 20] [--json]   the shared event log (who/what/when) and live claims
```

| Command | MCP tool |
|---|---|
| `ledger` | `ledger` |

- `ledger`: Recent events from the shared ledger and the live claims (`crew.mjs ledger --json`).

## memory/knowledge

```text
learn decision|learning|gotcha|convention|risk FACT (--why TEXT | --from DRAFT) [--scope "src/a/**, b.md"]
      [--source P-###] [--supersedes K-…] [--candidate] [--likelihood H|M|L --impact H|M|L --owner WHO]
recall [--paths a,b] [--plan P-###] [--topic WORDS] [--type T] [--all] [--json]   the knowledge that applies
```

| Command | MCP tool |
|---|---|
| `learn` | `learn` |
| `recall` | `recall` |

- `learn`: Record one fact the team should remember (`crew.mjs learn`): a decision, learning, gotcha, convention or risk, with why, scoped to the paths it applies to. Refused if it looks like a secret.
- `recall`: The knowledge that applies (`crew.mjs recall --json`): to a plan's touches, to paths, or to a topic. Call it before working in an area.

## work/execution

```text
checkpoint [P-###] [--step T3] [--run CMD | --verify CMD --result pass|fail] [--ac 1,2|all] [--output TXT]
           [--attempt WHAT --why WHY] [--note TXT] [--auto]   record where the work is (the plan of this branch by default)
resume [P-###] [--json] · handoff [P-###]     where the work stopped vs git now · write it into the plan's Handoff
checkpoint --workflow kickoff|onboard --step S [--skip] [--note] · resume --workflow W   a multi-step job's progress
```

| Command | MCP tool |
|---|---|
| `checkpoint` | `checkpoint` |
| `resume` | `resume` |
| `handoff` | `handoff` |

- `checkpoint`: Record where the work on a plan stands (`crew.mjs checkpoint`): the step, the commit and dirty files, a check you ran with its result and the acceptance criteria it covers, or an approach that failed and why. Call it after each task or check, and whenever an approach fails. A failed check returns an error result but is still recorded.
- `resume`: Where a plan's work stopped (`crew.mjs resume`): last checkpoint vs git now, check results, approaches not to retry, the next task and each criterion's evidence. Call it first when picking work up.
- `handoff`: Write the resume view into the plan's Handoff section (`crew.mjs handoff`), before ending a session.

## work/review

```text
review P-### --approve | --changes TXT        code review of a plan in review (never by its implementer)
review P-### --design --approve | --changes TXT   design review of a UI plan in review (design.ui_paths)
```

| Command | MCP tool |
|---|---|
| `review` | `review` |
| — | `design_review` |

- `review`: Code review of a plan in review (`crew.mjs review`): approve, or request changes, which sends it back to the developer. Never by the plan's implementer; under the lifecycle preset the Architect's, and done needs an approval of the current code.
- `design_review`: Design review of a UI plan in review (`crew.mjs review --design`): approve, or request changes, which sends it back to the developer. A UI plan's touches overlap design.ui_paths; never by its implementer; under the lifecycle preset the designer's, and accepting it needs an approval of the current code.

## work/release

```text
merge-order [--json]                          done plans to merge, dependencies first (Release)
refresh-bin [--check]                         copy the policy's release.refresh_bin files into .crew/bin (Release, in a plan worktree)
```

| Command | MCP tool |
|---|---|
| `merge-order` | `merge_order` |
| `refresh-bin` | — |

- `merge_order`: What Release merges next (`crew.mjs merge-order`): done plans with unmerged branches, dependencies first; plans waiting on an unmerged dependency; merged branches to delete.

## work/suite

```text
suite [--ref P-###]                           run hub.full_suite under a slot shared by every worktree, in P-###'s worktree (Release)
suites [--limit 20] [--json]                  recorded full-suite runs, newest first: queue wait and duration
```

| Command | MCP tool |
|---|---|
| `suite` | — |
| `suites` | `suites` |

- `suites`: Recorded full-suite runs (`crew.mjs suites`), newest first: ts, ref, run, worktree, sha, branch, slot, wait_ms, run_ms, exit.

## work/land

```text
land [P-###]                                  squash-merge accepted plans in merge order: update, rebuild, full suite, merge; a failure goes back to the developer (Release)
```

| Command | MCP tool |
|---|---|
| `land` | — |

## memory/context

```text
context [P-###] [--role R] [--budget CHARS] [--json]   what you need right now, within a budget (default 6000 chars)
```

| Command | MCP tool |
|---|---|
| `context` | `context` |

- `context`: What you need right now (`crew.mjs context`): for a plan, where the work stands, its goal, criteria with evidence, tasks, blockers and questions, knowledge in scope; without one, the idea, focus, your next steps and the team. Sliced for your role and kept within a budget. Call it at the start of every session.

## views/advisor

```text
next [--role R] · current · check · status [--write]    (roles: executive, director, pm, architect, developer, qa, release + the policy's)
```

| Command | MCP tool |
|---|---|
| `current` | `current` |
| `next` | `next` |

- `next`: The single best next step (`crew.mjs next`); with a role, that role's own queue, questions to it first.
- `current`: Where work stands: the focus goal and the plan on the current branch (`crew.mjs current`).

## team/guard

```text
guard                                         PreToolUse hook: reads the hook JSON on stdin, prints the decision
```

| Command | MCP tool |
|---|---|
| `guard` | — |

## team/team

```text
assign PLAN_ID --to ROLE [--team T] [--note TXT]   open a ready plan for a role (start then needs it)
staff [--json]                                what can run in parallel now, within budgets.max_agents
reassign PLAN_ID [--to ROLE] [--note TXT] [--force]   release a stale claim and assign the plan again
```

| Command | MCP tool |
|---|---|
| `reassign` | `reassign` |
| `assign` | `assign` |
| `staff` | `staff` |

- `assign`: Open a ready plan for a role (`crew.mjs assign`): records who implements it; `start` then needs the assignment. Under the lifecycle preset only the PM assigns.
- `staff`: What can run in parallel now (`crew.mjs staff`): ready plans whose dependencies are done, that overlap nothing in progress or each other, within budgets.max_agents, each routed to a team; and why the others wait.
- `reassign`: Move stuck work to another run (`crew.mjs reassign`): releases a stale claim (limits.stale_claim_hours) and assigns the plan again; the next agent takes it over with start, which resumes its branch. Under the lifecycle preset, the Director's.

## team/dispatch

```text
dispatch [--json]                             who works on what next: one {role, ref, task, resume} per entry, within budgets.max_agents
```

| Command | MCP tool |
|---|---|
| `dispatch` | `dispatch` |

- `dispatch`: Who works on what next (`crew.mjs dispatch`): one entry {role, ref, task, resume} per actionable document — questions, Director exceptions, urgent bugs, release, review, goal closure, in progress, ready, triage, specs, a stall — cut to budgets.max_agents (`more` counts the rest). `/crew:team` launches one agent per entry.

## team/liveness

```text
pause [--reason TXT] · resume --team [--note TXT]     stop / restart staffing and starts (executive or director)
end-run RUN [--note TXT]                            mark a stopped agent's run ended (executive or director)
```

| Command | MCP tool |
|---|---|
| `pause` | `pause` |
| `end-run` | `end_run` |

- `pause`: Pause the team (`crew.mjs pause`), or resume it with resume: true: while paused, staff and start refuse. The executive's or the Director's call.
- `end_run`: Mark a stopped or crashed agent's run ended (`crew.mjs end-run`): it stops being live and gives no dispatch entry until it acts again. The executive's or the Director's call.

## team/agents

```text
agents [--check]                              render the role agents (.claude/agents/crew-<role>.md) from the policy
```

| Command | MCP tool |
|---|---|
| `agents` | — |

## team/questions

```text
ask [ID] --to ROLE TEXT [--fyi] · escalate [ID] TEXT · answer Q-… TEXT [--decision [--scope GLOBS]] [--approved-by NAME]
ask/escalate … [--options "A; B"]            the answers to choose from (split on ';'), shown by questions and inbox
questions [--to ROLE] [--ref ID] [--all] [--json]       questions between roles; an open one blocks only its document
```

| Command | MCP tool |
|---|---|
| `ask` | `ask` |
| `escalate` | `escalate` |
| `answer` | `answer` |
| `questions` | `questions` |

- `ask`: Ask another role a question (`crew.mjs ask`), recorded so it isn't lost. It blocks the document it is about from moving forward until answered (fyi: true doesn't block).
- `escalate`: Escalate to the executive (`crew.mjs escalate`): reserved decisions, a goal at risk, anything only a human can settle. Blocks the document until a human answers.
- `answer`: Answer a question addressed to your role (`crew.mjs answer`); decision: true also records it as a decision entry. Escalations can't be answered here — only a human, on the CLI.
- `questions`: Open questions between roles (`crew.mjs questions --json`).

## team/inbox

```text
inbox [--json]                                what waits on the human: goals to approve, escalations, human-gated steps
```

| Command | MCP tool |
|---|---|
| `inbox` | `inbox` |

- `inbox`: What waits on the human (`crew.mjs inbox --json`): goals to approve, escalations and plan steps the policy gates to a human, each with its question, options, what it holds and the command a human runs. Read-only.

## views/export

```text
export [--json] [--out FILE]                  interactive HTML view (.crew/view/index.html) or the graph as JSON
```

| Command | MCP tool |
|---|---|
| `export` | — |

## views/ui

```text
ui [--port 8765] [--no-open] [--design]       serve the view live on 127.0.0.1 (updates as files change);
                                              --design opens the design studio (/design)
```

| Command | MCP tool |
|---|---|
| `ui` | — |

## views/design

```text
design show [--json] · design wait [--timeout 1800] · design done ID|all
                                              the design studio's state; wait blocks until the page hands a
                                              step to Claude (run it in the background); done clears one
```

| Command | MCP tool |
|---|---|
| `design` | `design` |

- `design`: The design studio's live state (`crew.mjs design show`): DESIGN.md's direction, status and revision, the page's stage, shortlist, pinned variants, screen reviews, and the steps it handed to Claude. With done: clear a hand-off you dealt with.

## views/checks

| Command | MCP tool |
|---|---|
| `check` | `check` |

- `check`: Validate .crew/ (`crew.mjs check`): ERROR and HINT lines; an error result means problems were found.

## views/doctor

```text
doctor [--json]                               is this project ready for the loop: OK/WARN/FAIL per check, with the fix
```

| Command | MCP tool |
|---|---|
| `doctor` | `doctor` |

- `doctor`: Whether this project is ready for the autonomous loop (`doctor --json`): each check's id, level (ok, warn, fail), detail and fix; an error result means a check failed.

## views/reports

| Command | MCP tool |
|---|---|
| `status` | `status` |

- `status`: Status report for the project (`crew.mjs status`); write=true also saves it to .crew/status.md.

## views/graph

| Command | MCP tool |
|---|---|
| — | `graph` |

- `graph`: Every tracked document (idea, goals, items, plans) with status, gates, relations and the focus, as JSON (`crew.mjs export --json`).
