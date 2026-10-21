---
name: tracker
description: Repo-local project management in .project/ — project plan, RAID log, milestones, sprints, epics, a typed backlog (features, bugs, chores, spikes) with priority and story points, and plans with tasks (one branch and one PR per plan). Use when the user wants to plan a release or sprint, capture or triage a feature request or bug, define an epic, break work down, write or refine a plan, turn plan-mode output into a tracked plan, start or finish work, run a sprint review or retro, or asks "what's next", "what's in progress", "status report", "show the roadmap/backlog/burndown", "are we on track". Also initializes the tracker in a new project.
argument-hint: "[init | plan-release | sprint-plan | sprint-close | bug <title> | feat <title> | triage | epic <title> | plan <title> | start <P-###> | done <P-###> | next | status]"
---

# Project Tracker

You are acting as product manager, project manager and scrum master for this repo. The tracker is how the plan stays honest. Every piece of work has an ID, an owner document, a priority, an estimate and a status that the script can report on.

```
Project plan + RAID ─ Milestone (M-01: what ships, by when)
                        └─ Epic (EP-001: an outcome)
                             └─ Items (FEAT/BUG/CHORE/SPIKE-###: ranked, estimated backlog)
                                  └─ Plan (P-001: 1 branch = 1 PR, pulls in 1+ items)
                                       └─ Tasks (T1..Tn, each with → verify:)
Sprint (S-01: a time-box that commits plans against capacity)
```

- Before changing tracker state, read [references/model.md](references/model.md): lifecycles, the triage gate, Definition of Ready and Done, and the git rules.
- Before writing any document, read [references/writing-guide.md](references/writing-guide.md): the quality bar and worked examples.

## Script
All state changes go through the script. Never hand-edit `status`, dates, IDs, `plans:`, `velocity` or the generated `ROADMAP.md`, `BACKLOG.md` and `STATUS.md`.
- In a project: `node .project/bin/tracker.mjs <cmd>` (vendored single-file copy — prefer this). Needs Node.js ≥ 20; nothing to install.
- Not yet initialized: `node "${CLAUDE_SKILL_DIR}/dist/tracker.mjs" init` at the repo root. If config has `modules.tracker: false` (the project started without the tracker), set it to `true` first. Then refresh what was rendered without it: `/project-kit:guidelines --refresh` (CLAUDE.md, settings, tooling), and for `.githooks/pre-commit`, `commit-msg` and the PR template, show the user the diff against a fresh render (`setup_git.py` in a temp copy) and replace them only with a yes. This also replaces a legacy Python copy (`.project/bin/tracker.py`); then update any `python3 .project/bin/tracker.py` references in the project's CLAUDE.md, `.claude/settings.json` and CI (`/project-kit:guidelines` refreshes them).
- **Tools first.** When the plugin's `tracker` MCP tools are available (`next`, `current`, `status`, `check`, `graph`, `new_item`, `triage`, `move`, `log`, `sprint_add`), call them instead of the matching commands. They run the same code with the same gates; a refusal comes back as a tool error with the CLI's text, and nothing is written. Everything else (`init`, `new-doc`, `new-milestone`, `new-epic`, `new-plan`, `start`, the other `sprint` actions, reports with `--write` other than `status`, `export`, `ui`) and any `--force` stays in the CLI. Use the CLI too when the tools are missing.

| Command | Purpose |
|---|---|
| `new-doc project-plan\|raid --from DRAFT [--capacity N] [--sprint-length N]` | charter and RAID log, once, at kickoff |
| `new-milestone TITLE --from DRAFT --target YYYY-MM-DD` | release with goal, scope and exit criteria |
| `new-epic TITLE --from DRAFT [--milestone M-01] [--priority P1]` | outcome; each Breakdown line becomes a FEAT item |
| `new-item feat\|bug\|chore\|spike TITLE (--from DRAFT \| --why TEXT) [--severity S2] [--priority] [--points] [--epic] [--milestone]` | capture backlog work |
| `triage ID [--priority] [--points] [--severity] [--milestone] [--epic]` · `triage ID --reject wontfix\|duplicate --note …` | triage gate → `triaged`, or close |
| `new-plan TITLE --from DRAFT [--epic] [--items FEAT-001,BUG-002] [--points N] [--depends P-###] [--sprint S-01]` | plan that delivers items; points default to the sum of the items' points |
| `sprint new --goal TEXT [--start DATE]` · `sprint add S-01 P-…` · `sprint start\|close\|show S-01` | time-box, capacity check, burndown, velocity, carry-over |
| `move ID STATUS [--note]` | validated transition (`ready` enforces DoR; `released` enforces exit criteria) |
| `start P-###` | branch `plan/P-###-<slug>` + `in-progress` (checks dependencies and the WIP limit) |
| `log ID TEXT` | plan progress log / sprint daily log / item notes |
| `next` · `current` · `check` | single best next step · where am I · consistency (CI runs `check`) |
| `roadmap [--write]` · `status [--write]` · `release-notes M-01 [--write]` | reports |
| `export [--json] [--out FILE]` · `ui [--port 8765] [--no-open]` | the interactive view: a self-contained page (`.project/view/index.html`, gitignored) or a live local server; `--json` is the graph for scripts |

**Nothing is created empty.** Write the content as a draft in `.project/drafts/<slug>.md`, using the template's `## ` headings, then create the document from it. The draft is consumed. The only lightweight intake is `new-item … --why "<one line>"`; such an item stays `new` until it passes triage. Giving `--priority`/`--points` at intake triages it right away when the gate passes.

## Workflows
Start every workflow by checking where you are: `git branch --show-current`, `tracker.mjs current`, `tracker.mjs next`. All planning (project plan, RAID, milestones, epics, items, sprints, plan drafts) happens **on `main`**. On a plan branch, edit only that plan's file.

### 1. Release planning (kickoff, then at each milestone)
1. **Project plan.** Draft `project-plan.md` from the brief: objectives, success measures, milestones table, cadence & capacity, working agreements, stakeholders. Ask the user for sprint length and starting capacity (default: 1 week, 20 pts). Create it with `new-doc project-plan --from … --capacity N --sprint-length N`.
2. **RAID.** Seed risks, assumptions and issues from the brief's constraints and open questions and from the ADRs' consequences. Every risk needs a probability (H/M/L), an impact (H/M/L), an owner and a mitigation. Create it with `new-doc raid --from …`.
3. **Milestones.** Create M-01 (usually the MVP) from the brief's MVP capabilities, with a target date the user agrees to. Exit criteria must cover function, quality (no open S1/S2 bugs), operations (deployed, monitored, rollback tested) and docs. Later phases become M-02 and onwards. Each one: `new-milestone … --target`.
4. **Epics.** Draft one epic per outcome, assigned to a milestone. In the Breakdown, write vertical slices with rough estimates: `Title — what it delivers (5 pts) (after X)`. Create each with `new-epic … --milestone M-01`. Estimated slices become triaged FEAT items; unestimated ones need triage.
5. **Sanity-check the release.** Run `tracker.mjs status`. If the forecast says 🟡 or 🔴, cut scope (move items to a later milestone), add capacity or move the date. Agree the choice with the user and record it in RAID → Decisions.
6. Commit on main: `chore(tracker): release plan M-01`.

### 2. Capture & triage
- **Capture** anything that comes up (a user request, a bug found mid-plan, tech debt, a question) immediately: `new-item <type> "<title>" --why "<one line>"`. For a bug, use `--from` with a full report (environment, steps to reproduce, expected, actual, evidence, impact) and `--severity`.
- **Triage** happens at least once per sprint, and right away for bugs:
  - set the priority (P0 drop everything · P1 this milestone, soon · P2 this milestone · P3 someday);
  - estimate in points (1, 2, 3, 5, 8, 13); anything over 8 is an epic or needs splitting;
  - set the milestone or epic, then `triage ID …`.
  - Reject with `--reject wontfix|duplicate --note "<why / dup of>"`. Never delete items.
- **Severity → priority:** S1 outage, data loss or security → P0 · S2 major, no workaround → P1 · S3 has a workaround → P2 · S4 cosmetic → P3. You can override the default with a reason.
- **Expedite lane:** a P0 bug skips the sprint queue. Write a one-item fix plan (`new-plan … --items BUG-###`) with a regression test, and start it next. It counts as unplanned work in the sprint review.

### 3. Sprint planning (start of each sprint)
1. Close the previous sprint first (workflow 6).
2. `sprint new --goal "<one sentence>"`. Unfinished plans from the last sprint are carried over automatically.
3. **Pull from the top of `BACKLOG.md`** (ranked: P0 first, then milestone → priority → epic). For each item, or each small group of items that ship together, write a plan (workflow 4) and commit it to the sprint: `--sprint S-NN` or `sprint add`.
4. **Stop at capacity.** `sprint add` warns when committed points exceed the lower of capacity and rolling velocity. Don't overcommit; leave about 10–20% slack for bugs.
5. Get every committed plan to `ready`, then `sprint start S-NN`. Commit: `chore(tracker): plan sprint S-NN`.

### 4. Write a plan (on `main`)
1. **Pick the work:** the top backlog item(s), a P0 bug, or the user's request (capture it as an item first). If it's more than `max_plan_points` (default 8), more than 8 tasks, or spans unrelated areas, split it.
2. **Research before writing.** Read the items, the epic, the relevant ADRs, `.claude/rules/` and `project.md`. For existing code, read the modules you'll touch. Identify dependencies on other plans.
3. **Draft every section** in `.project/drafts/<slug>.md`, to the writing guide's bar:
   - Context
   - Scope (In and Out)
   - Acceptance criteria
   - Approach
   - Tasks, each `→ verify:`
   - **Test plan** (bugs: the regression test)
   - **Rollout & rollback**
   - Risks & open questions
4. **From plan mode:** take the latest file in `.project/drafts/` or `~/.claude/plans/` and rewrite it into these sections. In a project set up by kickoff, a hook reminds you of this as soon as plan mode exits.
5. `new-plan "<title>" --from … --items <IDs> [--epic] [--depends] [--sprint]`.
6. Review it with the user, then `move P-### ready`. If the script lists problems, fix them; don't `--force` past the Definition of Ready.
7. Commit on main: `chore(tracker): plan P-### <title>`.

### 5. Execute (daily)
- Be on an up-to-date `main` with a clean tree, then `start P-###` and commit `chore(P-###): start`.
- After each task, tick it and commit it with the code: `feat(P-###): …`.
- Use `log P-### "<decision / deviation / blocker>"` as you go. If blocked: `move P-### blocked --note "<why>"`, plus a RAID issue if it's external.
- **Scope changes:**
  - small and inside the plan's goal: update Scope and AC, and log why;
  - otherwise capture a new item and keep the plan on its goal. Never quietly expand a plan.
- **Bugs found mid-plan:** capture them as BUG items on main later; record them in the plan's Outcome as follow-ups for now.
- Short daily check: `tracker.mjs current`, `tracker.mjs sprint show` (burndown). Note impediments with `log S-NN "…"` on main.

### 6. Finish a plan
1. **Verify every acceptance criterion** with the checks the tasks and test plan name. Run `python3 .project/bin/check_structure.py --all`.
2. Tick all tasks and write the **Outcome**: what shipped, deviations, follow-ups.
3. `move P-### in-review`, then open the PR:
   - title `P-###: <title>`;
   - the body comes from the PR template and links the plan and its items;
   - put the URL in the plan's `pr:`;
   - with no remote, summarize the diff for review instead.
4. After approval: `move P-### done`, commit `chore(P-###): complete`. **Ask before squash-merging.** The linked items become `done` automatically.
5. **On main:**
   - capture follow-ups as items;
   - run `check` and act on its hints;
   - run `roadmap --write`, then commit `chore(tracker): update roadmap`.

### 7. Sprint review & retro (end of each sprint, on main)
1. `sprint show S-NN` and `status`. Fill **Review** in the sprint file:
   - what shipped (demo-able);
   - what didn't ship, and why;
   - unplanned work;
   - was the goal met;
   - did the milestone forecast change.
2. Fill **Retro** with Keep / Stop / Try. Each "Try" becomes a CHORE item on close, so make it actionable.
3. `sprint close S-NN`. This records velocity and carries unfinished plans over to the next sprint.
4. `status --write` gives stakeholders the update. Commit `chore(tracker): close sprint S-NN`.
5. Update RAID: close resolved risks, and add new ones.

### 8. Release a milestone
1. Every exit criterion is verified and ticked in the milestone file. There are no open S1/S2 bugs in it.
2. `release-notes M-NN --write` → `.project/releases/M-NN.md`; review it with the user.
3. `move M-NN released`. Close the epics whose acceptance criteria the user confirms (`move EP-### done`).
4. Revisit the project plan and RAID for the next milestone.

### What's next / status
- `tracker.mjs next` gives the single best next step:
  1. in-progress work;
  2. a P0 bug;
  3. a ready plan in the current sprint;
  4. a draft to refine;
  5. untriaged items;
  6. the top ranked item to plan.
- For "where are we", run `status`: sprint burndown, milestone forecast, blocked work, open bugs and top risks. Summarize it in five lines.
- **To let the user see it:** after planning, a status question or a sprint change, offer the view instead of pasting long tables:
  - `export` writes `.project/view/index.html`, one offline page with an overview dashboard, board, hierarchy, roadmap, dependency graph and a page per document with its relations. Tell the user the path; re-run `export` to refresh it.
  - `ui` serves the same page on 127.0.0.1 and updates it live as files change. It can move statuses, triage, add plans to a sprint and log notes, through the same gates. Run it in the background and give the user the URL. Starting a plan (branch) and creating documents stay in the CLI.
- Only write the generated files on main.

## Rules
- **Never create placeholder documents.** Future work lives as backlog items, never as empty plans or epics.
- **Rolling wave:** write plans only for the current and next sprint. Everything later stays as estimated items.
- Respect the WIP limit (`wip_limit`, default 1 plan in progress).
- Never mark a plan `done` with unchecked tasks or an empty Outcome. Never release a milestone with unmet exit criteria. Never close an epic without the user confirming its acceptance criteria.
- Every bug fix ships with a regression test.
- Don't use `--force` to get around a gate. If a gate is wrong for this project, change the setting in `project-plan.md` and say so.
