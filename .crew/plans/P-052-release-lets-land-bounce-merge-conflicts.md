---
id: P-052
title: Release lets land bounce merge conflicts
goal: G-007
items: BUG-036
touches: plugins/crew/skills/hub/agents/release.md, packages/crew/test/hub/e2e/agents.test.ts
depends_on:
status: accepted
branch: plan/P-052-release-lets-land-bounce-merge-conflicts
pr:
created: 2026-10-26
started: 2026-10-26
completed:
assignee: developer
---

# P-052: Release lets land bounce merge conflicts

## Context
BUG-036 (G-007). Since P-051 the guard binds every role's Bash writes to `paths.write`, so Release (`.crew/drafts/**`) cannot resolve a merge conflict. The executive decided (Q-544d38, hub 6905992): option B. Release never resolves conflicts; `land` bounces a conflicting plan back to its developer (seen with P-045, hub 2f7828d). The fix is in Release's instructions and the role text, not in `paths.write`.

## Scope
**In:**
- Release's instructions (agent file and any role text the hub generates) say: on a merge conflict, let `land` bounce the plan to the developer; do not edit, abort-and-reroute by hand, or widen anything.
- Keep the plugin copy and the vendored copy of the instructions in step.

**Out (explicitly not doing):**
- Widening Release's `paths.write` (rejected by the executive).
- Changing how `land` detects or bounces a conflict.

## Acceptance criteria
- [ ] AC1 · Release's instructions state that a conflict is left to `land`'s bounce to the developer and that Release never resolves one.
- [ ] AC2 · No remaining Release instruction tells it to resolve or edit conflicted files.
- [ ] AC3 · A regression test (agents.test.ts, "the release template leaves merge conflicts to land's bounce") covers the new instruction text and fails on the old template.

## Approach
- The plugin template `plugins/crew/skills/hub/agents/release.md` is the only source of Release's instructions. The hub generates no conflict text for Release: `next --role release` only lists `land P-###`. The template already says `land` sends a conflicting plan back. The change makes that the rule and closes the two gaps that led to BUG-036:
  - Loop step 3: on a conflict, `land` bounces the plan to its developer (`accepted → in-progress`, the conflicting files in the note). Release never resolves one: no Edit, no `sed`, no `git checkout --ours/--theirs`, and no aborting and rerouting by hand. It reports the bounce. The developer resolves and checkpoints, the Architect re-reviews and QA re-checks (K-2026-10-26-b-keep-merge-conflicts).
  - Rules, the hand-merge line (plans completed before `accepted` existed): if that hand merge conflicts, `git merge --abort` and hand it to the developer with `crew.mjs ask P-### --to developer "hand merge of P-### conflicts in <files>: merge <base> into its branch and resolve"`, then merge again once answered. Never resolve it. (Not `move P-### in-progress`: such a plan is `done`, which `PLAN_FLOW` never leaves, and `plan.in-progress` is the developer's gate under `lifecycle`.)
  - One Rules line: "Never resolve a merge conflict; a conflict is the developer's (land bounces it)."
- `.crew/templates/agents/release.md` (the vendored copy, read before the plugin's by `agents.ts` `template()`) and `.claude/agents/crew-release.md` are protected paths. This plan doesn't write them; see Rollout.
- Test: in `agents.test.ts`, `it("the release template leaves merge conflicts to land's bounce")` reads the plugin template (`AGENT_TEMPLATES/release.md`). It asserts the text contains "Never resolve a merge conflict" and `git merge --abort`, and that no line tells Release to resolve or edit a conflict: no match for `/resolve (the |a |any )?conflict/i` outside lines starting with "Never" or containing "never".

## Tasks
- [x] T1: Rewrite Release's conflict handling in `plugins/crew/skills/hub/agents/release.md` (loop step 3, the hand-merge rule, the new Rules line), under the YAML frontmatter rules (K-2026-10-23-agent-frontmatter-values-are-yaml: only the body changes) → verify: `cd packages/crew && npx vitest run test/hub/e2e/agents.test.ts -t "release template"` (AC1, AC2)
- [x] T2: The template test in `agents.test.ts` → verify: the same command fails with the old template (`git stash` the template edit) and passes with the new one; the whole of `agents.test.ts` is green (AC3)

## Test plan
**Targeted checks** (from `packages/crew/`; agents.test.ts drives the built `dist/crew.mjs`, so `npm run build` first, then `git checkout -- plugins/crew/skills/hub/dist`):
- AC1, AC2 → `npx vitest run test/hub/e2e/agents.test.ts -t "release template"`, plus a manual read of the new loop step 3 and Rules.
- AC3 → `npx vitest run test/hub/e2e/agents.test.ts` (the new case, and the render cases still green: `agents --check` clean in a fresh sandbox).

## Rollout & rollback
- Ships in the plugin. This repo renders Release from its vendored copy, which is protected. After the plan lands, the executive copies the template (`cp plugins/crew/skills/hub/agents/release.md .crew/templates/agents/release.md`, or re-runs `init` from the plugin), runs `agents` with their approval to re-render `.claude/agents/crew-release.md`, and starts a fresh session (agent definitions load at session start). Until then `agents --check` stays clean, because the vendored copy is unchanged, and Release follows the old text.
- Rollback: revert the commit (and re-vendor if already copied).

## Risks & open questions
- Each conflict costs a round trip (developer, re-review, QA, re-accept). This is accepted by the executive's decision B.
- The vendored copy can lag the plugin. That is a general gap (no `agents --check` warning for a stale vendored template) and is out of scope here.

## Handoff

_Generated 2026-10-26 by `crew.mjs handoff` from the ledger._

- P-052: Release lets land bounce merge conflicts [in-review] tasks 2/2 — claimed by Arpit Anand (developer:a22625ccf29413479)
- last checkpoint 2026-10-26 07:33 at T1 (55a6469) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-052-release-lets-land-bounce-merge-conflicts/packages/crew && npm run build && npx vitest run test/hub/e2e/agents.test.ts -t 'release template'; r=$?; git -C /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-052-release-lets-land-bounce-merge-conflicts checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md plugins/crew/docs; exit $r (AC 1)
- ✓ cd /Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-052-release-lets-land-bounce-merge-conflicts/packages/crew && npx vitest run test/hub/e2e/agents.test.ts -t 'release template' (AC 2)
- ✓ W=/Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-052-release-lets-land-bounce-merge-conflicts; cd $W/packages/crew && git -C $W show 817ff12:plugins/crew/skills/hub/agents/release.md > $W/plugins/crew/skills/hub/agents/release.md && ! npx vitest run test/hub/e2e/agents.test.ts -t 'release template'; old=$?; git -C $W show HEAD:plugins/crew/skills/hub/agents/release.md > $W/plugins/crew/skills/hub/agents/release.md; [ $old -eq 0 ] && npm run build && npx vitest run test/hub/e2e/agents.test.ts; r=$?; git -C $W checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md plugins/crew/docs; exit $r (AC 3)
- ✓ W=/Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-052-release-lets-land-bounce-merge-conflicts; T=$W/plugins/crew/skills/hub/agents/release.md; S=/private/tmp/claude-502/-Users-aanand-Documents-Projects-Personal-claude-plugins/7d499a6e-8ddb-494b-9ce3-90b14bf1a8bb/scratchpad/release.md.new; cp $T $S && git -C $W show c2c3e19:plugins/crew/skills/hub/agents/release.md > $T && cd $W/packages/crew && ! npx vitest run test/hub/e2e/agents.test.ts -t 'release template'; old=$?; cp $S $T; [ $old -eq 0 ] && npm run build && npx vitest run test/hub/e2e/agents.test.ts; r=$?; git -C $W checkout -- plugins/crew/skills/hub/dist plugins/crew/skills/hub/references/commands.md plugins/crew/docs; exit $r (AC 3)
- evidence: AC1 ✓ (self), AC2 ✓ (self), AC3 ✓ (self)

Latest log:
- 2026-10-26: status in-progress → in-review
- 2026-10-26: review: changes requested — Loop step 3 and the new Rules line are right. The hand-merge Rules line in plugins/crew/skills/hub/agents/release.md tells Release to do something the hub refuses. A plan merge-order marks 'completed before accepted' is done, and PLAN_FLOW has done: [] (no way out), and under lifecycle plan.in-progress is the developer's role gate. So 'crew.mjs move P-### in-progress --note …' fails for Release. That is my spec's error; the Approach is now amended. Replace that sentence with: if that merge conflicts, git merge --abort and hand it to the developer with crew.mjs ask P-### --to developer "hand merge of P-### conflicts in <files>: merge <base> into its branch and resolve", then merge again once it is answered; never resolve it. In agents.test.ts's 'release template' case, also assert that the template no longer contains 'move P-### in-progress'. Only the template body changes; the frontmatter and paths.write stay as they are.
- 2026-10-26: status in-review → in-progress — changes requested: Loop step 3 and the new Rules line are right. The hand-merge Rules line in plugins/crew/skills/hub/agents/release.md tells Release to do something the hub refuses. A plan merge-order marks 'completed before accepted' is done, and PLAN_FLOW has done: [] (no way out), and under lifecycle plan.in-progress is the developer's role gate. So 'crew.mjs move P-### in-progress --note …' fails for Release. That is my spec's error; the Approach is now amended. Replace that sentence with: if that merge conflicts, git merge --abort and hand it to the developer with crew.mjs ask P-### --to developer "hand merge of P-### conflicts in <files>: merge <base> into its branch and resolve", then merge again once it is answered; never resolve it. In agents.test.ts's 'release template' case, also assert that the template no longer contains 'move P-### in-progress'. Only the template body changes; the frontmatter and paths.write stay as they are.

## Progress log

- 2026-10-26: status draft → ready
- 2026-10-26: assigned to the developer role
- 2026-10-26: status ready → in-progress — branch plan/P-052-release-lets-land-bounce-merge-conflicts
- 2026-10-26: status in-progress → in-review
- 2026-10-26: review: changes requested — Loop step 3 and the new Rules line are right. The hand-merge Rules line in plugins/crew/skills/hub/agents/release.md tells Release to do something the hub refuses. A plan merge-order marks 'completed before accepted' is done, and PLAN_FLOW has done: [] (no way out), and under lifecycle plan.in-progress is the developer's role gate. So 'crew.mjs move P-### in-progress --note …' fails for Release. That is my spec's error; the Approach is now amended. Replace that sentence with: if that merge conflicts, git merge --abort and hand it to the developer with crew.mjs ask P-### --to developer "hand merge of P-### conflicts in <files>: merge <base> into its branch and resolve", then merge again once it is answered; never resolve it. In agents.test.ts's 'release template' case, also assert that the template no longer contains 'move P-### in-progress'. Only the template body changes; the frontmatter and paths.write stay as they are.
- 2026-10-26: status in-review → in-progress — changes requested: Loop step 3 and the new Rules line are right. The hand-merge Rules line in plugins/crew/skills/hub/agents/release.md tells Release to do something the hub refuses. A plan merge-order marks 'completed before accepted' is done, and PLAN_FLOW has done: [] (no way out), and under lifecycle plan.in-progress is the developer's role gate. So 'crew.mjs move P-### in-progress --note …' fails for Release. That is my spec's error; the Approach is now amended. Replace that sentence with: if that merge conflicts, git merge --abort and hand it to the developer with crew.mjs ask P-### --to developer "hand merge of P-### conflicts in <files>: merge <base> into its branch and resolve", then merge again once it is answered; never resolve it. In agents.test.ts's 'release template' case, also assert that the template no longer contains 'move P-### in-progress'. Only the template body changes; the frontmatter and paths.write stay as they are.
- 2026-10-26: status in-progress → in-review
- 2026-10-26: status in-review → accepted
- 2026-10-26: landed on main as 31c8cc6

## Outcome
Release's template (plugins/crew/skills/hub/agents/release.md, body only) now leaves every merge conflict to land's bounce: loop step 3 says Release only reports the bounce (no Edit, sed, checkout --ours/--theirs or manual reroute), a new Rules line says it never resolves a conflict, and the hand-merge rule for pre-accepted plans aborts a conflicting merge, asks the developer (ask --to developer) to merge the base into the branch and resolve, and merges again once answered (review fix: a done plan has no transitions and in-progress is the developer's). agents.test.ts gains the regression case, which fails on the base template and passes on the new one; the whole file is green. The vendored .crew/templates/agents/release.md and .claude/agents/crew-release.md are unchanged (protected); the executive re-vendors after landing.

Learnings: none new — the base-version check followed K-2026-10-25-a-plan-task-that-says-to-git-stash (write the old file from git show BASE:path, negate the test run, restore from git show HEAD:path, all inside one checkpoint --run).
