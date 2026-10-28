---
id: P-085
title: Wire the Designer to this repo's DESIGN.md (design.file)
goal:
items: CHORE-027
touches: .crew/config.yaml, plugins/crew/skills/hub/agents/designer.md, plugins/crew/skills/design/SKILL.md
depends_on:
status: done
branch: plan/P-085-wire-the-designer-to-this-repos-design
pr:
created: 2026-10-27
started: 2026-10-28
completed: 2026-10-28
assignee: developer
---

# P-085: Wire the Designer to this repo's DESIGN.md (design.file)

## Context
CHORE-027: P-021 added the designer role, but in this repo the Designer cannot do its job end to end. Checked on main
(2026-10-27), part of the item is already done:
- `.claude/agents/crew-designer.md` and `.crew/templates/agents/designer.md` exist and `crew.mjs agents --check` reports
  "Agents up to date" (vendored in d835cf9).
- `.crew/config.yaml` already has `design: ui_paths: [packages/crew/ui/**]`, so `isUiPlan` works and dispatch can name
  the Designer for plans touching the hub UI.

What is still missing:
1. The rendered `crew-designer.md` has no `model:` line, because `.crew/policy.yaml` has no `roles.designer`. The other
   roles get theirs from `roles.<role>.models.default`. `policy.yaml`, `.crew/templates/agents/**` and
   `.claude/agents/**` are guard-protected (`paths.protected`), so only the human can make this change. It is a
   follow-up after this plan lands, not one of this plan's tasks (see Rollout).
2. DESIGN.md lives at `packages/crew/docs/design/DESIGN.md` (moved there by P-014), not at `docs/design/DESIGN.md`.
   The design checker (`src/tools/design/check_design.ts`) and the studio (`readDesign`, covered by `design.test.ts`
   "follows design.file in config.yaml") already follow `design.file` in `.crew/config.yaml`, but this repo doesn't set
   it. A scratch run showed that the checker currently finds no DESIGN.md, and that once `file:` is set it finds this
   one. The Designer's template (`plugins/crew/skills/hub/agents/designer.md:11`) and the design skill
   (`plugins/crew/skills/design/SKILL.md:9`) hard-code `docs/design/DESIGN.md`.

## Scope
**In:**
- `.crew/config.yaml`: add `file: packages/crew/docs/design/DESIGN.md` to the existing `design:` block, on the line
  directly after `ui_paths` with no blank line between them. The checker's regex only reads keys that sit in one
  unbroken indented block.
- `plugins/crew/skills/hub/agents/designer.md`: name DESIGN.md as the file at `design.file` in `.crew/config.yaml`
  (default `docs/design/DESIGN.md`). Do the same for `studio.json`, which sits next to it. Keep the rest of the
  template unchanged.
- `plugins/crew/skills/design/SKILL.md`: the same one-phrase change where it names the persisted file (line 9).

**Out (explicitly not doing):**
- Moving DESIGN.md back to the repo root, because P-014 placed it with the package on purpose.
- `roles.designer` in `.crew/policy.yaml`, re-vendoring `.crew/templates/agents/designer.md` and re-rendering
  `.claude/agents/crew-designer.md`. These paths are protected, so the human does them after this plan lands (Rollout).
- Fixing the checker's existing off-token findings (warn mode), or scoping it with `architecture.frontend_dir`.
- Changing `design.ui_paths`, which already lists the hub UI.

## Acceptance criteria
- [ ] AC1: In the plan worktree, `node plugins/crew/skills/design/scripts/check_design.mjs --export tailwind --root .`
  exits 0 and prints the `:root` tokens from `packages/crew/docs/design/DESIGN.md`. It must not print
  "docs/design/DESIGN.md not found".
- [ ] AC2: `grep -A2 "^design:" .crew/config.yaml` shows `ui_paths: [packages/crew/ui/**]` and then
  `file: packages/crew/docs/design/DESIGN.md` with no blank line between them, and
  `node plugins/crew/skills/design/scripts/check_design.mjs --all --root .` exits 0 with no "crew design lint" or
  "crew design lock" line on stderr (warn-mode "off the design tokens" findings are allowed).
- [ ] AC3: `plugins/crew/skills/hub/agents/designer.md` and `plugins/crew/skills/design/SKILL.md` point to DESIGN.md
  through `design.file` (default `docs/design/DESIGN.md`). `grep -n "design.file"` finds it in both files, and the
  agents e2e test still passes.
- [ ] AC4: `design-review.test.ts` passes. It covers UI plans from `ui_paths` and the design-review dispatch entry.

## Approach
This is config and wording only. The code that follows `design.file` already exists and is tested
(`design.test.ts`, `check_design.ts`), so this plan only wires it up. It does not move DESIGN.md: the move costs more
(P-014 links, the studio's `studio.json` next to it), and config is the mechanism the skill already documents.

## Design
n/a: touches no `design.ui_paths` path.

## Tasks
- [x] T1: Add `file: packages/crew/docs/design/DESIGN.md` to the `design:` block in `.crew/config.yaml` → verify: AC1 and AC2 commands.
  Put it directly after `ui_paths` and extend the comment above the block to mention `design.file`.
- [x] T2: Point `plugins/crew/skills/hub/agents/designer.md` at `design.file` → verify: `grep -n "design.file" plugins/crew/skills/hub/agents/designer.md`; `cd packages/crew && npx vitest run test/hub/e2e/agents.test.ts`.
  Name DESIGN.md and studio.json (next to it) as the files at `design.file` (default `docs/design/DESIGN.md`).
- [x] T3: Make the same change in `plugins/crew/skills/design/SKILL.md` line 9. → verify:
  `grep -n "design.file" plugins/crew/skills/design/SKILL.md`; `cd packages/crew && npx vitest run test/plugin/contents.test.ts`.

## Test plan
**Targeted checks:**
- AC1, AC2: `node plugins/crew/skills/design/scripts/check_design.mjs --export tailwind --root .` and
  `… --all --root .` in the plan worktree. Existing warn-mode findings off the tokens are expected and are not failures.
- AC3: the two `grep` checks; `cd packages/crew && npx vitest run test/hub/e2e/agents.test.ts test/plugin/contents.test.ts`.
- AC4: `cd packages/crew && npx vitest run test/hub/e2e/design-review.test.ts test/design.test.ts`.

## Rollout & rollback
After this plan lands, the human does the following on main, because these paths are guard-protected:
1. Add `designer: { models: { default: opus } }` under `roles:` in `.crew/policy.yaml`. Opus because the Designer's
   reviews are judgement-heavy, like the Architect's.
2. `cp plugins/crew/skills/hub/agents/designer.md .crew/templates/agents/designer.md`. The vendored copy is already
   stale: it lacks the "answer Q-…" lines.
3. `node .crew/bin/crew.mjs agents`, then `agents --check` must be clean and `.claude/agents/crew-designer.md` must
   contain `model: opus`. Commit.
That closes CHORE-027's first "Done when". Rollback: revert the plan's commit. Without `design.file`, the checker skips
again silently.

## Risks & open questions
- `.crew/policy.yaml` has an uncommitted local change on main (`max_agents: 7`). The human should commit or keep it
  while making rollout step 1.
- `.crew/config.yaml` is not in `hub.shared`, so this plan and P-079 (ready, also touches it) can't be staffed at the
  same time; whichever starts second waits for the first to land. Both edits are small and disjoint.
- The checkpoint commit skips `.crew/config.yaml` (known gotcha), so Release must carry the T1 edit into the plan's
  commit; QA checks AC1/AC2 in the worktree, where `check_design.mjs --root .` reads the worktree's config.
- With no `frontend_dir`, `check_design.mjs --all` scans every tracked source file, so warn-mode findings show up in
  tool sources (`src/tools/design/*.ts`). This is noise and out of scope; a follow-up can scope it if it gets in the way.

## Handoff

_Generated 2026-10-28 by `crew.mjs handoff` from the ledger._

- P-085: Wire the Designer to this repo's DESIGN.md (design.file) [in-review] tasks 3/3 — claimed by Arpit Anand (developer:a7c0d1c4b8073a774)
- last checkpoint 2026-10-28 05:31 at T3 (d985b61) by Arpit Anand; since then 0 commit(s), 0 uncommitted file(s)
- evidence: AC1 —, AC2 —, AC3 —, AC4 —

Latest log:
- 2026-10-28: status draft → ready
- 2026-10-28: assigned to the developer role
- 2026-10-28: status ready → in-progress — branch plan/P-085-wire-the-designer-to-this-repos-design

## Progress log

- 2026-10-28: status draft → ready
- 2026-10-28: assigned to the developer role
- 2026-10-28: status ready → in-progress — branch plan/P-085-wire-the-designer-to-this-repos-design
- 2026-10-28: status in-progress → in-review
- 2026-10-28: status in-review → accepted
- 2026-10-28: landed on main as 1f5797b
- 2026-10-28: status accepted → done

## Outcome
Learnings: none
