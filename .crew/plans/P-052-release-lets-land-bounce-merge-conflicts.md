---
id: P-052
title: Release lets land bounce merge conflicts
goal: G-007
items: BUG-036
touches: plugins/crew/skills/hub/agents/release.md, packages/crew/test/hub/e2e/agents.test.ts
depends_on:
status: ready
branch: plan/P-052-release-lets-land-bounce-merge-conflicts
pr:
created: 2026-10-26
started:
completed:
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
  - Rules, the hand-merge line (plans completed before `accepted` existed): if that hand merge conflicts, `git merge --abort` and send the plan back with `move P-### in-progress --note "conflict in <files>"`. Never resolve it.
  - One Rules line: "Never resolve a merge conflict; a conflict is the developer's (land bounces it)."
- `.crew/templates/agents/release.md` (the vendored copy, read before the plugin's by `agents.ts` `template()`) and `.claude/agents/crew-release.md` are protected paths. This plan doesn't write them; see Rollout.
- Test: in `agents.test.ts`, `it("the release template leaves merge conflicts to land's bounce")` reads the plugin template (`AGENT_TEMPLATES/release.md`). It asserts the text contains "Never resolve a merge conflict" and `git merge --abort`, and that no line tells Release to resolve or edit a conflict: no match for `/resolve (the |a |any )?conflict/i` outside lines starting with "Never" or containing "never".

## Tasks
- [ ] T1: Rewrite Release's conflict handling in `plugins/crew/skills/hub/agents/release.md` (loop step 3, the hand-merge rule, the new Rules line), under the YAML frontmatter rules (K-2026-10-23-agent-frontmatter-values-are-yaml: only the body changes) → verify: `cd packages/crew && npx vitest run test/hub/e2e/agents.test.ts -t "release template"` (AC1, AC2)
- [ ] T2: The template test in `agents.test.ts` → verify: the same command fails with the old template (`git stash` the template edit) and passes with the new one; the whole of `agents.test.ts` is green (AC3)

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

## Progress log

- 2026-10-26: status draft → ready

## Outcome
