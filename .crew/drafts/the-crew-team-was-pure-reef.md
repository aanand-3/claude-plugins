# Autonomous, parallel delivery for the crew team

## Context

The crew team is meant to take approved goals and work the backlog to done on its own, several plans at once, in this repo and in other projects. Today it does neither:

- **Parallel plans break each other.** Each plan worktree has its own copy of `.crew/`. New plans, items and status moves stay in that copy until Release commits the plan (`carryHub`, `packages/crew/src/hub/commands/work/planning.ts:165`). So state forks. BUG-018 itself exists only in the P-023 worktree. P-021 to P-025 aren't on main. FEAT-027 and FEAT-029 to 031 sit untracked in different checkouts.
- **Almost everything runs one at a time.** Every hub plan rebuilds the committed bundles (`dist/*.mjs`, `.crew/bin/crew.mjs`). Touches globs are broad, and every new command edits the same registry files (`cli.ts`, `mcp.ts`, `SKILL.md`). `staff` won't run plans whose touches overlap, so architects add `depends_on` as a lock. That gives P-020 → {P-021, P-022, P-023} → {P-024, P-025}.
- **Merging is a prose procedure**, written as instructions for the Release agent. Nothing rebases a plan onto newer main, rebuilds generated files or retries after a conflict. Squash merges break ancestry checks (BUG-005). A worktree cut before its dependency merged still sees that dependency as unfinished.
- **Work stays uncommitted until Release.** So review approval is pinned to a commit that never moves (BUG-014, CHORE-014).
- **The loop stops after one goal and only runs while a human drives it.**
  - `run` stops when the focus goal is done (`commands/team/autonomy.ts:43`).
  - Nothing moves the focus to the next goal.
  - Nothing turns `new` items into triaged items, then into specced plans, unless a role is asked to.
  - `run` only prints a shell loop.
  - CHORE-005 is still open: nothing checks that the session actually loaded the crew agents.
- **You can't see what agents are doing.** The hub records progress only when an agent checkpoints or stops. A long run looks stuck, and a pointer to the hub shows nothing until the agent finishes.
- **You can only reach the team through an open session.** Your answers count only when given in the conversation with the main session, so an unattended run waits for you to open one.

**Decisions (you, 2026-10-25):**
- **Hub state** lives in the main checkout only.
- **Humans approve** goals plus the reserved steps (deploy to production, publish, spend, policy changes). Nothing else.
- **The runner** is a local loop.

## Approach

Record this as a new goal, **"Autonomous parallel delivery"**, with one plan per section below. Wave 0 is done by hand on one branch: the team can't fix the tool it is breaking on. Waves 1 and 2 are specced with **narrow, disjoint touches** and handed to the team in parallel, which tests the result on the work itself.

### Wave 0: one home for hub state (by hand, first)

**Before Wave 0: release P-023 as it stands.**
- It is done but uncommitted in its worktree. Its worktree also holds hub files that main lacks: BUG-015 to BUG-018, FEAT-025, FEAT-026, FEAT-028, SPIKE-003 and SPIKE-004, and three knowledge entries.
- Merging it brings those files to main the way the current design intends, so gather has less to reconcile.
- After it merges, you re-render the protected agent copies (P-023 rollout).

**W0-a: gather what has forked.**
- Add `migrate --gather`. It copies every `.crew/{plans,items,goals,knowledge}` file and `idea.md` from the plan worktrees into the main checkout.
  - Where copies differ, the newest wins and the command reports the conflict.
  - Clashing IDs (two different FEAT-027s) get renumbered, and the clash is logged.
- Run it once, then commit the result on main.
- Close the duplicates from the fork with `triage --reject duplicate`: BUG-015 is BUG-018, and SPIKE-003 is SPIKE-004.
- This resolves Q-d4e060 and Q-67af6f. It also brings P-021 to P-025 and BUG-017 and BUG-018 onto main.

**W0-b: the Store always uses the main checkout** (fixes BUG-018).
- `Store` roots `.crew` at the main worktree, `git.worktrees()[0]`, wherever the command runs (`core/store.ts:55`). Source code is still read from the current worktree.
- Remove the per-worktree overlays: `WorktreeCopies`, `carryHub`, `restore`, and the plan/items overlay in `store.ts:121-228`. Plan files are written to main (`planning.ts:119`).
- Every hub write commits on the base branch as a small commit:
  - message: `hub(<ID>): <what>`;
  - only the paths the command wrote: `git commit -- <paths>`, under the ledger lock;
  - the user's other uncommitted work is never staged.
- If the main checkout isn't on the base branch, refuse and say so.
- The guard refuses writes to `.crew/` documents inside a plan worktree.
- Update the knowledge entries this replaces, using `learn --supersedes`:
  - "a plan file on main can lag its branch";
  - "commit hub changes before staffing".

**W0-c: everything an agent does shows in the hub, live.** This is the team's first plan once W0-b lands, so every later plan runs where you can watch it.
- **Why.** The `CLAUDE.md` rule (state in the hub, pointers everywhere else) is right. But the hub only records what an agent does when the agent chooses to: a checkpoint at the end of a task, or `usage` when it stops. So a pointer leads to nothing until the agent finishes, and a long run looks stuck. The fix is to have the hub capture progress itself, not to put progress back into chat.
- **Activity is captured by hooks, not by agent discipline.**
  - A new `activity --hook` runs as a PostToolUse hook, beside the guard, in `.claude/settings.json` and the guidelines settings template.
  - It appends one compact event per tool call: run, role, ref (plan or item), tool, and target (a file path, or a command's first word plus its hub subcommand). It stores no arguments or file contents, so no secrets.
  - Events go to `activity.jsonl` next to the ledger (`core/memory/ledger.ts:60`), so the ledger itself stays small. Old activity rotates out.
  - Agents also send `checkpoint --note` on every task step they start, not only when the step finishes.
- **Reports land in the hub.** The SubagentStop hook (`usage --hook`) also stores the agent's final report as a `report` event on its ref. Each runner pass (W2-c) stores its outcome too. The main session relays a summary plus the ref; the full text is in the hub.
- **Views.**
  - `status` gets a "Running now" section: each live run's role, plan, task, last action and how long ago, and tokens so far.
  - A new `watch` command tails the feed in a terminal.
  - The `ui` server watches the ledger and `activity.jsonl` and shows a live activity panel. This is FEAT-019, folded in here.
- **Liveness from heartbeats.** A run with no activity for `limits.idle_minutes` (default 20) shows as idle in `status` and goes to the Director through `dispatch`. `stale_claim_hours` stays as the hard limit for reassigning.

### Wave 1: plans can run side by side (parallel)

**W1-a: generated files stay out of plans.** P-023 is done (not yet merged) and already covers this. Generated paths are marked `linguist-generated` in `.gitattributes`, `drift` ignores them, and Release rebuilds with `hub.build`. What's left:
- Release P-023, then P-024 (refresh `.crew/bin`, FEAT-027).
- No new config key. The `.gitattributes` marking is the single source of what counts as generated, and every later step reads it from there.
- `check` warns when a plan's `touches` lists a generated path.

**W1-b: commit on the plan branch.**
- `checkpoint` makes a WIP commit in the plan's worktree. It leaves out `linguist-generated` paths, so P-023's rule holds (developers build only to run checks, and never keep the output).
- Review pins to that commit and goes stale when HEAD moves (BUG-014, the review-gate part of CHORE-014).
- Release still squashes to one commit per plan, so FEAT-022's rule holds.

**W1-c: a merge queue** (`land P-###`, run by Release, in `commands/work/release.ts`).
- This turns P-023's Release steps in `release.md` into a command; it doesn't replace them. In merge order, for each done plan:
  1. Restore the generated files.
  2. Merge the latest base into its branch.
  3. Run `hub.build`.
  4. Make the plan's one commit, then run `hub.full_suite`.
  5. Squash-merge.
  6. Remove the worktree.
  7. Fast-forward the worktrees of plans that depend on it.
- A conflict or a failing suite moves the plan back to in-progress for its developer, with the conflicting files in the note. It then goes back in the queue.
- Fix squash detection (BUG-005, CHORE-014).

**W1-d: an overlap is not a dependency.**
- Add `hub.shared` globs (registries, `SKILL.md`, `README.md`). Overlaps on those don't block `staff`; the merge queue resolves them.
- This takes on FEAT-028 and SPIKE-003/004 (test-only overlaps), which P-023 left out of scope.
- `check` warns on:
  - touches that are too broad (FEAT-028);
  - a `depends_on` that has no code dependency (overlap only).
- Architect guidance: use `depends_on` only when a plan needs another plan's code.

**W1-e: split the registries.**
- Each command module registers its own CLI command and MCP tool, and `cli.ts` and `mcp.ts` load them, so a new command touches only its own file.
- The command reference in `hub/SKILL.md` is generated from the modules.

### Wave 2: the team runs to done (parallel, after Wave 0)

**W2-a: the hub dispatches; the PM owns each plan; the Director handles exceptions** (your choice, 2026-10-25).
- **Why the roles change.**
  - Today an LLM Director pass decides every hand-off.
  - A subagent can't start other subagents, so the PM can't coordinate a plan by itself; only the top-level loop can.
  - Routing is mechanical, given a plan's state and the role gates in `presets.ts`. So the hub decides it, and roles do the judgment work.
- **New `dispatch [--json]`** (in `commands/team/`, beside `staff`): one entry per actionable thing, `{role, ref, task}`, capped by `budgets.max_agents`. It reads the existing gates, so there's no new routing table.

  | State | Role and task |
  |---|---|
  | `new` items | PM: triage |
  | triaged items with no plan | Architect: spec. Only until there are `max_agents` ready plans ahead of the developers, so the frontier stays full without over-speccing. |
  | ready plan proposed by `staff`, not assigned | PM: assign |
  | assigned or in-progress | developer: start / continue |
  | in-review with no current approval | Architect: review |
  | approved without QA evidence | QA: test |
  | review changes, or QA bugs | the same developer (the runner's roster resumes that agent) |
  | evidence and approval in | PM: complete |
  | done | Release: `land` |
  | stale claim, bounce/attempt limit hit, `staff` overlap it can't resolve, focus goal's plans all closed | Director |

- **Roles after the change** (the gates stay as they are, except `goal.done`):
  - **Executive (human):** approves goals plus the reserved decisions. No plan-level approval (your choice).
  - **PM:** owns each plan's lifecycle: triage, assign, complete. Owns goal closure too: once it has verified each criterion, it moves the goal to done. `goal.done` changes from director to pm.
  - **Director:** exceptions and the goal queue only (reassign, split or drop stuck work, set the next focus). The step-by-step hand-off loop is removed from `crew-director.md`.
  - **Architect, Developer, QA, Release:** unchanged duties. Their text changes only where Waves 0 and 1 change the mechanics.
- **The `/crew:team` skill** (`plugins/crew/skills/team/SKILL.md`) becomes the dispatcher's executor. Each pass:
  1. Run `dispatch --json`.
  2. Launch or resume one `crew-<role>` subagent per entry, in parallel.
  3. Wait for the reports.
  4. Repeat until `dispatch` is empty or `run --check` says STOP.
- QA's bugs flow back into triage. P0/S1 bugs jump ahead of other work, as `next` does today.
- Changes:
  - `presets.ts` (`goal.done` → pm);
  - the new dispatch module;
  - `team/SKILL.md`;
  - `plugins/crew/skills/hub/agents/{director,pm}.md`.
  - You re-render `.claude/agents/**`, since those files are protected.

**Role text that Waves 0 and 1 make wrong ships with those plans,** not here:
- "nothing is committed to main on its own; hub changes travel with the next plan" in `director.md` → W0-b;
- `new-plan` "writes the spec there [in the worktree]" in `architect.md` → W0-b;
- "Release makes its one commit… nothing committed until complete" → W1-b/W1-c.

**W2-b: a goal queue.**
- Goals you approved form an ordered queue.
- When the focus goal's criteria are verified, the Director sets it to done and moves the focus to the next approved goal.
- `runState` (`autonomy.ts:31`) builds on P-023's version: escalations still hold only their own plan or item, and `held` and `HELD` stay as they are. Only the focus-goal reason changes: a done focus moves to the next approved goal, and the team stops only when none is left (or on an escalation, pause or budget stop). The stop message reports what was finished.

**W2-c: a local runner.** `run --until-done [--max-passes N]` is a real command:
- It spawns `claude -p "/crew:team continue"` each pass and logs every pass to the ledger.
- It stops on `runState`, or after two passes in a row that changed nothing in the ledger (no progress).
- It notifies on stop.
- Preflight (CHORE-005): it checks that the crew agents are rendered and loadable, and that the guard hook is installed.

**W2-e: the human talks to the hub, not to a session** (revisits the earlier decision).
- **Today** (`plugins/crew/skills/team/SKILL.md:36-47`): you talk only to the main Claude Code session, which relays to one Director. An answer counts only when you gave it in that conversation. Unattended, there's no conversation, so an escalation waits until you open one.
- **New channel: an inbox in the hub.**
  - **`inbox`** (CLI and a UI page) lists what waits on you: goals to approve, escalations, reserved decisions. Each entry has its question, its options, and what it holds.
  - **You answer from your own terminal or the UI:** `answer Q-… "<decision>" --approved-by <you>`, `move G-### active --approved-by <you>`.
    - The guard already refuses `--approved-by` from agents (`commands/team/guard.ts:165`), so this stays a human-only path.
    - The guard also refuses agent requests to the UI server's answer endpoint.
  - **You steer the same way:** `new-goal`, `focus`, `pause`, or `ask --to director "<direction>"`. `dispatch` routes an open question for the Director as an exception, so the next pass picks it up. No session needs to be open.
- **The Claude Code session becomes one view onto the hub.** `/crew:team` in a session runs passes and shows the live feed from W0-c. It no longer relays through a long-lived Director.
- **Notifications:** `notify:` sends each new inbox entry to you (ntfy, Slack, mail; your choice, since it's a policy change).
- **The decision record:** record the new decision with `learn decision … --supersedes` the entry that holds the old one, and change `team/SKILL.md`'s "Each run" section to match.

**W2-d: ready for other projects.**
- `doctor` checks a project for:
  - the base branch;
  - the main checkout on that branch;
  - rendered agents and installed hooks;
  - the generated and shared globs set;
  - the policy preset.
- `init` writes sensible defaults for all of these.

## Verification

- **Wave 0:**
  - From two plan worktrees, run `new-item`, `move` and `new-plan`. `ls .crew/plans .crew/items` in the main checkout shows all of them.
  - `git status` in every worktree shows no `.crew/` changes.
  - `git log` on main shows `hub(...)` commits.
  - Existing vitest suites pass (`npm test` in `packages/crew`), plus new tests for the store root, the auto-commit and gather.
- **Wave 1:** in a scratch repo (the test helper's temp repos), set up two plans that edit the same `cli.ts` and both rebuild bundles.
  - `staff` proposes both.
  - Developers finish both.
  - `land` merges the first, then rebases and merges the second.
  - A forced real conflict sends the second plan back to in-progress.
- **W0-c:** start a developer subagent on a test plan.
  - While it runs, `watch` and `status` show its tool calls within seconds, and `ui` updates without a reload.
  - After it stops, `ledger --ref P-###` holds its report.
  - Activity events contain no command arguments.
  - An idle run shows as idle after `idle_minutes`.
- **W2-e:**
  - With an escalation open and no session running, `answer … --approved-by` from a terminal unblocks the next runner pass.
  - An agent that tries the same command, or a request to the UI answer endpoint, is refused by the guard.
- **W2-a unit tests:** one fixture per row of the dispatch table. Each fixture puts a plan or item in that state and checks that `dispatch --json` names the expected role. `max_agents` caps the list. Stuck work goes to the Director.
- **Wave 2, end to end** (G-003 criterion 1, FEAT-013): a sample project with two approved goals and five items, started with `run --until-done`, and no human input. The ledger shows the Director acting only on exceptions.
  - The items get triaged and specced.
  - Two developers work at the same time.
  - Everything merges to main.
  - The focus moves to goal 2.
  - The runner stops with "all approved goals done".
  - The ledger shows no human-only step taken by an agent.

## Order and parallelism

- **First**, P-023 is released.
- **Wave 0:** W0-a and W0-b run next and alone, here. W0-c is the first plan the team builds after that, with nothing running beside it. Its hub changes reach this repo's agents only once `.crew/bin` is refreshed (P-024 / FEAT-027, your call as a policy change).
- **Wave 1:** W1-a, W1-b, W1-d and W1-e can run in parallel. W1-c needs W1-a and W1-b.
- **Wave 2:** W2-e needs W0-c (the feed) and W2-a (`dispatch`). W2-a, W2-b and W2-d can run in parallel with each other and with Wave 1 once Wave 0 has landed. W2-c (the runner) loops over W2-a's `dispatch`, so it waits for W2-a. W2-a and W2-b both touch `crew-director.md`; give that file to W2-a and have W2-b depend on it for that one file, or let the merge queue resolve it.
