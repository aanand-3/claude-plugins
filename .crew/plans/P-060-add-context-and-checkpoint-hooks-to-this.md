---
id: P-060
title: Add context and checkpoint hooks to this repo and check them in doctor
goal: G-001
items: FEAT-002
touches: packages/crew/src/tools/guidelines/merge_settings.ts, packages/crew/build.mjs, plugins/crew/skills/guidelines/templates/settings.json, plugins/crew/skills/guidelines/SKILL.md, packages/crew/src/hub/commands/views/doctor.ts, packages/crew/test/tools/guidelines.test.ts, packages/crew/test/hub/e2e/doctor.test.ts, packages/crew/test/hub/e2e/context.test.ts, packages/crew/test/plugin/contents.test.ts
depends_on:
status: in-progress
branch: plan/P-060-add-context-and-checkpoint-hooks-to-this
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
---

# P-060: Add context and checkpoint hooks to this repo and check them in doctor

## Context
G-001 AC2 needs the hub's context at session start. The guidelines template
(`plugins/crew/skills/guidelines/templates/settings.json`) carries SessionStart `crew.mjs context` and Stop/PreCompact
`crew.mjs checkpoint --auto`; this repo's `.claude/settings.json` has the guard (PreToolUse), usage (SubagentStop),
activity (PostToolUse `*`), the ExitPlanMode plan hook and a SessionStart hook that only runs `track_plan_draft.mjs
--session`. The three hooks are missing here. `.claude/settings.json` is protected: agents can't edit it.

**What the refresh path is today (findings):** nothing in code merges template hooks into an existing settings.json.
- `/crew:guidelines` step 5 says "Merge with an existing file": a prose instruction Claude carries out by hand; the
  `--refresh` section re-runs only step 2, `compose_rules.mjs`.
- `compose_rules.mjs` (src/tools/guidelines/compose_rules.ts) touches settings.json only through `legacy.upgrade()`
  (python3 `.py` → node `.mjs` rewrites). It also exits early on this repo: `.crew/config.yaml` has no `packs:` list, so
  `/crew:guidelines --refresh` cannot run here at all.
- The template's SessionStart is one command that chains githooks activation, `crew.mjs context` and `track_plan_draft
  --session`. Matching hooks by verbatim command would therefore add a second `track_plan_draft --session` next to this
  repo's existing one.

**Decision:** the refresh path gets a deterministic, add-only merge script, `merge_settings.mjs`. It sits beside
compose_rules in the guidelines skill and needs no `packs:`. The template's SessionStart group is split into three hooks
so that each can be matched on its own. `doctor` reports the three hooks as WARN: the portable-core decision is that the
CLI carries everything and hooks only automate, so a project without them still works. The guard stays the only FAIL.
Applying the merge to this repo's `.claude/settings.json` is the human's step (Rollout), not a developer task.

## Scope
**In:**
- The template's SessionStart group holds three separate hooks in the same order as today: githooks activation,
  `crew.mjs context`, and `track_plan_draft.mjs --session`. The last one is written byte-for-byte like this repo's
  current SessionStart command.
- New skill script `src/tools/guidelines/merge_settings.ts` → built by Release to
  `plugins/crew/skills/guidelines/scripts/merge_settings.mjs` (listed in build.mjs `TOOLS`). It adds the template's
  missing hooks to `<root>/.claude/settings.json` and changes nothing else.
- `/crew:guidelines` SKILL.md: step 5 and the Refresh section use `merge_settings.mjs` (`--dry-run` first) for settings.json
  hooks instead of a hand merge.
- `doctor`: three more non-required `HOOKS` entries, a WARN fix text that names the merge, and the OK detail.
- Updated test expectations for the split SessionStart (contents.test.ts, context.test.ts).

**Out (explicitly not doing):**
- Editing this repo's `.claude/settings.json` (the human applies the merge, see Rollout).
- Merging `permissions`, `plansDirectory` or any other non-hook key. Removing, reordering or rewriting existing hooks,
  including near-duplicates whose command text differs from the template.
- Changes to the guard, usage and activity hooks or to compose_rules / `legacy.upgrade()`.
- A hub command for the merge (it would touch the registry and MCP tests). `packs:` for this repo's config.
- Hand-editing generated files: `scripts/merge_settings.mjs`, dist and references are Release's build. The
  `generated:hooks` table in plugins/crew/docs/context-and-memory.md must stay unchanged, since the split stays within one
  group.

## Acceptance criteria
1. **Template split.** In `templates/settings.json`, `hooks.SessionStart` has exactly one group with three hooks. Hook 1
   activates `.githooks`. Hook 2 runs `crew.mjs context`. Hook 3 is exactly
   `[ -f "$CLAUDE_PROJECT_DIR/.crew/bin/track_plan_draft.mjs" ] && node "$CLAUDE_PROJECT_DIR/.crew/bin/track_plan_draft.mjs" --session; true`.
   Every other event in the template is byte-identical to main. `test/docs.test.ts` passes with
   `plugins/crew/docs/context-and-memory.md` unchanged.
2. **Add-only merge.** `merge_settings.mjs --root R` reads the template from `../templates/settings.json` next to the
   script. For each template group and hook, the hook counts as present when the same event already has a group with the
   same `matcher` (absent equals absent) that holds a hook with the identical `command` string. A missing hook joins that
   group; when no such group exists, a new group with that matcher is appended to the event, and a missing event is
   appended to `hooks`. Existing hooks keep their groups and order. Every key outside `hooks` is deep-equal before and
   after. The script prints one `ADD    <event> [<matcher>] <command>` line per added hook, then
   `WRITE  .claude/settings.json`, and writes the result as `JSON.stringify(s, null, 2)` plus a trailing newline.
3. **Idempotent; dry run.** A second run prints `OK     .claude/settings.json (hooks up to date)` and leaves the file
   byte-identical (it isn't rewritten). With `--dry-run`, the script prints `WOULD ADD` lines and writes nothing.
4. **This repo's settings.** A fixture equal to this repo's current `.claude/settings.json` (as of this plan's base),
   merged, gains the following:
   - SessionStart: the githooks activation and `crew.mjs context` hooks;
   - Stop and PreCompact: one `checkpoint --auto` hook each;
   - PostToolUse `Edit|Write|MultiEdit`: `format_on_edit.mjs`.

   Its `track_plan_draft.mjs --session` appears exactly once. The PreToolUse, SubagentStop, PostToolUse `*` and
   ExitPlanMode hooks and `permissions` are unchanged.
5. **Edge cases.** A missing `.claude/settings.json` gets the template written verbatim (`WRITE`). A file that doesn't
   parse as JSON makes the script exit 1 with a message that names the file, and the file is left as it was.
6. **Doctor.** `HOOKS` in views/doctor.ts gains three `required: false` entries:
   - SessionStart `/crew\.mjs context\b/` ("the SessionStart `crew.mjs context`");
   - Stop `/crew\.mjs checkpoint --auto\b/` ("the Stop `crew.mjs checkpoint --auto`");
   - PreCompact, the same pattern ("the PreCompact `crew.mjs checkpoint --auto`").

   Each missing hook gives one `WARN  hooks: .claude/settings.json has no <name>` line with the fix
   `the human runs \`/crew:guidelines --refresh\` (its merge_settings.mjs adds the template's missing hooks; .claude/settings.json is protected)`.
   This fix text also replaces the old one for the usage and activity hooks and the guard. Doctor exits 0 when only
   non-required hooks are missing. With the template's settings, doctor reports
   `OK    hooks: guard, usage, activity, context and checkpoint hooks are set`. With this repo's current settings as the
   fixture, doctor reports exactly three hooks WARNs (context, Stop, PreCompact) and no hooks FAIL.
7. **Skill text.** `plugins/crew/skills/guidelines/SKILL.md` step 5 and the Refresh section tell the reader to run
   `node "${CLAUDE_SKILL_DIR}/scripts/merge_settings.mjs" --root . --dry-run` and then the same command without
   `--dry-run`. They say the merge is add-only and needs no `packs:`.
8. **Size.** merge_settings.ts and doctor.ts each stay under 300 lines.

## Approach
A small pure function `mergeHooks(existing, template) → { settings, added }` plus a `main()` that does the file I/O and
argument parsing with the existing `cli()` helper (`--root`, `--dry-run`), in the style of compose_rules. Doctor stays a
table change: three rows in `HOOKS`, one fix constant and the OK string.

## Design
- Hook identity is (event, matcher, verbatim command). Normalizing commands would be guesswork, so near-duplicates in a
  project are left alone and reported by doctor if they don't match its regexes.
- Splitting the SessionStart group keeps behaviour the same for new projects: Claude Code runs every hook in the group,
  and none of the three depends on another. It also lets a project with its own track_plan_draft hook receive only the
  missing pieces.
- WARN, not FAIL: missing context or checkpoint hooks degrade the loop but don't break it (portable core). The guard is
  the only hook the loop can't run without.

## Tasks
- [ ] T1: Split the template's SessionStart into three hooks (AC1); update `context.test.ts` ("the SessionStart hook runs context") and `contents.test.ts` ("the settings template wires the hooks") to look across the group's hooks → verify: `npx vitest run test/hub/e2e/context.test.ts test/plugin/contents.test.ts test/docs.test.ts test/tools/upgrade.test.ts`
- [ ] T2: `src/tools/guidelines/merge_settings.ts` and its `TOOLS` entry in build.mjs (AC2, AC3, AC5, AC8); tests in `test/tools/guidelines.test.ts` run the built script (`npm run build` in the plan worktree first; leave the build output uncommitted) → verify: `npx vitest run test/tools/guidelines.test.ts`
- [ ] T3: The this-repo fixture test (AC4). The current hooks section is a literal in guidelines.test.ts, not read from the repo root → verify: `npx vitest run test/tools/guidelines.test.ts -t "this repo"`
- [ ] T4: Doctor rows, fix text and OK detail (AC6); extend `doctor.test.ts` "hooks and agents report what's missing" and add a case with this repo's hooks fixture → verify: `npx vitest run test/hub/e2e/doctor.test.ts`
- [ ] T5: SKILL.md step 5 and Refresh (AC7) → verify: `grep -n "merge_settings.mjs" plugins/crew/skills/guidelines/SKILL.md` shows both places

## Test plan
**Targeted checks** (run in `packages/crew` of the plan worktree after `npm ci --prefer-offline` and `npm run build`):
- AC1: `npx vitest run test/hub/e2e/context.test.ts test/plugin/contents.test.ts test/docs.test.ts test/tools/upgrade.test.ts`;
  `git diff --quiet main -- plugins/crew/docs/context-and-memory.md`
- AC2, AC3, AC5: `npx vitest run test/tools/guidelines.test.ts -t merge_settings`
- AC4: `npx vitest run test/tools/guidelines.test.ts -t "this repo"`. QA can also copy the main checkout's
  `.claude/settings.json` into a temp dir, run the built `merge_settings.mjs --root <tmp>` twice and inspect both outputs.
- AC6: `npx vitest run test/hub/e2e/doctor.test.ts`
- AC7: grep as in T5
- AC8: `wc -l src/tools/guidelines/merge_settings.ts src/hub/commands/views/doctor.ts`

## Rollout & rollback
**Human step (after P-060 lands and Release has rebuilt the scripts), in the main checkout on main:**
1. `node plugins/crew/skills/guidelines/scripts/merge_settings.mjs --root . --dry-run`. It should list 5 additions:
   githooks activation, `crew.mjs context`, Stop and PreCompact `checkpoint --auto`, and `format_on_edit.mjs`. The last
   two non-crew hooks are no-ops here, because there is no `.githooks/` and no `.crew/bin/format_on_edit.mjs`.
2. Run the same command without `--dry-run`, review `git diff .claude/settings.json` (the permissions list is re-indented
   but its content is unchanged), and commit it as `chore: add crew context and checkpoint hooks`.
3. Start a new session: it opens with the `crew.mjs context` output. `node .crew/bin/crew.mjs doctor` shows `OK hooks`
   once `.crew/bin` has been refreshed after the merge.

**Rollback:** revert P-060's squash commit. The human reverts their settings.json commit separately if wanted.

## Risks & open questions
- The merge re-serializes settings.json with 2-space JSON. That's acceptable: the file is crew-owned and the content is
  checked deep-equal.
- The human may not want the no-op githooks and format_on_edit hooks in this repo. They can remove them after the merge,
  and doctor doesn't check either one.

## Handoff

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: Human decision: keep the template's githooks-activation and format_on_edit hooks that the merge adds to this repo's .claude/settings.json (harmless no-ops now; they start working if .githooks/ or format_on_edit.mjs are added). No manual removal in the rollout.
- 2026-10-26: assigned to the developer role — G-001 FEAT-002; assigned at the human's request; no overlap with in-flight G-007 plans
- 2026-10-26: assigned to the developer role
- 2026-10-26: The PM's assignment to the developer role (95fe671) replaces the team session's assign entry 0734bc7, which the team session made in the PM's name; the PM owns this assignment.
- 2026-10-26: status ready → in-progress — branch plan/P-060-add-context-and-checkpoint-hooks-to-this

## Outcome
- This repo's .claude/settings.json carries the SessionStart context hook and the Stop and PreCompact `checkpoint --auto` hooks, merged in via the guidelines refresh path.
- `doctor` (views/doctor.ts HOOKS) reports whether those three hooks are present.
