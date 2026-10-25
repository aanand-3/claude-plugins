---
id: BUG-002
type: bug
title: A subagent can run crew.mjs init and rewrite .crew/bin
status: new
severity:
priority:
goal: G-003
plan:
created: 2026-10-23
closed:
---

# BUG-002: A subagent can run crew.mjs init and rewrite .crew/bin

## Summary
The guard blocks direct writes to .crew/bin/** but init vendors the CLI and templates through the hub, which the guard can't see (found in T2). Low risk: it copies the plugin's own files. Fix: the guard denies crew.mjs init from subagents, as it does agents.

## Environment
Main checkout on main at b39b036, vendored hub `.crew/bin/crew.mjs`, plugin build `plugins/crew/skills/hub/dist/crew.mjs` (byte-identical today), macOS. Source:
- `packages/crew/src/hub/commands/team/guard.ts` `decide()`: of all the hub commands, it denies only `agents` without `--check`.
- `packages/crew/src/hub/commands/work/planning.ts` `init()`/`vendor()`.
- `setup.ts` `initDefaults()`.
- Default `paths.protected` in `packages/crew/src/hub/core/team/policy.ts`: `.crew/bin/**`, `.crew/templates/agents/**`, `.crew/policy.yaml`, among others.

## Steps to reproduce
1. Write a PreToolUse payload: `{"tool_name":"Bash","agent_type":"crew-pm","agent_id":"repro","cwd":"<main checkout>","tool_input":{"command":"node plugins/crew/skills/hub/dist/crew.mjs init"}}`.
2. Run `node .crew/bin/crew.mjs guard < payload.json` from the main checkout.
3. Repeat with `node .crew/bin/crew.mjs init` (pm), and with a plugin-cache path such as `node ~/.claude/plugins/cache/…/crew/skills/hub/dist/crew.mjs init` (developer).
4. For comparison, run `node .crew/bin/crew.mjs agents` and `cp plugins/crew/skills/hub/dist/crew.mjs .crew/bin/crew.mjs`.

## Expected
The guard denies `crew.mjs init` from any subagent, the same way it denies `crew.mjs agents`. Init writes the guard's own files (`paths.protected`), so only the human runs it.

## Actual
The guard lets `init` through on every path. It only injects identity:
- step 1: `{"updatedInput":{"command":"node plugins/crew/skills/hub/dist/crew.mjs --as pm --run-id pm:repro init"}}`
- step 3: the same rewrite for `.crew/bin/crew.mjs init` and the plugin-cache path

The step-4 controls are denied: `` `crew.mjs agents` rewrites the agent definitions, which only the human renders (paths.protected) `` and `the command writes to .crew/bin/crew.mjs, which the crew policy protects (paths.protected)`.

What `init` then writes depends on which copy runs. These effects are read from the code; init was not run:
- From any copy other than `.crew/bin`, `vendor()` overwrites `.crew/bin/crew.mjs`, `ui.html` and the studio file with that copy's own build. It also overwrites `.crew/templates/*` and `.crew/templates/agents/**`, which are protected and are the source `crew.mjs agents` renders the agent definitions from.
- From the vendored `.crew/bin/crew.mjs`, `vendor()` returns early (`SCRIPT_DIR === .crew/bin`). That run writes only missing `.gitkeep` files, a missing `.crew/README.md`, the CLAUDE.md hub-state section if it is absent, and `config.yaml`/`policy.yaml` only if missing.

## Evidence
Reproduced on 2026-10-26 by piping each payload into `node .crew/bin/crew.mjs guard` from the main checkout. Steps 1 and 3 printed an `updatedInput` rewrite, with no deny. Step 4 printed `permissionDecision: deny`. The early return for the vendored copy is at `planning.ts` `vendor()`: `if (resolve(SCRIPT_DIR) === resolve(bin)) return;`.

## Impact
The bug still reproduces, but only partly as the title says. Running the vendored copy, the usual `node .crew/bin/crew.mjs init`, does not rewrite `.crew/bin`. The real route is a subagent running init from another hub copy: the repo's `plugins/crew/skills/hub/dist/` build, or the installed plugin cache. That run swaps the CLI the guard itself runs from, and the protected agent templates, for whatever that copy holds, all without a human gate. Today the dist build equals the vendored one, so the effect would be a no-op. A stale or newer plugin build, or a dev build in a plan worktree, would change the guard, so the risk is low but real. Init also skips `policy.yaml` and `config.yaml` when they already exist, so it can't loosen an existing policy.

## Notes
- Fix as the Summary says: in `decide()`, deny `hubCommand(c) === "init"` for subagents, next to the `agents` check. It is a few lines with a guard test, and it fits the planned guard plan (BUG-033/BUG-021/BUG-011/BUG-013), because it touches the same `decide()` block in `guard.ts`.
- Release's `refresh_bin` (policy `release.refresh_bin`) is the sanctioned route for updating `.crew/bin` and is out of scope here.
