---
name: design
description: Give a web frontend one deliberate, modern visual design and keep every page on it — one interactive design studio walks palette (Sanzo Wada's colour combinations) → directions (curated type pairings, shape, density, elevation, motion) → tune and compare → finalise and lock → the project's own screens, recorded as docs/design/DESIGN.md (tokens, layout shell, component inventory, screens, do's and don'ts); compose new pages from it, revise it only through recorded revisions, and review UI for drift and generic "AI-looking" design. Use when the user asks for a design system, look and feel, theme, colors/fonts, "make it look modern/better", before building a new page or screen, or for a UI/design review.
argument-hint: "[init | page <name> | review | refresh]"
---

# Design

Goal: every page looks like it came from the same designer, and that designer had taste. Consistency comes from **one persisted file** read before any UI work — `docs/design/DESIGN.md` — plus a checker that catches drift. Taste comes from deciding a direction up front instead of letting each page fall back to defaults.

References (read the ones the mode needs):
- [references/principles.md](references/principles.md) — colour, type, space, layout, app/dashboard patterns, states, and the generic tells to avoid.
- [references/motion.md](references/motion.md) — when and how to animate.
- [references/companions.md](references/companions.md) — optional third-party skills (Impeccable, Taste, Emil Kowalski, shadcn) and when to suggest them.

Catalogs (`${CLAUDE_SKILL_DIR}/assets/`): `fonts.json` (curated OFL pairings with moods and a reason each), `presets.json` (shape, density, elevation, motion, type scale), `blocks.json` (shells and blocks for project screens), `wada/` (the palettes). `catalog.json` is all of them plus every palette's UI roles, built by `studio.mjs catalog`; the studio page embeds it.

Scripts (`${CLAUDE_SKILL_DIR}/scripts/`):
- `studio.mjs fonts|seed|catalog` — font pairings for moods; validate Claude's spec and write `docs/design/studio.json`; rebuild the catalog.
- `wada.mjs suggest|show|roles` — palette candidates from *A Dictionary of Color Combinations* and their WCAG-checked UI roles.
- `check_design.mjs --all|--staged|--export tailwind` — lints DESIGN.md, enforces the lock (a final design changes only through a revision with an ADR; always blocks on `--staged`), scans UI code for off-token values, exports Tailwind v4 theme CSS. Vendored to `.crew/bin/` by the guidelines step when the `design` pack is on.

The studio is part of the hub: `dist/studio.html` in the hub skill, served by the same `crew ui` server as the hub's view (`/` is the hub, `/design` the studio, linked both ways) and saving straight into `docs/design/` — nothing is copied by hand. Below, `crew` means `node "${CLAUDE_SKILL_DIR}/../hub/dist/crew.mjs"` (the plugin's copy; it works as soon as `.crew/config.yaml` exists, before `crew init`). Its stages: **Palette → Directions → Tune → Finalise → Project screens → Done**. The page does every stage that needs no Claude by itself (shortlist → Next builds directions in the page). Steps that need Claude arrive as **hand-offs**: `crew design wait` (run in the background) exits when the user clicks one, `crew design show` (or the MCP `design` tool) prints the state, `crew design done <id>` clears one and the page updates live.

Mode is `$ARGUMENTS` (default: `init` when no DESIGN.md exists, otherwise ask).

## init — one continuous flow from palette to project screens
1. **Context.** Read `.crew/config.yaml` (frontend stack, `frontend_dir`), `docs/project-brief.md` (users, purpose), the goals and FEAT items, and `docs/research/idea-research.md` if it exists (competitors — note their visual conventions so we can stand apart).
2. **Ask once** (AskUserQuestion, ≤4): product surface — *app*, *marketing* or *both*; three adjectives for how it should feel; fixed brand assets (logo colours, fonts) and whether dark mode is required (default: yes for apps); and **project screens: lay them out now (recommended) or later**.
3. **Seed the studio.** Map the adjectives to moods (`calm, bold, warm, cool, light, dark, earthy, technical, editorial, friendly`). Write a spec (format in `studio.mjs`'s docstring) to a draft file:
   - `project`, `surface`, `moods`, `avoid` (competitor hexes);
   - `directions` (optional, 0–4): only when you have a reason the page's builder wouldn't (brand colours, a reference site). Use `wada.mjs suggest` and `studio.mjs fonts --mood … --surface …`; two directions on similar palettes differ in type and shape;
   - `screens` (when the user chose *now*): the 3–6 screens the product needs first, from the brief, goals and items — each a shell plus blocks from `assets/blocks.json`, filled with **real domain content** (names, numbers, states), never lorem ipsum. App: the main list, the detail, the key form, the dashboard. Marketing: the landing page sections.
   Run `node "${CLAUDE_SKILL_DIR}/scripts/studio.mjs" seed <spec>` (it validates and refuses a bad spec with every problem listed).
   - Brand colours: skip the palette stage — seed one direction per brand option and add the colours as `docs/design/palettes-extra.json` (see `wada.mjs`).
4. **Open the studio.** `crew ui --design --no-open` in the background, then open the printed URL (the built-in browser pane if available; otherwise give the URL). If the hub's view is already running, reuse it: the studio is its `/design` page. Tell the user what to do in one line (shortlist up to four palettes, Next, pick a direction, tune, save). Then start `crew design wait` in the background and wait for it — don't poll.
5. **Answer each hand-off**, `crew design done <id>`, and start `crew design wait` again until the flow is done:
   - **finalise** — write DESIGN.md's prose from `templates/DESIGN.md` for the saved tokens (don't touch the front matter): overview (the direction and *why* it suits these users), colours, typography, layout shell, elevation, shapes, component inventory, states, motion, voice, do's and don'ts. Run `check_design.mjs --all --root .` — the lint must be clean.
   - **locked** — the user locked revision 1. Write the ADR ("Visual design direction", mention `DESIGN.md revision 1`), set `design: {file: docs/design/DESIGN.md, direction: <name>, source: "Wada #<id>", surface: <…>, dark_mode: <bool>}` and `design_check: warn` in `.crew/config.yaml`, and add `design` to `packs:`.
   - **screen-change** — revise that screen in `docs/design/studio.json → screens` as the note asks (edit the JSON; keep ids). The page marks it *revised* for another review.
   - **screens-done** — add a row per approved screen to DESIGN.md → Screens, and one FEAT item per screen (during kickoff, step 6 adds them once goals exist) (`crew new-item feat "Build the <name> screen" --why "<purpose>; layout in DESIGN.md → Screens"`), noting its id in the row.
   - **screens-skipped** — say `/crew:design page <name>` builds screens later.
   - **revision** — see refresh.
6. Standalone, suggest `/crew:guidelines --refresh` so the `design` rules and checker are installed. **No application code**: the Tailwind theme is applied by the first UI plan (`check_design.mjs --export tailwind`).

## page <name> — before building a page or screen
1. Read DESIGN.md (tokens, shell, inventory, Screens, do's and don'ts) and the page's plan. If DESIGN.md → Screens has the page, start from its approved layout (`docs/design/studio.json → screens`); otherwise add it there first (and let the user review it in the studio) when it is a main screen.
2. Sketch the page as a composition of **shell + inventory components** (ASCII is fine) before coding. Anything not in the inventory: reuse/extend an inventory component first; a genuinely new composite gets added to the inventory section in the same change, with its states.
3. Build with tokens only (`bg-primary`, `text-muted-foreground`, `rounded-md`, spacing scale). Every data view has loading, empty and error states.
4. **QA loop:** run the app, screenshot at full size at 375, 900 and 1440 px in light and dark (look at each at 100 %, never scaled down), compare against DESIGN.md, the studio's render of the screen, one existing page and the [review checklist](references/review-checklist.md), fix everything found in one batch, re-check once. Run `check_design.mjs --all`; for the crew hub's UI also `layout_sweep.mjs` (sideways scroll and overflow at every width and theme).

## review — audit existing UI
1. `check_design.mjs --all` for mechanical drift.
2. Visual pass per page against DESIGN.md (including Screens), principles (hierarchy, spacing rhythm, alignment, states, contrast, the tells list) and every entry of the [review checklist](references/review-checklist.md), on screenshots taken at full size at 375, 900 and 1440 px in light and dark (look at each at 100 %, never scaled down). Report as a table: `file:line | issue | before → after | why`. Fix only what the user approves.
3. Where a deeper pass would help, suggest a companion skill from references/companions.md (e.g. Impeccable `audit`/`polish` for a critique, Emil Kowalski's skills for motion).

## refresh — change a final design
A `final` DESIGN.md changes only through a **revision**; the pre-commit check blocks anything else.
1. Prefer the studio: open it, Tune → **Start a revision**, change it, give the reason, save. The server bumps `revision`, files a CHORE ("Bring the UI onto design revision N") and hands you a **revision** step.
2. Without the studio, edit the tokens yourself and bump `revision` by one (prose-only edits need no revision).
3. Either way, write an ADR that mentions `DESIGN.md revision N` and why, update the prose the change affects, run the lint, and let `check_design.mjs --all` list the code that now drifts — it belongs to the CHORE, not this change.

## Rules
- **DESIGN.md is the one home for visual decisions.** Rules files, plans and components link to it; nobody copies token values elsewhere. Once final, it changes only through a revision.
- Tokens only in components. A deliberate exception carries a `design-ok` comment explaining why.
- Decide, don't average: one direction, one accent, one display face. Spend boldness in one place per page.
- Real content in directions, screens and pages (domain nouns, plausible numbers), never lorem ipsum.
- Accessibility is part of the design: AA contrast (the scripts enforce it for tokens), visible focus, 44 px touch targets, `prefers-reduced-motion`.
- Use Wada data only as colour values and names; never reproduce the book's pages or images. Fonts come only from `fonts.json` (all OFL) or the user's licensed brand fonts.
