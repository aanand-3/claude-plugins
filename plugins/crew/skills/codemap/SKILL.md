---
name: codemap
description: Set up graphify for a project — check or install the graphify CLI, wire its post-commit rebuild hook and CLAUDE.md section into the project, gitignore graphify-out/, and build the code knowledge graph so Claude navigates the codebase from the graph instead of reading files broadly. Use when the user wants a code graph / codebase map, wants to save tokens on a large repo, enables the graphify module at kickoff or onboard, or wants to remove it.
argument-hint: "[enable | build | remove]"
---

# Code graph (graphify)

[graphify](https://pypi.org/project/graphifyy/) turns the repo into a knowledge graph (`graphify-out/graph.json`, `GRAPH_REPORT.md`) that Claude queries before reading files. It is an external tool, not part of this plugin: this skill installs it only with the user's yes and wires it into the project as the `graphify` module (`modules.graphify` in `.crew/config.yaml`).

## enable (default)
1. **CLI.** Run `graphify --version`. If it's missing, ask once, showing the command, before installing anything:
   - `uv tool install graphifyy` (preferred; the PyPI name has two y's), or `pipx install graphifyy` when uv isn't available;
   - then `graphify install` so the `/graphify` Claude skill is available.
   If the user declines, stop: set nothing and say how to enable it later (`/crew:codemap`).
2. **Hooks.** Needs git set up first (`core.hooksPath` = `.githooks`; run the `git-setup` skill if it isn't). Then `graphify hook install`.
   - It appends to `.githooks/post-commit` and adds `post-checkout`, `post-merge` and `post-rewrite`. These rebuild the graph from changed code files (AST only, no LLM).
   - The hook pins this machine's Python path but falls back to `PATH`. On a machine without graphify, commits still succeed and the hook prints a one-line notice.
3. **Ignore the output.** `graphify-out/` goes in `.gitignore` (git-setup adds it when `modules.graphify: true`; add the line yourself if git-setup already ran). The graph is local and rebuilt per machine.
4. **CLAUDE.md.** Run `graphify claude install`. It adds a `## graphify` section telling Claude to query the graph first. Keep the project CLAUDE.md's *Code map* line (from the guidelines template) and don't duplicate the section's content.
5. **Config.** Set `modules.graphify: true` in `.crew/config.yaml`.
6. **Build** if there's code to map (see *build*). In a project with no code yet, skip the build and say the graph is built once the first code lands (it's part of P-001's scope).

## build
- `/graphify .` builds the full graph (it uses the graphify skill, and it's the only step that uses an LLM). Later builds use `/graphify . --update`, or the hook does it on commit.
- Summarise `graphify-out/GRAPH_REPORT.md` for the user: god nodes, communities, surprising links. When adopting a project, these feed `docs/architecture.md` and `structure:`.
- Before broad codebase questions, prefer `/graphify query "<question>"`, `path "A" "B"` and `explain "X"` over reading many files.

## remove
`graphify hook uninstall`, `graphify claude uninstall`, then set `modules.graphify: false`. Leave the `graphify-out/` ignore line; it's harmless. Uninstalling the CLI itself is the user's call (`uv tool uninstall graphifyy`).

## Rules
- Never install without an explicit yes.
- Never commit `graphify-out/`.
- Don't run `graphify hook install` before `.githooks` is active, or the hooks land in `.git/hooks` and aren't versioned.
