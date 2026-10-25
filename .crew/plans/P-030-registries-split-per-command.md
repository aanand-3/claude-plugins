---
id: P-030
title: Registries split per command
goal: G-007
items: FEAT-039
touches: packages/crew/src/hub/cli.ts, packages/crew/src/hub/mcp.ts, packages/crew/src/hub/registry.ts, packages/crew/src/hub/reference.ts, packages/crew/src/hub/commands/index.ts, packages/crew/src/hub/commands/*/*.reg.ts, packages/crew/build.mjs, .gitattributes, plugins/crew/skills/hub/SKILL.md, packages/crew/test/hub/registry.test.ts, packages/crew/test/hub/registry-before.json, packages/crew/test/dist.test.ts
depends_on:
status: ready
branch: plan/P-030-registries-split-per-command
pr:
created: 2026-10-25
started:
completed:
---

# P-030: Registries split per command

## Context
W1-e of G-007 (design: `.crew/drafts/the-crew-team-was-pure-reef.md`, "W1-e: split the registries"). Every hub command is declared three times in shared files: its CLI spec and help line in `cli.ts` (`COMMANDS`, `USAGE`), its MCP tool in `mcp.ts` (`TOOLS`), and its row in `plugins/crew/skills/hub/SKILL.md`'s command table. So every plan that adds or changes a command touches the same three files, and `staff` makes those plans wait for each other (P-021, P-024, P-025 and P-027 all list `cli.ts`). After this plan, a command's CLI spec, help lines and MCP tool live in one registration file beside its command module. `cli.ts` and `mcp.ts` only load them, and the command reference is generated.

Two design choices, recorded as decisions with this plan:
- **Registration files beside the modules (`<module>.reg.ts`), not inside them.** The command modules stay untouched, so this plan runs beside P-028, P-029, P-037 and P-038, which edit those modules. It also keeps workflow.ts (278 lines) under the 300-line rule.
- **The generated reference is a whole file**, `plugins/crew/skills/hub/references/commands.md`, marked `linguist-generated`, and SKILL.md points to it. P-023's rule is that generated paths are whole files that no plan lists and Release rebuilds. A generated table inside the hand-written SKILL.md would break it: every command-adding plan would have to regenerate and commit part of SKILL.md.

## Scope
**In:**
- `src/hub/registry.ts`: the types (`CliSpec`, the CLI option spec as today's `Spec`; `ToolSpec`, as today's `Tool`; `Registration = { usage?: string[]; cli?: Record<string, CliSpec>; tools?: Record<string, ToolSpec> }`) and the helpers both sides use now (`str`, `DRAFTED` from cli.ts; `text`, `obj`, `s`, `up`, `num`, `n`, `ITEM_FIELDS` from mcp.ts).
- One `commands/<area>/<module>.reg.ts` per command module that has a CLI command or MCP tool, exporting its `Registration`: the CLI specs, the `USAGE` lines and the MCP tools moved verbatim from cli.ts and mcp.ts. `ui` (server.ts) registers from `commands/views/ui.reg.ts`.
- `src/hub/commands/index.ts`: the list of registrations in help order (one import per file). It is in P-029's `hub.shared`.
- `cli.ts` keeps `parse`, `identity`, `main`, the USAGE header and the `--as`/`--run-id` line. It builds `COMMANDS` and the help text from the index, failing at load on a duplicate command name. `mcp.ts` keeps the JSON-RPC server, `callTool` and `handle`, and builds `TOOLS` from the index. Both keep their exports (`USAGE`, `parse`, `main`, `TOOLS`, `callTool`, `handle`, `serveStdio`).
- `src/hub/reference.ts`: `commandReference()` renders the reference markdown from the index: per registration its usage lines, each CLI command, and the MCP tool name it maps to.
- `build.mjs`: `bundleReference()` bundles `reference.ts` to a temp file, imports it and writes `plugins/crew/skills/hub/references/commands.md`; `node build.mjs` runs it. `.gitattributes` marks the file `linguist-generated`. `dist.test.ts` gets the freshness case.
- SKILL.md: the command table and the hard-coded tool list in "Tools first" are replaced by a pointer to `references/commands.md`. The rest of SKILL.md is unchanged.

**Out (explicitly not doing):**
- Any change to a command's behaviour, options, help text or tool schema (a pure move).
- Changing the command modules themselves (`commands/*/*.ts` other than the new `*.reg.ts`), or server.ts.
- Generating `references/model.md` or README.md.
- P-027's `activity`/`watch` and P-024's `refresh-bin` beyond moving whatever is on the base branch when this plan updates to it.

## Acceptance criteria
- [ ] AC1 · `cli.ts` and `mcp.ts` declare no command: `grep -nE '^\s+"?[a-z-]+"?: \{ (pos|description):' packages/crew/src/hub/cli.ts packages/crew/src/hub/mcp.ts` finds nothing. Every CLI command and MCP tool is declared in exactly one `commands/*/*.reg.ts`, and `commands/index.ts` lists every `.reg.ts` file (the test globs the directory and compares).
- [ ] AC2 · The CLI is unchanged: the inventory of command names with their `pos`, `rest`, `str`, `int`, `flag`, `required` and `choices` equals `test/hub/registry-before.json`, which T1 captures from today's `COMMANDS` before the move. Every help line of today's `USAGE` appears in the new help text.
- [ ] AC3 · The MCP server is unchanged: `tools/list` returns the same tool names, descriptions and input schemas as `registry-before.json` records (order aside).
- [ ] AC4 · A test registers a fake extra registration through the index's loader and finds it in `parse`, the help text and `tools/list` without any other file changing. A duplicate command name fails at load, naming the two files.
- [ ] AC5 · `npm run build` writes `plugins/crew/skills/hub/references/commands.md`, listing every CLI command and MCP tool. `.gitattributes` marks it `linguist-generated`. The `dist.test.ts` freshness case fails when it is stale and passes after a build. SKILL.md links to it and no longer carries the command table.
- [ ] AC6 · The existing CLI and MCP tests pass unchanged: `test/mcp.test.ts`, `test/dist.test.ts` (after a build), and the e2e suites `basics`, `items`, `execution` and `team`.
- [ ] AC7 · `npm run typecheck` passes, and cli.ts, mcp.ts, registry.ts, reference.ts and each `.reg.ts` stay under 300 lines.

## Approach
- **T1 first: the snapshot.** Before moving anything, write `test/hub/registry.test.ts` with a helper that dumps `{cli: {name: {pos, rest, str, int, flag, required, choices}}, usage: string[], tools: {name: {description, input}}}` from cli.ts/mcp.ts's exports (add a `export const COMMANDS` if it isn't exported; it is exported after the move anyway), and commit the dump as `registry-before.json`. AC2 and AC3 compare against it.
- **Moving.** Per module, cut its entries from `COMMANDS`, its `USAGE` lines and its `TOOLS` entries into `<module>.reg.ts`, importing the command functions from the module. Commands whose CLI entry dispatches to several modules (`checkpoint` → execution or runs; `resume` → execution, runs or liveness; `migrate` → migrate or gather; `pause`/`resume --team`) are registered once, in the module that owns the default path (execution.reg.ts for checkpoint/resume, migrate.reg.ts for migrate, liveness.reg.ts for pause), importing the other function.
- **Help text order.** The index lists registrations in today's help order, so the help text reads the same. Lines that combine several commands (`start PLAN_ID · move ID STATUS [--note] · log ID TEXT`) stay one usage line, in the registration of their first command.
- **reference.ts** imports only the index and registry.ts (no Store), so `build.mjs` can bundle and import it without a repository.
- **Adding a command afterwards:** a new command in an existing module edits that module and its `.reg.ts`; a new module adds its `.reg.ts` and one line in `commands/index.ts` (shared). This goes in the header comment of `commands/index.ts`.
- **Reuse:** today's `parse`, `identity`, `callTool`, `handle` unchanged; `bundleNode` in build.mjs.

## Tasks
- [ ] T1: `test/hub/registry.test.ts` and `registry-before.json` from today's code → verify: `cd packages/crew && npx vitest run test/hub/registry.test.ts` passes on today's code (AC2, AC3 baselines)
- [ ] T2: registry.ts with the shared types and helpers; cli.ts and mcp.ts use them (still holding the tables) → verify: `npm run typecheck`; `npx vitest run test/mcp.test.ts test/hub/registry.test.ts`
- [ ] T3: the `.reg.ts` files and `commands/index.ts`; cli.ts and mcp.ts build `COMMANDS`, the help text and `TOOLS` from the index; the duplicate-name check → verify: `npx vitest run test/hub/registry.test.ts` (AC1, AC2, AC3, AC4) and `npx vitest run test/mcp.test.ts`
- [ ] T4: reference.ts, `bundleReference` in build.mjs, the `.gitattributes` line, the dist freshness case → verify: `npm run build && npx vitest run test/dist.test.ts`; `git check-attr linguist-generated -- plugins/crew/skills/hub/references/commands.md` says `true` (AC5)
- [ ] T5: SKILL.md points to the reference → verify: `grep -n "references/commands.md" plugins/crew/skills/hub/SKILL.md`; `grep -c "^| \`new-idea" plugins/crew/skills/hub/SKILL.md` prints 0; `npx vitest run test/plugin` (AC5)
- [ ] T6: the unchanged suites, types and sizes → verify: `npx vitest run test/mcp.test.ts test/hub/e2e/basics.test.ts test/hub/e2e/items.test.ts test/hub/e2e/execution.test.ts test/hub/e2e/team.test.ts` after `npm run build`; `npm run typecheck`; `wc -l src/hub/cli.ts src/hub/mcp.ts src/hub/registry.ts src/hub/reference.ts src/hub/commands/*/*.reg.ts` each under 300 (AC6, AC7)

## Test plan
**Targeted checks** (from `packages/crew/`; e2e and dist checks after `npm run build`):
- AC1, AC2, AC3, AC4 → `npx vitest run test/hub/registry.test.ts`; AC1's grep.
- AC5 → `npx vitest run test/dist.test.ts`; T4's `git check-attr`; T5's greps.
- AC6 → `npx vitest run test/mcp.test.ts test/hub/e2e/basics.test.ts test/hub/e2e/items.test.ts test/hub/e2e/execution.test.ts test/hub/e2e/team.test.ts`.
- AC7 → `npm run typecheck`; T6's `wc -l`.

## Rollout & rollback
- Start after P-027 has merged, and bring the branch up to the base first (`git merge --ff-only main` in the worktree, K-2026-10-25-a-plan-worktree-cut-before-its-depends): the move must include P-027's new commands. Any plan that added a command to cli.ts or mcp.ts after this branch updated (P-024 if it lands first) is moved in when this plan updates to the base before release.
- Plans specced against the old layout (P-024's cli.ts entry) register in `commands/work/release.reg.ts` instead if this plan lands first. P-024's touches name both.
- Rollback: revert the plan's commit (a pure move; no data changes).

## Risks & open questions
- A big mechanical move: the snapshot (T1) makes any dropped option or changed schema a test failure rather than a review finding.
- Merge conflicts with any plan that adds a command at the same time: such plans touch cli.ts or mcp.ts, which overlap this plan's touches until P-029's `hub.shared` lands, so staffing sequences them; after that, the second to land resolves it.
- Shares no file with P-028, P-029, P-037 or P-038 (the command modules stay untouched), so it runs beside them. Overlaps P-027 (cli.ts, SKILL.md: P-027 runs first) and P-024 (cli.ts: staffing sequences them).

## Handoff

## Progress log

- 2026-10-25: status draft → ready

## Outcome
