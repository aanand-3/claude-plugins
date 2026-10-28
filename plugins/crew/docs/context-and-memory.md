# Context and memory

<!-- The generated blocks below are rewritten from the code by `npm run docs` in packages/crew (`npm run build` runs it too). Edit the prose around them, never inside them. -->

## Hooks

What the project's `.claude/settings.json` (from the guidelines skill's template) runs, in the order a session meets them.

<!-- generated:hooks -->
| Hook | Matcher | Runs |
|---|---|---|
| SessionStart |  | `crew.mjs context`, `track_plan_draft.mjs --session` |
| PreToolUse | `*` | `crew.mjs guard` |
| PostToolUse | `Edit\|Write\|MultiEdit` | `format_on_edit.mjs` |
| PostToolUse | `ExitPlanMode` | `track_plan_draft.mjs` |
| PostToolUse | `*` | `crew.mjs activity --hook` |
| PreCompact |  | `crew.mjs checkpoint --auto` |
| Stop |  | `crew.mjs checkpoint --auto` |
| SubagentStop |  | `crew.mjs usage --hook` |
<!-- /generated -->

## Questions and exceptions

Every exception goes to the Director first; the human sees only what the Director escalates. Roles ask
`crew.mjs ask <ID> --to director "…"`, and a role's ask for the executive (`ask --to executive`) is routed to the
Director first. The Director answers it (`crew.mjs answer Q-… "…"`) or, when only the human may decide, raises it with
`crew.mjs escalate <ID> "…"`. The human answers an escalation with `crew.mjs answer Q-… "…" --approved-by <name>`.

## Ledger events

Every write to the hub records an event in the shared ledger
(`packages/crew/src/hub/core/memory/ledger.ts:EVENT_TYPES`).

<!-- generated:ledger-events -->
| Event | Recorded when |
|---|---|
| `claim` | a run takes a plan on (`start`) |
| `release` | a run gives a claim up, or the plan closed |
| `move` | a status change, with its note and approval |
| `log` | a progress-log line |
| `usage` | tokens and cost a run used |
| `learn` | a knowledge entry was recorded |
| `checkpoint` | where the work on a plan stands, with its check and evidence |
| `ask` | a question to a role |
| `answer` | the answer to a question |
| `assign` | a plan opened for, or moved to, a role |
| `pause` | the team was paused |
| `resume` | the team was resumed |
| `review` | the Architect's verdict on a plan's code |
| `notify` | something the human was told |
| `report` | a run's or the runner's report |
| `end-run` | a stopped run was marked ended (end-run) |
<!-- /generated -->
