---
id: P-007
title: Tracker v2: TypeScript core, CLI and interactive UI
goal: 
items: 
touches:
depends_on:
status: done
branch:
pr: https://github.com/aanand-3/claude-plugins/pull/3
created: 2026-10-18
started:
completed: 2026-10-21
---

# P-007: Tracker v2: TypeScript core, CLI and interactive UI

## Context
The project-kit tracker stores everything as markdown in `.project/` and drives it with a ~2,000-line Python stdlib script (`skills/tracker/scripts/trackerlib/`). The markdown works well for git and for Claude. What's missing for people is a way to *see* the project: you open each epic or plan file one by one, and the relationships between documents (milestone → epic → item → plan, `depends_on`, sprint commitments, IDs mentioned in prose) are never visible.

The plugin is new, so we're redesigning it as if from scratch rather than bolting a UI onto the Python script. Agreed decisions:
- **Markdown in `.project/` stays the source of truth.** It stays git-native, reviewable and Claude-editable, and **existing `.project/` folders keep working unchanged**: same files and frontmatter keys.
- **TypeScript end to end.** One shared core powers the CLI, the UI and a local server, so types and rules (gates, forecasts) are written once and the UI can show them live. Node ≥20 is required in projects that use the tracker, but no `npm install` happens in the user's project: we ship prebuilt bundles.
- **The UI works without a server** (a static HTML export with the data embedded). `tracker ui` adds a local server with live updates and actions that run through the same gates.
- **MCP adapter in a later phase**, as a thin layer over the same core.
- **Obsidian is an optional reader, not the UI.** It can't show typed relations, forecasts or gates, and edits made in it bypass the rules. A later phase makes the vault experience nice.

## Architecture
```
.project/**/*.md ─► core.load() ─► Project (typed, validated with zod)
                                   ├─ rules      gates (DoR, WIP, triage, exit criteria) → Violation[]
                                   ├─ graph      docs + typed edges + metrics (versioned JSON)
                                   ├─ forecast   velocity, milestone health, burndown series
                                   └─ commands   (project, args) → { writes: FileWrite[], messages }
        shells:  CLI (tracker.mjs) · server (tracker ui: HTTP + SSE) · static export · [later] MCP
```
**Functional core, imperative shell.** Commands are pure functions that return the file writes they want; each shell applies them. CLI, server and MCP stay thin and can never bypass a gate, and the core is unit-testable without touching the disk.

### Repo layout
```
packages/tracker/                 # source (NOT shipped), npm workspace
  src/core/  schema.ts parse.ts store.ts git.ts graph.ts rules.ts forecast.ts render-md.ts
  src/commands/  init new-doc new-milestone new-epic new-item triage new-plan sprint start move log next current check reports export
  src/cli.ts  src/server.ts
  ui/  (Vite + React 19 + TS)  src/views/{overview,tree,board,roadmap,graph,doc}.tsx  src/lib/  src/data.ts
  test/  (vitest)
plugins/project-kit/skills/tracker/
  dist/tracker.mjs                # esbuild single file, deps bundled, `#!/usr/bin/env node`
  dist/ui.html                    # vite + vite-plugin-singlefile: all JS/CSS inlined
  templates/ references/ SKILL.md # unchanged structure
```
Built `dist/` is committed. Both CI and a test check that it matches the source (`npm run build && git diff --exit-code`). `init` vendors `tracker.mjs`, `ui.html` and the templates into `.project/bin/`, so a cloned repo works without the plugin, as it does today.

### Libraries (all bundled at build time)
- **Core:** `zod` (schemas per kind), `yaml` (read frontmatter; writes keep the current flat `key: value` style so diffs stay small), `commander` (CLI).
- **UI:** `react`, `react-router` (hash routes, so it also works from `file://`), `@xyflow/react` + `elkjs` (dependency graph), `recharts` (burndown/velocity), `react-markdown` + `remark-gfm` + a small plugin that links tracker IDs. Styling is CSS variables for light/dark.
- **Server:** `node:http` with no framework, plus `fs.watch` on `.project/` and `.git/refs`.

### UI (one codebase, two modes)
`data.ts` reads the embedded `<script id="graph">` JSON (static mode) or calls `/api/graph` and subscribes to `/api/events` (served mode). Views register in one list (route, title, component), so adding a view means adding a file.
- **Overview:** active sprint goal and burndown, milestone health, blocked work, open S1/S2 bugs, top risks, and `next`.
- **Hierarchy:** collapsible Milestone → Epic → Item → Plan tree with points and progress. Unassigned items get their own bucket.
- **Board:** plan or item columns by status, with filters (milestone, epic, sprint, type, priority).
- **Roadmap:** milestone timeline (target vs projected, health color), burndown per sprint, velocity history.
- **Graph:** ELK-laid-out node graph of epics/items/plans and `depends_on`. Blocked chains are highlighted, and clicking a node opens the doc.
- **Doc:** frontmatter chips, rendered sections, task progress, a **live DoR/gate checklist** from `rules.ts`, and a **Relations panel** (parent, children, delivers, depends on/blocks, sprint, mentioned-in backlinks).
- **Served mode only:** move status, log, triage, add to sprint. Each one POSTs to `/api/commands/:name`, and gate violations show inline. Creating documents stays with Claude (draft → `--from`).

### CLI and server
- The command surface stays the same as today (`init, new-*, triage, sprint …, start, move, log, next, current, check, roadmap, status, release-notes`), invoked as `node .project/bin/tracker.mjs <cmd>`. New commands:
  - `export --json [FILE]`: the graph, with `schemaVersion`.
  - `export --html [FILE]`: `ui.html` with the graph embedded. The default target `.project/view/index.html` is gitignored.
  - `ui [--port 8765] [--no-open]`: the server.
- Server safety: bound to `127.0.0.1`; a random per-run token is injected into the served page and required on every POST; foreign `Origin`/`Host` headers are rejected; `--force` is never exposed. The page shows the current branch and the main-vs-plan-branch rule.

## Phases (one branch and one PR each)
1. **Core + CLI parity, Python removed.** Port `trackerlib` module by module into `src/core` and `src/commands`, keeping behavior. Retarget the existing pytest acceptance suite (`tests/project-kit/test_tracker.py`, 23 black-box tests driven through `conftest.py`) at `node dist/tracker.mjs`; it is the parity spec. Add vitest unit tests for parse, rules and forecast. Delete `scripts/tracker.py` and `trackerlib/`. Update every reference from `python3 .project/bin/tracker.py` to `node .project/bin/tracker.mjs`:
   - the githooks `pre-commit` and the PR template;
   - `guidelines/templates/{CLAUDE.project.md, settings.json}` (the Bash allow rule and the SessionStart hook);
   - `guidelines/tooling/ci/ci.yml` (add setup-node);
   - the `kickoff`, `git-setup` and `tracker` SKILL.md files;
   - the tracker templates `project-plan.md`, `raid.md` and `sprint.md`;
   - `README.md` and `test_plugin_contents.py`.
   
   Add a Node ≥20 check to `init` and `kickoff`. Bump to 0.7.0 (breaking runtime change).
2. **Graph + static UI.** `graph.ts` (edges: `in-milestone`, `in-epic`, `delivers`, `depends-on`, `committed-to`, `mentions`), `export`, the React app with all six views, and `ui.html` vendored by `init`. No per-document HTML is ever generated: the one shell `ui.html` renders any project's markdown at runtime. Export is on demand only, writes a single gitignored file, and is never committed.
3. **Local server.** `tracker ui`: SSE live updates, the command endpoint and the token. Add the served-mode actions to the UI.
4. **(Later, optional) Obsidian compatibility.** Make `.project/` open cleanly as an Obsidian vault without making the canonical files noisier. Candidates, to be decided in that phase: an `export --obsidian` mode, or link-typed frontmatter properties plus a shipped `.base` view file. Obsidian stays a reader; status changes still go through the tracker.
5. **(Later) MCP adapter.** Expose the core commands as typed MCP tools via the plugin's `.mcp.json`, and have SKILL.md prefer them.

Other skills' Python scripts (`check_structure.py`, `check_secrets.py`, design `wada.py`/`gallery.py`, `compose_rules.py`) are out of scope. Porting them can be a follow-up so the plugin ends up on a single runtime.

## Verification
- **Phase 1:** `npm test` (vitest) and `cd tests/project-kit && pytest -q` all green against `dist/tracker.mjs`. The vendored `.project/bin/tracker.mjs` runs in a temp repo with the plugin absent. Run it against an existing `.project/` created by the old Python version (fixture) and check `check`, `status` and `roadmap` agree. The dist freshness check passes.
- **Phase 2:** vitest for `graph.ts` (all edge types, derived item status, burndown series). `export --html` contains no `http(s)://` script or style sources and embeds the data. Manually open a seeded sample project's export in the built-in browser and click through every view in light/dark, at desktop and phone width.
- **Phase 3:** server tests: POST without the token → 403; a DoR-failing `move ready` → 400 with the gate message; a valid move rewrites the md file and pushes an SSE event. Manually, edit a plan file in an editor and watch the board update live.

## Progress log
- 2026-10-24: imported from plan mode (`~/.claude/plans/we-have-built-the-golden-marshmallow.md`); it predates the hub tracking plans, status done from git history

## Outcome
Shipped in `fbe6be8` (TypeScript single-file CLI, https://github.com/aanand-3/claude-plugins/pull/1), `ba7c9f0` (graph export, React UI and live server, https://github.com/aanand-3/claude-plugins/pull/3) and `9c6defc` (MCP server), 2026-10-21.

Learnings: none
