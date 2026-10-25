---
name: hub
description: The team's shared context in .crew/ — the project's idea and success criteria, the focus goal, goals, a typed backlog (features, bugs, chores, spikes) with priority, and plans with verifiable tasks (one branch and one PR per plan). Use when the user or an agent needs to capture or triage work, write the idea or a goal, set the focus, break work down, write or refine a plan, turn plan-mode output into a tracked plan, start or finish work, migrate a project-kit .project/ folder, or asks "what's next", "what's in progress", "where are we", "status". Also initializes the hub in a new project.
argument-hint: "[init | migrate | idea | goal <title> | focus <G-###> | bug <title> | feat <title> | triage | plan <title> | start <P-###> | done <P-###> | next | status]"
---

# Hub: the team's shared context

The hub is where every agent and human on the project reads what the work is for, what is happening and what comes next,
so no one drifts from the goal. Every piece of work has an ID, a document, a priority and a status the script can report on.

```
Idea (IDEA: problem, outcome, success criteria; holds the focus)
 └─ Goal (G-001: an outcome)            ← one goal is the focus at a time
      └─ Items (FEAT/BUG/CHORE/SPIKE-###: the ranked backlog)
           └─ Plan (P-001: 1 branch = 1 PR, delivers 1+ items, declares touches:)
                └─ Tasks (T1..Tn, each with → verify:)
```

- Before changing hub state, read [references/model.md](references/model.md): lifecycles, focus, the triage gate, Definition of Ready and Done, and the git rules.
- Before writing any document, read [references/writing-guide.md](references/writing-guide.md): the quality bar and worked examples.

## Script
All state changes go through the script. Never hand-edit `status`, dates, IDs, `plan:`, `focus:` or the generated `STATUS.md`.
- In a project: `node .crew/bin/crew.mjs <cmd>` (vendored single-file copy — prefer this). Needs Node.js ≥ 20; nothing to install.
- Not yet initialized: `node "${CLAUDE_SKILL_DIR}/dist/crew.mjs" init` at the repo root.
- A project-kit project (`.project/`): `node "${CLAUDE_SKILL_DIR}/dist/crew.mjs" migrate` on a clean `main`, then follow the `next:` lines it prints, and commit `chore(hub): migrate to crew`.
- **Tools first.** When the plugin's `hub` MCP tools are available (`next`, `context`, `ask`, `escalate`, `answer`, `questions`, `current`, `status`, `check`, `graph`, `new_item`, `triage`, `move`, `log`, `focus`, `usage`, `learn`, `recall`, `checkpoint`, `resume`, `handoff`, `ledger`, `design`), call them instead of the matching commands. They run the same code with the same gates; a refusal comes back as a tool error with the CLI's text, and nothing is written. Everything else (`init`, `migrate`, `new-idea`, `new-goal`, `new-plan`, `start`, `release`, `export`, `ui`) and any `--force` stays in the CLI. Use the CLI too when the tools are missing.

| Command | Purpose |
|---|---|
| `new-idea TITLE --from DRAFT` | the idea, once: problem, outcome, success criteria (checklist), research, direction, constraints |
| `new-goal TITLE --from DRAFT [--priority P1]` | an outcome; each Breakdown line becomes a FEAT item |
| `focus G-###` | the one goal the team works toward now |
| `new-item feat\|bug\|chore\|spike TITLE (--from DRAFT \| --why TEXT) [--goal] [--priority] [--severity]` | capture backlog work |
| `triage ID [--priority] [--severity] [--goal]` · `triage ID --reject wontfix\|duplicate --note …` | triage gate → `triaged`, or close |
| `new-plan TITLE --from DRAFT [--goal] [--items FEAT-001,BUG-002] [--touches "src/a/**, docs/b.md"] [--depends P-###]` | a plan that delivers items |
| `move ID STATUS [--note] [--approved-by NAME]` | validated transition (`ready` enforces DoR; IDEA `decided` needs success criteria); policy gates need a human's approval |
| `policy show [--role R] [--team T] [--json]` · `policy check` | the effective policy and its source layers · validation (CI) |
| `start P-###` | claim the plan, branch `plan/P-###-<slug>`, `in-progress` (checks the claim, dependencies and this run's WIP) |
| `log ID TEXT` | progress log / item notes (also a ledger event) |
| `release P-### [--note] [--force]` | give up a claim; another run's claim needs `--force` |
| `usage [--tokens-in N] [--tokens-out N] [--cost USD] [--model M] [--ref ID]` | record what this run used |
| `ledger [--ref ID] [--type T] [--limit N] [--json]` | the shared event log and the live claims |
| `checkpoint [P-###] [--run CMD \| --verify CMD --result pass\|fail] [--ac 1,2\|all] [--attempt WHAT --why WHY] [--step T3]` | record where the work stands: the commit and dirty files, a check and the criteria it covers (`--run` executes it and records the real result), an approach that failed |
| `resume [P-###]` · `handoff [P-###]` | where the work stopped vs git now (checks, attempts not to retry, next task, evidence) · the same written into the plan's Handoff |
| `learn decision\|learning\|gotcha\|convention\|risk FACT --why TEXT [--scope GLOBS] [--source ID] [--supersedes K-…]` | record one fact the team should remember (risks also take `--likelihood`, `--impact`, `--owner`) |
| `recall [--plan P-###] [--paths a,b] [--topic WORDS] [--type T] [--all]` | the knowledge that applies to a plan's touches, some paths or a topic (project + playbook) |
| `context [P-###] [--role R] [--budget N]` | what you need right now, sliced for your role, within a budget (the SessionStart hook runs it) |
| `next [--role R]` · `current` · `check` | the single best next step (or your role's queue, questions to you first) · where am I · consistency (CI runs `check`) |
| `ask [ID] --to ROLE TEXT [--fyi]` · `escalate [ID] TEXT` · `answer Q-… TEXT [--decision]` · `questions` | questions between roles; an open one blocks only its document; escalations are answered by a human |
| `status [--write]` | where the work stands: idea and focus, now, blocked, ready, top of the backlog, open bugs, recently done |
| `migrate` | convert a project-kit `.project/` folder into `.crew/` |
| `export [--json] [--out FILE]` · `ui [--port 8765] [--no-open] [--design]` | the interactive view: a self-contained page (`.crew/view/index.html`, gitignored) or a live local server; `--json` is the graph for scripts; `--design` opens the design studio (`/design`) |
| `design show [--json]` · `design wait [--timeout 1800]` · `design done ID\|all` | the design studio's state, and its hand-offs to Claude (see the design skill) |

**Roles and questions.** Set `CREW_ROLE` to your role (`director`, `pm`, `architect`, `developer`, `qa`, `release`; the human is the `executive`). `next --role` is your queue and `context --role` your brief. Don't guess across roles: `ask P-### --to architect "…"` records the question and blocks only that plan until it's answered; Only the role a question was sent to answers it (`CREW_ROLE`), never the run that asked; a human can answer for a role with `--approved-by`. `answer Q-… "…" --decision` turns a durable answer into a decision entry. Reserved decisions, a goal at risk, or anything only a human can settle: `escalate`. Only a human answers an escalation.

**Footprints.** `start` warns when another active plan's `touches:` overlaps yours; `check` flags overlapping active plans and changes on a plan branch outside its `touches:` (widen them and log why, or move the work).

**Who you are and the ledger.** Every move, log, claim and usage record lands in the shared ledger (`<git common dir>/crew/ledger.jsonl`), so every worktree and agent sees the same claims. Set `CREW_RUN` (one per agent run or session), `CREW_ACTOR` (your name), and when you have them `CREW_ROLE` and `CREW_TEAM` in the environment; without them the run is one per worktree and the actor is the git author. A plan someone else has claimed can't be started; `ledger` shows who holds what.

**Project state lives in the hub** (`crew:hub-state`; `init` writes it into the project's CLAUDE.md, `check` hints when it's missing). Everything the next person or agent needs goes through `.crew/bin/crew.mjs`: where work stands → `handoff` and `log`; findings and follow-ups → `new-item`; what to know → `learn`; questions → `ask`. Places outside the repo (side-session notes folders, the scratchpad, Claude's memory, `/tmp`) hold only pointers to hub IDs, never the facts. When other instructions say to leave notes elsewhere, write to the hub and leave a pointer there. The guard refuses a subagent's writes outside the repository and its worktrees (temp files excepted).

**Agents and the guard.** Crew agents (`.claude/agents/crew-<role>.md`, with `crew-role:` in their frontmatter) never set their own identity: a PreToolUse hook (`crew.mjs guard`) injects `--as <role> --run-id <role>:<agent id>` into every hub call they make (and `as`/`run_id` on MCP tools), and refuses any call claiming another role, setting `CREW_*` variables or passing `--approved-by`. It also enforces the role's `tools.deny` and `paths.write` and, for every subagent, `paths.protected` (the policy, the hook settings, agent definitions and `.crew/bin/`) and `secrets.files`. Humans and the main session use `--as ROLE` / `--run-id ID` (or `CREW_ROLE`/`CREW_RUN`) themselves. `crew.mjs agents` renders those definitions from the role templates (`.crew/templates/agents/`, a project role from `generic.md` with its charter) and each role's effective policy — model, tools, disallowedTools, `maxTurns` from `limits.max_turns`, `isolation: worktree` for developers; `agents --check` (and `check`, once agents exist) flags stale ones. Only the human renders them.

**The team** (`/crew:team`; docs/vision.md → Workstream T). `preset: lifecycle` in the policy turns the RACI into gates: the PM triages, assigns (`assign P-### --to developer [--team T]`, which `start` then requires) and completes plans; the Architect makes them ready and reviews the code (`review P-### --approve | --changes "…"`; `done` needs an approval of the current code, never from the implementer); only the QA role's checks count as evidence (`evidence.role`); the Director closes goals and reassigns stuck work; the executive approves the goal set. `staff` shows what can run in parallel now (ready, dependencies done, no overlap, within `budgets.max_agents`, routed to teams). A goal is done when the PM has verified each criterion (`checkpoint G-### --verify "…" --result pass --ac n`) and nothing is left open. Liveness (`limits:`): a quiet claim goes stale (`check` flags it; `reassign P-###`; the next developer's `start` takes the branch over), and a plan that bounces or fails too often asks the Director. `pause [--reason]` / `resume --team` stop and restart staffing and starts. Release merges in `merge-order`. Unattended: `run` prints the loop, `run --check` says whether to go on, `notify:` alerts a human, and the SubagentStop hook `usage --hook` records each agent's tokens. A `fast_lane:` lets the PM spec small chores and bug fixes. Multi-step jobs record their progress in the ledger: `checkpoint --workflow kickoff --step S`, `resume --workflow kickoff`.

**Policy.** `.crew/policy.yaml` (with an org layer from the playbook repo) sets the `mode` and what needs a human. `crew.mjs policy show` prints the effective policy and where each value came from; `policy check` validates it (and `check` includes it).
- **Human gates and reserved decisions** (by mode: `ai-assisted` gates plan `ready`/`done` and goal `done`; reserved always: deciding or killing the idea, production deploy, publish, spend, delete data, policy change) are refused over MCP and without `--approved-by`. **Never pass `--approved-by` on your own.** Ask the user, and pass it only after they approved that exact step in this conversation, with their name. `--force` does not bypass these.
- **Role gates** (`role_gates: {plan.done: qa}`) need `CREW_ROLE` to match.
- **Budgets** (`budgets.run`, `budgets.project`, `max_agents`): over budget, `start` refuses new work until the user approves it.

**Project memory.** `.crew/knowledge/K-<date>-<slug>.md`: one fact plus why, scoped to the paths it applies to, committed and reviewed with the code. **Recall before you work in an area** (`recall --plan P-###`), and **learn as you go**:
- a failed attempt that cost real time → `learn gotcha`;
- a decision made mid-plan, or an answer to a question → `learn decision`;
- a pattern the code follows that a newcomer would miss → `learn convention`;
- something that might go wrong → `learn risk`.

Replace an outdated entry with `--supersedes`, never by editing history. Never put secrets or env values in it (refused, and `check` fails on them). Before review, the plan's Outcome lists `Learnings: K-…` or `Learnings: none`.

**Nothing is created empty.** Write the content as a draft in `.crew/drafts/<slug>.md`, using the template's `## ` headings, then create the document from it. The draft is consumed. The only lightweight intake is `new-item … --why "<one line>"`; such an item stays `new` until it passes triage. Giving `--priority`/`--severity` at intake triages it right away when the gate passes.

## Workflows
Start every workflow by checking where you are: `crew.mjs context` (or `context --role <yours>`), then `crew.mjs next --role <yours>`. All planning (idea, focus, goals, items, plan drafts) happens **on `main`**. On a plan branch, edit only that plan's file.

### 1. Idea and goals
1. **Idea.** Draft `idea.md` from the brief and any research (`docs/research/`): problem, outcome, success criteria as a checklist the executive can verify, direction and constraints. Create it with `new-idea`. Move it through `researching` and `proposed` as the work goes; only the executive (the user) decides: `move IDEA decided` (or `killed`). A pivot moves it back to `proposed`.
2. **Goals.** Draft one goal per outcome that serves the idea. In the Breakdown, write vertical slices: `Title — what it delivers`. Create each with `new-goal`; the slices become FEAT items.
3. **Focus.** `focus G-###` on the goal to deliver first, then `move G-### active` when its first plan starts. Commit on main: `chore(hub): idea and goals`.

### 2. Capture & triage
- **Capture** anything that comes up (a user request, a bug found mid-plan, tech debt, a question) immediately: `new-item <type> "<title>" --why "<one line>"`. For a bug, use `--from` with a full report (environment, steps to reproduce, expected, actual, evidence, impact) and `--severity`.
- **Triage** right away for bugs, and whenever `next` asks:
  - set the priority (P0 drop everything · P1 needed for the focus goal, soon · P2 planned · P3 someday);
  - set the goal, then `triage ID …`;
  - anything too big for one plan is a goal, or needs splitting.
  - Reject with `--reject wontfix|duplicate --note "<why / dup of>"`. Never delete items.
- **Severity → priority:** S1 outage, data loss or security → P0 · S2 major, no workaround → P1 · S3 has a workaround → P2 · S4 cosmetic → P3. You can override the default with a reason.
- **Expedite lane:** a P0 bug skips the queue. Write a one-item fix plan (`new-plan … --items BUG-###`) with a regression test, and start it next.

### 3. Write a plan (on `main`)
1. **Pick the work:** what `next` names — the top item of the focus goal, a P0 bug, or the user's request (capture it as an item first). If it needs more than `max_tasks` tasks, or spans unrelated areas, split it.
2. **Research before writing.** Read the items, the goal, the relevant ADRs, `.claude/rules/`, `project.md` and what the team already knows (`recall --paths …` or `recall --topic …`). For existing code, read the modules you'll touch. Identify dependencies on other plans.
3. **Draft every section** in `.crew/drafts/<slug>.md`, to the writing guide's bar:
   - Context
   - Scope (In and Out)
   - Acceptance criteria
   - Approach
   - Tasks, each `→ verify:`
   - **Test plan** (bugs: the regression test)
   - **Rollout & rollback**
   - Risks & open questions
4. **From plan mode:** take the latest file in `.crew/drafts/` or `~/.claude/plans/` and rewrite it into these sections. In a project set up by kickoff, a hook reminds you of this as soon as plan mode exits.
5. `new-plan "<title>" --from … --items <IDs> --touches "<globs>" [--goal] [--depends]`. `touches:` is the plan's footprint: narrow globs for the paths it will change.
6. Review it with the user, then `move P-### ready`. If the script lists problems, fix them; don't `--force` past the Definition of Ready.
7. With plan worktrees, the hub commits it on the base branch for you (`chore(hub): …`). Solo, don't commit it on its own: `start` carries uncommitted hub files to the plan branch, and they land in the plan's commit.

### 4. Execute
- **Picking work up (a new session, after compaction, or someone else's plan):** `resume` first. It shows the last checkpoint against git now, the checks that failed, the approaches not to retry and the next task. Don't repeat an attempt it lists.
- **Shared plan worktrees** (`plan_worktrees: true` under `hub:` in `.crew/config.yaml`; the agent team requires it): `new-plan` creates the plan's branch and its worktree `.claude/worktrees/<P-###-slug>` for the code. Hub documents (plans, items, goals, knowledge, the idea) have one home, the main checkout: hub commands work from any checkout, read and write them there, and commit each change on the base branch (`chore(hub): <command> <IDs>`, only hub documents; the main checkout must stay on the base branch). The guard refuses agents' writes to copies in other worktrees; `migrate --gather` brings back what older worktrees still hold. Everyone works on the plan's code in its worktree (`context P-###` names it); `start` claims without switching branches, and `checkpoint --run` runs in the worktree. The code is committed when the plan is complete: one commit in the worktree, a squash-merge, and `git worktree remove` (`merge-order` lists each step). The rest of this section is the solo flow without it.
- Be on an up-to-date `main` with no uncommitted changes outside `.crew/`, then `start P-###` (no commit: uncommitted hub files move to the plan branch with you). Starting claims the plan for your run; `done` or `dropped` releases it.
- **Checkpoint as you go:** after each task or check, `checkpoint --run "<the task's verify command>" --ac <criteria it covers>` — the task's targeted check, never the full suite; when an approach fails, `checkpoint --attempt "<what>" --why "<why it failed>"`. The Stop and PreCompact hooks checkpoint automatically, so a crash loses at most one step. Before ending a session, `handoff`.
- Record what the work costs as you go: `usage --tokens-in … --tokens-out … --cost … --ref P-###`. Nothing records it automatically yet, so budgets only see what runs record.
- After each task, tick it; don't commit. **One commit per plan:** when every task is done, commit the code and the hub files together (`feat(P-###): <title>`), then fix rounds (`fix(P-###): …`). Stopping before the plan is done, commit what you have (`chore(P-###): wip — …`) so a takeover doesn't lose it.
- Use `log P-### "<decision / deviation / blocker>"` as you go. If blocked: `move P-### blocked --note "<why>"`.
- **Scope changes:**
  - small and inside the plan's goal: update Scope, AC and `touches:`, and log why;
  - otherwise capture a new item and keep the plan on its goal. Never quietly expand a plan.
- **Bugs found mid-plan:** capture them as BUG items on main later; record them in the plan's Outcome as follow-ups for now.

### 5. Finish a plan
1. **Verify every acceptance criterion** with the targeted checks the tasks and test plan name (`checkpoint --run … --ac …`). Run `node .crew/bin/check_structure.mjs --all`.
2. Tick all tasks and write the **Outcome**: what shipped, deviations, follow-ups, and `Learnings: K-…` (or `none`). `in-review` is refused without it.
3. `move P-### in-review`, then open the PR:
   - title `P-###: <title>`;
   - the body comes from the PR template and links the plan, its items and its goal;
   - put the URL in the plan's `pr:`;
   - with no remote, summarize the diff for review instead.
4. **Done needs independent evidence.** Another run (QA, `CREW_RUN`/`CREW_ROLE`) re-runs the checks: `checkpoint P-### --run "<check>" --ac all`, then `move P-### done`. The run that implemented the plan can't mark it done, and its own checks don't count. With a human's `--approved-by`, an `evidence: …` note on a criterion also counts. The completion rides along with the merge; no separate commit. **Before merging**, the full suite passes on the branch: green CI, or `full_suite` from the `hub:` block of `.crew/config.yaml` — the only place it runs. **Squash-merge** (ask first in a human-driven session), so main gets one commit per plan. The linked items become `done` automatically.
5. **On main:** capture follow-ups as items, run `check` and act on its hints.

### 6. Close a goal, finish the idea
1. When a goal's plans and items are closed, verify its acceptance criteria with the user and record each one (`checkpoint G-### --verify "<how>" --result pass --ac n`), then `move G-### done` (refused while a criterion is unverified, a plan or item is open, or a plan drifted), `focus` the next goal. With plan worktrees the hub commits these on the base branch; solo, don't commit them on their own: `start` carries them to the plan branch.
2. When every success criterion on the idea is met, tick it with its evidence and report to the user. The idea stays `decided`; new direction starts with a pivot (`move IDEA proposed`).

### What's next / status
- `crew.mjs next` gives the single best next step:
  1. in-progress work;
  2. a P0 bug;
  3. a ready plan (focus work first);
  4. a draft to refine;
  5. untriaged items;
  6. the top ranked item to plan;
  7. the idea, until it is decided.
- For "where are we", run `status`: idea and focus progress, what's in progress, blocked work, top of the backlog, open bugs and what recently shipped. Summarize it in five lines.
- **To let the user see it:** after planning or a status question, offer the view instead of pasting long tables:
  - `export` writes `.crew/view/index.html`, one offline page with the executive overview (idea, success criteria, focus progress, what's next, blockers), board, hierarchy, dependency graph and a page per document with its relations. Tell the user the path; re-run `export` to refresh it.
  - `ui` serves the same page on 127.0.0.1 and updates it live as files change. It can move statuses, triage, set the focus and log notes, through the same gates. It also serves the design studio at `/design`, which saves DESIGN.md and studio.json (the design skill drives it). Run it in the background and give the user the URL. Starting a plan (branch) and creating documents stay in the CLI.
- Only write the generated `STATUS.md` on main.

## Rules
- **Never create placeholder documents.** Future work lives as backlog items, never as empty plans or goals.
- **One focus.** Plans serve the focus goal; bugs and chores are the only work that runs off focus.
- **Write plans just in time:** for the work about to start. Everything later stays as items.
- Respect the WIP limit (`wip_limit`, default 1 plan in progress).
- Never mark a plan `done` with unchecked tasks or an empty Outcome. Never close a goal without the user confirming its acceptance criteria. Only the user decides or kills the idea.
- Every bug fix ships with a regression test.
- Never approve on the user's behalf: `--approved-by` only carries an approval the user gave you for that step.
- Don't use `--force` to get around a gate. If a gate is wrong for this project, change the setting under `hub:` in `.crew/config.yaml` and say so.
