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
- Not yet initialized: `node "${CLAUDE_SKILL_DIR}/dist/crew.mjs" init` at the repo root. If config has `modules.hub: false`, set it to `true` first, then refresh what was rendered without it: `/crew:guidelines --refresh` (CLAUDE.md, settings, tooling), and for `.githooks/pre-commit`, `commit-msg` and the PR template, show the user the diff against a fresh render (`setup_git.py` in a temp copy) and replace them only with a yes.
- A project-kit project (`.project/`): `node "${CLAUDE_SKILL_DIR}/dist/crew.mjs" migrate` on a clean `main`, then follow the `next:` lines it prints, and commit `chore(hub): migrate to crew`.
- **Tools first.** When the plugin's `hub` MCP tools are available (`next`, `current`, `status`, `check`, `graph`, `new_item`, `triage`, `move`, `log`, `focus`), call them instead of the matching commands. They run the same code with the same gates; a refusal comes back as a tool error with the CLI's text, and nothing is written. Everything else (`init`, `migrate`, `new-idea`, `new-goal`, `new-plan`, `start`, `export`, `ui`) and any `--force` stays in the CLI. Use the CLI too when the tools are missing.

| Command | Purpose |
|---|---|
| `new-idea TITLE --from DRAFT` | the idea, once: problem, outcome, success criteria (checklist), research, direction, constraints |
| `new-goal TITLE --from DRAFT [--priority P1]` | an outcome; each Breakdown line becomes a FEAT item |
| `focus G-###` | the one goal the team works toward now |
| `new-item feat\|bug\|chore\|spike TITLE (--from DRAFT \| --why TEXT) [--goal] [--priority] [--severity]` | capture backlog work |
| `triage ID [--priority] [--severity] [--goal]` · `triage ID --reject wontfix\|duplicate --note …` | triage gate → `triaged`, or close |
| `new-plan TITLE --from DRAFT [--goal] [--items FEAT-001,BUG-002] [--touches "src/a/**, docs/b.md"] [--depends P-###]` | a plan that delivers items |
| `move ID STATUS [--note]` | validated transition (`ready` enforces DoR; IDEA `decided` needs success criteria) |
| `start P-###` | branch `plan/P-###-<slug>` + `in-progress` (checks dependencies and the WIP limit) |
| `log ID TEXT` | progress log / item notes |
| `next` · `current` · `check` | single best next step · where am I · consistency (CI runs `check`) |
| `status [--write]` | where the work stands: idea and focus, now, blocked, ready, top of the backlog, open bugs, recently done |
| `migrate` | convert a project-kit `.project/` folder into `.crew/` |
| `export [--json] [--out FILE]` · `ui [--port 8765] [--no-open]` | the interactive view: a self-contained page (`.crew/view/index.html`, gitignored) or a live local server; `--json` is the graph for scripts |

**Nothing is created empty.** Write the content as a draft in `.crew/drafts/<slug>.md`, using the template's `## ` headings, then create the document from it. The draft is consumed. The only lightweight intake is `new-item … --why "<one line>"`; such an item stays `new` until it passes triage. Giving `--priority`/`--severity` at intake triages it right away when the gate passes.

## Workflows
Start every workflow by checking where you are: `git branch --show-current`, `crew.mjs current`, `crew.mjs next`. All planning (idea, focus, goals, items, plan drafts) happens **on `main`**. On a plan branch, edit only that plan's file.

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
2. **Research before writing.** Read the items, the goal, the relevant ADRs, `.claude/rules/` and `project.md`. For existing code, read the modules you'll touch. Identify dependencies on other plans.
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
7. Commit on main: `chore(hub): plan P-### <title>`.

### 4. Execute
- Be on an up-to-date `main` with a clean tree, then `start P-###` and commit `chore(P-###): start`.
- After each task, tick it and commit it with the code: `feat(P-###): …`.
- Use `log P-### "<decision / deviation / blocker>"` as you go. If blocked: `move P-### blocked --note "<why>"`.
- **Scope changes:**
  - small and inside the plan's goal: update Scope, AC and `touches:`, and log why;
  - otherwise capture a new item and keep the plan on its goal. Never quietly expand a plan.
- **Bugs found mid-plan:** capture them as BUG items on main later; record them in the plan's Outcome as follow-ups for now.

### 5. Finish a plan
1. **Verify every acceptance criterion** with the checks the tasks and test plan name. Run `python3 .crew/bin/check_structure.py --all`.
2. Tick all tasks and write the **Outcome**: what shipped, deviations, follow-ups.
3. `move P-### in-review`, then open the PR:
   - title `P-###: <title>`;
   - the body comes from the PR template and links the plan, its items and its goal;
   - put the URL in the plan's `pr:`;
   - with no remote, summarize the diff for review instead.
4. After approval: `move P-### done`, commit `chore(P-###): complete`. **Ask before squash-merging.** The linked items become `done` automatically.
5. **On main:** capture follow-ups as items, run `check` and act on its hints.

### 6. Close a goal, finish the idea
1. When a goal's plans and items are closed, verify its acceptance criteria with the user, then `move G-### done` and `focus` the next goal.
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
  - `ui` serves the same page on 127.0.0.1 and updates it live as files change. It can move statuses, triage, set the focus and log notes, through the same gates. Run it in the background and give the user the URL. Starting a plan (branch) and creating documents stay in the CLI.
- Only write the generated `STATUS.md` on main.

## Rules
- **Never create placeholder documents.** Future work lives as backlog items, never as empty plans or goals.
- **One focus.** Plans serve the focus goal; bugs and chores are the only work that runs off focus.
- **Write plans just in time:** for the work about to start. Everything later stays as items.
- Respect the WIP limit (`wip_limit`, default 1 plan in progress).
- Never mark a plan `done` with unchecked tasks or an empty Outcome. Never close a goal without the user confirming its acceptance criteria. Only the user decides or kills the idea.
- Every bug fix ships with a regression test.
- Don't use `--force` to get around a gate. If a gate is wrong for this project, change the setting under `hub:` in `.crew/config.yaml` and say so.
