# The hub model

The hub is the team's shared context: one place every agent and human reads and writes, so nobody drifts from the goal.
**The plan is the unit of delivery** (1 plan = 1 branch = 1 PR). The idea and goals say what the work is for; items hold
what is wanted but not yet planned. Design and roadmap: `docs/vision.md` in the crew repository.

| Level | ID | What it is | Lives in |
|---|---|---|---|
| **Idea** | `IDEA` | The project's one idea: problem, outcome, success criteria, direction. Holds `focus:` | `.crew/idea.md` |
| **Goal** | `G-001` | An outcome too big for one PR; serves the idea | `.crew/goals/` |
| **Item** | `FEAT-001`, `BUG-001`, `CHORE-001`, `SPIKE-001` | A backlog entry with priority, severity (bugs) and goal | `.crew/items/` |
| **Plan** | `P-001` | A shippable slice (≤ `max_tasks` tasks, one PR) that delivers one or more items | `.crew/plans/` |
| **Task** | `T1..Tn` | A step inside a plan, each with `→ verify:` | checklist in the plan |

Also in `.crew/`: `knowledge/` (decisions, learnings, risks; written by `learn`), `archive/`
(what `migrate` carried over from project-kit), `drafts/`, `templates/`, `bin/` (the vendored CLI). Generated, never
hand-edited: `STATUS.md` (`status --write`) and `view/` (`export`, gitignored).

## Ledger
Documents hold the *content* (reviewed in git); the ledger holds *what is happening*. It is an append-only JSON-lines log at
`<git common dir>/crew/ledger.jsonl`, shared live by every worktree and agent on the machine, never committed.

| Event | Written by | Fields |
|---|---|---|
| `claim` | `start` | `branch` (and `force` when overriding) |
| `release` | `done`/`dropped`, `release` | `reason` |
| `move` | every status change | `from`, `to`, `note` |
| `log` | `log` | `text` |
| `usage` | `usage`, `usage --hook` | `tokens_in`, `tokens_out`, `cost`, `model` (from a transcript: `cache_read`, `source`) |
| `checkpoint` | `checkpoint` | `step`, `sha`, `verify`, `attempt`; for a workflow run `workflow`, `step`, `state` |
| `ask` / `answer` | `ask`, `escalate`, limits / `answer` | `qid`, `to`, `text`, `escalation`, `approved_by` |
| `learn` | `learn` | `kind`, `title` |
| `assign` | `assign`, `reassign` | `to` (a role), `team`, `note`, `reassigned` |
| `review` | `review` | `verdict` (approve, changes), `sha`, `text`, `kind: design` for a design review (none: code) |
| `pause` / `resume` | `pause` / `resume --team` | `reason` / `note` |
| `notify` | a `notify:` alert sent | `kind`, `text`, `key` |

Every event carries `ts`, `ref`, `run` (`CREW_RUN`, else one per worktree), `actor` (`CREW_ACTOR`, else the git author) and
`worktree`. Events are written only when the command succeeds, under a lock, and claims are re-checked inside it, so two runs
can't both claim a plan. Derived from it: live claims (owner in `status` and the view), each run's WIP, spend, and a `check`
hint when a plan file disagrees with the ledger's last move or a closed plan is still claimed.

## Roles, questions and context
Roles are the built-in eight (`executive`, `director`, `pm`, `architect`, `developer`, `qa`, `release`, `designer`) plus any the policy
declares under `roles.<name>` with a `charter:` (lower-case name). Identity is `--as ROLE --run-id ID` on any command
(`as`/`run_id` on MCP), else `CREW_ROLE`/`CREW_RUN`; for crew agents the `guard` hook injects it from the agent's verified
definition, so an agent can't act as another role. An unknown acting role makes the policy invalid, so moves fail closed.
Roles: `executive` (the human), `director`, `pm`, `architect`, `designer`, `developer`, `qa`, `release` (`CREW_ROLE`). Questions are
ledger events (`ask` → `answer`): an open, blocking question on a document refuses its forward moves and its `start`, and
nothing else. Only the addressed role answers (or a human with `--approved-by`), never the asking run. Escalations go to the
policy's `escalation.to` and are answered only with `--approved-by`.
`next --role` gives each role its queue (questions to it first). `context` assembles, in priority order and within a budget
(default 6,000 characters): for a plan — where the work stands, the goal, criteria with evidence, tasks, blockers and
questions, knowledge in scope, handoff and log (QA, architect and release get their own slices); without one — the idea and
focus, next steps, who holds what, recent knowledge. What doesn't fit becomes a pointer to the full command.

**Inbox.** `inbox [--json]` (MCP `inbox`, and the Inbox page of `crew.mjs ui`) lists what waits on the human, oldest
first within each kind: goals to approve (`proposed`), open escalations (questions to the executive — how reserved
decisions arrive; "holds P-###" for one about a plan or item, else "stops the team"), follow-ups (below), and plans in
review whose `accepted` step the policy gates to a human, once their evidence is complete and the review approves. Each entry has
`kind`, `ref`, `question`, `options`, `holds` and `how`, the command that answers it. The human answers from their own
terminal (`answer Q-… "…" --approved-by <name>`, `move G-### active --approved-by <name>`, `move P-### accepted
--approved-by <name>`) or from the page, which asks for their name once and records it as `approved_by`; no session needs
to be open. `ask` and `escalate` take `--options "A; B"` (split on `;`), stored on the question and shown by `questions`
and the inbox. The guard denies every Claude tool call that reaches the page's command endpoint (`/api/commands/`), so
answers and approvals stay the human's. When an answer leaves a step to the human (merge a branch, run a command),
they record it with the answer: `answer Q-… "…" --approved-by <name> --follow-up "<step>" [--unblocks P-###|ITEM]`
(the page's "Then you…" field). The follow-up is one more open question to the executive (an `ask` with `after` and
`step`) about the document it unblocks — the answered question's, or `--unblocks` — so it holds that document, shows in
`status`, `staff` and `resume` as its wait reason, and stays in the inbox (kind `follow-up`, `options: ["done"]`) until
the human answers it `done` (the page's Done button). A human steers with `ask --to director "…"`, which dispatch
routes to the Director.

## Execution state
`checkpoint` events in the ledger record a plan's step, commit, dirty files, check results (command, pass/fail, the criteria
it covers, the end of its output; `--run` executes the check, otherwise the result is *reported*) and failed attempts. The
Stop/PreCompact hooks call `checkpoint --auto`, which records nothing off a plan branch or when the tree hasn't changed.
`resume` compares the last checkpoint with git now; `handoff` writes the same into the plan's `## Handoff` (also on
`in-review`), so another machine resumes from git alone.

**Evidence (plan → `accepted`):** every acceptance criterion's latest check passed and was recorded by a run other than the
implementers (every run that claimed the plan or moved it to in-progress — moving a plan to in-progress claims it), and
an implementer can't make the move itself. A check covers criteria by their text (a fingerprint), so inserting or
reordering criteria never moves a pass onto another one; adding an `evidence:` note doesn't change a criterion. With `--approved-by`, an
`evidence: …` note on a criterion's line also counts.

## Knowledge (project memory)
`.crew/knowledge/K-<yyyy-mm-dd>-<slug>.md` — collision-free across branches, committed, reviewed with the code.

| Field | Meaning |
|---|---|
| `type` | `decision`, `learning`, `gotcha`, `convention` or `risk` (risks add `likelihood`, `impact`, `owner`) |
| `scope` | path globs it applies to; empty = everywhere |
| `source` | the plan, item or idea it came from (defaults to the plan of the current branch) |
| `supersedes` | the entry it replaces; superseded entries drop out of `recall` (`--all` shows them) |
| `tier` | `project`, or `playbook-candidate` for a lesson worth promoting to the org playbook |

`recall` matches a plan's `touches:` or concrete paths against scopes, plus words in the title or body; the org playbook's
`lessons/**.md` (at the pinned ref) are recalled with project entries. `check` reports scopes that match no file, superseded
entries still cited by open work, risks with no owner, and — as errors — anything that looks like a secret. Definition of Done:
the Outcome's `Learnings:` line lists the entries captured, or `none`, before `in-review`.

## Policy
`.crew/policy.yaml`, layered over the built-in defaults and the org playbook (`playbook: {path, ref}` in config.yaml, or
`CREW_PLAYBOOK`): built-in → org → org role → project → project role → project team.

| Key | Where | Merge |
|---|---|---|
| `mode` | global | override; sets the default `human_gates` |
| `human_gates`, `reserved` | global | `<kind>.<status>` transitions needing `--approved-by`; the org's are a floor, reserved is a union |
| `preset` | global | `lifecycle`: a layer between org and project with the team's RACI as gates (see below) |
| `role_gates` | global | `{plan.accepted: qa}` — the step needs the acting role; keys are `<kind>.<status>`, one edge `<kind>.<from>><to>` (wins over the status), or an action: `plan.assigned`, `plan.reassigned`, `plan.reviewed`, `plan.design-reviewed`, `plan.landed` |
| `evidence.role` | global | only that role's checks count toward a plan's acceptance |
| `limits` | global (`max_turns` also per role) | `stale_claim_hours`, `max_bounces`, `max_attempts` (over → a question to the director), `max_turns` (agents) |
| `notify` | global | `{command, on: [escalation, budget, stale, goal-done, paused, stopped, goal-approval]}` — the command gets each event as JSON on stdin |
| `fast_lane` | global | `{types: [CHORE, BUG], max_tasks: 3}` — the PM may make such plans ready |
| `release.refresh_bin` | global only | `{from: plugins/crew/skills/hub/dist, files: [crew.mjs, ui.html]}` — only the release role, in a plan's worktree, runs `refresh-bin` to copy each listed file from `from` over its existing `.crew/bin/` copy (it never adds a file); `refresh-bin --check` fails while a copy differs. No default |
| `models`, `tools.allow`, `paths.write` | global, role, team | override |
| `tools.deny`, `paths.protected`, `secrets.*`, `git.protected_branches` | (as above) | union — a deny always beats an allow |
| `git.force_push`, `git.no_verify` | global | can only be turned off |
| `budgets.run`, `budgets.project`, `budgets.max_agents` | run also per role/team | override, but never above an org ceiling |

A run's role and team come from `CREW_ROLE` and `CREW_TEAM`; an unknown team is a policy error. Drift (changes outside
`touches:`) is measured from `git.default_branch` in config.yaml, else the first protected branch, else `main`.

| Mode | Human gates by default |
|---|---|
| `ai-native` | none (only reserved decisions) |
| `ai-assisted` (default) | plan `ready`, plan `accepted`, goal `done` |
| `human-led` | those, plus item `triaged` |

The hub enforces gates, reserved transitions and budgets; models and tools reach the agents through `crew.mjs agents`
(their frontmatter) and the `guard` hook enforces tool patterns, `paths.write`, `paths.protected` and `secrets.files`.
Bash write targets (redirections, `tee`, `cp`/`mv`/`ln`/`install` destinations, `rm`/`touch`/`mkdir` operands, `sed -i`
files, `git checkout/restore/rm/mv` operands) are checked against `paths.write` too; `/dev/*`, temp-dir files outside the
repository and `git checkout`/`git restore` operands are exempt. Every variable in a target is expanded (its assignments,
`for` words and globs, `$(mktemp)` as a temp path, the environment) and one that stays unknown is refused. Roles with
`paths.write` are refused inline and stdin interpreter scripts (`python3 -c`/`-`, `node -e`/`-p`, `perl -e`, an
interpreter fed a pipe or heredoc), `sh -c` or shell stdin, and `eval`, since no parser sees what those write. The gap that
remains: a script file or build tool a role runs (`node x.js`, `bash x.sh`, `npm run`, `make`) is not seen by the guard.
No subagent runs `crew.mjs init`. An invalid policy blocks every move until `policy check` passes.

`preset: lifecycle`: mode `ai-native`; the executive approves `goal.active`; role gates `item.triaged`, `item.done`,
`item.wontfix`, `item.duplicate`, `item.regoaled`, `plan.regoaled`, `plan.assigned`, `plan.accepted`, `plan.done`, `plan.dropped`, `goal.done` → pm;
`plan.ready`, `plan.reviewed` → architect; `plan.in-progress`, `plan.in-review` → developer; `plan.landed` → release;
`plan.design-reviewed` → designer; `plan.reassigned` → director; `evidence.role: qa`; `limits: {stale_claim_hours: 24, max_bounces:
2, max_attempts: 5}`; the director, pm, qa and release roles write only `.crew/drafts/`. Under a policy that gates
`plan.assigned`, `start` needs an assignment; under one that gates `plan.reviewed`, `accepted` needs an approving review that
covers the last code change, and under one that gates `plan.design-reviewed` a UI plan (its touches overlap
`design.ui_paths` in `.crew/config.yaml`, a list of path globs) also needs an approving `review --design` that covers it; a
UI plan needs a `## Design` section to be ready; under one that gates `goal.done`, the PM verifies a goal's criteria. `plan.landed` is the
gate of `land` and of every `accepted → in-progress` move (a failed land); it keeps the developer's claim and counts
toward `max_bounces`. A project whose own policy gates `plan.done` for a human should gate `plan.accepted` instead:
`done` after a landing is mechanical.

**Dispatch.** `dispatch [--json]` decides who works on what next, from the gates and the state above: one
`{role, ref, task, resume}` entry per document, highest priority first — questions to a role; Director exceptions (a
stale claim, a blocked plan, the focus goal done while another is active); urgent bugs (S1 or P0); the first plan in
`merge-order` → Release lands it; landed accepted plans → the PM completes them; plans in review (a failing check → the
implementer, no approving review → the Architect, a UI plan with no approving design review → the Designer, missing evidence → QA, else the PM accepts); a focus goal with nothing open → the PM closes it; plans in progress; ready plans `staff`
can start (assigned → that role, else the PM assigns); triage; specs and new plans while fewer plans are ready than
`budgets.max_agents`; and, when nothing can move but work is open, one stall entry for the Director. Documents an
escalation holds get no entry; a paused team gets none. Entries are cut to `max_agents` (`more` counts the rest);
`resume` names the run to continue (`<role>:<agent id>`). `/crew:team` launches one agent per entry.

## Focus
`focus G-###` records one goal on the idea. Everything orients to it:
- `next` and the backlog ranking put focus work first;
- `check` warns when a ready or active plan does not serve the focus goal. Bugs and chores may run off focus;
- the overview (executive view) leads with the focus goal's outcome and progress.

There is exactly one focus at a time.

**Goal queue.** The goals the executive approved (`active`, behind the `goal.active` gate) form the queue, ordered by
priority (P0 first, none last), then ID, with the focus first while it is open. When the focus goal is done or dropped (or
there is none), `run --check` moves the focus to the next goal in the queue (`FOCUS  G-001 → G-002`, logged on the idea);
the team stops only when no approved goal is left (`all approved goals done: …`). A `proposed` focus is not replaced.
There is no stored order: set priorities when approving, and `focus G-###` jumps the queue.

## Settings (`hub:` in `.crew/config.yaml`)
| Key | Default | Meaning |
|---|---|---|
| `wip_limit` | 1 | Plans `in-progress` at once |
| `max_tasks` | 10 | A plan with more tasks must be split |
| `plan_worktrees` | false | One shared worktree per plan, created at `new-plan`; a single commit when the plan completes (the agent team needs it) |
| `shared` | [] | Path globs (registries, docs, test files) that plans may change side by side: two plans that meet only on shared touches don't block each other in `staff` or `check`, and their merge conflicts are resolved at release. A touch is shared when it is an exact path a shared glob matches, or equals a shared glob; a broad glob never is |
| `full_suite` | — | The command that runs every test; Release runs it with `crew.mjs suite` before each merge when the project has no CI |
| `suite_slots` | 1 | How many `crew.mjs suite` runs may run at once across every worktree of the repository; the rest wait for a slot |

## Item types
| Type | Use for | Triage gate (must have content) |
|---|---|---|
| FEAT | New capability; goal slices | Summary, priority |
| BUG | Behavior that differs from what's expected | Steps to reproduce, Expected, Actual, severity, priority |
| CHORE | Tech debt, upgrades, tooling | Summary, priority |
| SPIKE | A time-boxed question; its output is a decision or ADR, not shipped code | Question, Timebox, priority |

**Priority:** P0 drop everything · P1 needed for the focus goal, soon · P2 planned · P3 someday.
**Severity (bugs):** S1 outage, data loss or security · S2 major, no workaround · S3 has a workaround · S4 cosmetic. The default priority follows severity (S1→P0, S2→P1, S3→P2, S4→P3).
**Ranking** (`next`, `status`): P0 first, then the focus goal, then priority → goal → ID.

**Goal links** are decided at triage, not capture. `new-item` links no goal: it records the item's `origin:` — `--origin
P-###|ID`, else the plan whose worktree it runs in, else the plan of the run's one open claim — and a `--goal` is checked,
then kept in Notes as `goal hint G-###`. A bug is refused at capture unless Steps to reproduce, Expected and Actual have
content. `triage` on an item without a goal prints the suggested goal (the origin's goal, else the latest hint); `triage
--goal G-###` links it. A goal's Breakdown still links the items it creates. Changing or clearing a goal is a re-goal (the
PM's: `item.regoaled`, `plan.regoaled`): `regoal ID G-###|none --note TXT`, or `triage --goal G-###|none --note TXT`. Each
appends `re-goaled <old> → <new> by <actor>: <note>` (Notes for items, Progress log for plans) and a `log` event. A
re-goal is refused for closed work, from or to a `done` or `dropped` goal, and for an item in an open plan; `regoal P-###`
moves the plan with all its items, all or nothing.

**Overlap candidates** (`overlaps ID [--json]`, read-only) are printed by `triage` too, before its own output (not with
`--reject`): open items whose title is similar (Jaccard of title words ≥ 0.5 with at least 2 shared words, best 5) and
plans in `ready`, `in-progress`, `blocked`, `in-review` or `accepted` whose `touches` cover a path the item's text names.
They come from the documents alone and change nothing; the PM decides. A plan in flight never grows mid-flight: the
item becomes a dependent plan (`new-plan --depends P-###`) or a note on the plan. The block ends with `technical question
→ architect: <why>` only when a matching plan is `in-progress`, `in-review` or `accepted`, or the item's paths match two or
more plans in flight; the PM then asks the Architect (`ask ID --to architect`).

## Lifecycles
Every edge below is in the code (`packages/crew/src/hub/core/work/model.ts`); the gates on each edge are in the generated
[`plugins/crew/docs/plan-lifecycle.md`](../../../docs/plan-lifecycle.md).

**Idea:** `exploring → researching → proposed → decided`, or `killed` from any open state. `decided` needs Problem,
Outcome and Success criteria written, with the criteria as a checklist. A pivot moves `decided → proposed`. Every edge:
- `exploring → researching | killed`
- `researching → proposed | exploring | killed`
- `proposed → decided | researching | killed`
- `decided → proposed`
- `killed → exploring`

**Item** (stored): `new → triaged`, closed as `done | wontfix | duplicate`. The PM closes any item from any status (`move
<ID> done|wontfix|duplicate`, or `triage --reject`), and a closed one reopens to `new`; closing stamps `closed:`. Every edge:
- `new → triaged | done | wontfix | duplicate`
- `triaged → new | done | wontfix | duplicate`
- `done → new | wontfix | duplicate`; `wontfix → new | done | duplicate`; `duplicate → new | done | wontfix`

Until it
is closed, an item a plan links (`plan: P-###`) has its status *derived* from the plan:

| Plan status | Item status |
|---|---|
| draft, ready | `planned` |
| in-progress, blocked, in-review, accepted | `in-progress` |
| done | `done` |

When the plan moves to `done` (with or without `--force`), each of its items not already closed is stored `done` with
`closed:`, a Notes line `status <old> → done — delivered by P-###` and a ledger `move` event `via: plan.done`; no item gate
applies. An item already closed keeps the PM's closure. Closing an item never blocks or moves its plan: a plan whose items
are all closed keeps its status and gates, and whether it still has something to deliver is the PM's call (`move P-###
dropped`). If a plan is dropped, clear the item's `plan:` to return it to the backlog.

**Plan**
```
draft ──► ready ──► in-progress ──► in-review ──► accepted ──► done
  │          │         ▲  │   ▲          │            │
  │          │         │  ▼   │          │            │
  │          │         │ blocked         │            │
  │          │         └─────────────────┴────────────┘   (review changes; a failed land)
  └──────────┴────────────────────► dropped   (from any non-done state; record why)
```
Every edge (the diagram draws the main path; the way back is here):
- `draft → ready | dropped`
- `ready → in-progress | draft | dropped`
- `in-progress → blocked | in-review | ready | dropped`
- `blocked → in-progress | dropped`
- `in-review → in-progress | accepted | dropped` (`in-progress`: review changes or QA's bugs)
- `accepted → done | in-progress | dropped` (`in-progress`: a failed land)
- `done` has no way out; `dropped → draft`

`accepted`: QA's evidence and the review are in, and the PM accepted it; Release lands it (`land`). `done`: it is on the
base branch, and the PM moved it there. An accepted plan still holds its claim and its touches, its goal stays open,
its items stay `in-progress`, and a plan that depends on it doesn't start until it is `done`.

**Goal:** `proposed → active → done | dropped`. Every edge:
- `proposed → active | dropped`
- `active → done | proposed | dropped`
- `done → active`
- `dropped → proposed`

Run `move G-### active` when its first plan starts; it closes only after its acceptance criteria are confirmed.

## Definition of Ready (plan → `ready`, enforced)
- Context, Scope (In/Out), Acceptance criteria and Test plan are written. Every criterion is observable and testable,
  with a targeted check (the tests covering `touches`); the full suite is never a task or a criterion.
- `touches:` lists the paths (globs) the plan expects to change.
- 1–`max_tasks` tasks (aim for 3–8), each ending `→ verify: <how>`.
- Every linked item is triaged. A plan that fixes a BUG names its regression test.
- Dependencies are declared (`depends_on:`); risks and open questions are listed.

## Definition of Done
**Accepted** (plan → `accepted`, enforced):
- Every acceptance criterion is verified with the named checks, and all tasks are ticked.
- The targeted checks are green. Docs, `.env.example` and ADRs are updated where needed; rollout steps are documented.
- Outcome written: what shipped, deviations, follow-ups (captured as items on main).
- Under a policy that gates `plan.reviewed`, an approving review covers the current code.

**Done** (plan → `done`, enforced): the plan is landed — no plan worktree is left, and its branch, if it still exists, is
merged or squash-merged into the base. The full suite ran once, before the merge (CI, or `full_suite` through `land`).

## Size, dependencies and WIP
- Size a plan by its tasks: more than `max_tasks`, or work in unrelated areas, means split it. Parallel work comes from splitting
  into plans with separate `touches:`, not from more people on one plan.
- `depends_on: P-002, P-005` in the plan frontmatter, only for a code dependency: the plan needs the other's code (name it in
  Context, Approach or Risks). An overlap of `touches:` is not a dependency: narrow touches, or list the file in `hub.shared`.
  `start` refuses while a dependency isn't `done`; `status` shows `waits for …`.
- `start` refuses when *this run* already holds `wip_limit` plans in progress (in-progress plans with no claim count for every run). Finish before starting. Parallel agents each have their own WIP.
- Prefer ordering slices so that dependencies are rare. A long chain is a sign the slices are split by layer rather than vertically.

## Git mapping
Two flows, chosen by `hub.plan_worktrees` in `.crew/config.yaml`: branch per plan (the default, below) or one shared
worktree per plan (`plan_worktrees: true`, "With plan worktrees" below).

- Branch per plan: `plan/P-012-<slug>`, created from an up-to-date `main`.
- Commits: Conventional Commits with the plan ID as the scope: `feat(P-012): add login endpoint`.
- PR title: `P-012: <plan title>`. The PR body links the plan, its items and the goal. Squash-merge, then delete the branch.
- **The final commit on the branch sets the plan to `accepted`** (tasks checked, outcome written); after the merge (`land`,
  or the PR), the PM moves it `done` on `main`.

### Where hub changes are committed (branch per plan)
- **On `main`** (`chore(hub): …`, only `.crew/` files): the idea and focus, goals, items, plan drafts and creation, generated reports.
- **On the plan branch:** only *that plan's* file (status after `ready`, the progress log, ticked tasks, the outcome). This keeps parallel branches conflict-free; item statuses follow automatically.
- Branch per plan only: `status` and `next` read `main` *and* every `plan/*` branch, so they show live progress before
  merge.

### With plan worktrees (`plan_worktrees: true`)
- `new-plan` creates the plan's branch and one shared worktree (`.claude/worktrees/P-012-<slug>`) that every role on the
  plan works in. It is sparse: no `.crew/plans`, items, goals, knowledge or `idea.md`.
- Hub documents have one home, the main checkout: every hub-writing command commits them there on the base branch
  (`chore(hub): …`), including the plan's own file (status, ticked tasks, progress log, outcome).
- The plan branch holds only code: `checkpoint` and the hand-over to `in-review` commit the work in progress on it.
- `land` (Release, after the PM accepts) squashes the branch into the plan's one commit on the base, then removes the
  worktree and the branch; the PM then moves the plan `done`.

### Exception: goal integration branch (opt-in)
Use only when a goal's plans **cannot** ship to `main` independently and a feature flag isn't an option:
1. Create `goal/G-003-<slug>` from `main`.
2. Branch plans from it and merge them into it.
3. PR the goal branch into `main`.

Record `integration_branch:` in the goal. Prefer feature flags.
