---
id: P-024
title: Release refreshes the vendored hub in .crew/bin
goal: G-007
items: FEAT-027
touches: packages/crew/src/hub/core/team/policy.ts, packages/crew/src/hub/commands/work/release.ts, packages/crew/src/hub/cli.ts, packages/crew/src/hub/commands/work/release.reg.ts, packages/crew/src/hub/commands/index.ts, packages/crew/test/hub/refresh-bin.test.ts, plugins/crew/skills/hub/agents/release.md, plugins/crew/skills/hub/references/model.md, packages/crew/src/hub/commands/team/policy.ts, .crew/config.yaml
depends_on: P-023
status: done
branch: plan/P-024-release-refreshes-the-vendored-hub
pr:
created: 2026-10-24
started: 2026-10-25
completed: 2026-10-25
assignee: developer
---

# P-024: Release refreshes the vendored hub in .crew/bin

## Context
Delivers FEAT-027 under G-001 (shared context: the hub). This repo runs its hub from the vendored `.crew/bin/crew.mjs` (and reads `.crew/bin/ui.html` beside it for `export`/`ui`), but `.crew/bin/**` is protected, so after every merge a human must copy `plugins/crew/skills/hub/dist/crew.mjs` over it. Until they do, every agent's `context`, `check`, `run --check` and guard run stale code: Release ships hub fixes that this repo then doesn't run (new IDs still get `-s-` slugs after P-022; P-023's drift rule and escalation holds stay off until a refresh, as P-023's Rollout says). The executive approved the policy.change for this item only (ledger, FEAT-027, 2026-10-24 18:19).

Follows P-023 (bundles built once at release, in the plan's one commit): the refresh is one more step of that same release flow.

## Scope
**In:**
- A new hub command, `crew.mjs refresh-bin [--check]`, that copies the vendored hub files named in the project policy from the rebuilt bundle into `.crew/bin/` of the checkout it runs in. It is the only sanctioned way an agent changes `.crew/bin/**`. The guard is unchanged: `.crew/bin/**` stays in `paths.protected`, and every direct Bash/Edit write to it is still denied for every subagent, Release included. Hub commands already write protected files the same way (`init` vendors `.crew/bin/` through `store.ws`).
- A new global policy key, `release.refresh_bin: {from, files}`, that the executive sets in `.crew/policy.yaml`. Built-in default: absent, so the command refuses. It cannot be set per role or per team, and no preset sets it.
- Release's step from P-023's flow: restore the generated files, update to the base, run `hub.build`, **run `refresh-bin` in the plan's worktree**, make the plan's one commit, then run `hub.full_suite`. The refreshed `.crew/bin/` copy ships in the plan's commit and lands on main with the squash-merge.
- A freshness check: `refresh-bin --check`. `hub.full_suite` runs it last, so Release (after the commit) and CI fail when a listed `.crew/bin/` file differs from the rebuilt bundle.
- Docs: release.md (the step) and references/model.md (the policy key).

**Which vendored copies (the PM's list, checked against the code):**
- `.crew/bin/crew.mjs`: yes. This is what the approval covers.
- `.crew/bin/ui.html`: yes, functionally. `export` and `ui` read it from beside the running crew.mjs (`UI_FILE`, export.ts), and it is committed in `.crew/bin/` today. A refreshed crew.mjs next to a stale ui.html fills an old shell with new data. **Including it goes beyond the approval's literal wording** ("refresh .crew/bin/crew.mjs"). The executive confirms by listing it in `files:`. The code takes whatever list the policy holds, so leaving ui.html out needs no code change; a human then keeps copying it by hand.
- `dist/mcp.mjs`: not vendored, confirmed. `plugins/crew/.mcp.json` runs `${CLAUDE_PLUGIN_ROOT}/skills/hub/dist/mcp.mjs`, and `.crew/bin/` has no copy.
- `dist/studio.html`: not in `.crew/bin/` today (`git ls-files .crew/bin` lists crew.mjs, track_plan_draft.mjs and ui.html). `init` would vendor it on a fresh install, so `ui --design` from this repo's vendored copy has no studio. Adding it would create a new protected file, which is beyond the approval. Out of scope. The command only refreshes files that already exist in `.crew/bin/` and never adds one.
- `.crew/bin/track_plan_draft.mjs`: a vendored skill script, out of scope (and its source is not in `from`).

**Out (explicitly not doing):**
- Any change to the guard (guard.ts), to `paths.protected`, or to how protected paths are matched. The guard keeps one protected-path check.
- Letting Release write any other protected path (`.crew/policy.yaml`, `.claude/agents/**`, `.crew/templates/agents/**`, settings), or letting any other role run the refresh.
- Exposing `refresh-bin` as an MCP tool (mcp.ts lists its tools explicitly; it is not touched).
- Re-rendering agents at release: still the human's.
- studio.html, track_plan_draft.mjs and the other vendored skill scripts: separate items if wanted.
- Running the refresh from the main checkout or the base branch. It writes only inside a plan's worktree, so the change always rides in the plan's one commit.
- Any change to P-020..P-023 or to Q-d4e060 / Q-67af6f.

## Acceptance criteria
- [ ] AC1 · In a plan's worktree whose policy sets `release.refresh_bin`, running `crew.mjs refresh-bin` as release makes each listed `.crew/bin/<f>` byte-identical to `<from>/<f>` (Buffer-equal; `cmp` is silent), keeps the target's file mode, and prints one line per file it changed. Files not listed, and listed files that do not already exist in `.crew/bin/`, are never written.
- [ ] AC2 · The refresh exits 1 and writes nothing when: it runs as any other role (message names the release role); the policy has no `release.refresh_bin` (message names the key); the checkout is not a plan's worktree; `from` is absolute, escapes the checkout or lies under `.crew/`; or a file name is not a bare name (contains `/` or starts with `.`). A Release subagent's direct `cp plugins/crew/skills/hub/dist/crew.mjs .crew/bin/crew.mjs` (Bash) or Edit of `.crew/bin/crew.mjs` is still denied by the guard, naming `paths.protected`. `release:` under `roles.<r>` or `teams.<t>` is reported by `policy check` as global-only.
- [ ] AC3 · `refresh-bin --check` exits 1 naming each listed file whose `.crew/bin/` copy differs from `from`, and exits 0 once they match. With no `release.refresh_bin` it exits 0 and says there is nothing to check. `hub.full_suite` in `.crew/config.yaml` ends with it.
- [ ] AC4 · release.md puts the refresh after `hub.build` and before the plan's one commit (with `hub.full_suite` after the commit), says to run it in the plan's worktree, and says a project without `release.refresh_bin` skips it.
- [ ] AC5 · `policy show` prints the effective `release.refresh_bin`, and references/model.md documents the key (global only, Release only, refreshes existing `.crew/bin/` files from `from`).

## Approach
- **Policy key (policy.ts).** Add `release: { refresh_bin: { from: "str", files: "list" } }` to `GLOBAL` only (not `SCOPED`): `validate` then reports it under `roles.*`/`teams.*` as "can only be set globally". It merges as a plain override, not a `UNION`. `Effective` gains `release: { refresh_bin: { from: string | null; files: string[] } }`, filled from `release.refresh_bin.from` / `.files` (defaults `null` / `[]`). No built-in or preset value. policy.ts is 295 lines and must stay under 300 (K-2026-10-23-every-module-stays-under-300-lines): the shape, the interface field and the value are one line each. Semantic checks live in the command, not policy.ts.
- **Command (release.ts, beside `merge-order`).** `refreshBin(store, root, check)`, exported, where `root` is the checkout to refresh (the CLI passes `store.ws.root`; P-032's `land` passes a plan's worktree):
  - Read `store.policy.policy.release.refresh_bin`. With no `from` or an empty `files`: `--check` prints "nothing to check (no release.refresh_bin in the policy)" and returns 0; the refresh fails naming the key.
  - Validate `from`: relative, normalised, inside `store.ws.root`, not under `.crew/`. Validate each file as a bare name (`/^[\w][\w.-]*$/`). Any problem fails before anything is written.
  - For each file: source `join(root, from, f)`; target `join(root, ".crew", "bin", f)`. Never `store.dir`: since P-026 that is the main checkout's `.crew/`, and the refresh must land in the plan's worktree so it rides in the plan's commit. Skip (with a note) a file missing from either side. The refresh never creates a file in `.crew/bin/`.
  - `--check`: compare bytes and list the differing files; exit 1 if any differ. Read-only, any role, any checkout (CI and `hub.full_suite`).
  - Refresh: fail unless `store.ledger.who.role === "release"` ("only the release role refreshes .crew/bin; this run is the <role> role" / "no role"). Fail unless `root`'s current branch (`git -C <root> branch --show-current`) is the `branch:` of an open plan (the checkout is a plan's worktree). Then `copyFileSync` each differing file (an existing target keeps its mode) and print `refreshed .crew/bin/<f> from <from>/<f>`, or `up to date` when nothing differed.
  - The whole command stays under 300 lines with `merge-order`. If it would not, it goes in a new `commands/work/vendor.ts`, which is then added to touches by the Architect before review.
- **CLI (cli.ts, or `commands/work/release.reg.ts` plus its line in `commands/index.ts` if P-030 has landed first).** One table entry, `"refresh-bin": { pos: [], flag: ["check"], … }`, and one help line next to `merge-order`: `refresh-bin [--check]   copy the policy's release.refresh_bin files into .crew/bin (Release, in a plan worktree)`.
- **Why a hub command and not a guard exception.** The guard's protected-path rule stays a single check with no role or command pattern to parse. The narrowing (role, files, source) is enforced in one function and tested directly. The guard already refuses `--as` for another role and `CREW_*` variables, so an agent cannot claim the release role.
- **Which binary runs it.** Release runs `node .crew/bin/crew.mjs refresh-bin` from the plan's worktree after updating it to the base. That is the base branch's vendored hub, already reviewed and merged, reading the base's `.crew/policy.yaml`. It is never the plan's freshly built bundle. Since P-026 the Store's hub paths (`store.dir`, the policy) are the main checkout's, which is on the base branch, so the policy read is the base's; the files written are under `root` (the worktree), never `store.dir`.
- **Freshness check in the full suite.** `hub.full_suite` becomes `… && git diff --exit-code -- plugins/crew/skills && node plugins/crew/skills/hub/dist/crew.mjs refresh-bin --check`. It runs the just-built bundle, not `.crew/bin/crew.mjs`, so that P-024's own release (whose vendored copy has no `refresh-bin` yet) passes; there the check is vacuous because the key is not set. Once the executive has bootstrapped (Rollout), it is a real check on every release and on CI.
- **release.md.** P-023 rewrites step 3 as restore → update to base → `hub.build` → one commit → `hub.full_suite`. P-024 inserts, after `hub.build`: "when the policy sets `release.refresh_bin` (`crew.mjs policy show`), run `node .crew/bin/crew.mjs refresh-bin` in the plan's worktree, so the refreshed `.crew/bin/` copy goes in the plan's one commit; never copy into `.crew/bin/` yourself (the guard refuses it)". It also says that a failing `refresh-bin --check` in the full suite means the refresh was skipped.
- **Ordering.** depends_on P-023: both rewrite release.md step 3 and the `hub` block of `.crew/config.yaml`, and the refresh step only makes sense after P-023's `hub.build`. P-020 is done (merged in 78a3edf), so P-024 has no dependency on it, directly or through P-023. P-021 (ready, G-003) overlaps on `cli.ts`, `plugins/crew/skills/hub/**` and `.crew/config.yaml`, with no depends_on: staffing makes whichever starts second wait, and whichever lands second takes the other's text when it updates to the base. cli.ts is 276 lines; together the two plans' entries stay under 300.

## Tasks
- [x] T1: policy.ts gains the global-only `release.refresh_bin` shape and `Effective.release` → verify: `cd packages/crew && npx vitest run test/hub/refresh-bin.test.ts -t policy` (AC2's `roles.release` error, AC5's `policy show` output) and `npx vitest run test/hub/e2e/policy.test.ts` unchanged
- [x] T2: `refresh-bin [--check]` in release.ts plus the cli.ts entry and help line → verify: `npx vitest run test/hub/refresh-bin.test.ts` (AC1, AC2, AC3) after `npm run build`; `wc -l src/hub/core/team/policy.ts src/hub/commands/work/release.ts src/hub/cli.ts` each under 300
- [x] T3: `test/hub/refresh-bin.test.ts` drives the built `dist/crew.mjs` in a throwaway repo (reuse `test/helpers/repo.js`, `test/hub/e2e/helpers.ts`, `sections.ts`: `agent`, `bash`, `hook`). It sets up a plan worktree with `.crew/bin/{crew.mjs,ui.html}` (no studio.html) and a fake `from` dir holding changed `crew.mjs`, `ui.html`, `studio.html`. Cases: release refresh with `files: [crew.mjs, ui.html]` → both Buffer-equal and studio.html not created (AC1); `--as developer` → exit 1 naming release, no change; no key → exit 1 naming `release.refresh_bin`; run from the base checkout → exit 1; `from: /abs`, `from: ../x`, `from: .crew/bin`, `files: [../policy.yaml]` → exit 1, nothing written; guard `hook` for `crew-release` on `cp …/crew.mjs .crew/bin/crew.mjs` and on Edit `.crew/bin/crew.mjs` → deny naming `paths.protected` (AC2); `--check` → exit 1 naming the stale file before the refresh, exit 0 after; exit 0 with no key (AC3) → verify: the file fails against the current bundle (`unknown command 'refresh-bin'`) and passes after `npm run build`
- [x] T4: `.crew/config.yaml` `hub.full_suite` ends with `&& node plugins/crew/skills/hub/dist/crew.mjs refresh-bin --check`; release.md gets the step; references/model.md gets a `release.refresh_bin` row in the policy table → verify: `grep -n "refresh-bin" .crew/config.yaml plugins/crew/skills/hub/agents/release.md` finds each and the release.md line sits between the `hub.build` line and the "one commit" line (AC3, AC4); `grep -n "refresh_bin" plugins/crew/skills/hub/references/model.md` (AC5); `npx vitest run test/plugin` passes (agent templates)

## Test plan
**Targeted checks** (from `packages/crew/`, after `npm run build`):
- AC1, AC2, AC3 → `npx vitest run test/hub/refresh-bin.test.ts`; `npx vitest run test/hub/e2e/guard.test.ts` and `test/hub/e2e/policy.test.ts` still pass unchanged (the guard and existing keys didn't move).
- AC3 (wiring) → `grep -n "refresh-bin --check" .crew/config.yaml`.
- AC4 → T4's grep and line order in release.md; `npx vitest run test/plugin`.
- AC5 → the `policy` case in `refresh-bin.test.ts` (text `policy show` rows `release.refresh_bin.from` / `.files`, and `--json`); T4's grep in model.md.
- Module size → `wc -l` from T2.

## Rollout & rollback
- **Bootstrap (one time).** The code that honours `release.refresh_bin` ships in P-024's own bundle, but `.crew/bin/crew.mjs` is the old hub until someone copies it. So the first refresh is a manual copy by the executive, in this order:
  1. P-023 merges as specced.
  2. Release releases P-024 under P-023's flow with no refresh step. The vendored hub has no `refresh-bin`, and the rendered Release agent still has the old text. Its full suite's `refresh-bin --check` runs from the rebuilt dist and passes vacuously (no key yet). The Director passes this to Release with the merge.
  3. The executive, on main, after P-024's merge, in one commit: first `cp plugins/crew/skills/hub/dist/crew.mjs .crew/bin/crew.mjs` and `cp plugins/crew/skills/hub/dist/ui.html .crew/bin/ui.html` (the second only if ui.html is approved), **then** the policy.yaml edit below.

     The copy must come first. The old vendored policy.ts does not know `release:`, reports "release: unknown key", and with an invalid policy `move` refuses everything (workflow.ts: "nothing moves until it is fixed"). Applying the edit before the copy, or before P-024 merges, halts the team.

     Verify: `node .crew/bin/crew.mjs policy check` exits 0, and `node .crew/bin/crew.mjs refresh-bin --check` exits 0.
  4. The human re-renders `.claude/agents/**` and `.crew/templates/agents/**` (`crew.mjs agents`) so this repo's Release reads the new release.md (and P-023's).
  5. From the next released plan on, Release refreshes `.crew/bin/` in the plan's commit, and the full suite enforces it.
- **The policy.yaml edit** (append at the top level of `.crew/policy.yaml`, after the `budgets:` block, two-space indent):
  ```yaml
  # FEAT-027 (executive approval, ledger 2026-10-24 18:19): Release refreshes these vendored hub files from the rebuilt bundle.
  release:
    refresh_bin:
      from: plugins/crew/skills/hub/dist
      files: [crew.mjs, ui.html]
  ```
  If the executive approves crew.mjs only, the last line is `      files: [crew.mjs]`, and ui.html stays a manual copy.
- Plan worktrees opened before step 3 carry the old `.crew/bin/` and policy. Release updates each to the base before refreshing, so they pick both up.
- Rollback: revert the plan's commit and remove the `release:` block from policy.yaml (an absent key is valid for old and new hubs, so the order does not matter). The human resumes copying `.crew/bin/` by hand.

## Risks & open questions
- **For the executive: ui.html is beyond the literal approval** ("Release may refresh .crew/bin/crew.mjs from the rebuilt bundle"). Confirm it by including it in `files:`, or leave it out and keep copying it by hand. The code is the same either way.
- For the executive: studio.html is not vendored in this repo, so `crew.mjs ui --design` from `.crew/bin/` has no design studio. Vendoring it would add a protected file; that is a separate decision, not covered here.
- Trust: the refresh runs the base's vendored hub against the base's policy, so a plan cannot widen what its own release refreshes. A plan can change what the *next* refresh copies only through reviewed, merged code, as with any hub change.
- Settled: no dependency on P-020 (done). Overlap with P-021 is sequenced by staffing.
- Protected paths (`.crew/policy.yaml`, `.crew/bin/**`, `.claude/agents/**`, `.crew/templates/agents/**`) are not touches: the executive and the human apply those (Rollout).

## Handoff

_Generated 2026-10-25 by `crew.mjs handoff` from the ledger._

- P-024: Release refreshes the vendored hub in .crew/bin [in-review] tasks 4/4 — claimed by Arpit Anand (developer:af588eed65e640684)
- last checkpoint 2026-10-25 08:42 at T4 (def8a26) by Arpit Anand; since then 0 commit(s), 8 uncommitted file(s): .crew/config.yaml, packages/crew/src/hub/cli.ts, packages/crew/src/hub/commands/team/policy.ts, packages/crew/src/hub/commands/work/release.ts, packages/crew/src/hub/core/team/policy.ts, plugins/crew/skills/hub/agents/release.md, plugins/crew/skills/hub/references/model.md, packages/crew/test/hub/refresh-bin.test.ts
- evidence: AC1 —, AC2 —, AC3 —, AC4 —, AC5 —

Latest log:
- 2026-10-25: status ready → in-progress — branch plan/P-024-release-refreshes-the-vendored-hub
- 2026-10-25: Architect (Q-6949e4): touches gain packages/crew/src/hub/commands/team/policy.ts for two text rows in `policy show` (release.refresh_bin.from / .files); AC5 is tested on text and --json output.
- 2026-10-25: Developer notes: (1) 'a plan's worktree' = the checkout's current branch is the branch: of a plan not dropped (done counts, since Release refreshes after done). (2) copyFileSync copies the source mode, so refresh-bin chmods the target back to its own mode. (3) policy show prints 'none' for an unset key (Q-6949e4). (4) .crew/config.yaml edited in the plan worktree (in touches; ships in the plan commit). Bootstrap (policy.yaml release block, .crew/bin copy) not done: human-reserved per Rollout.

## Progress log

- 2026-10-24: status draft → ready
- 2026-10-25: Architect refinement after P-026: refresh target is the plan worktree's .crew/bin (root param), not store.dir (now the main checkout); refreshBin(store, root, check) exported for P-032's land; registration may go to release.reg.ts if P-030 lands first (touches widened).
- 2026-10-25: Architect: goal G-001 → G-007 (FEAT-027 re-goaled to G-007; P-024 is W1-a and P-032 depends on it), at the Director's request.
- 2026-10-25: assigned to the developer role
- 2026-10-25: status ready → in-progress — branch plan/P-024-release-refreshes-the-vendored-hub
- 2026-10-25: Architect (Q-6949e4): touches gain packages/crew/src/hub/commands/team/policy.ts for two text rows in `policy show` (release.refresh_bin.from / .files); AC5 is tested on text and --json output.
- 2026-10-25: Developer notes: (1) 'a plan's worktree' = the checkout's current branch is the branch: of a plan not dropped (done counts, since Release refreshes after done). (2) copyFileSync copies the source mode, so refresh-bin chmods the target back to its own mode. (3) policy show prints 'none' for an unset key (Q-6949e4). (4) .crew/config.yaml edited in the plan worktree (in touches; ships in the plan commit). Bootstrap (policy.yaml release block, .crew/bin copy) not done: human-reserved per Rollout.
- 2026-10-25: status in-progress → in-review
- 2026-10-25: QA: the AC4 order-check failure was a false fail, BUG-017 (guard splices identity into the quoted grep pattern); re-run from .crew/drafts/p024-qa-ac4.sh passed. The first QA checkpoint committed the developer's 7 uncommitted files as cd4fb58 (P-028 behaviour); .crew/config.yaml stayed uncommitted.
- 2026-10-25: status in-review → done
- 2026-10-25: merged 23e2a4a (squash of a234563, rebased on 54f5212; dist rebuilt; .crew/config.yaml full_suite now ends in refresh-bin --check). Full suite green: typecheck, 47 files/338 tests, build, no skills drift, refresh-bin --check vacuous (no release.refresh_bin yet). Worktree and branch removed. Bootstrap (Rollout steps 3-4: copy dist to .crew/bin, then policy.yaml release: block, then crew.mjs --as release --run-id release:a706ae345948caef9 agents) left to executive/human.

## Outcome
`crew.mjs refresh-bin [--check]` (release.ts `refreshBin(store, root, check)`, exported for `land`) copies the policy's `release.refresh_bin.files` from `from` over existing vendored copies in the checkout's bin dir, as release and in a plan worktree only; `--check` is read-only and ends `hub.full_suite`. Global-only policy key, shown by `policy show`; release.md and model.md document the step and key. Bootstrap (policy.yaml block, first vendored copy) stays with the executive per Rollout.
Learnings: K-2026-10-25-nodes-copyfilesync-onto-an-existing-file
