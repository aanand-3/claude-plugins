---
id: P-010
title: Design studio: one continuous design workflow in the hub
goal: 
items: 
touches:
depends_on:
status: done
branch:
pr: https://github.com/aanand-3/claude-plugins/pull/4
created: 2026-10-23
started:
completed: 2026-10-23
---

# P-010: Design studio: one continuous design workflow in the hub

## Context
`/crew:design` today is a chain of disconnected pages:
- **Palette gallery** (`palettes.html`, static). The shortlist tray's buttons don't work for the user, and even when they do, the page ends with "copy and paste back to Claude".
- **Directions** (`directions.html`). Built afterwards as a separate file with a generic sample screen.
- **DESIGN.md** is then written and nothing follows. There are no screens specific to the project, and nothing stops later edits that aren't recorded.

Only colour is curated. Type, shape, density, elevation and motion are free text.

**Goal:** one studio page that walks through every stage without a dead end, using these decisions:
- **Catalogs:** build our own, and keep the open DESIGN.md format (Google's `version: alpha` spec). Companion skills stay optional.
- **Hosting:** served by `crew ui`, with a static fallback for projects without the hub.
- **Locking:** a final design is locked, and changing it means a recorded revision.

**Stages:**
**Palette → Directions → Tune → Finalise → Project screens (or skip)**
- The page does the stages that don't need Claude by itself.
- At the stages that do, it hands off to Claude and picks up again automatically.

**Branch:** `feat/design-studio` off `feat/hub-context`, because it needs that branch's hub server.

## 0. No copy step: Next moves the selection on
- The shortlist tray's Copy button goes away. **Next** moves the selection straight to Directions in the same page.
- Directions are built in the page from the catalogs, so Claude isn't needed for that step. Claude may seed directions ahead of time, but doesn't have to.
- Claude is needed only for the writing steps: the Finalise rationale, and project screen specs and change requests. Those reach Claude through `crew design wait` (§3), not the clipboard.
- The only place copying survives is a Claude hand-off in static mode, where there is no server. There the page shows a selectable line to paste into chat.
- Browser check: Shortlist → Next → Directions works with no copy step, which also covers the old broken buttons.

## 1. Catalogs and DESIGN.md format (`plugins/crew/skills/design/`, Python)
- **`assets/fonts.json`:** about 30 curated OFL pairings from Google Fonts.
  - Fields: `id, name, display, body, mono, classification, moods, surface, why, weights, google (css2 family), fontsource (package)`.
  - Moods are `wada.MOODS` plus `technical, editorial, friendly`.
- **`assets/presets.json`:**
  - `shape`: sharp / soft / round, mapping to rounded sm/md/lg.
  - `density`: compact / comfortable / spacious, setting spacing base, control height and UI text size.
  - `elevation`: flat / border / soft, at most 2 shadow levels.
  - `motion`: none / subtle / expressive, setting durations and easing.
- **`assets/blocks.json`:** the layout vocabulary for project screens.
  - Shell types: `sidebar-app`, `topbar-app`, `marketing`.
  - Blocks: `page-header, stat-row, data-table, filter-bar, form, detail-panel, list, chart, empty-state, tabs, hero, feature-section, pricing, footer`.
  - Each block lists its props and states.
- **`scripts/studio.py`:** replaces `gallery.py`. Subcommands:
  - `catalog` writes `assets/catalog.json`: every Wada combination with full light/dark roles from `wada.roles()` and mood scores, plus fonts, presets and blocks. It is committed, and a test checks it is up to date.
  - `fonts suggest --mood …` ranks pairings, mirroring `wada.suggest`.
  - `seed` writes `docs/design/studio.json` with:
    - `moods`
    - `suggested` palette ids
    - optional Claude directions
    - `sample` domain content
    - `screens`: project screen specs (shell plus blocks with real content), derived from the brief, goals and FEAT items
  - `export --out docs/design/studio.html` builds the static fallback. It puts the catalog, DESIGN.md and studio.json into `${CLAUDE_PLUGIN_ROOT}/skills/hub/dist/studio.html`.
- **`templates/DESIGN.md`:**
  - New front-matter keys: `status: draft|final`, `revision`, `typography.pairing`, `typography.<role>.source`, `density`, `elevation`, `motion`.
  - New prose section **Screens**: one row per approved screen with its shell, blocks, states, and the FEAT item that builds it.
- **`scripts/check_design.py`:**
  - Lint the new keys.
  - Add a **revision guard** on `--staged`:
    - If `HEAD:` DESIGN.md is `final` and its tokens changed without `revision` going up by one, that is a finding.
    - If `revision` went up but no ADR mentions `DESIGN.md revision <n>`, that is a finding.
    - Whether a finding blocks follows `design_check`.
  - `export_tailwind()` also outputs fonts, shadows and durations.
- **Remove** `templates/palettes.html`, `templates/directions.html` and `scripts/gallery.py`, and update `test_gallery_*`.

## 2. Studio page (`packages/hub/ui`): one page, five stages
- **Build:**
  - New Vite entry `ui/studio.html` and `ui/src/studio/`, built as a single file into `dist/studio.html`. The catalog is included at build time.
  - Reuses `styles/tokens.css`, `components/primitives.tsx` and `api.ts` (the token and `onHubChange` SSE pattern).
- **Data:**
  - Static mode reads an embedded `<script id="design">`. Served mode calls `GET api/design`.
  - The payload is `{tokens, status, revision, stage, studio (studio.json), catalog}`.
- **Stepper header**, always visible, with one state per stage: done / current / waiting on Claude / skipped.

1. **Palette:** browse Wada, filtered by mood, with Claude's suggestions badged. Shortlist 2–4 picks into a tray. "Build directions" moves to stage 2 straight away, with no copy-paste.
2. **Directions:** the page builds one direction per shortlisted palette.
   - Font pairing: the best `fonts.json` match for the moods.
   - Shape and density come from the moods. Two similar palettes get different type and shape.
   - Claude-seeded directions take precedence.
   - Each direction is previewed on the **project's own screens** from `studio.json.screens`, not a generic sample, in light and dark. "Pick" or "Mix" moves to stage 3.
3. **Tune:**
   - A control rail for palette, per-role hex override (with a live AA badge), type, scale, shape, density, elevation, motion and theme (light / dark / split).
   - Canvas tabs: Screens (project), Components, Type specimen.
   - Compare: pin up to 4 variants side by side, and copy any one dimension from another variant.
   - "Save draft" writes DESIGN.md and moves to stage 4.
4. **Finalise:** the page shows "Waiting for Claude to write the design rationale" (hand-off below).
   - When Claude has written the prose, it appears here.
   - The user then confirms "Lock design", which sets `status: final` and `revision: 1`.
5. **Project screens:** "Build project layouts" or "Skip, build them later with `/crew:design page`".
   - Building: each screen in `studio.json.screens` is rendered with the final tokens, through blocks and the shell, at 375 / 1280 px.
   - Each screen gets Approve, Request change (a free-text note, which hands off to Claude) or Drop.
   - "Done" hands off to Claude to record the Screens section and create FEAT items.

**Lock UX:**
- When `final`, Palette/Directions/Tune are read-only.
- "Start revision" (with a reason) reopens Tune.
- Saving creates a revision.

**Static fallback:**
- The same stages, with the same checks on each.
- A hand-off shows a selectable line for the user to paste into chat.

**Fonts:** preview fonts load from Google Fonts CSS2 on demand. Offline, the page falls back to the system font stack and says so in the UI.

**Logic:** pure functions in `ui/src/studio/model.ts`:
- tokens to CSS variables
- contrast (a port of `check_design.contrast`)
- direction builder
- presets
- diff
- block renderers in `ui/src/studio/blocks/`

## 3. Hand-off between page and Claude (no dead ends)
- The studio writes its state to `docs/design/studio.json` (`stage`, `shortlist`, `variants`, `screen_reviews`, `handoff: {kind, note, at}`).
- **New CLI command `crew design wait`:** blocks until the studio posts a hand-off, then prints it and exits.
  - The skill runs it in the background, so the harness wakes Claude when the user clicks.
  - Claude does the step (writes prose, revises a screen, records Screens and items), clears `handoff`, and starts `wait` again.
  - The studio updates live over SSE.
- **`crew design show`** and an MCP tool **`design`** print tokens, status, revision, stage and pending reviews, so any agent can read the live state.

## 4. Hub server, CLI and build (`packages/hub/src`)
- **`core/design.ts`:**
  - Reads DESIGN.md from `config.yaml → design.file`.
  - Parses the front matter with the existing `yaml` dependency.
  - Writes the front matter back **without touching the markdown body**.
  - Validates, bumps revisions, and reads/writes `studio.json`.
- **`server.ts`:** reuses the token / Origin / Host checks at :62–:89.
  - `GET /design` returns studio.html with the hub-token meta tag.
  - `GET /api/design`.
  - `POST /api/design` with `{tokens, kind: draft|revision|lock, reason?}`:
    - It refuses a plain save over a `final` design.
    - `revision` bumps the revision and, through the store, creates a CHORE "Bring UI onto design revision N", then flushes.
  - `POST /api/design/studio` handles stage, shortlist, variants, reviews and hand-off.
  - Add `docs/design/` to the `fs.watch` list.
- **Hub shell (`ui/src/components/Shell.tsx`):** a "Design" link to `/design`, shown in served mode.
- **CLI (`cli.ts`):** `ui --design`, `design show`, `design wait [--timeout]`.
- **MCP (`mcp.ts`):** the `design` tool.
- **Build:** `build.mjs` bundles `studio.html`. `vendor()` (`commands/planning.ts:23`) also copies it into `.crew/bin/`.

## 5. Skill flow (`SKILL.md`, references, README)
- **init:**
  1. Context.
  2. Ask once: surface, adjectives, references, brand assets, dark mode, and **project screens: now / later**.
  3. Claude runs `wada.py suggest` and `studio.py fonts suggest`, derives the `screens` from the brief, goals and items, and runs `studio.py seed`.
  4. Open the studio (`crew ui --design` with the hub, or `studio.py export` plus the browser pane), then `crew design wait` in the background.
  5. Respond to each hand-off:
     - **Finalise:** write the prose sections, then after the user's lock write the ADR and `config.yaml design:`.
     - **Screen change requests:** revise the screen spec.
     - **Screens done:** write the DESIGN.md Screens section and create one FEAT item per approved screen, linked to it (hub on).
  6. If the user skipped screens, say `/crew:design page <name>` builds them later.
- **refresh:** through "Start revision" in the studio, or by Claude editing. Either way the revision goes up by one, an ADR mentions `DESIGN.md revision N`, and drift becomes a CHORE.
- **page:** start from the matching Screens entry if there is one.
- **review:** also checks screens against the Screens section.
- **Other files:**
  - `references/principles.md` points to the catalogs instead of repeating their values.
  - `guidelines/stacks/design.md` mentions the revision guard.
  - Update the README design row.
- **Dogfood:** migrate `packages/hub/docs/design/DESIGN.md` to `status: final, revision: 1`.

## Verification
- **`pytest tests/crew/test_design.py`:**
  - `catalog.json` is fresh.
  - Schemas for fonts, presets and blocks.
  - `seed` writes a valid studio.json including screens.
  - `export` embeds the payload.
  - Revision guard: an edit without a bump is a finding, a bump without an ADR is a finding, and a bump with an ADR is clean.
  - The Tailwind export includes fonts, shadows and motion.
- **`cd packages/hub && npm run typecheck && npm test && npm run build`:**
  - The `core/design.ts` round trip leaves the body unchanged.
  - Server routes: the token / Origin / Host refusals.
  - Saves: a draft save works, a plain save over a final design is refused, and a revision creates the CHORE and bumps the number.
  - `POST /api/design/studio` plus SSE on a file change.
  - `crew design wait` exits on a hand-off and on timeout.
  - The MCP `design` tool matches the CLI.
  - `dist.test.ts` freshness includes `studio.html`.
- **End to end in the browser pane**, on the sample project with seeded screens, via `crew ui --design`:
  - Shortlist 3 palettes. The buttons work and lead to Directions with no copy-paste.
  - Directions render on the project's screens. Pick one, tune it, save a draft.
  - The `wait` hand-off reaches Claude. Write the prose and lock.
  - Screens: approve 2, request a change on 1, then Done. The Screens section and FEAT items exist.
  - Revision flow: read-only, then "Start revision", then a CHORE.
  - Screenshots in light and dark at 375 and 1280 px.
  - Repeat with the static `studio.html` (hand-off by selectable line).
- `check_design.py --all` is clean on the dogfooded hub DESIGN.md.

## Progress log
- 2026-10-24: imported from plan mode (`~/.claude/plans/the-current-design-skill-mutable-wozniak.md`); it predates the hub tracking plans, status done from git history

## Outcome
Shipped in `b6665ea` (https://github.com/aanand-3/claude-plugins/pull/4, merged as `e983e48`, 2026-10-23).

Learnings: none
