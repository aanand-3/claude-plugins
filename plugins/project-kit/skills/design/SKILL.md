---
name: design
description: Give a web frontend one deliberate, modern visual design and keep every page on it — browse a gallery of Sanzo Wada's colour combinations, shortlist, compare full style tiles and pick a direction, record it as docs/design/DESIGN.md (tokens, layout shell, component inventory, do's and don'ts), compose new pages from it, and review UI for drift and generic "AI-looking" design. Use when the user asks for a design system, look and feel, theme, colors/fonts, "make it look modern/better", before building a new page or screen, or for a UI/design review.
argument-hint: "[init | page <name> | review | refresh]"
---

# Design

Goal: every page looks like it came from the same designer, and that designer had taste. Consistency comes from **one persisted file** read before any UI work — `docs/design/DESIGN.md` — plus a checker that catches drift. Taste comes from deciding a direction up front instead of letting each page fall back to defaults.

References (read the ones the mode needs):
- [references/principles.md](references/principles.md) — colour, type, space, layout, app/dashboard patterns, states, and the generic tells to avoid.
- [references/motion.md](references/motion.md) — when and how to animate.
- [references/companions.md](references/companions.md) — optional third-party skills (Impeccable, Taste, Emil Kowalski, shadcn) and when to suggest them.

Scripts (`${CLAUDE_SKILL_DIR}/scripts/`):
- `gallery.py` — writes `docs/design/palettes.html`, every combination previewed as UI, for the user to shortlist from.
- `wada.py suggest|show|roles` — palette candidates from *A Dictionary of Color Combinations* and their WCAG-checked UI roles.
- `check_design.py --all|--staged|--export tailwind` — lints DESIGN.md, scans UI code for off-token values, exports Tailwind v4 theme CSS. Vendored to `.project/bin/` by the guidelines step when the `design` pack is on.

Mode is `$ARGUMENTS` (default: `init` when no DESIGN.md exists, otherwise ask).

## init — choose a direction, write DESIGN.md
1. **Context.** Read `.project/config.yaml` (frontend stack, `frontend_dir`), `docs/project-brief.md` (users, purpose) and `docs/research/idea-research.md` if it exists (competitors — note their visual conventions so we can stand apart).
2. **Ask once** (AskUserQuestion, ≤4): product surface — *app* (dashboards, forms, tables), *marketing* (landing/content), or *both*; three adjectives for how it should feel; reference sites they like (optional); fixed brand assets (logo colours, fonts) and whether dark mode is required (default: yes for apps).
3. **Palette gallery — the user browses, Claude suggests.** Map the adjectives to moods (`calm, bold, warm, cool, light, dark, earthy`) and run
   `python3 "${CLAUDE_SKILL_DIR}/scripts/gallery.py" --mood <moods> [--avoid "<competitor hexes>"] --out docs/design/palettes.html`.
   It writes every Wada combination (plus `docs/design/palettes-extra.json`, if present) as a filterable page. Each one is previewed as UI in light and dark, ranked by the moods, and Claude's top picks are badged *suggested*. Open it (see step 5 for how) and ask the user to shortlist **2–4** and paste back the line the page gives them ("Shortlist: #214, #155, #223").
   - If the user says "you pick", choose 3 suggested combinations that **differ from each other** (hue family and temperature), not simply the top three scores (`wada.py suggest` lists them).
   - If more than 4 are shortlisted, ask which to drop. If the user has fixed brand colours, skip the gallery and build the directions around those colours.
4. **Directions** — one per shortlisted combination (2–4). For each, get roles with `wada.py roles <id>`, then choose a type pairing and shape language that fits the adjectives (principles → Typography). Two directions on similar palettes should differ in type and shape. Name each direction in two words that describe it ("Ledger Calm", "Signal Bold"). Fill `templates/directions.html` (replace every `{{…}}`) → `docs/design/directions.html`: one column per direction showing palette, type scale, buttons, input, card, table row, and one sample screen of the real product (app mode: its main list/detail screen with real-looking domain data; marketing: the hero and one section), in light and dark.
5. **Show it.** Open the file in a browser: the built-in browser pane if available (serve `docs/design/` with `python3 -m http.server` if file URLs are refused), otherwise give the user the path. Screenshot it and ask the user to pick one, or mix (e.g. "palette of A, type of B"). If none fits, go back to the gallery for a new shortlist. Allow at most two rounds of tweaks on the directions.
6. **Write `docs/design/DESIGN.md`** from `templates/DESIGN.md`: the chosen roles under `colors` (light + `dark-` prefixed), typography, rounded, spacing, components, and the prose — overview (the direction and *why* it suits these users), layout shell, component inventory, states, motion, voice, and the project's do's and don'ts. Keep `source: Wada #<id>` in front matter. Then run `python3 "${CLAUDE_SKILL_DIR}/scripts/check_design.py" --all --root .` — the lint must be clean.
7. **Record it.** In `.project/config.yaml` set `design: {file: docs/design/DESIGN.md, direction: <name>, source: "Wada #<id>", surface: <app|marketing|both>, dark_mode: <bool>}` and `design_check: warn`, add `design` to `packs:`, and write an ADR ("Visual design direction"). Standalone, suggest `/project-kit:guidelines --refresh` so the `design` rules and checker are installed. **No application code**: the Tailwind theme is applied by the first UI plan (`check_design.py --export tailwind`).

## page <name> — before building a page or screen
1. Read DESIGN.md (tokens, shell, inventory, do's and don'ts) and the page's plan.
2. Sketch the page as a composition of **shell + inventory components** (ASCII is fine) before coding. Anything not in the inventory: reuse/extend an inventory component first; a genuinely new composite gets added to the inventory section in the same change, with its states.
3. Build with tokens only (`bg-primary`, `text-muted-foreground`, `rounded-md`, spacing scale). Every data view has loading, empty and error states.
4. **QA loop:** run the app, screenshot at 375 px and 1280 px in light and dark, compare against DESIGN.md and one existing page, fix everything found in one batch, re-check once. Run `check_design.py --all`.

## review — audit existing UI
1. `check_design.py --all` for mechanical drift.
2. Visual pass per page against DESIGN.md and principles (hierarchy, spacing rhythm, alignment, states, contrast, the tells list). Report as a table: `file:line | issue | before → after | why`. Fix only what the user approves.
3. Where a deeper pass would help, suggest a companion skill from references/companions.md (e.g. Impeccable `audit`/`polish` for a critique, Emil Kowalski's skills for motion).

## refresh — change the design
Revise DESIGN.md (re-run `wada.py roles` if the palette changes), regenerate the tile only if the direction changes, run the lint, and append an ADR when the change is visible to users. Then `check_design.py --all` lists the code that now drifts; capture it as a CHORE item rather than fixing it inline.

## Rules
- **DESIGN.md is the one home for visual decisions.** Rules files, plans and components link to it; nobody copies token values elsewhere.
- Tokens only in components. A deliberate exception carries a `design-ok` comment explaining why.
- Decide, don't average: one direction, one accent, one display face. Spend boldness in one place per page.
- Real content in tiles and pages (domain nouns, plausible numbers), never lorem ipsum.
- Accessibility is part of the design: AA contrast (the scripts enforce it for tokens), visible focus, 44 px touch targets, `prefers-reduced-motion`.
- Use Wada data only as colour values and names; never reproduce the book's pages or images.
